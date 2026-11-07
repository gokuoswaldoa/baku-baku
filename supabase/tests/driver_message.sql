-- Disposable PostgreSQL only. Synthetic order and auth fixture roll back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000061');
insert into public.admin_users(user_id) values ('00000000-0000-4000-8000-000000000061');
do $$
declare order_data jsonb;
begin
  order_data := public.submit_order_request(gen_random_uuid(), '{
    "modality":"entrega","neighborhood":"Colonia ficticia",
    "contact":{"name":"Contacto de prueba","phone":"0000000001","address":"Calle ficticia S/N","references":"Puerta de prueba","latitude":18.85,"longitude":-99.23},
    "items":[{"product_id":"bola-fuego-xl","quantity":1,"finish_id":"anguila","topping_ids":[],"dip_id":"sin-dip","expected_unit_price_cents":9500}]
  }');
  perform set_config('test.driver_order_id', order_data->>'id', true);
  update public.order_delivery set recipient_name='Destinatario de prueba', recipient_phone='0000000002'
    where order_id=(order_data->>'id')::uuid;
end;
$$;

set local role anon;
do $$ begin
  begin
    perform public.prepare_driver_message(current_setting('test.driver_order_id')::uuid);
    raise exception 'Anonymous caller accepted';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000062","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.prepare_driver_message(current_setting('test.driver_order_id')::uuid);
    raise exception 'Non-admin caller accepted';
  exception when insufficient_privilege then null;
  end;
end; $$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000061","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
do $$
declare
  order_id uuid := current_setting('test.driver_order_id')::uuid;
  message text;
begin
  begin
    perform public.prepare_driver_message(order_id);
    raise exception 'Pending delivery was shareable';
  exception when invalid_parameter_value then null;
  end;
  perform public.confirm_delivery(order_id, 3500);
  perform public.transition_order(order_id, 'pendiente', 'confirmado');
  message := public.prepare_driver_message(order_id);
  if position(order_id::text in message) = 0
     or position('Recibe: Destinatario de prueba' in message) = 0
     or position('Teléfono: 0000000002' in message) = 0
     or position('Dirección: Calle ficticia S/N' in message) = 0
     or position('Referencias: Puerta de prueba' in message) = 0
     or position('https://www.google.com/maps/dir/?api=1&destination=18.850000%2C-99.230000' in message) = 0 then
    raise exception 'Administrative delivery message incomplete';
  end if;
end;
$$;
reset role;
set constraints all immediate;
rollback;
