import type { FastifyPluginAsync } from 'fastify';
import { requireAdmin, type AppRole } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

const roles: AppRole[] = ['admin', 'manager', 'technician', 'field_operator', 'viewer'];

type UpdateUserBody = {
  role?: AppRole;
  is_active?: boolean;
  full_name?: string | null;
};

export const adminUserRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: requireAdmin }, async (_request, reply) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .order('email', { ascending: true });

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body ?? {};

    if (body.role !== undefined && !roles.includes(body.role)) {
      return reply.code(400).send({ error: 'Invalid role' });
    }

    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
      return reply.code(400).send({ error: 'is_active must be boolean' });
    }

    if (body.full_name !== undefined && body.full_name !== null && typeof body.full_name !== 'string') {
      return reply.code(400).send({ error: 'full_name must be a string or null' });
    }

    const { data: target, error: targetError } = await supabase
      .from('user_profiles')
      .select('id, role, is_active')
      .eq('id', id)
      .single();

    if (targetError || !target) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (request.authUser?.id === id && body.is_active === false) {
      return reply.code(400).send({ error: 'You cannot deactivate your own account' });
    }

    const removesActiveAdmin = target.role === 'admin' && target.is_active && (
      body.role !== undefined && body.role !== 'admin' || body.is_active === false
    );

    if (removesActiveAdmin) {
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', id);

      if (countError) return reply.code(500).send({ error: countError.message });
      if ((count ?? 0) === 0) {
        return reply.code(400).send({ error: 'At least one active administrator is required' });
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.role !== undefined) update.role = body.role;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.full_name !== undefined) update.full_name = body.full_name?.trim() || null;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });
};
