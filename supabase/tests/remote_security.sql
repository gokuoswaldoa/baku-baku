-- Run with the trusted owner against the linked database. Returns no row values.
-- Write access is checked through effective grants and RLS expressions. No DML is executed.
begin read only;

do $audit$
declare
  private_tables text[] := array['leads','order_requests','order_items','order_contacts','order_delivery','order_events','admin_users'];
  catalog_tables text[] := array['products','options','product_options'];
  table_name text;
  table_id regclass;
  expected_policies integer;
  expected_columns text[];
  public_policy text;
  client_role text;
  probe_id uuid := gen_random_uuid();
  visible boolean;
  rpc_call text;
begin
  foreach table_name in array private_tables || catalog_tables loop
    table_id := to_regclass(format('public.%I', table_name));
    if table_id is null or not (select relrowsecurity from pg_class where oid=table_id) then
      raise exception 'audit_rls_missing';
    end if;
    if has_table_privilege('anon', table_id, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or has_any_column_privilege('anon', table_id, 'INSERT,UPDATE,REFERENCES') then
      raise exception 'audit_anon_write_grant';
    end if;
    if table_name = any(private_tables) then
      expected_policies := case when table_name = 'leads' then 2 else 1 end;
      if (select count(*) from pg_policy where polrelid=table_id) <> expected_policies
         or exists (
           select 1 from pg_policy where polrelid=table_id and (
             polroles <> array['authenticated'::regrole::oid]
             or polcmd not in ('r','w')
             or (polcmd='w' and (table_name <> 'leads' or polwithcheck is null
                 or pg_get_expr(polwithcheck,polrelid) is distinct from pg_get_expr(polqual,polrelid)))
             or coalesce(regexp_replace(lower(pg_get_expr(polqual,polrelid)), '[[:space:]()]','','g'),'')
                not in ('selectprivate.is_adminasis_admin','selectprivate.is_admin')
           )
         ) then raise exception 'audit_private_policy'; end if;
      if has_table_privilege('anon',table_id,'SELECT') or has_any_column_privilege('anon',table_id,'SELECT')
         or has_table_privilege('authenticated',table_id,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         or has_any_column_privilege('authenticated',table_id,'INSERT,REFERENCES')
         or exists (
           select 1 from pg_attribute where attrelid=table_id and attnum>0 and not attisdropped
           and (table_name <> 'leads' or attname <> 'status')
           and has_column_privilege('authenticated',table_id,attnum,'UPDATE')
         ) then raise exception 'audit_private_grant'; end if;
    else
      expected_columns := case table_name
        when 'products' then array['available','description','id','name','price_is_provisional','unit_price_cents']
        when 'options' then array['available','id','kind','name','surcharge_cents']
        else array['available','option_id','product_id']
      end;
      if (select array_agg(attname::text order by attname) from pg_attribute
          where attrelid=table_id and attnum>0 and not attisdropped) is distinct from expected_columns then
        raise exception 'audit_catalog_columns';
      end if;
      public_policy := case table_name
        when 'products' then 'available_products'
        when 'options' then 'available_options'
        else 'available_product_options'
      end;
      if (select count(*) from pg_policy where polrelid=table_id) <> 4
         or not exists (
           select 1 from pg_policy where polrelid=table_id and polname=public_policy and polcmd='r'
             and polroles @> array['anon'::regrole::oid,'authenticated'::regrole::oid]
             and (case when table_name='product_options'
                  then pg_get_expr(polqual,polrelid) like '%products%' and pg_get_expr(polqual,polrelid) like '%options%'
                  else pg_get_expr(polqual,polrelid)='available' end)
         )
         or exists (
           select 1 from pg_policy where polrelid=table_id and polname<>public_policy and (
             polroles <> array['authenticated'::regrole::oid] or polcmd not in ('r','a','w')
             or (polcmd in ('r','w') and coalesce(regexp_replace(lower(pg_get_expr(polqual,polrelid)), '[[:space:]()]','','g'),'')
                 not in ('selectprivate.is_adminasis_admin','selectprivate.is_admin'))
             or (polcmd in ('a','w') and coalesce(regexp_replace(lower(pg_get_expr(polwithcheck,polrelid)), '[[:space:]()]','','g'),'')
                 not in ('selectprivate.is_adminasis_admin','selectprivate.is_admin'))
           )
         ) then raise exception 'audit_catalog_policy'; end if;
    end if;
  end loop;

  -- Real PostgreSQL roles, with synthetic request claims rather than a signed Auth JWT.
  foreach client_role in array array['anon','authenticated'] loop
    perform set_config('request.jwt.claims',jsonb_build_object('sub',probe_id,'role',client_role,'aal','aal2')::text,true);
    perform set_config('request.jwt.claim.sub',probe_id::text,true);
    execute format('set local role %I',client_role);
    if current_user <> client_role or private.is_admin() then raise exception 'audit_role_setup'; end if;

    foreach table_name in array private_tables loop
      table_id := format('public.%I',table_name)::regclass;
      if not row_security_active(table_id) then raise exception 'audit_role_bypasses_rls'; end if;
      if client_role='anon' then
        begin
          execute format('select exists(select 1 from public.%I)',table_name) into visible;
          raise exception 'audit_anon_read_allowed';
        exception when insufficient_privilege then null;
        end;
      else
        execute format('select exists(select 1 from public.%I)',table_name) into visible;
        if visible then raise exception 'audit_unauthorized_rows_visible'; end if;
      end if;
    end loop;

    foreach rpc_call in array array[
      'select public.submit_order_request(null::uuid,null::jsonb)',
      format('select public.transition_order(%L::uuid,null,null,null)',probe_id),
      format('select public.confirm_delivery(%L::uuid,null)',probe_id)
    ] loop
      begin
        execute rpc_call;
        raise exception 'audit_rpc_allowed';
      exception when insufficient_privilege then null;
      end;
    end loop;

    if not exists (select 1 from public.products)
       or not exists (select 1 from public.options)
       or not exists (select 1 from public.product_options)
       or exists (select 1 from public.products where not available)
       or exists (select 1 from public.options where not available)
       or exists (
         select 1 from public.product_options po
         left join public.products p on p.id=po.product_id
         left join public.options o on o.id=po.option_id
         where not po.available or p.id is null or o.id is null
       ) then raise exception 'audit_catalog_visibility'; end if;
    execute 'reset role';
  end loop;
end;
$audit$;

rollback;
