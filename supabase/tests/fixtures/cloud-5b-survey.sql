-- Cloud 5B only. Copy as 202611060000_fictional_survey.sql into the isolated
-- workdir for izogjwztgkrvlpjyxjhq after verifying the target. Never stage this
-- in the main migrations directory. Migration 005 closes these test policies.
begin;

-- Fail if a survey already exists. This fixture never replaces records.
create table public.leads (
  id integer primary key,
  status text not null,
  whatsapp text not null,
  coupon_code text not null
);

insert into public.leads (id, status, whatsapp, coupon_code)
select n, 'fixture', lpad(n::text, 10, '0'), 'FAKE-5B-' || n
from generate_series(1, 16) as sample(n);

alter table public.leads enable row level security;
-- Keep the rows private before 005, including on Cloud with default grants.
-- Migration 005 checks these policy definitions and installs its own ACLs.
revoke all on public.leads from public, anon, authenticated;
create policy "Permitir lectura de leads" on public.leads for select using (true);
create policy "Permitir inserción de respuestas a usuarios anónimos"
  on public.leads for insert with check (true);
create policy "Permitir actualización de estado de leads"
  on public.leads for update using (true) with check (true);

commit;
