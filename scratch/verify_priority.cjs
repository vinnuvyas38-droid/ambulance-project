async function test() {
  const resetRes = await fetch('http://localhost:4000/api/v1/simulation/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-operator-token' },
    body: JSON.stringify({ scenario: 'two_ambulances_conflict' })
  });
  console.log('Reset to two_ambulances_conflict status:', resetRes.status);

  // Get J2 junction ID
  const jRes = await fetch('http://localhost:4000/api/v1/junctions');
  const jData = await jRes.json();
  const j2 = jData.data.find(j => j.code === 'J2');
  console.log('Found J2:', j2.id, j2.name);

  // Evaluate Priority
  const pRes = await fetch('http://localhost:4000/api/v1/priority/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-operator-token' },
    body: JSON.stringify({ junction_id: j2.id })
  });
  const pData = await pRes.json();
  console.log('Priority Evaluation Response Status:', pRes.status);
  console.log('Priority Evaluation Data:', JSON.stringify(pData, null, 2));
  pData.data?.ranked_candidates?.forEach((c, idx) => {
    console.log(` Rank ${idx + 1}: ${c.ambulance_call_sign} | Final Score: ${(c.final_score * 100).toFixed(1)}% | Severity: ${c.severity_level} (${c.severity_score}) | ETA: ${c.eta_seconds}s | Movement: ${c.movement}`);
  });
  console.log('Selected Movement:', pData.data.selected_movement);
  console.log('Decision Reason:', pData.data.decision_reason);
}

test().catch(console.error);
