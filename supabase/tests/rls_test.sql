-- =========================================================
-- AI Emergency Green Corridor - RLS Verification Script
-- supabase/tests/rls_test.sql
-- =========================================================

begin;

-- Create test auth users
insert into auth.users (id, email)
values
  ('99999999-aaaa-9999-aaaa-999999999999', 'driver_a@greencorridor.local'),
  ('88888888-bbbb-8888-bbbb-888888888888', 'driver_b@greencorridor.local'),
  ('77777777-cccc-7777-cccc-777777777777', 'viewer_1@greencorridor.local')
on conflict do nothing;

-- Update profiles with specific test roles
update public.profiles set role = 'driver', full_name = 'Driver Alpha'
where id = '99999999-aaaa-9999-aaaa-999999999999';

update public.profiles set role = 'driver', full_name = 'Driver Bravo'
where id = '88888888-bbbb-8888-bbbb-888888888888';

update public.profiles set role = 'viewer', full_name = 'Viewer Alice'
where id = '77777777-cccc-7777-cccc-777777777777';

-- Create an ambulance for driver B
insert into ambulances (id, call_sign, driver_id, is_authorized, lat, lng)
values ('dddddddd-bbbb-dddd-bbbb-dddddddddddd', 'MEDIC-TEST-B', '88888888-bbbb-8888-bbbb-888888888888', true, 12.97, 77.60)
on conflict do nothing;

-- Create a mission for driver B
insert into missions (
  id, ambulance_id, hospital_id, created_by, patient_info, emergency_category, status
) values (
  'eeeeeeee-bbbb-eeee-bbbb-eeeeeeeeeeee',
  'dddddddd-bbbb-dddd-bbbb-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  '88888888-bbbb-8888-bbbb-888888888888',
  '{"notes":"Confidential patient record for driver B"}'::jsonb,
  'cardiac',
  'dispatched'
) on conflict do nothing;

-- -----------------------------------------------------------------
-- TEST 1: Driver A cannot read Driver B's mission
-- -----------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"99999999-aaaa-9999-aaaa-999999999999","role":"authenticated"}';

do $$
declare
  visible_count int;
begin
  select count(*) into visible_count
  from missions
  where id = 'eeeeeeee-bbbb-eeee-bbbb-eeeeeeeeeeee';

  if visible_count > 0 then
    raise exception 'RLS VIOLATION: Driver A was able to read Driver B mission!';
  else
    raise notice 'TEST 1 PASSED: Driver A cannot read Driver B mission.';
  end if;
end $$;

-- -----------------------------------------------------------------
-- TEST 2: Viewer cannot insert missions
-- -----------------------------------------------------------------
set local "request.jwt.claims" to '{"sub":"77777777-cccc-7777-cccc-777777777777","role":"authenticated"}';

do $$
begin
  begin
    insert into missions (
      ambulance_id, hospital_id, created_by, patient_info, emergency_category
    ) values (
      'bbbbbbbb-1111-bbbb-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      '77777777-cccc-7777-cccc-777777777777',
      '{"notes":"Illegal insert by viewer"}'::jsonb,
      'cardiac'
    );
    raise exception 'RLS VIOLATION: Viewer was able to insert a mission!';
  exception when insufficient_privilege or check_violation then
    raise notice 'TEST 2 PASSED: Viewer insertion blocked by RLS.';
  end;
end $$;

-- -----------------------------------------------------------------
-- TEST 3: User cannot change own role
-- -----------------------------------------------------------------
set local "request.jwt.claims" to '{"sub":"99999999-aaaa-9999-aaaa-999999999999","role":"authenticated"}';

do $$
begin
  begin
    update profiles
    set role = 'admin'
    where id = '99999999-aaaa-9999-aaaa-999999999999';

    raise exception 'RLS VIOLATION: Driver was able to self-promote to admin!';
  exception when check_violation or insufficient_privilege then
    raise notice 'TEST 3 PASSED: Self role-escalation blocked by RLS.';
  end;
end $$;

rollback;
