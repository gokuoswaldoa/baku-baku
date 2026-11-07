begin;

-- Initial snapshot of src/order-config.ts. Future catalog updates use the admin panel.
insert into public.products (id, name, description, unit_price_cents, price_is_provisional, available)
values ('bola-fuego-xl', 'Bola de Fuego XL', 'Relleno estilo Tampico, partida en 4 piezas.', 9500, true, true);

insert into public.options (id, kind, name, available) values
  ('anguila', 'finish', 'Con salsa de anguila', true),
  ('sin-salsa', 'finish', 'Sin salsa encima', true),
  ('ajonjoli', 'topping', 'Ajonjolí blanco tostado', true),
  ('cebollin', 'topping', 'Cebollín', true),
  ('aguacate', 'topping', 'Aguacate', true),
  ('cebolla-crujiente', 'topping', 'Cebolla crujiente', true),
  ('jalapeno', 'topping', 'Jalapeño en rodajas', true),
  ('panko-extra', 'topping', 'Panko crujiente extra', true),
  ('soya-jalapeno', 'dip', 'Soya con jalapeño y cebollín', true),
  ('mayo-chipotle', 'dip', 'Mayo chipotle', true),
  ('soya-clasica', 'dip', 'Soya clásica', true),
  ('valentina', 'dip', 'Valentina', true),
  ('sin-dip', 'dip', 'Sin dip', true);

insert into public.product_options (product_id, option_id)
select 'bola-fuego-xl', id from public.options;

commit;
