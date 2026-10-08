-- SeedTrace PF - Build 002 security hardening
-- Keep domain data backend-only through service_role and close direct RPC exposure.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crops',
    'cultivars',
    'descriptor_definitions',
    'cultivar_descriptor_values',
    'genetic_materials',
    'seed_lots'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
  end loop;
end;
$$;

-- Optimize policies that legitimately expose limited reads to signed-in users.
drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Admin and manager can read audit logs" on public.audit_logs;
create policy "Admin and manager can read audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = (select auth.uid())
      and p.is_active = true
      and p.role in ('admin', 'manager')
  )
);

-- Trigger-only functions must not be callable as public RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.seedtrace_audit_row_change() from public, anon, authenticated;
revoke execute on function public.seedtrace_validate_varietal_value() from public, anon, authenticated;
revoke execute on function public.seedtrace_validate_lot_genealogy() from public, anon, authenticated;
revoke execute on function public.prevent_audit_log_mutation() from public, anon, authenticated;

alter function public.prevent_audit_log_mutation() set search_path = public;

-- Cover the most frequently traversed domain foreign keys.
create index if not exists idx_cultivars_crop_id
  on public.cultivars(crop_id);
create index if not exists idx_cultivar_descriptor_values_descriptor_id
  on public.cultivar_descriptor_values(descriptor_id);
create index if not exists idx_genetic_materials_cultivar_id
  on public.genetic_materials(cultivar_id);
create index if not exists idx_seed_lots_genetic_material_id
  on public.seed_lots(genetic_material_id);
create index if not exists idx_seed_lots_parent_lot_id
  on public.seed_lots(parent_lot_id);
