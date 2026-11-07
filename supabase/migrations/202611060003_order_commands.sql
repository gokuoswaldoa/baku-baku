begin;

-- No direct browser writes. This transaction is callable only by the server role.
create function public.submit_order_request(p_idempotency_key uuid, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text;
  v_existing public.order_requests%rowtype;
  v_product public.products%rowtype;
  v_option public.options%rowtype;
  v_line jsonb;
  v_contact jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_snapshot jsonb;
  v_choice jsonb;
  v_toppings jsonb;
  v_option_id text;
  v_kind text;
  v_qty integer;
  v_unit integer;
  v_total bigint := 0;
  v_order_id uuid;
  v_number integer := 0;
begin
  if p_idempotency_key is null or jsonb_typeof(p_payload) is distinct from 'object'
    or octet_length(p_payload::text) > 65536 then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  v_hash := encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex');
  -- Serializes concurrent calls even when the idempotency row does not yet exist.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into v_existing from public.order_requests where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_hash then
      raise exception 'Idempotency key reused with different content' using errcode = '23505';
    end if;
    return jsonb_build_object('id', v_existing.id, 'status', v_existing.status,
      'subtotal_cents', v_existing.subtotal_cents, 'replayed', true);
  end if;

  if p_payload->>'modality' is null or p_payload->>'modality' not in ('recogida', 'entrega')
    or jsonb_typeof(p_payload->'items') is distinct from 'array' then
    raise exception 'Invalid modality or items' using errcode = '22023';
  end if;
  if jsonb_array_length(p_payload->'items') not between 1 and 50 then
    raise exception 'Invalid item count' using errcode = '22023';
  end if;
  if p_payload->>'modality' = 'entrega'
    and coalesce(length(btrim(p_payload->>'neighborhood')), 0) not between 1 and 120 then
    raise exception 'Neighborhood required' using errcode = '22023';
  end if;

  for v_line in select value from jsonb_array_elements(p_payload->'items')
  loop
    if jsonb_typeof(v_line) is distinct from 'object'
      or jsonb_typeof(v_line->'topping_ids') is distinct from 'array' then
      raise exception 'Invalid line' using errcode = '22023';
    end if;
    if jsonb_array_length(v_line->'topping_ids') > 2
      or (select count(*) <> count(distinct value) from jsonb_array_elements(v_line->'topping_ids'))
      or coalesce(v_line->>'quantity', '') !~ '^[0-9]{1,2}$'
      or coalesce(v_line->>'expected_unit_price_cents', '') !~ '^[0-9]{1,7}$' then
      raise exception 'Invalid quantity, toppings or expected price' using errcode = '22023';
    end if;
    v_qty := (v_line->>'quantity')::integer;
    if v_qty not between 1 and 99 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;
    select * into v_product from public.products
      where id = v_line->>'product_id' and available for share;
    if not found then raise exception 'Product unavailable' using errcode = '22023'; end if;
    v_unit := v_product.unit_price_cents;
    v_toppings := '[]'::jsonb;
    v_snapshot := jsonb_build_object(
      'product', jsonb_build_object('id', v_product.id, 'name', v_product.name,
        'description', v_product.description, 'base_price_cents', v_product.unit_price_cents),
      'price_is_provisional', v_product.price_is_provisional
    );

    -- Locks catalog rows through the commit, preventing mixed price snapshots.
    for v_option_id, v_kind in
      select v_line->>'finish_id', 'finish'
      union all select value, 'topping' from jsonb_array_elements_text(v_line->'topping_ids')
      union all select v_line->>'dip_id', 'dip'
    loop
      select o.* into v_option from public.options o
      join public.product_options po on po.option_id = o.id
      where o.id = v_option_id and o.kind = v_kind and o.available
        and po.product_id = v_product.id and po.available
      for share of o, po;
      if not found then raise exception 'Option unavailable' using errcode = '22023'; end if;
      v_unit := v_unit + v_option.surcharge_cents;
      v_choice := jsonb_build_object('id', v_option.id, 'name', v_option.name,
        'surcharge_cents', v_option.surcharge_cents);
      if v_kind = 'topping' then
        v_toppings := v_toppings || jsonb_build_array(v_choice);
      else
        v_snapshot := v_snapshot || jsonb_build_object(v_kind, v_choice);
      end if;
    end loop;
    if v_unit <> (v_line->>'expected_unit_price_cents')::integer then
      raise exception 'Price changed; refresh catalog before submitting' using errcode = '22023';
    end if;
    v_snapshot := v_snapshot || jsonb_build_object('toppings', v_toppings);
    v_total := v_total + v_qty::bigint * v_unit;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id', v_product.id,
      'quantity', v_qty, 'unit_price_cents', v_unit, 'snapshot', v_snapshot));
  end loop;

  insert into public.order_requests (idempotency_key, payload_hash, modality, subtotal_cents)
  values (p_idempotency_key, v_hash, p_payload->>'modality', v_total)
  returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(v_lines)
  loop
    v_number := v_number + 1;
    insert into public.order_items (order_id, line_number, product_id, quantity, unit_price_cents, personalization_snapshot)
    values (v_order_id, v_number, v_line->>'product_id', (v_line->>'quantity')::smallint,
      (v_line->>'unit_price_cents')::integer, v_line->'snapshot');
  end loop;

  v_contact := coalesce(p_payload->'contact', '{}'::jsonb);
  if jsonb_typeof(v_contact) is distinct from 'object' then
    raise exception 'Invalid contact' using errcode = '22023';
  end if;
  insert into public.order_contacts (order_id, customer_name, phone, written_address,
    address_references, pin_latitude, pin_longitude)
  values (v_order_id, nullif(btrim(v_contact->>'name'), ''), nullif(btrim(v_contact->>'phone'), ''),
    nullif(btrim(v_contact->>'address'), ''), nullif(btrim(v_contact->>'references'), ''),
    (v_contact->>'latitude')::double precision, (v_contact->>'longitude')::double precision);

  if p_payload->>'modality' = 'entrega' then
    insert into public.order_delivery (order_id, neighborhood)
    values (v_order_id, btrim(p_payload->>'neighborhood'));
  end if;
  insert into public.order_events (order_id, event_type, to_status)
  values (v_order_id, 'received', 'pendiente');
  return jsonb_build_object('id', v_order_id, 'status', 'pendiente',
    'subtotal_cents', v_total, 'replayed', false);
