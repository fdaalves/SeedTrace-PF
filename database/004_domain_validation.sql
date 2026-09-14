-- SeedTrace PF - Build 001 hardening
-- Database-side domain validation and genealogy safeguards.
-- Constraints are added NOT VALID so legacy/demo rows do not block migration;
-- every new or updated row is still checked.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'descriptor_data_type_valid') then
    alter table public.descriptor_definitions
      add constraint descriptor_data_type_valid
      check (data_type in ('text', 'integer', 'decimal', 'boolean', 'option', 'range')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'descriptor_criticality_valid') then
    alter table public.descriptor_definitions
      add constraint descriptor_criticality_valid
      check (criticality is null or criticality in ('low', 'medium', 'high', 'critical')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'seed_lot_quantity_nonnegative') then
    alter table public.seed_lots
      add constraint seed_lot_quantity_nonnegative
      check (quantity is null or quantity >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'varietal_range_order_valid') then
    alter table public.cultivar_descriptor_values
      add constraint varietal_range_order_valid
      check (min_value is null or max_value is null or min_value <= max_value) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'crop_code_not_blank') then
    alter table public.crops add constraint crop_code_not_blank check (btrim(code) <> '') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cultivar_code_not_blank') then
    alter table public.cultivars add constraint cultivar_code_not_blank check (btrim(code) <> '') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'material_code_not_blank') then
    alter table public.genetic_materials add constraint material_code_not_blank check (btrim(code) <> '') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lot_code_not_blank') then
    alter table public.seed_lots add constraint lot_code_not_blank check (btrim(code) <> '') not valid;
  end if;
end;
$$;

create or replace function public.seedtrace_validate_varietal_value()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cultivar_crop uuid;
  descriptor_crop uuid;
  descriptor_type text;
  descriptor_options jsonb;
begin
  select crop_id into cultivar_crop from public.cultivars where id = new.cultivar_id and is_active = true;
  if cultivar_crop is null then raise exception 'cultivar_id must reference an active cultivar'; end if;

  select crop_id, data_type, allowed_values
    into descriptor_crop, descriptor_type, descriptor_options
  from public.descriptor_definitions
  where id = new.descriptor_id and is_active = true;

  if descriptor_crop is null then raise exception 'descriptor_id must reference an active descriptor'; end if;
  if cultivar_crop <> descriptor_crop then raise exception 'Cultivar and descriptor must belong to the same crop'; end if;

  if descriptor_type = 'text' then
    if nullif(btrim(new.value_text), '') is null then raise exception 'text descriptor requires value_text'; end if;
  elsif descriptor_type = 'option' then
    if nullif(btrim(new.value_text), '') is null then raise exception 'option descriptor requires value_text'; end if;
    if not exists (select 1 from jsonb_array_elements_text(coalesce(descriptor_options, '[]'::jsonb)) v where v = new.value_text) then
      raise exception 'value_text is not allowed for this option descriptor';
    end if;
  elsif descriptor_type in ('integer', 'decimal') then
    if new.value_number is null then raise exception 'numeric descriptor requires value_number'; end if;
    if descriptor_type = 'integer' and trunc(new.value_number) <> new.value_number then raise exception 'integer descriptor requires an integer value'; end if;
  elsif descriptor_type = 'range' then
    if new.min_value is null or new.max_value is null then raise exception 'range descriptor requires min_value and max_value'; end if;
    if new.min_value > new.max_value then raise exception 'min_value cannot be greater than max_value'; end if;
  elsif descriptor_type = 'boolean' then
    if new.value_text not in ('true', 'false') then raise exception 'boolean descriptor requires value_text true or false'; end if;
  end if;

  return new;
end;
$$;

drop trigger if exists seedtrace_validate_varietal_value_trigger on public.cultivar_descriptor_values;
create trigger seedtrace_validate_varietal_value_trigger
before insert or update on public.cultivar_descriptor_values
for each row execute procedure public.seedtrace_validate_varietal_value();

create or replace function public.seedtrace_validate_lot_genealogy()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  child_cultivar uuid;
  parent_cultivar uuid;
  creates_cycle boolean;
begin
  if new.parent_lot_id is null then return new; end if;
  if new.parent_lot_id = new.id then raise exception 'A lot cannot be its own parent'; end if;

  if not exists (select 1 from public.seed_lots where id = new.parent_lot_id) then
    raise exception 'parent_lot_id must reference an existing lot';
  end if;

  select cultivar_id into child_cultivar from public.genetic_materials where id = new.genetic_material_id;
  select gm.cultivar_id into parent_cultivar
    from public.seed_lots p
    join public.genetic_materials gm on gm.id = p.genetic_material_id
    where p.id = new.parent_lot_id;

  if child_cultivar is not null and parent_cultivar is not null and child_cultivar <> parent_cultivar then
    raise exception 'Parent and child lots must reference genetic materials of the same cultivar';
  end if;

  with recursive lineage as (
    select id, parent_lot_id from public.seed_lots where id = new.parent_lot_id
    union
    select l.id, l.parent_lot_id
      from public.seed_lots l
      join lineage p on l.id = p.parent_lot_id
  )
  select exists(select 1 from lineage where id = new.id) into creates_cycle;

  if creates_cycle then raise exception 'Lot genealogy cannot contain cycles'; end if;
  return new;
end;
$$;

drop trigger if exists seedtrace_validate_lot_genealogy_trigger on public.seed_lots;
create trigger seedtrace_validate_lot_genealogy_trigger
before insert or update of parent_lot_id, genetic_material_id on public.seed_lots
for each row execute procedure public.seedtrace_validate_lot_genealogy();
