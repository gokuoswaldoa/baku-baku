begin;

alter table public.order_delivery
  add column recipient_name text,
  add column recipient_phone text,
  add constraint order_delivery_recipient_valid check (
    (recipient_name is null and recipient_phone is null)
    or (
      recipient_name is not null and recipient_phone is not null
      and length(btrim(recipient_name)) between 1 and 120
      and recipient_phone ~ '^[0-9]{10}$'
    )
  );

-- The future admin panel calls this only when the operator chooses to prepare the message.
create function public.prepare_driver_message(p_order_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  delivery record;
begin
  if not private.is_admin() then raise insufficient_privilege; end if;

  select d.recipient_name, d.recipient_phone, c.written_address, c.address_references,
         c.pin_latitude, c.pin_longitude
    into delivery
    from public.order_delivery d
    join public.order_requests r on r.id = d.order_id
    join public.order_contacts c on c.order_id = d.order_id
    where d.order_id = p_order_id and r.modality = 'entrega'
      and r.status in ('confirmado', 'preparando', 'listo', 'en reparto')
      and d.coverage_confirmed and d.confirmed_fee_cents is not null;

  if not found or delivery.recipient_name is null or delivery.recipient_phone is null
     or nullif(btrim(delivery.written_address), '') is null
     or delivery.pin_latitude is null or delivery.pin_longitude is null then
    raise exception 'Delivery is not ready to share' using errcode = '22023';
  end if;

  return concat_ws(E'\n',
    'Folio: ' || p_order_id::text,
    'Recibe: ' || delivery.recipient_name,
    'Teléfono: ' || delivery.recipient_phone,
    'Dirección: ' || delivery.written_address,
    case when nullif(btrim(delivery.address_references), '') is not null
         then 'Referencias: ' || delivery.address_references end,
    'Navegación: https://www.google.com/maps/dir/?api=1&destination='
      || round(delivery.pin_latitude::numeric, 6)::text || '%2C'
      || round(delivery.pin_longitude::numeric, 6)::text
  );
end;
$$;

revoke all on function public.prepare_driver_message(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prepare_driver_message(uuid) to authenticated;

commit;
