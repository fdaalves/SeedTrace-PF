import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppRole } from './lib/auth.js';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

const { buildApp } = await import('./app.js');

function authAs(role: AppRole) {
  return async (request: FastifyRequest) => {
    request.authUser = {
      id: `user-${role}`,
      email: `${role}@example.com`,
      full_name: role,
      role,
      is_active: true
    };
  };
}

async function rejectAuthentication(_request: FastifyRequest, reply: FastifyReply) {
  return reply.code(401).send({ error: 'Authentication required' });
}

test('protected API rejects unauthenticated requests', async () => {
  const app = buildApp({ logger: false, authenticate: rejectAuthentication });
  const response = await app.inject({ method: 'GET', url: '/api/account/me' });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: 'Authentication required' });
  await app.close();
});

for (const role of ['admin', 'manager', 'technician', 'field_operator', 'viewer'] as AppRole[]) {
  test(`authenticated ${role} can read own profile`, async () => {
    const app = buildApp({ logger: false, authenticate: authAs(role) });
    const response = await app.inject({ method: 'GET', url: '/api/account/me' });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().role, role);
    await app.close();
  });
}

for (const role of ['admin', 'manager', 'technician'] as AppRole[]) {
  test(`${role} passes the global write authorization gate`, async () => {
    const app = buildApp({ logger: false, authenticate: authAs(role) });
    const response = await app.inject({ method: 'POST', url: '/api/crops', payload: {} });

    // 400 proves the request reached the domain handler and was rejected by validation,
    // rather than by the global authorization hook.
    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.json(), { error: 'code is required' });
    await app.close();
  });
}

for (const role of ['field_operator', 'viewer'] as AppRole[]) {
  test(`${role} is blocked from write endpoints`, async () => {
    const app = buildApp({ logger: false, authenticate: authAs(role) });
    const response = await app.inject({ method: 'POST', url: '/api/crops', payload: {} });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), { error: 'Write permission required' });
    await app.close();
  });
}

test('technician cannot read audit history', async () => {
  const app = buildApp({ logger: false, authenticate: authAs('technician') });
  const response = await app.inject({ method: 'GET', url: '/api/account/audit' });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), { error: 'Audit permission required' });
  await app.close();
});

test('manager cannot administer users', async () => {
  const app = buildApp({ logger: false, authenticate: authAs('manager') });
  const response = await app.inject({ method: 'GET', url: '/api/account/users' });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.json(), { error: 'Administrator permission required' });
  await app.close();
});
