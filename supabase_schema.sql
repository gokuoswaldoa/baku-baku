-- ==============================================================================
-- BAKU-BAKU SUSHI & FIRE - Esquema de Base de Datos para Encuestas y Cupones
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase (supabase.com)
-- ==============================================================================

-- 1. Crear tabla de leads / respuestas
create table if not exists public.leads (
    id text primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    formatted_date text,
    whatsapp text not null,
    coupon_code text,
    status text default 'pendiente' not null,
    benefit text default '$40 MXN de descuento en compra > $180 MXN',
    dinner_preference text,
    other_dinner text,
    budget text,
    try_sushi text,
    ingredients text[] default '{}',
    constraint unique_whatsapp unique (whatsapp)
);

-- 2. Habilitar Row Level Security (RLS)
alter table public.leads enable row level security;

-- 3. Políticas de seguridad para permitir a la encuesta web (clave pública/anon):
-- a) Permitir insertar nuevas respuestas desde la encuesta
create policy "Permitir inserción de respuestas a usuarios anónimos"
on public.leads
for insert
with check (true);

-- b) Permitir consultar leads (para el panel de administración y verificación de duplicados)
create policy "Permitir lectura de leads"
on public.leads
for select
using (true);

-- c) Permitir actualizar estado (ej. cambiar a 'contactado' o 'canjeado' desde el panel admin)
create policy "Permitir actualización de estado de leads"
on public.leads
for update
using (true)
with check (true);

-- d) Permitir eliminar registros desde el panel admin si es necesario
create policy "Permitir eliminación de leads"
on public.leads
for delete
using (true);

-- 4. Índice para búsquedas rápidas por WhatsApp
create index if not exists idx_leads_whatsapp on public.leads (whatsapp);
create index if not exists idx_leads_created_at on public.leads (created_at desc);