end;
$$;
revoke all on function public.submit_order_request(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_order_request(uuid, jsonb) to service_role;

create function private.valid_transition(p_from text, p_to text, p_modality text)
returns boolean language sql immutable set search_path = ''
as $$
  select coalesce(
    (p_from = 'pendiente' and p_to = 'confirmado')
    or (p_from = 'confirmado' and p_to = 'preparando')
    or (p_from = 'preparando' and p_to = 'listo')
    or (p_from = 'listo' and p_to = case when p_modality = 'entrega' then 'en reparto' else 'entregado' end)
    or (p_from = 'en reparto' and p_to = 'entregado')
    or (p_from not in ('entregado', 'cancelado') and p_to = 'cancelado'), false);
$$;
revoke all on function private.valid_transition(text, text, text) from public;

create function public.transition_order(p_order_id uuid, p_expected_status text, p_status text, p_reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests%rowtype;
begin
  if not private.is_admin() then raise insufficient_privilege; end if;
  select * into v_order from public.order_requests where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = '22023'; end if;
  if v_order.status <> p_expected_status then
    raise exception 'Order changed; reload before updating' using errcode = '40001';
  end if;
  if not private.valid_transition(v_order.status, p_status, v_order.modality) then
    raise exception 'Invalid transition' using errcode = '22023';
  end if;
  if p_status = 'cancelado' and coalesce(length(btrim(p_reason)), 0) = 0 then
    raise exception 'Cancellation reason required' using errcode = '22023';
  end if;
  if p_status = 'confirmado' and v_order.modality = 'entrega' and not exists (
    select 1 from public.order_delivery where order_id = p_order_id and coverage_confirmed
      and confirmed_fee_cents is not null
  ) then raise exception 'Confirm coverage and fee first' using errcode = '22023'; end if;

  update public.order_requests set status = p_status, updated_at = now(),
    confirmed_at = case when p_status = 'confirmado' then now() else confirmed_at end
  where id = p_order_id;
  insert into public.order_events(order_id, actor_id, event_type, from_status, to_status, reason)
  values (p_order_id, auth.uid(), 'status_changed', v_order.status, p_status, nullif(btrim(p_reason), ''));
end;
$$;
revoke all on function public.transition_order(uuid, text, text, text) from public, anon;
grant execute on function public.transition_order(uuid, text, text, text) to authenticated;

create function public.confirm_delivery(p_order_id uuid, p_fee_cents integer)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests%rowtype;
  v_previous integer;
begin
  if not private.is_admin() then raise insufficient_privilege; end if;
  select * into v_order from public.order_requests where id = p_order_id for update;
  if not found or v_order.modality <> 'entrega' or v_order.status <> 'pendiente' then
    raise exception 'Only pending deliveries can be quoted' using errcode = '22023';
  end if;
  select confirmed_fee_cents into v_previous from public.order_delivery where order_id = p_order_id;
  if not found then raise exception 'Missing delivery' using errcode = '22023'; end if;
  update public.order_delivery set coverage_confirmed = true, confirmed_fee_cents = p_fee_cents,
    confirmed_by = auth.uid(), confirmed_at = now() where order_id = p_order_id;
  insert into public.order_events(order_id, actor_id, event_type, details)
  values (p_order_id, auth.uid(), 'delivery_updated',
    jsonb_build_object('previous_fee_cents', v_previous, 'confirmed_fee_cents', p_fee_cents, 'coverage_confirmed', true));
end;
$$;
revoke all on function public.confirm_delivery(uuid, integer) from public, anon;
grant execute on function public.confirm_delivery(uuid, integer) to authenticated;

-- Revoke inherited table grants too. Privileged commands above own every order write.
revoke all on public.order_requests, public.order_items, public.order_contacts,
  public.order_delivery, public.order_events, public.admin_users from public;
revoke all on sequence public.order_events_id_seq from public, anon, authenticated;

commit;
