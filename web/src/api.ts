import { supabase } from './supabase';
import type { Crop, Cultivar, Descriptor, GeneticMaterial, SeedLot, UserProfile, VarietalValue } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined)
  };

  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Erro ao acessar a API');
  return body as T;
}

export const api = {
  getMe: () => request<UserProfile>('/api/account/me'),
  listCrops: () => request<Crop[]>('/api/crops'),
  createCrop: (payload: Pick<Crop, 'code' | 'common_name' | 'scientific_name'>) => request<Crop>('/api/crops', { method: 'POST', body: JSON.stringify(payload) }),
  listCultivars: () => request<Cultivar[]>('/api/cultivars'),
  createCultivar: (payload: Omit<Cultivar, 'id' | 'crops'>) => request<Cultivar>('/api/cultivars', { method: 'POST', body: JSON.stringify(payload) }),
  listDescriptors: () => request<Descriptor[]>('/api/descriptors'),
  createDescriptor: (payload: Omit<Descriptor, 'id' | 'crops'>) => request<Descriptor>('/api/descriptors', { method: 'POST', body: JSON.stringify(payload) }),
  listVarietalValues: () => request<VarietalValue[]>('/api/varietal-values'),
  setVarietalValue: (payload: Omit<VarietalValue, 'id'>) => request<VarietalValue>('/api/varietal-values', { method: 'POST', body: JSON.stringify(payload) }),
  listMaterials: () => request<GeneticMaterial[]>('/api/materials'),
  createMaterial: (payload: Omit<GeneticMaterial, 'id' | 'cultivars'>) => request<GeneticMaterial>('/api/materials', { method: 'POST', body: JSON.stringify(payload) }),
  listLots: () => request<SeedLot[]>('/api/lots'),
  createLot: (payload: Omit<SeedLot, 'id' | 'genetic_materials' | 'parent'>) => request<SeedLot>('/api/lots', { method: 'POST', body: JSON.stringify(payload) })
};
