-- =========================================================
-- AI Emergency Green Corridor - Row Level Security (RLS)
-- Migration 002_rls.sql
-- =========================================================

-- Enable RLS on every table
alter table profiles enable row level security;
alter table hospitals enable row level security;
alter table junctions enable row level security;
alter table junction_cameras enable row level security;
alter table junction_movements enable row level security;
alter table junction_conflicts enable row level security;
alter table routes enable row level security;
alter table route_junctions enable row level security;
alter table ambulances enable row level security;
alter table missions enable row level security;
alter table severity_assessments enable row level security;
alter table signal_overrides enable row level security;
alter table priority_decisions enable row level security;
alter table cv_detections enable row level security;
alter table system_config enable row level security;
alter table alerts enable row level security;
alter table audit_logs enable row level security;
alter table simulation_state enable row level security;

-- =========================================================
-- 1. PROFILES
-- =========================================================
-- Select: user can read own row; staff (admin, operator) can read all
create policy "profiles_select_policy" on profiles
  for select using (
    auth.uid() = id or is_staff()
  );

-- Update: user can update own full_name but NOT change own role; admin can update any
create policy "profiles_update_own_policy" on profiles
  for update using (
    auth.uid() = id
  )
  with check (
    auth.uid() = id and role = (select role from profiles where id = auth.uid())
  );

create policy "profiles_admin_update_policy" on profiles
  for update using (
    is_admin()
  );

-- =========================================================
-- 2. HOSPITALS, JUNCTIONS, CAMERAS, MOVEMENTS, CONFLICTS, ROUTES
-- =========================================================
create policy "hospitals_select_policy" on hospitals
  for select using (auth.role() = 'authenticated');
create policy "hospitals_admin_policy" on hospitals
  for all using (is_admin());

create policy "junctions_select_policy" on junctions
  for select using (auth.role() = 'authenticated');
create policy "junctions_admin_policy" on junctions
  for all using (is_admin());

create policy "cameras_select_policy" on junction_cameras
  for select using (auth.role() = 'authenticated');
create policy "cameras_admin_policy" on junction_cameras
  for all using (is_admin());

create policy "movements_select_policy" on junction_movements
  for select using (auth.role() = 'authenticated');
create policy "movements_admin_policy" on junction_movements
  for all using (is_admin());

create policy "conflicts_select_policy" on junction_conflicts
  for select using (auth.role() = 'authenticated');
create policy "conflicts_admin_policy" on junction_conflicts
  for all using (is_admin());

create policy "routes_select_policy" on routes
  for select using (auth.role() = 'authenticated');
create policy "routes_admin_policy" on routes
  for all using (is_admin());

create policy "route_junctions_select_policy" on route_junctions
  for select using (auth.role() = 'authenticated');
create policy "route_junctions_admin_policy" on route_junctions
  for all using (is_admin());

-- =========================================================
-- 3. AMBULANCES
-- =========================================================
-- Staff & viewer: all; driver: only where driver_id = auth.uid()
create policy "ambulances_select_policy" on ambulances
  for select using (
    is_staff() or current_user_role() = 'viewer' or driver_id = auth.uid()
  );

-- Admin and operator can insert and update
create policy "ambulances_insert_policy" on ambulances
  for insert with check (is_staff());

create policy "ambulances_update_policy" on ambulances
  for update using (is_staff());

create policy "ambulances_delete_policy" on ambulances
  for delete using (is_admin());

-- =========================================================
-- 4. MISSIONS
-- =========================================================
-- Staff & viewer see all; driver sees only own missions or ambulance assigned
create policy "missions_select_policy" on missions
  for select using (
    is_staff() or current_user_role() = 'viewer' or created_by = auth.uid() or
    exists (
      select 1 from ambulances a
      where a.id = missions.ambulance_id and a.driver_id = auth.uid()
    )
  );

-- Insert: staff or driver (with created_by = auth.uid())
create policy "missions_insert_policy" on missions
  for insert with check (
    (is_staff() or current_user_role() = 'driver') and created_by = auth.uid()
  );

-- Update: staff only
create policy "missions_update_policy" on missions
  for update using (is_staff());

-- Delete: admin only
create policy "missions_delete_policy" on missions
  for delete using (is_admin());

-- =========================================================
-- 5. SEVERITY ASSESSMENTS
-- =========================================================
-- Select: visible if parent mission is visible
create policy "severity_select_policy" on severity_assessments
  for select using (
    exists (
      select 1 from missions m
      where m.id = severity_assessments.mission_id and (
        is_staff() or current_user_role() = 'viewer' or m.created_by = auth.uid() or
        exists (select 1 from ambulances a where a.id = m.ambulance_id and a.driver_id = auth.uid())
      )
    )
  );
-- Insert/update/delete handled by service role (bypass RLS)

-- =========================================================
-- 6. SIGNAL OVERRIDES, PRIORITY DECISIONS, CV DETECTIONS
-- =========================================================
create policy "overrides_select_policy" on signal_overrides
  for select using (
    is_staff() or current_user_role() = 'viewer' or
    exists (
      select 1 from missions m
      where m.id = signal_overrides.mission_id and (
        m.created_by = auth.uid() or
        exists (select 1 from ambulances a where a.id = m.ambulance_id and a.driver_id = auth.uid())
      )
    )
  );

create policy "priority_select_policy" on priority_decisions
  for select using (
    is_staff() or current_user_role() = 'viewer'
  );

create policy "cv_detections_select_policy" on cv_detections
  for select using (
    is_staff() or current_user_role() = 'viewer' or
    (mission_id is not null and exists (
      select 1 from missions m
      where m.id = cv_detections.mission_id and (
        m.created_by = auth.uid() or
        exists (select 1 from ambulances a where a.id = m.ambulance_id and a.driver_id = auth.uid())
      )
    ))
  );

-- =========================================================
-- 7. SYSTEM CONFIG
-- =========================================================
create policy "config_select_policy" on system_config
  for select using (is_staff());

create policy "config_admin_policy" on system_config
  for all using (is_admin());

-- =========================================================
-- 8. ALERTS
-- =========================================================
create policy "alerts_select_policy" on alerts
  for select using (is_staff() or current_user_role() = 'viewer');

create policy "alerts_update_ack_policy" on alerts
  for update using (is_staff())
  with check (is_staff());

-- =========================================================
-- 9. AUDIT LOGS
-- =========================================================
create policy "audit_select_policy" on audit_logs
  for select using (is_admin());
-- Insert via service role only; update/delete blocked by trigger

-- =========================================================
-- 10. SIMULATION STATE
-- =========================================================
create policy "simulation_select_policy" on simulation_state
  for select using (auth.role() = 'authenticated');

create policy "simulation_update_policy" on simulation_state
  for update using (is_staff())
  with check (is_staff());
