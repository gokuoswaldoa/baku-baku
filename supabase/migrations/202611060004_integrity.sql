begin;

create function private.guard_order_update() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise insufficient_privilege; end if;
  if (to_jsonb(new) - array['status','confirmed_at','updated_at'])
    <> (to_jsonb(old) - array['status','confirmed_at','updated_at']) then
    raise exception 'Request snapshot is immutable' using errcode = '22023';
  end if;
  if not private.valid_transition(old.status, new.status, old.modality) then
    raise exception 'Invalid transition' using errcode = '22023';
  end if;
  if new.status = 'confirmado' and old.modality = 'entrega' and not exists (
    select 1 from public.order_delivery where order_id = old.id and coverage_confirmed and confirmed_fee_cents is not null
  ) then raise exception 'Confirm coverage and fee first' using errcode = '22023'; end if;
  new.confirmed_at := case when new.status = 'confirmado' then now() else old.confirmed_at end;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_order_update() from public;
create trigger guard_order_update before update on public.order_requests
for each row execute function private.guard_order_update();

create function private.check_order_integrity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_order public.order_requests%rowtype;
  v_count integer;
  v_sum bigint;
begin
  if tg_table_name = 'order_requests' then
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_id := old.order_id;
  else
    v_id := new.order_id;
  end if;
  select * into v_order from public.order_requests where id = v_id;
  if not found then return null; end if;
  select count(*), coalesce(sum(line_total_cents), 0) into v_count, v_sum
    from public.order_items where order_id = v_id;
  if v_count not between 1 and 50 or v_sum <> v_order.subtotal_cents
    or not exists (select 1 from public.order_contacts where order_id = v_id)
    or (v_order.modality = 'entrega') <> exists (select 1 from public.order_delivery where order_id = v_id) then
    raise exception 'Incomplete or inconsistent order' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.check_order_integrity() from public;
create constraint trigger complete_request after insert or update on public.order_requests
deferrable initially deferred for each row execute function private.check_order_integrity();
create constraint trigger consistent_items after insert or update or delete on public.order_items
deferrable initially deferred for each row execute function private.check_order_integrity();
create constraint trigger consistent_contacts after insert or update or delete on public.order_contacts
deferrable initially deferred for each row execute function private.check_order_integrity();
create constraint trigger consistent_delivery after insert or update or delete on public.order_delivery
deferrable initially deferred for each row execute function private.check_order_integrity();

create function private.immutable_snapshot() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'Historical snapshots and events are immutable' using errcode = '22023';
end;
$$;
revoke all on function private.immutable_snapshot() from public;
create trigger immutable_items before update or delete on public.order_items
for each row execute function private.immutable_snapshot();
create trigger immutable_events before update or delete on public.order_events
for each row execute function private.immutable_snapshot();

-- SECURITY DEFINER commands run as their owner. The server role needs only RPC execution.
revoke all on public.order_requests, public.order_items, public.order_contacts,
  public.order_delivery, public.order_events, public.admin_users from service_role;
revoke all on sequence public.order_events_id_seq from service_role;

commit;
