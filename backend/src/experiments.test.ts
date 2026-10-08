import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyRequest } from 'fastify';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
const { buildApp } = await import('./app.js');

// Exercise the route and Supabase response handling without touching a real database.
test('duplicate block returns a conflict without leaking database constraint names', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/rest/v1/experiments?')) {
      return new Response(JSON.stringify({ id: 'experiment-test', is_active: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    assert.ok(url.includes('/rest/v1/experiment_blocks?'));
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({
      code: '23505', message: 'duplicate key value violates unique constraint experiment_blocks_experiment_id_block_number_key'
    }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  });
  const app = buildApp({ logger: false, authenticate: async (request: FastifyRequest) => {
    request.authUser = { id: 'admin-test', email: 'admin@example.com', full_name: null, role: 'admin', is_active: true };
  } });
  t.after(() => app.close());
  const response = await app.inject({ method: 'POST', url: '/api/experiments/experiment-test/blocks', payload: { block_number: 1 } });
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), { error: 'Block number already exists in this experiment' });
});
