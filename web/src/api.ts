import { supabase } from './supabase';
import type { Crop, Cultivar, Descriptor, Experiment, ExperimentBlock, ExperimentPlot, GeneticMaterial, PlotAssessment, SeedLot, UserProfile, VarietalValue } from './types';

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
  updateCrop: (id: string, payload: Partial<Pick<Crop, 'code' | 'common_name' | 'scientific_name' | 'is_active'>>) => request<Crop>(`/api/crops/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listCultivars: () => request<Cultivar[]>('/api/cultivars'),
  createCultivar: (payload: Omit<Cultivar, 'id' | 'crops'>) => request<Cultivar>('/api/cultivars', { method: 'POST', body: JSON.stringify(payload) }),
  updateCultivar: (id: string, payload: Partial<Pick<Cultivar, 'code' | 'name' | 'breeder' | 'cultivar_type' | 'notes' | 'is_active'>>) => request<Cultivar>(`/api/cultivars/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listDescriptors: () => request<Descriptor[]>('/api/descriptors'),
  createDescriptor: (payload: Omit<Descriptor, 'id' | 'crops'>) => request<Descriptor>('/api/descriptors', { method: 'POST', body: JSON.stringify(payload) }),
  updateDescriptor: (id: string, payload: Partial<Pick<Descriptor, 'code' | 'name' | 'unit' | 'phenological_stage' | 'criticality' | 'allowed_values' | 'is_active'>>) => request<Descriptor>(`/api/descriptors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listVarietalValues: () => request<VarietalValue[]>('/api/varietal-values'),
  setVarietalValue: (payload: Omit<VarietalValue, 'id'>) => request<VarietalValue>('/api/varietal-values', { method: 'POST', body: JSON.stringify(payload) }),
  listMaterials: () => request<GeneticMaterial[]>('/api/materials'),
  createMaterial: (payload: Omit<GeneticMaterial, 'id' | 'cultivars'>) => request<GeneticMaterial>('/api/materials', { method: 'POST', body: JSON.stringify(payload) }),
  updateMaterial: (id: string, payload: Partial<Pick<GeneticMaterial, 'code' | 'material_category' | 'origin' | 'received_at' | 'responsible_name' | 'notes' | 'is_active'>>) => request<GeneticMaterial>(`/api/materials/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listLots: () => request<SeedLot[]>('/api/lots'),
  createLot: (payload: Omit<SeedLot, 'id' | 'genetic_materials' | 'parent'>) => request<SeedLot>('/api/lots', { method: 'POST', body: JSON.stringify(payload) }),
  updateLot: (id: string, payload: Partial<Pick<SeedLot, 'code' | 'season' | 'quantity' | 'unit' | 'status' | 'is_active'>>) => request<SeedLot>(`/api/lots/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listExperiments: () => request<Experiment[]>('/api/experiments'),
  createExperiment: (payload: Omit<Experiment, 'id' | 'crops' | 'is_active'>) => request<Experiment>('/api/experiments', { method: 'POST', body: JSON.stringify(payload) }),
  updateExperiment: (id: string, payload: Partial<Omit<Experiment, 'id' | 'crop_id' | 'crops'>>) => request<Experiment>(`/api/experiments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  listExperimentBlocks: (experimentId: string) => request<ExperimentBlock[]>(`/api/experiments/${experimentId}/blocks`),
  createExperimentBlock: (experimentId: string, payload: Pick<ExperimentBlock, 'block_number' | 'name' | 'notes'>) => request<ExperimentBlock>(`/api/experiments/${experimentId}/blocks`, { method: 'POST', body: JSON.stringify(payload) }),
  listExperimentPlots: (experimentId: string) => request<ExperimentPlot[]>(`/api/experiments/${experimentId}/plots`),
  createExperimentPlot: (experimentId: string, payload: Omit<ExperimentPlot, 'id' | 'experiment_id' | 'block' | 'seed_lots' | 'is_active'>) => request<ExperimentPlot>(`/api/experiments/${experimentId}/plots`, { method: 'POST', body: JSON.stringify(payload) }),
  listPlotAssessments: (plotId: string) => request<PlotAssessment[]>(`/api/experiments/plots/${plotId}/assessments`),
  createPlotAssessment: (plotId: string, payload: {
    descriptor_id: string;
    assessed_at?: string;
    phenological_stage?: string;
    value_text?: string;
    value_number?: number;
    min_value?: number;
    max_value?: number;
    notes?: string;
  }) => request<PlotAssessment>(`/api/experiments/plots/${plotId}/assessments`, { method: 'POST', body: JSON.stringify(payload) })
};
