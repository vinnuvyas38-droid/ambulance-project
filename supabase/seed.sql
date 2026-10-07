-- =========================================================
-- AI Emergency Green Corridor - Seed Data
-- supabase/seed.sql
-- =========================================================

-- SYSTEM CONFIG
insert into system_config (key, value)
values (
  'priority_weights',
  '{
    "w_severity": 0.40,
    "w_eta": 0.20,
    "w_waiting": 0.15,
    "w_conflict_cost": 0.15,
    "w_route_requirement": 0.10,
    "arming_distance_m": 300,
    "yellow_seconds": 3,
    "all_red_seconds": 2,
    "min_green_seconds": 8,
    "max_green_seconds": 30,
    "clear_confirm_frames": 3,
    "cv_timeout_seconds": 5
  }'::jsonb
) on conflict (key) do update set value = excluded.value;

-- HOSPITALS
insert into hospitals (id, name, address, lat, lng, capabilities, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Apex Trauma & Cardiac Center', '100 Healthcare Ave, Medical District', 12.9600, 77.5920, array['trauma', 'cardiac', 'stroke', 'pediatric', 'icu'], true),
  ('22222222-2222-2222-2222-222222222222', 'St. Jude Memorial Hospital', '45 Innovation Way, Tech Corridor', 12.9730, 77.6180, array['cardiac', 'burns', 'neurology', 'icu'], true),
  ('33333333-3333-3333-3333-333333333333', 'City General Emergency Hospital', '78 Civic Boulevard, Downtown', 12.9590, 77.6150, array['general_emergency', 'obstetric', 'poisoning', 'icu'], true)
on conflict (id) do nothing;

-- JUNCTIONS (3x2 Grid)
insert into junctions (id, code, name, lat, lng, grid_x, grid_y, mode, normal_cycle, current_signals)
values
  ('a1111111-aaaa-1111-aaaa-111111111111', 'J1', 'Metro Central Junction', 12.9716, 77.5946, 0, 0, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb),

  ('a2222222-aaaa-2222-aaaa-222222222222', 'J2', 'Civic Square Junction', 12.9716, 77.6046, 1, 0, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb),

  ('a3333333-aaaa-3333-aaaa-333333333333', 'J3', 'Tech Park Avenue', 12.9716, 77.6146, 2, 0, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb),

  ('a4444444-aaaa-4444-aaaa-444444444444', 'J4', 'Hospital Boulevard', 12.9616, 77.5946, 0, 1, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb),

  ('a5555555-aaaa-5555-aaaa-555555555555', 'J5', 'Rivergate Cross', 12.9616, 77.6046, 1, 1, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb),

  ('a6666666-aaaa-6666-aaaa-666666666666', 'J6', 'Eastern Expressway Hub', 12.9616, 77.6146, 2, 1, 'normal',
   '[{"phase":"NS","movements":["N_S","S_N","N_E","S_W"],"green":25},{"phase":"EW","movements":["E_W","W_E","E_S","W_N"],"green":25}]'::jsonb,
   '{"N":"red","E":"green","S":"red","W":"green"}'::jsonb)
on conflict (id) do nothing;

-- JUNCTION CAMERAS (4 per junction: N, E, S, W)
do $$
declare
  j record;
  app text;
begin
  for j in select id, code from junctions loop
    foreach app in array array['N', 'E', 'S', 'W'] loop
      insert into junction_cameras (junction_id, approach, label, is_online)
      values (j.id, app, j.code || ' Camera ' || app, true)
      on conflict (junction_id, approach) do nothing;
    end loop;
  end loop;
end $$;

-- JUNCTION MOVEMENTS (12 movements per junction)
do $$
declare
  j record;
  mov record;
begin
  for j in select id from junctions loop
    for mov in
      select * from (values
        ('N_S', 'N', 'S'), ('S_N', 'S', 'N'), ('E_W', 'E', 'W'), ('W_E', 'W', 'E'),
        ('N_E', 'N', 'E'), ('N_W', 'N', 'W'), ('S_E', 'S', 'E'), ('S_W', 'S', 'W'),
        ('E_N', 'E', 'N'), ('E_S', 'E', 'S'), ('W_N', 'W', 'N'), ('W_S', 'W', 'S')
      ) as t(m, f, to_app)
    loop
      insert into junction_movements (junction_id, movement, from_approach, to_approach)
      values (j.id, mov.m, mov.f, mov.to_app)
      on conflict (junction_id, movement) do nothing;
    end loop;
  end loop;
end $$;

-- JUNCTION CONFLICTS
-- Pairs of movements that cannot be green simultaneously (movement_a < movement_b alphabetically)
do $$
declare
  j record;
  conf record;
begin
  for j in select id from junctions loop
    for conf in
      select * from (values
        -- E_W conflicts with NS movements and turns
        ('E_W', 'N_S'), ('E_W', 'S_N'), ('E_W', 'N_W'), ('E_W', 'S_E'), ('E_W', 'S_W'), ('E_W', 'N_E'),
        -- W_E conflicts with NS movements and turns
        ('N_S', 'W_E'), ('S_N', 'W_E'), ('N_E', 'W_E'), ('N_W', 'W_E'), ('S_E', 'W_E'), ('S_W', 'W_E'),
        -- E_S turn conflicts
        ('E_S', 'N_S'), ('E_S', 'S_N'), ('E_S', 'W_E'), ('E_S', 'N_W'), ('E_S', 'W_N'),
        -- W_N turn conflicts
        ('N_S', 'W_N'), ('S_N', 'W_N'), ('E_W', 'W_N'), ('S_W', 'W_N'), ('E_S', 'W_N'),
        -- S_W turn conflicts
        ('N_S', 'S_W'), ('E_W', 'S_W'), ('W_E', 'S_W'), ('E_N', 'S_W'),
        -- N_E turn conflicts
        ('E_W', 'N_E'), ('N_E', 'S_N'), ('N_E', 'W_E'), ('N_E', 'W_S'),
        -- E_N turn conflicts
        ('E_N', 'N_S'), ('E_N', 'S_N'), ('E_N', 'W_E'), ('E_N', 'W_S'),
        -- W_S turn conflicts
        ('N_S', 'W_S'), ('S_N', 'W_S'), ('E_W', 'W_S'),
        -- cross turns conflicting with each other
        ('E_S', 'W_S'), ('E_N', 'W_N')
      ) as t(m_a, m_b)
    loop
      -- Ensure m_a < m_b to satisfy database constraint
      if conf.m_a < conf.m_b then
        insert into junction_conflicts (junction_id, movement_a, movement_b)
        values (j.id, conf.m_a, conf.m_b)
        on conflict (junction_id, movement_a, movement_b) do nothing;
      else
        insert into junction_conflicts (junction_id, movement_a, movement_b)
        values (j.id, conf.m_b, conf.m_a)
        on conflict (junction_id, movement_a, movement_b) do nothing;
      end if;
    end loop;
  end loop;
end $$;

-- AMBULANCES (4 vehicles)
insert into ambulances (id, call_sign, is_authorized, lat, lng, speed_kmh, heading_deg, is_simulated)
values
  ('bbbbbbbb-1111-bbbb-1111-111111111111', 'MEDIC-101', true, 12.9716, 77.5880, 48.0, 90.0, true),
  ('bbbbbbbb-2222-bbbb-2222-222222222222', 'MEDIC-102', true, 12.9780, 77.6046, 52.0, 180.0, true),
  ('bbbbbbbb-3333-bbbb-3333-333333333333', 'CRITICAL-201', true, 12.9616, 77.5880, 45.0, 90.0, true),
  ('bbbbbbbb-4444-bbbb-4444-444444444444', 'RAPID-301', true, 12.9716, 77.6200, 50.0, 270.0, true)
on conflict (id) do nothing;

-- ROUTES (3 Pre-built routes)
insert into routes (id, name, origin_lat, origin_lng, hospital_id, geometry, distance_m)
values
  -- Route 1: West-East corridor J1 -> J2 -> J3 to St. Jude Memorial Hospital
  ('cccccccc-1111-cccc-1111-111111111111', 'West-East Expressway to St. Jude', 12.9716, 77.5880, '22222222-2222-2222-2222-222222222222',
   '[{"lat":12.9716,"lng":77.5880},{"lat":12.9716,"lng":77.5946},{"lat":12.9716,"lng":77.6046},{"lat":12.9716,"lng":77.6146},{"lat":12.9730,"lng":77.6180}]'::jsonb,
   3200),

  -- Route 2: North-South arterial corridor J1 -> J4 to Apex Trauma Center
  ('cccccccc-2222-cccc-2222-222222222222', 'North Arterial to Apex Trauma', 12.9780, 77.5946, '11111111-1111-1111-1111-111111111111',
   '[{"lat":12.9780,"lng":77.5946},{"lat":12.9716,"lng":77.5946},{"lat":12.9616,"lng":77.5946},{"lat":12.9600,"lng":77.5920}]'::jsonb,
   2200),

  -- Route 3: Cross-City Emergency Corridor J2 -> J5 -> J4 to Apex Trauma Center
  ('cccccccc-3333-cccc-3333-333333333333', 'Central Cross to Apex Trauma', 12.9780, 77.6046, '11111111-1111-1111-1111-111111111111',
   '[{"lat":12.9780,"lng":77.6046},{"lat":12.9716,"lng":77.6046},{"lat":12.9616,"lng":77.6046},{"lat":12.9616,"lng":77.5946},{"lat":12.9600,"lng":77.5920}]'::jsonb,
   3500)
on conflict (id) do nothing;

-- ROUTE JUNCTIONS
-- Route 1: J1 (W_E) -> J2 (W_E) -> J3 (W_E)
insert into route_junctions (route_id, seq, junction_id, entry_approach, exit_approach, distance_from_prev_m)
values
  ('cccccccc-1111-cccc-1111-111111111111', 1, 'a1111111-aaaa-1111-aaaa-111111111111', 'W', 'E', 700),
  ('cccccccc-1111-cccc-1111-111111111111', 2, 'a2222222-aaaa-2222-aaaa-222222222222', 'W', 'E', 1100),
  ('cccccccc-1111-cccc-1111-111111111111', 3, 'a3333333-aaaa-3333-aaaa-333333333333', 'W', 'E', 1100)
on conflict (route_id, seq) do nothing;

-- Route 2: J1 (N_S) -> J4 (N_S)
insert into route_junctions (route_id, seq, junction_id, entry_approach, exit_approach, distance_from_prev_m)
values
  ('cccccccc-2222-cccc-2222-222222222222', 1, 'a1111111-aaaa-1111-aaaa-111111111111', 'N', 'S', 700),
  ('cccccccc-2222-cccc-2222-222222222222', 2, 'a4444444-aaaa-4444-aaaa-444444444444', 'N', 'S', 1100)
on conflict (route_id, seq) do nothing;

-- Route 3: J2 (N_S) -> J5 (N_W) -> J4 (E_W)
insert into route_junctions (route_id, seq, junction_id, entry_approach, exit_approach, distance_from_prev_m)
values
  ('cccccccc-3333-cccc-3333-333333333333', 1, 'a2222222-aaaa-2222-aaaa-222222222222', 'N', 'S', 700),
  ('cccccccc-3333-cccc-3333-333333333333', 2, 'a5555555-aaaa-5555-aaaa-555555555555', 'N', 'W', 1100),
  ('cccccccc-3333-cccc-3333-333333333333', 3, 'a4444444-aaaa-4444-aaaa-444444444444', 'E', 'W', 1100)
on conflict (route_id, seq) do nothing;
