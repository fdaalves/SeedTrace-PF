import type { Crop, Cultivar, Descriptor } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Erro ao acessar a API');
  return body as T;
}

export const api = {
  listCrops: () => request<Crop[]>('/api/crops'),
  createCrop: (payload: Pick<Crop, 'code' | 'common_name' | 'scientific_name'>) =>
    request<Crop>('/api/crops', { method: 'POST', body: JSON.stringify(payload) }),
  listCultivars: () => request<Cultivar[]>('/api/cultivars'),
  createCultivar: (payload: Omit<Cultivar, 'id' | 'crops'>) =>
    request<Cultivar>('/api/cultivars', { method: 'POST', body: JSON.stringify(payload) }),
  listDescriptors: () => request<Descriptor[]>('/api/descriptors'),
  createDescriptor: (payload: Omit<Descriptor, 'id' | 'crops'>) =>
    request<Descriptor>('/api/descriptors', { method: 'POST', body: JSON.stringify(payload) })
};
