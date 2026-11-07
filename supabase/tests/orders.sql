-- Run only on a disposable/local Supabase database after all migrations.
-- All fixtures roll back. Requires the trusted database owner to SET ROLE.
begin;

insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');
insert into public.admin_users(user_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.products(id, name, description, unit_price_cents, available)
values ('hidden-test', 'Hidden fixture', '', 9500, false);

set local role anon;
do $$
begin
  if exists (select 1 from public.products where id = 'hidden-test') then raise exception 'Hidden catalog exposed'; end if;
  if not exists (select 1 from public.products where id = 'bola-fuego-xl') then raise exception 'Public catalog blocked'; end if;
  begin
    perform 1 from public.order_contacts;
    raise exception 'Anonymous contact read unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_order_request(gen_random_uuid(), '{}');
    raise exception 'Anonymous RPC unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('test.payload', '{
  "modality":"entrega","neighborhood":"Colonia de prueba",
  "items":[
    {"product_id":"bola-fuego-xl","quantity":3,"finish_id":"anguila","topping_ids":["ajonjoli","cebollin"],"dip_id":"sin-dip","expected_unit_price_cents":9500},
    {"product_id":"bola-fuego-xl","quantity":1,"finish_id":"sin-salsa","topping_ids":[],"dip_id":"mayo-chipotle","expected_unit_price_cents":9500}
  ]}', true);
select set_config('test.key', gen_random_uuid()::text, true);

set local role service_role;
do $$
declare result jsonb;
begin
  result := public.submit_order_request(current_setting('test.key')::uuid, current_setting('test.payload')::jsonb);
  if result->>'subtotal_cents' <> '38000' or result->>'status' <> 'pendiente' then raise exception 'Incorrect subtotal/status'; end if;
  perform set_config('test.order_id', result->>'id', true);
  result := public.submit_order_request(current_setting('test.key')::uuid, current_setting('test.payload')::jsonb);
  if result->>'replayed' <> 'true' or result->>'id' <> current_setting('test.order_id') then raise exception 'Replay duplicated order'; end if;
  begin
    perform public.submit_order_request(current_setting('test.key')::uuid,
      jsonb_set(current_setting('test.payload')::jsonb, '{neighborhood}', '"Otra colonia"'));
    raise exception 'Idempotency conflict accepted';
  exception when unique_violation then null;
  end;
  begin
    perform public.submit_order_request(gen_random_uuid(),
      jsonb_set(current_setting('test.payload')::jsonb, '{items,0,expected_unit_price_cents}', '1'));
    raise exception 'Tampered price accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_order_request(gen_random_uuid(),
      jsonb_set(current_setting('test.payload')::jsonb, '{items,0,dip_id}', '"unknown-dip"'));
    raise exception 'Unavailable option accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_order_request(gen_random_uuid(),
      jsonb_set(current_setting('test.payload')::jsonb, '{items,0,quantity}', '0'));
    raise exception 'Zero quantity accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

set local role authenticated;
do $$
begin
  if exists (select 1 from public.order_requests) then raise exception 'Unauthorised user read orders'; end if;
  begin
    insert into public.admin_users(user_id) values (gen_random_uuid());
    raise exception 'Self promotion allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.order_requests) then raise exception 'MFA bypass'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
do $$
declare v_id uuid := current_setting('test.order_id')::uuid;
begin
  if not exists (select 1 from public.order_requests where id = v_id) then raise exception 'Admin blocked'; end if;
  if (select count(*) from public.order_items where order_id = v_id) <> 2 then raise exception 'Wrong line count'; end if;
  begin
    perform public.transition_order(v_id, 'pendiente', 'confirmado');
    raise exception 'Delivery confirmed without coverage and fee';
  exception when invalid_parameter_value then null;
  end;
  perform public.confirm_delivery(v_id, 3500);
  perform public.transition_order(v_id, 'pendiente', 'confirmado');
  begin
    perform public.transition_order(v_id, 'confirmado', 'entregado');
    raise exception 'Skipped states';
  exception when invalid_parameter_value then null;
  end;
  perform public.transition_order(v_id, 'confirmado', 'preparando');
  perform public.transition_order(v_id, 'preparando', 'listo');
  perform public.transition_order(v_id, 'listo', 'en reparto');
  perform public.transition_order(v_id, 'en reparto', 'entregado');
  if (select confirmed_fee_cents from public.order_delivery where order_id = v_id) <> 3500 then raise exception 'Fee lost'; end if;
  begin
    perform public.transition_order(v_id, 'entregado', 'cancelado', 'Terminal state test');
    raise exception 'Terminal state changed';
  exception when invalid_parameter_value then null;
  end;
  update public.products set unit_price_cents = 9900 where id = 'bola-fuego-xl';
  if exists (select 1 from public.order_items where order_id = v_id and unit_price_cents <> 9500) then
    raise exception 'Historical price changed with catalog';
  end if;
  if (select subtotal_cents from public.order_requests where id = v_id) <> 38000 then raise exception 'Historical subtotal changed'; end if;
  begin
    update public.order_items set quantity = 7 where order_id = v_id;
    raise exception 'Direct snapshot write allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set constraints all immediate;
rollback;
