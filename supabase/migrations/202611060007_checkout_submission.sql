begin;

-- Extend the trusted intake command without changing existing orders or its catalog rules.
create function public.submit_checkout_request(p_idempotency_key uuid, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  contact jsonb := p_payload->'contact';
  receipt jsonb;
begin
  if jsonb_typeof(contact) is distinct from 'object'
    or jsonb_typeof(contact->'name') is distinct from 'string'
    or length(btrim(contact->>'name')) not between 1 and 120
    or jsonb_typeof(contact->'phone') is distinct from 'string'
    or contact->>'phone' !~ '^[0-9]{10}$' then
    raise exception 'Invalid checkout contact' using errcode = '22023';
  end if;

  if p_payload->>'modality' = 'entrega' then
    if jsonb_typeof(contact->'address') is distinct from 'string'
      or length(btrim(contact->>'address')) not between 1 and 500
      or jsonb_typeof(p_payload->'neighborhood') is distinct from 'string'
      or length(btrim(p_payload->>'neighborhood')) not between 1 and 120
      or jsonb_typeof(contact->'recipient_name') is distinct from 'string'
      or length(btrim(contact->>'recipient_name')) not between 1 and 120
      or jsonb_typeof(contact->'recipient_phone') is distinct from 'string'
      or contact->>'recipient_phone' !~ '^[0-9]{10}$'
      or jsonb_typeof(contact->'latitude') is distinct from 'number'
      or jsonb_typeof(contact->'longitude') is distinct from 'number' then
      raise exception 'Invalid checkout delivery' using errcode = '22023';
    end if;
    if (contact->>'latitude')::numeric not between -90 and 90
      or (contact->>'longitude')::numeric not between -180 and 180 then
      raise exception 'Invalid checkout pin' using errcode = '22023';
    end if;
  elsif p_payload ? 'neighborhood'
    or contact ?| array['address', 'references', 'latitude', 'longitude', 'recipient_name', 'recipient_phone'] then
    raise exception 'Unexpected checkout delivery' using errcode = '22023';
  end if;

  -- Keep recipient fields in the original hash to detect conflicting retries.
  receipt := public.submit_order_request(p_idempotency_key, p_payload);
  if p_payload->>'modality' = 'entrega' and not (receipt->>'replayed')::boolean then
    update public.order_delivery
      set recipient_name = btrim(contact->>'recipient_name'),
          recipient_phone = contact->>'recipient_phone'
      where order_id = (receipt->>'id')::uuid;
    if not found then
      raise exception 'Missing checkout delivery';
    end if;
  end if;
  return receipt;
end;
$$;

revoke all on function public.submit_checkout_request(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkout_request(uuid,jsonb) to service_role;

commit;
