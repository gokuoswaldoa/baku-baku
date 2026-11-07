-- Disposable database only. All synthetic orders roll back.
begin;

do $$
declare role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    execute format('set local role %I', role_name);
    begin
      perform public.submit_checkout_request(gen_random_uuid(), '{}');
      raise exception 'Public checkout RPC allowed';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';
  end loop;
end;
$$;

do $$
begin
  perform set_config('test.checkout_payload', '{
    "modality":"entrega","neighborhood":"Colonia ficticia",
    "contact":{"name":"Contacto ficticio","phone":"0000000001","recipient_name":"Destinatario ficticio","recipient_phone":"0000000002","address":"Calle ficticia S/N, Col. Colonia ficticia, Temixco","references":"Puerta ficticia","latitude":18.85,"longitude":-99.23},
    "items":[
      {"product_id":"bola-fuego-xl","quantity":3,"finish_id":"anguila","topping_ids":["ajonjoli","cebollin"],"dip_id":"sin-dip","expected_unit_price_cents":9500},
      {"product_id":"bola-fuego-xl","quantity":1,"finish_id":"sin-salsa","topping_ids":[],"dip_id":"mayo-chipotle","expected_unit_price_cents":9500}
    ]}', true);
  perform set_config('test.checkout_key', gen_random_uuid()::text, true);
end;
$$;

set local role service_role;
do $$
declare
  payload jsonb := current_setting('test.checkout_payload')::jsonb;
  request_key uuid := current_setting('test.checkout_key')::uuid;
  receipt jsonb;
  delivery_id uuid;
  invalid jsonb;
begin
  receipt := public.submit_checkout_request(request_key, payload);
  delivery_id := (receipt->>'id')::uuid;
  if delivery_id is null or receipt->>'status' is distinct from 'pendiente'
    or receipt->>'subtotal_cents' is distinct from '38000' or receipt->>'replayed' is distinct from 'false' then
    raise exception 'Delivery receipt incorrect';
  end if;
  receipt := public.submit_checkout_request(request_key, payload);
  if receipt->>'id' is distinct from delivery_id::text or receipt->>'replayed' is distinct from 'true' then
    raise exception 'Duplicate delivery on retry';
  end if;
  begin
    perform public.submit_checkout_request(request_key, jsonb_set(payload, '{contact,recipient_name}', '"Otro destinatario"'));
    raise exception 'Idempotency conflict accepted';
  exception when unique_violation then null;
  end;

  foreach invalid in array array[
    payload #- '{contact,name}',
    payload #- '{contact,address}',
    payload #- '{contact,recipient_name}',
    payload #- '{contact,latitude}',
    jsonb_set(payload, '{contact,latitude}', '91'),
    jsonb_set(payload, '{contact,recipient_phone}', '"123"'),
    jsonb_set(payload, '{items,0,product_id}', '"unavailable"'),
    jsonb_set(payload, '{items,0,dip_id}', '"unavailable"'),
    jsonb_set(payload, '{items,0,quantity}', '0'),
    jsonb_set(payload, '{items,0,expected_unit_price_cents}', '1')
  ] loop
    begin
      perform public.submit_checkout_request(gen_random_uuid(), invalid);
      raise exception 'Invalid checkout accepted';
    exception when invalid_parameter_value then null;
    end;
  end loop;

  receipt := public.submit_checkout_request(gen_random_uuid(), jsonb_build_object(
    'modality', 'recogida', 'contact', jsonb_build_object('name', 'Contacto ficticio', 'phone', '0000000001'),
    'items', jsonb_build_array(payload->'items'->0)
  ));
  perform set_config('test.pickup_id', receipt->>'id', true);
end;
$$;
reset role;

do $$
declare
  delivery_id uuid := (select id from public.order_requests where idempotency_key = current_setting('test.checkout_key')::uuid);
  pickup_id uuid := current_setting('test.pickup_id')::uuid;
begin
  if (select count(*) from public.order_requests) <> 2
    or (select count(*) from public.order_items where order_id = delivery_id) <> 2
    or not exists (select 1 from public.order_delivery where order_id = delivery_id
      and recipient_name = 'Destinatario ficticio' and recipient_phone = '0000000002'
      and not coverage_confirmed and confirmed_fee_cents is null
      and reference_near_cents = 3500 and reference_far_cents = 5500)
    or not exists (select 1 from public.order_contacts where order_id = delivery_id
      and written_address is not null and address_references is not null
      and pin_latitude = 18.85 and pin_longitude = -99.23)
    or not exists (select 1 from public.order_contacts where order_id = pickup_id and written_address is null)
    or exists (select 1 from public.order_delivery where order_id = pickup_id) then
    raise exception 'Checkout storage, delivery, or tariff incorrect';
  end if;
end;
$$;

set constraints all immediate;
rollback;
