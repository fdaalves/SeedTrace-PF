import { supabase } from './supabase';
import type { AuditLog } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}${path}`, {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Erro ao carregar auditoria');
  return body as T;
}

export const auditApi = {
  list: (filters: { entity_type?: string; action?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.entity_type) params.set('entity_type', filters.entity_type);
    if (filters.action) params.set('action', filters.action);
    params.set('limit', String(filters.limit ?? 100));
    return request<AuditLog[]>(`/api/account/audit?${params.toString()}`);
  }
};
