import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const { buildApp } = await import('./app.js');

test('GET /health returns backend status', async () => {
  const app = buildApp({ logger: false });
  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'ok',
    service: 'seedtrace-pf-backend',
    version: '0.1.0-alpha'
  });

  await app.close();
});
