import { supabase } from './supabase';
import type { AppRole, ManagedUser } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Erro ao administrar usuários');
  return body as T;
}

export const adminApi = {
  listUsers: () => adminRequest<ManagedUser[]>('/api/account/users'),
  updateUser: (id: string, payload: { role?: AppRole; is_active?: boolean; full_name?: string | null }) =>
    adminRequest<ManagedUser>(`/api/account/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
};
