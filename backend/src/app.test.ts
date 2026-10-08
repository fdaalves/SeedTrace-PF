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

for (const path of ['/api/crops/test-id', '/api/account/users/test-id']) {
  test(`CORS allows authenticated PATCH from the web app to ${path}`, async (t) => {
    const app = buildApp({ logger: false });
    t.after(() => app.close());
    const response = await app.inject({
      method: 'OPTIONS',
      url: path,
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type'
      }
    });
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.ok(String(response.headers['access-control-allow-methods']).split(',').map(value => value.trim()).includes('PATCH'));
    assert.match(String(response.headers['access-control-allow-headers']), /authorization/i);
    assert.match(String(response.headers['access-control-allow-headers']), /content-type/i);
  });
}
