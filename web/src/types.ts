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
  crops?: {
    code: string;
    common_name: string;
    scientific_name?: string | null;
  } | null;
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
  allowed_values?: unknown;
  crops?: {
    code: string;
    common_name: string;
  } | null;
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
