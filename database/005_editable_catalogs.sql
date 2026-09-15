-- SeedTrace PF - Build 001 completion
-- Soft deactivation support for genetic materials and seed lots.

alter table public.genetic_materials
  add column if not exists is_active boolean not null default true;

alter table public.seed_lots
  add column if not exists is_active boolean not null default true;

create index if not exists idx_genetic_materials_active
  on public.genetic_materials(is_active);

create index if not exists idx_seed_lots_active
  on public.seed_lots(is_active);
