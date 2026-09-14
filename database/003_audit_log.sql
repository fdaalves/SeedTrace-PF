-- SeedTrace PF - Build 001 hardening
-- Immutable database audit trail with actor attribution

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_fields text[],
  before_data jsonb,
  after_data jsonb
);

create index if not exists idx_audit_logs_occurred_at on public.audit_logs(occurred_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);

alter table public.audit_logs enable row level security;

-- Direct authenticated reads are limited to administrators and managers.
drop policy if exists "Admin and manager can read audit logs" on public.audit_logs;
create policy "Admin and manager can read audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'manager')
  )
);

-- Actor columns let database triggers attribute changes made through the service-role backend.
alter table public.crops add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.crops add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.cultivars add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.cultivars add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.descriptor_definitions add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.descriptor_definitions add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.cultivar_descriptor_values add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.cultivar_descriptor_values add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.genetic_materials add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.genetic_materials add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.seed_lots add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.seed_lots add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.user_profiles add column if not exists updated_by uuid references auth.users(id) on delete set null;

create or replace function public.seedtrace_audit_row_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  old_json jsonb;
  new_json jsonb;
  actor_id uuid;
  actor_email_snapshot text;
  changed text[];
  record_id uuid;
begin
  old_json := case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end;
  new_json := case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end;

  actor_id := coalesce(
    nullif(new_json ->> 'updated_by', '')::uuid,
    nullif(new_json ->> 'created_by', '')::uuid,
    nullif(old_json ->> 'updated_by', '')::uuid,
    nullif(old_json ->> 'created_by', '')::uuid
  );

  select p.email into actor_email_snapshot
  from public.user_profiles p
  where p.id = actor_id;

  record_id := coalesce(
    nullif(new_json ->> 'id', '')::uuid,
    nullif(old_json ->> 'id', '')::uuid
  );

  if TG_OP = 'UPDATE' then
    select array_agg(key order by key)
      into changed
    from (
      select key
      from jsonb_object_keys(coalesce(old_json, '{}'::jsonb) || coalesce(new_json, '{}'::jsonb)) as key
      where old_json -> key is distinct from new_json -> key
        and key not in ('updated_at', 'updated_by')
    ) q;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    entity_type,
    entity_id,
    action,
    changed_fields,
    before_data,
    after_data
  ) values (
    actor_id,
    actor_email_snapshot,
    TG_TABLE_NAME,
    record_id,
    lower(TG_OP),
    changed,
    old_json,
    new_json
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable
before update or delete on public.audit_logs
for each row execute procedure public.prevent_audit_log_mutation();

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
    'seed_lots',
    'user_profiles'
  ]
  loop
    execute format('drop trigger if exists seedtrace_audit_trigger on public.%I', table_name);
    execute format(
      'create trigger seedtrace_audit_trigger after insert or update or delete on public.%I for each row execute procedure public.seedtrace_audit_row_change()',
      table_name
    );
  end loop;
end;
$$;
