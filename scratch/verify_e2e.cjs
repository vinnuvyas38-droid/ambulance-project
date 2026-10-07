async function get(url, headers = {}) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, ok: res.ok, json, text };
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, ok: res.ok, json, text };
}

async function put(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, ok: res.ok, json, text };
}

async function run() {
  console.log('=== VERIFYING FRONTEND ===');
  const frontend = await get('http://localhost:5173/');
  console.log('Frontend status:', frontend.status, 'HTML length:', frontend.text.length);
  console.log('Frontend serves root div:', frontend.text.includes('id="root"'));
  console.log('Frontend serves main.tsx script:', frontend.text.includes('/src/main.tsx'));

  // Also check if Vite serves /src/main.tsx successfully without error
  const mainTsx = await get('http://localhost:5173/src/main.tsx');
  console.log('/src/main.tsx status:', mainTsx.status, 'Content length:', mainTsx.text.length);
  console.log('main.tsx contains ReactDOM createRoot:', mainTsx.text.includes('createRoot'));

  console.log('\n=== VERIFYING BACKEND SIMULATION & JUNCTIONS ===');
  const sim = await get('http://localhost:4000/api/v1/simulation/state');
  console.log('Sim state status:', sim.status, 'Tick:', sim.json?.data?.tick, 'Scenario:', sim.json?.data?.scenario);

  const junctions = await get('http://localhost:4000/api/v1/junctions');
  console.log('Junctions count:', junctions.json?.data?.length);

  const missions = await get('http://localhost:4000/api/v1/missions', { 'Authorization': 'Bearer mock-operator-token' });
  console.log('Missions count:', missions.json?.data?.length, 'First mission status:', missions.json?.data?.[0]?.status);

  console.log('\n=== VERIFYING DRIVER ROLE ACCESS (NO 403 ON ALERTS/REPORTS/CONFIG) ===');
  const driverHeaders = { 'Authorization': 'Bearer mock-driver-token' };
  const driverAlerts = await get('http://localhost:4000/api/v1/alerts', driverHeaders);
  console.log('Driver GET /alerts status:', driverAlerts.status, '(expected 200, count:', driverAlerts.json?.data?.length, ')');
  const driverSummary = await get('http://localhost:4000/api/v1/reports/summary', driverHeaders);
  console.log('Driver GET /reports/summary status:', driverSummary.status, '(expected 200)');
  const driverConfig = await get('http://localhost:4000/api/v1/config', driverHeaders);
  console.log('Driver GET /config status:', driverConfig.status, '(expected 200)');

  console.log('\n=== VERIFYING PRIORITY EVALUATION (NO NaN) ===');
  const j1Id = junctions.json?.data?.[0]?.id;
  const prio = await post('http://localhost:4000/api/v1/priority/evaluate', { junction_id: j1Id }, { 'Authorization': 'Bearer mock-operator-token' });
  console.log('Priority evaluate status:', prio.status);
  const candidates = prio.json?.data?.ranked_candidates || [];
  console.log('Priority candidates count:', candidates.length);
  candidates.forEach((c, idx) => {
    console.log(`Candidate ${idx}: call_sign=${c.ambulance_call_sign}, final_score=${c.final_score}, composite_score=${c.composite_score}`);
  });

  console.log('\n=== VERIFYING PRIORITY WEIGHTS SAVE (CONFIG SCHEMA 12 PROPS) ===');
  const curConfig = await get('http://localhost:4000/api/v1/config', { 'Authorization': 'Bearer mock-admin-token' });
  console.log('Get config status:', curConfig.status);
  const cfgVal = curConfig.json?.data;
  console.log('Current config weights sum:', (cfgVal.w_severity + cfgVal.w_eta + cfgVal.w_waiting + cfgVal.w_conflict_cost + cfgVal.w_route_requirement).toFixed(4));
  
  const updateConfig = await put('http://localhost:4000/api/v1/config', {
    ...cfgVal,
    w_severity: 0.35,
    w_eta: 0.25,
    w_waiting: 0.15,
    w_conflict_cost: 0.15,
    w_route_requirement: 0.10
  }, { 'Authorization': 'Bearer mock-admin-token' });
  console.log('Put config status:', updateConfig.status, 'Success message:', updateConfig.json?.data?.message || updateConfig.text.slice(0, 150));

  console.log('\n=== VERIFYING MANUAL SIGNAL OVERRIDE CONTRACT ===');
  // First test invalid override without mission_id
  const invalidOverride = await post(`http://localhost:4000/api/v1/signals/${j1Id}/override`, {
    movement: 'W_E',
    planned_green_seconds: 15
  }, { 'Authorization': 'Bearer mock-operator-token' });
  console.log('Override without mission_id status:', invalidOverride.status, '(expected 400 validation error)');

  // Test valid override with active mission
  const activeMission = missions.json?.data?.[0];
  if (activeMission) {
    const validOverride = await post(`http://localhost:4000/api/v1/signals/${j1Id}/override`, {
      mission_id: activeMission.id,
      movement: 'W_E',
      planned_green_seconds: 15
    }, { 'Authorization': 'Bearer mock-operator-token' });
    console.log('Valid override status:', validOverride.status, 'Override status:', validOverride.json?.data?.status);

    // Test restoring signal
    const restore = await post(`http://localhost:4000/api/v1/signals/${j1Id}/restore`, {}, { 'Authorization': 'Bearer mock-operator-token' });
    console.log('Restore status:', restore.status);
  }

  console.log('\n=== START SIMULATION & MONITOR AMBULANCE PROGRESS THROUGH JUNCTION ===');
  await post('http://localhost:4000/api/v1/simulation/start', {}, { 'Authorization': 'Bearer mock-operator-token' });
  
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const mState = await get('http://localhost:4000/api/v1/missions', { 'Authorization': 'Bearer mock-operator-token' });
    const m = mState.json?.data?.[0];
    const ambState = await get('http://localhost:4000/api/v1/ambulances');
    const a = ambState.json?.data?.find(x => x.id === m?.ambulance_id);
    const jState = await get(`http://localhost:4000/api/v1/junctions/${j1Id}`);
    console.log(`Tick/Sec ${i+1}: Mission Status=${m?.status}, RouteSeq=${m?.current_route_seq}, Amb Lat=${a?.lat.toFixed(5)}, Lng=${a?.lng.toFixed(5)}, Speed=${a?.speed_kmh}km/h, J1 Mode=${jState.json?.data?.mode}`);
  }
}

run().catch(console.error);
