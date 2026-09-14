import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabase } from './supabase.js';

export type AppRole = 'admin' | 'manager' | 'technician' | 'field_operator' | 'viewer';

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
};

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return reply.code(401).send({ error: 'Authentication required' });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return reply.code(401).send({ error: 'Invalid or expired session' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return reply.code(403).send({ error: 'User profile not provisioned' });
  }

  if (!profile.is_active) {
    return reply.code(403).send({ error: 'User account is inactive' });
  }

  request.authUser = profile as AuthenticatedUser;
}

export function hasRole(request: FastifyRequest, allowed: AppRole[]) {
  return Boolean(request.authUser && allowed.includes(request.authUser.role));
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!hasRole(request, ['admin'])) {
    return reply.code(403).send({ error: 'Administrator permission required' });
  }
}
