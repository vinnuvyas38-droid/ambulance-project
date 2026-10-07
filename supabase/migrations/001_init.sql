-- =========================================================
-- AI Emergency Green Corridor - Database Schema
-- Migration 001_init.sql
-- =========================================================

-- EXTENSIONS
create extension if not exists "pgcrypto";

-- ENUMS
create type user_role as enum ('admin','operator','driver','viewer');
create type emergency_level as enum ('critical','high','medium','low');
create type mission_status as enum ('dispatched','en_route','approaching_junction','crossing','arrived','cancelled');
create type junction_mode as enum ('normal','armed','emergency','clearing','fail_safe');
create type override_status as enum ('requested','approved','active','cleared','restored','rejected','failed_safe');
create type density_level as enum ('free','moderate','heavy','jammed');
create type crossing_state as enum ('not_detected','approaching','entering','inside','cleared');
create type detection_source as enum ('simulated','gemini');
create type signal_color as enum ('red','yellow','green');

-- HELPER: updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- PROFILES
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  role user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','New User'), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ROLE HELPERS (used by RLS)
create or replace function current_user_role() returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function is_staff() returns boolean as $$
  select coalesce(current_user_role() in ('admin','operator'), false);
$$ language sql stable security definer set search_path = public;

create or replace function is_admin() returns boolean as $$
  select coalesce(current_user_role() = 'admin', false);
$$ language sql stable security definer set search_path = public;

-- HOSPITALS
create table if not exists hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  capabilities text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- JUNCTIONS
create table if not exists junctions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  grid_x int not null default 0,
  grid_y int not null default 0,
  mode junction_mode not null default 'normal',
  normal_cycle jsonb not null default
    '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]',
  current_signals jsonb not null default '{"N":"red","E":"green","S":"red","W":"green"}',
  active_mission_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_junctions_updated on junctions;
create trigger trg_junctions_updated before update on junctions
  for each row execute function set_updated_at();

create table if not exists junction_cameras (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  approach text not null check (approach in ('N','E','S','W')),
  label text not null,
  is_online boolean not null default true,
  unique (junction_id, approach)
);

create table if not exists junction_movements (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  movement text not null,
  from_approach text not null check (from_approach in ('N','E','S','W')),
  to_approach text not null check (to_approach in ('N','E','S','W')),
  unique (junction_id, movement)
);

-- Pairs of movements that must NEVER be green together
create table if not exists junction_conflicts (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  movement_a text not null,
  movement_b text not null,
  check (movement_a < movement_b),
  unique (junction_id, movement_a, movement_b)
);

-- ROUTES
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  hospital_id uuid not null references hospitals(id),
  geometry jsonb not null default '[]',      -- ordered [{lat,lng}] polyline
  distance_m integer not null check (distance_m >= 0),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists route_junctions (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  seq int not null check (seq >= 1),
  junction_id uuid not null references junctions(id),
  entry_approach text not null check (entry_approach in ('N','E','S','W')),
  exit_approach text not null check (exit_approach in ('N','E','S','W')),
  distance_from_prev_m integer not null default 0,
  unique (route_id, seq)
);

-- AMBULANCES
create table if not exists ambulances (
  id uuid primary key default gen_random_uuid(),
  call_sign text not null unique,
  driver_id uuid references profiles(id) on delete set null,
  is_authorized boolean not null default true,
  lat double precision not null default 0,
  lng double precision not null default 0,
  speed_kmh numeric(5,1) not null default 0,
  heading_deg numeric(5,1) not null default 0,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ambulances_updated on ambulances;
create trigger trg_ambulances_updated before update on ambulances
  for each row execute function set_updated_at();

-- MISSIONS
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  ambulance_id uuid not null references ambulances(id),
  hospital_id uuid not null references hospitals(id),
  route_id uuid references routes(id),
  created_by uuid not null references profiles(id),
  patient_info jsonb not null,
  emergency_category text not null,
  severity_score int check (severity_score between 0 and 100),
  severity_level emergency_level,
  status mission_status not null default 'dispatched',
  current_route_seq int not null default 0,
  eta_seconds int,
  baseline_eta_seconds int,                    -- fixed-time estimate for "time saved"
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_missions_updated on missions;
create trigger trg_missions_updated before update on missions
  for each row execute function set_updated_at();

create index if not exists idx_missions_status on missions(status);
create index if not exists idx_missions_created_by on missions(created_by);

create table if not exists severity_assessments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  input jsonb not null,
  output jsonb not null,
  score int not null check (score between 0 and 100),
  level emergency_level not null,
  model text not null,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- SIGNAL OVERRIDES (green corridor activations)
create table if not exists signal_overrides (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  movement text not null,
  status override_status not null default 'requested',
  planned_green_seconds int,
  requested_at timestamptz not null default now(),
  activated_at timestamptz,
  cleared_at timestamptz,
  restored_at timestamptz,
  failure_reason text
);

create index if not exists idx_overrides_junction on signal_overrides(junction_id, status);
create index if not exists idx_overrides_mission on signal_overrides(mission_id);

-- PRIORITY DECISIONS (multi-ambulance engine)
create table if not exists priority_decisions (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  candidates jsonb not null,       -- inputs and per-factor scores
  ranking jsonb not null,          -- ordered [{mission_id, rank, final_score}]
  schedule jsonb not null,         -- [{phase_order, mission_ids, movements, green_seconds}]
  safety_validated boolean not null default false,
  ai_rationale text,
  ai_model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_priority_junction on priority_decisions(junction_id, created_at desc);

-- COMPUTER VISION DETECTIONS
create table if not exists cv_detections (
  id uuid primary key default gen_random_uuid(),
  junction_id uuid not null references junctions(id) on delete cascade,
  approach text check (approach in ('N','E','S','W')),
  mission_id uuid references missions(id) on delete set null,
  source detection_source not null,
  detections jsonb not null default '[]',      -- [{label, confidence, bbox:[x,y,w,h]}]
  vehicle_count int not null default 0,
  density_pct int not null default 0 check (density_pct between 0 and 100),
  density density_level not null default 'free',
  ambulance_detected boolean not null default false,
  ambulance_direction text check (ambulance_direction in ('N','E','S','W')),
  crossing crossing_state not null default 'not_detected',
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create index if not exists idx_cv_junction_time on cv_detections(junction_id, created_at desc);

-- SYSTEM CONFIG, ALERTS, AUDIT
create table if not exists system_config (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info','warning','critical')),
  message text not null,
  junction_id uuid references junctions(id) on delete set null,
  mission_id uuid references missions(id) on delete set null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  actor_type text not null check (actor_type in ('user','system','ai')),
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_created on audit_logs(created_at desc);

-- Prevent edits/deletes on audit log (append-only)
create or replace function audit_immutable() returns trigger as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$ language plpgsql;

drop trigger if exists trg_audit_no_update on audit_logs;
create trigger trg_audit_no_update before update or delete on audit_logs
  for each row execute function audit_immutable();

create table if not exists simulation_state (
  id int primary key default 1 check (id = 1),
  running boolean not null default false,
  speed_multiplier int not null default 1 check (speed_multiplier in (1,2,4)),
  scenario text,
  tick bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into simulation_state (id) values (1) on conflict do nothing;

-- Enable Supabase Realtime publication
alter publication supabase_realtime add table missions;
alter publication supabase_realtime add table ambulances;
alter publication supabase_realtime add table junctions;
alter publication supabase_realtime add table signal_overrides;
alter publication supabase_realtime add table priority_decisions;
alter publication supabase_realtime add table cv_detections;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table simulation_state;
