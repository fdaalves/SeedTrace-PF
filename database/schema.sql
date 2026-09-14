-- SeedTrace PF - Build 001
-- PostgreSQL

create extension if not exists pgcrypto;

create table crops (
  id uuid primary key default gen_random_uuid(),
  code varchar(30) unique not null,
  common_name varchar(120) not null,
  scientific_name varchar(180),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cultivars (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references crops(id),
  code varchar(50) unique not null,
  name varchar(160) not null,
  breeder varchar(160),
  cultivar_type varchar(60),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table descriptor_definitions (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references crops(id),
  code varchar(80) not null,
  name varchar(160) not null,
  data_type varchar(30) not null,
  unit varchar(40),
  phenological_stage varchar(80),
  criticality varchar(20),
  allowed_values jsonb,
  is_active boolean not null default true,
  unique (crop_id, code)
);

create table cultivar_descriptor_values (
  id uuid primary key default gen_random_uuid(),
  cultivar_id uuid not null references cultivars(id) on delete cascade,
  descriptor_id uuid not null references descriptor_definitions(id),
  value_text text,
  value_number numeric,
  min_value numeric,
  max_value numeric,
  notes text,
  unique (cultivar_id, descriptor_id)
);

create table genetic_materials (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) unique not null,
  cultivar_id uuid references cultivars(id),
  material_category varchar(80),
  origin varchar(255),
  received_at date,
  responsible_name varchar(160),
  notes text,
  created_at timestamptz not null default now()
);

create table seed_lots (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) unique not null,
  genetic_material_id uuid not null references genetic_materials(id),
  parent_lot_id uuid references seed_lots(id),
  season varchar(30),
  quantity numeric,
  unit varchar(20),
  status varchar(30) not null default 'active',
  created_at timestamptz not null default now()
);
