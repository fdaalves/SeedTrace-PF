import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasRole } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

type AuditQuery = {
  entity_type?: string;
  entity_id?: string;
  action?: 'insert' | 'update' | 'delete';
  actor_user_id?: string;
  limit?: string;
};

async function requireAuditReader(request: FastifyRequest, reply: FastifyReply) {
  if (!hasRole(request, ['admin', 'manager'])) {
    return reply.code(403).send({ error: 'Audit permission required' });
  }
}

export async function auditRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AuditQuery }>('/', { preHandler: requireAuditReader }, async (request, reply) => {
    const requestedLimit = Number(request.query.limit ?? 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 200)
      : 100;

    let query = supabase
      .from('audit_logs')
      .select('id, occurred_at, actor_user_id, actor_email, entity_type, entity_id, action, changed_fields, before_data, after_data')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (request.query.entity_type) query = query.eq('entity_type', request.query.entity_type);
    if (request.query.entity_id) query = query.eq('entity_id', request.query.entity_id);
    if (request.query.action) query = query.eq('action', request.query.action);
    if (request.query.actor_user_id) query = query.eq('actor_user_id', request.query.actor_user_id);

    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });
}
