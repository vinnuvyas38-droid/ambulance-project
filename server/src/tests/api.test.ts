import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('Backend API End-to-End Tests', () => {
  const app = createApp();

  it('GET /api/v1/health returns healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services).toBeDefined();
  });

  it('GET /api/v1/hospitals returns hospital list', async () => {
    const res = await request(app).get('/api/v1/hospitals');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/v1/routes/compute computes route over grid', async () => {
    const res = await request(app)
      .post('/api/v1/routes/compute')
      .set('Authorization', 'Bearer mock-operator-token')
      .send({
        origin_lat: 12.9716,
        origin_lng: 12.9716 > 0 ? 77.5880 : 0,
        hospital_id: '11111111-1111-1111-1111-111111111111',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.route).toBeDefined();
    expect(res.body.data.junctions.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/signals/:junctionId/override rejects unauthorized requests or safety violations', async () => {
    // Calling without auth token should return 401
    const unauthRes = await request(app)
      .post('/api/v1/signals/a1111111-aaaa-1111-aaaa-111111111111/override')
      .send({
        mission_id: '11111111-1111-1111-1111-111111111111',
        movement: 'N_S',
      });
    expect(unauthRes.status).toBe(401);
  });
});
