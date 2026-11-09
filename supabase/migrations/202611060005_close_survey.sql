begin;
-- Apply only after private backup review and successful local restore/security tests.
-- Depends on 202611060001..004. Does not update or delete any survey record.
set local lock_timeout = '5s';
lock table public.leads in share row exclusive mode;

do $$
declare
  v_count bigint;
  v_before text;
  v_after text;
  v_column text;
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception 'Administrative authorization dependency is missing';
  end if;
  select count(*), encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)::text, 'UTF8')), 'hex')
  into v_count, v_before from public.leads l;
  if v_count <> 16 then
    raise exception 'Survey record count differs from the reviewed backup; stop and review';
  end if;

  -- Abort rather than remove unknown or newly changed policies.
  if (select count(*) from pg_policy where polrelid = 'public.leads'::regclass) <> 3
    or exists (
      select 1 from pg_policy where polrelid = 'public.leads'::regclass and not (
        polroles = array[0::oid] and polpermissive and (
          (polname = 'Permitir lectura de leads' and polcmd = 'r'
            and pg_get_expr(polqual, polrelid) = 'true' and polwithcheck is null)
          or (polname = 'Permitir inserción de respuestas a usuarios anónimos' and polcmd = 'a'
            and polqual is null and pg_get_expr(polwithcheck, polrelid) = 'true')
          or (polname = 'Permitir actualización de estado de leads' and polcmd = 'w'
            and pg_get_expr(polqual, polrelid) = 'true' and pg_get_expr(polwithcheck, polrelid) = 'true')
        )
      )
    ) then
    raise exception 'Survey policies differ from the reviewed configuration; stop and review';
  end if;

  drop policy "Permitir lectura de leads" on public.leads;
  drop policy "Permitir inserción de respuestas a usuarios anónimos" on public.leads;
  drop policy "Permitir actualización de estado de leads" on public.leads;

  -- RLS does not cover TRUNCATE. Revoke privileges as well as unsafe policies.
  revoke all on public.leads from public, anon, authenticated;
  -- Independently granted column privileges survive table-level REVOKE.
  for v_column in
    select attname from pg_attribute
    where attrelid = 'public.leads'::regclass and attnum > 0 and not attisdropped
  loop
    execute format('revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on public.leads from public, anon, authenticated', v_column);
  end loop;
  alter table public.leads enable row level security;

  grant select on public.leads to authenticated;
  grant update (status) on public.leads to authenticated;
  create policy leads_admin_read on public.leads
    for select to authenticated using ((select private.is_admin()));
  create policy leads_admin_update_status on public.leads
    for update to authenticated
    using ((select private.is_admin())) with check ((select private.is_admin()));

  -- No new public submission policy. Existing owner/service access is preserved.
  select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)::text, 'UTF8')), 'hex')
  into v_after from public.leads l;
  if v_before <> v_after or (select count(*) from public.leads) <> v_count then
    raise exception 'Survey integrity check failed; transaction aborted';
  end if;
end;
$$;

commit;
