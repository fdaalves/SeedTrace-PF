export type AppRole = 'admin' | 'manager' | 'technician' | 'field_operator' | 'viewer';

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
};

export type ManagedUser = UserProfile & {
  created_at?: string;
  updated_at?: string;
};

export type Crop = {
  id: string;
  code: string;
  common_name: string;
  scientific_name?: string | null;
};

export type Cultivar = {
  id: string;
  crop_id: string;
  code: string;
  name: string;
  breeder?: string | null;
  cultivar_type?: string | null;
  notes?: string | null;
  crops?: { code: string; common_name: string; scientific_name?: string | null } | null;
};

export type Descriptor = {
  id: string;
  crop_id: string;
  code: string;
  name: string;
  data_type: string;
  unit?: string | null;
  phenological_stage?: string | null;
  criticality?: string | null;
  allowed_values?: string[] | null;
  crops?: { code: string; common_name: string } | null;
};

export type VarietalValue = {
  id: string;
  cultivar_id: string;
  descriptor_id: string;
  value_text?: string | null;
  value_number?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  notes?: string | null;
};

export type GeneticMaterial = {
  id: string;
  code: string;
  cultivar_id?: string | null;
  material_category?: string | null;
  origin?: string | null;
  received_at?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  cultivars?: { code: string; name: string } | null;
};

export type SeedLot = {
  id: string;
  code: string;
  genetic_material_id: string;
  parent_lot_id?: string | null;
  season?: string | null;
  quantity?: number | null;
  unit?: string | null;
  status?: string | null;
  genetic_materials?: { code: string; material_category?: string | null } | null;
  parent?: { code: string } | null;
};
