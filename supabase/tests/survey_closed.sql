-- Run only against a disposable restored local database after all five migrations.
-- Only counts, privileges and integrity hashes are used. Never prints record values.
begin;

-- SET via DO avoids returning even the hash to the terminal.
do $$
begin
  perform set_config('survey_test.row_hash',
    (select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)::text, 'UTF8')), 'hex') from public.leads l), true);
  if (select count(*) from public.leads) <> 16 then raise exception 'Record count changed'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.leads'::regclass) then raise exception 'RLS disabled'; end if;
  if exists (
    select 1 from pg_policy where polrelid = 'public.leads'::regclass
      and (0::oid = any(polroles) or 'anon'::regrole::oid = any(polroles))
  ) then raise exception 'Public survey policy remains'; end if;
  if has_table_privilege('anon', 'public.leads', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or has_any_column_privilege('anon', 'public.leads', 'SELECT,INSERT,UPDATE,REFERENCES') then
    raise exception 'Anonymous privileges remain';
  end if;
end;
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.leads limit 1;
    raise exception 'Anonymous SELECT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.leads default values;
    raise exception 'Anonymous INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.leads set status = status where false;
    raise exception 'Anonymous UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.leads where false;
    raise exception 'Anonymous DELETE allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Minimal Auth fixture in the disposable database only. No emails or passwords.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000016');
insert into public.admin_users(user_id) values ('00000000-0000-4000-8000-000000000016');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000015","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
do $$
declare v_affected bigint;
begin
  if exists(select 1 from public.leads) then raise exception 'Unauthorized authenticated user can read survey'; end if;
  if has_table_privilege('authenticated', 'public.leads', 'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'Unnecessary authenticated table privilege';
  end if;
  update public.leads set status = status;
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'Unauthorized authenticated UPDATE allowed'; end if;
  begin
    insert into public.leads default values;
    raise exception 'Unauthorized authenticated INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.leads where false;
    raise exception 'Unauthorized authenticated DELETE allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000016","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
do $$
begin
  if exists(select 1 from public.leads) then raise exception 'Administrator read without MFA'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000016","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.leads) <> 16 then raise exception 'Authorized admin read blocked'; end if;
  if not has_column_privilege('authenticated', 'public.leads', 'status', 'UPDATE') then raise exception 'Admin status management not prepared'; end if;
  if has_column_privilege('authenticated', 'public.leads', 'coupon_code', 'UPDATE')
    or has_column_privilege('authenticated', 'public.leads', 'whatsapp', 'UPDATE') then
    raise exception 'Unnecessary client write privilege';
  end if;
end;
$$;
reset role;

do $$
declare v_after text;
begin
  select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)::text, 'UTF8')), 'hex')
  into v_after from public.leads l;
  if v_after <> current_setting('survey_test.row_hash') then raise exception 'Survey data changed'; end if;
end;
$$;
rollback;
