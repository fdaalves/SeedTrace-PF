import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyRequest } from 'fastify';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const { buildApp } = await import('./app.js');

async function technicianAuth(request: FastifyRequest) {
  request.authUser = {
    id: 'user-technician',
    email: 'technician@example.com',
    full_name: 'Technician',
    role: 'technician',
    is_active: true
  };
}

const requiredPayloadCases = [
  ['/api/crops', 'culture'],
  ['/api/cultivars', 'cultivar'],
  ['/api/descriptors', 'descriptor'],
  ['/api/varietal-values', 'varietal value'],
  ['/api/materials', 'genetic material'],
  ['/api/lots', 'seed lot']
] as const;

for (const [url, label] of requiredPayloadCases) {
  test(`${label} endpoint rejects an empty payload before persistence`, async () => {
    const app = buildApp({ logger: false, authenticate: technicianAuth });
    const response = await app.inject({ method: 'POST', url, payload: {} });

    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(typeof body.error, 'string');
    assert.ok(body.error.length > 0);
    await app.close();
  });
}

test('crop endpoint rejects codes with spaces', async () => {
  const app = buildApp({ logger: false, authenticate: technicianAuth });
  const response = await app.inject({
    method: 'POST',
    url: '/api/crops',
    payload: { code: 'SOY PF', common_name: 'Soja' }
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.json().error, /no spaces/i);
  await app.close();
});

test('lot endpoint rejects negative quantity before database lookup', async () => {
  const app = buildApp({ logger: false, authenticate: technicianAuth });
  const response = await app.inject({
    method: 'POST',
    url: '/api/lots',
    payload: {
      code: 'LOT-TEST-001',
      genetic_material_id: '00000000-0000-0000-0000-000000000001',
      quantity: -1
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'quantity must be greater than or equal to 0');
  await app.close();
});
