-- SeedTrace PF - Build 002
-- Core experimental design: experiments, blocks, plots and plot assessments.

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(180) not null,
  crop_id uuid not null references public.crops(id),
  season varchar(30),
  location_name varchar(180),
  objective text,
  design_type varchar(60) not null default 'RCBD',
  replications integer not null default 1 check (replications > 0),
  sowing_date date,
  harvest_date date,
  status varchar(30) not null default 'planned'
    check (status in ('draft', 'planned', 'active', 'completed', 'cancelled')),
  responsible_name varchar(160),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.experiment_blocks (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  block_number integer not null check (block_number > 0),
  name varchar(120),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (experiment_id, block_number)
);

create table if not exists public.experiment_plots (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  block_id uuid references public.experiment_blocks(id) on delete set null,
  plot_number integer not null check (plot_number > 0),
  plot_code varchar(100) not null,
  seed_lot_id uuid references public.seed_lots(id),
  treatment_label varchar(180) not null,
  rows_count integer check (rows_count is null or rows_count > 0),
  plot_length_m numeric check (plot_length_m is null or plot_length_m > 0),
  row_spacing_m numeric check (row_spacing_m is null or row_spacing_m > 0),
  planned_seed_count integer check (planned_seed_count is null or planned_seed_count >= 0),
  status varchar(30) not null default 'planned'
    check (status in ('planned', 'sown', 'active', 'harvested', 'discarded')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (experiment_id, plot_number),
  unique (experiment_id, plot_code)
);

create table if not exists public.plot_assessments (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.experiment_plots(id) on delete cascade,
  descriptor_id uuid not null references public.descriptor_definitions(id),
  assessed_at timestamptz not null default now(),
  phenological_stage varchar(80),
  value_text text,
  value_number numeric,
  min_value numeric,
  max_value numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_experiments_crop on public.experiments(crop_id);
create index if not exists idx_experiments_status on public.experiments(status) where is_active = true;
create index if not exists idx_experiment_blocks_experiment on public.experiment_blocks(experiment_id);
create index if not exists idx_experiment_plots_experiment on public.experiment_plots(experiment_id);
create index if not exists idx_experiment_plots_block on public.experiment_plots(block_id);
create index if not exists idx_experiment_plots_seed_lot on public.experiment_plots(seed_lot_id);
create index if not exists idx_plot_assessments_plot on public.plot_assessments(plot_id);
create index if not exists idx_plot_assessments_descriptor on public.plot_assessments(descriptor_id);

alter table public.experiments enable row level security;
alter table public.experiment_blocks enable row level security;
alter table public.experiment_plots enable row level security;
alter table public.plot_assessments enable row level security;

revoke all on table public.experiments from anon, authenticated;
revoke all on table public.experiment_blocks from anon, authenticated;
revoke all on table public.experiment_plots from anon, authenticated;
revoke all on table public.plot_assessments from anon, authenticated;

grant select, insert, update, delete on table public.experiments to service_role;
grant select, insert, update, delete on table public.experiment_blocks to service_role;
grant select, insert, update, delete on table public.experiment_plots to service_role;
grant select, insert, update, delete on table public.plot_assessments to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'experiments',
    'experiment_blocks',
    'experiment_plots',
    'plot_assessments'
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
