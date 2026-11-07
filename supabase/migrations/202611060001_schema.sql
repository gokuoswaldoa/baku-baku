begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (length(name) between 1 and 120),
  description text not null check (length(description) <= 1000),
  unit_price_cents integer not null check (unit_price_cents between 0 and 1000000),
  price_is_provisional boolean not null default true,
  available boolean not null default false
);

create table public.options (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  kind text not null check (kind in ('finish', 'topping', 'dip')),
  name text not null check (length(name) between 1 and 120),
  surcharge_cents integer not null default 0 check (surcharge_cents between 0 and 1000000),
  available boolean not null default false
);

create table public.product_options (
  product_id text not null references public.products(id) on delete restrict,
  option_id text not null references public.options(id) on delete restrict,
  available boolean not null default true,
  primary key (product_id, option_id)
);
create index product_options_option_idx on public.product_options(option_id);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmado', 'preparando', 'listo', 'en reparto', 'entregado', 'cancelado')),
  modality text not null check (modality in ('recogida', 'entrega')),
  subtotal_cents bigint not null check (subtotal_cents between 0 and 500000000000),
  currency text not null default 'MXN' check (currency = 'MXN'),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status in ('pendiente', 'cancelado') or confirmed_at is not null),
  check (modality = 'entrega' or status <> 'en reparto')
);
create index order_requests_status_created_idx on public.order_requests(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.order_requests(id) on delete restrict,
  line_number smallint not null check (line_number between 1 and 50),
  product_id text not null references public.products(id) on delete restrict,
  quantity smallint not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents between 0 and 5000000),
  line_total_cents bigint generated always as (quantity::bigint * unit_price_cents) stored,
  personalization_snapshot jsonb not null check (
    jsonb_typeof(personalization_snapshot) = 'object'
    and personalization_snapshot ?& array['product', 'finish', 'toppings', 'dip', 'price_is_provisional']
    and jsonb_typeof(personalization_snapshot->'toppings') = 'array'
    and jsonb_array_length(personalization_snapshot->'toppings') <= 2
  ),
  unique (order_id, line_number)
);

create table public.order_contacts (
  order_id uuid primary key references public.order_requests(id) on delete restrict,
  customer_name text check (length(customer_name) between 1 and 120),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,25}$'),
  written_address text check (length(written_address) between 1 and 500),
  address_references text check (length(address_references) between 1 and 500),
  pin_latitude double precision check (pin_latitude between -90 and 90),
  pin_longitude double precision check (pin_longitude between -180 and 180),
  check ((pin_latitude is null) = (pin_longitude is null))
);

create table public.order_delivery (
  order_id uuid primary key references public.order_requests(id) on delete restrict,
  neighborhood text not null check (length(btrim(neighborhood)) between 1 and 120),
  reference_near_cents integer not null default 3500 check (reference_near_cents >= 0),
  reference_far_cents integer not null default 5500 check (reference_far_cents >= 0),
  coverage_confirmed boolean not null default false,
  confirmed_fee_cents integer check (confirmed_fee_cents between 0 and 1000000),
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  check (
    (not coverage_confirmed and confirmed_fee_cents is null and confirmed_by is null and confirmed_at is null)
    or (coverage_confirmed and confirmed_fee_cents is not null and confirmed_by is not null and confirmed_at is not null)
  )
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.order_requests(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('received', 'status_changed', 'delivery_updated')),
  from_status text,
  to_status text,
  reason text check (length(reason) <= 500),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index order_events_order_created_idx on public.order_events(order_id, created_at);

-- Only the trusted project owner can add or revoke administrators.
-- MFA enrollment uses Auth itself, before access to application tables is granted.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal', '') = 'aal2'
    and exists (select 1 from public.admin_users where user_id = auth.uid() and active);
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['products','options','product_options','order_requests',
    'order_items','order_contacts','order_delivery','order_events','admin_users']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))', table_name);
  end loop;
end;
$$;

grant select on public.products, public.options, public.product_options to anon;
create policy available_products on public.products for select to anon, authenticated using (available);
create policy available_options on public.options for select to anon, authenticated using (available);
create policy available_product_options on public.product_options for select to anon, authenticated using (
  available
  and exists (select 1 from public.products p where p.id = product_id and p.available)
  and exists (select 1 from public.options o where o.id = option_id and o.available)
);

grant insert on public.products, public.options, public.product_options to authenticated;
grant update (name, description, unit_price_cents, price_is_provisional, available) on public.products to authenticated;
grant update (name, surcharge_cents, available) on public.options to authenticated;
grant update (available) on public.product_options to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['products','options','product_options']
  loop
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))', table_name);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', table_name);
  end loop;
end;
$$;

commit;
