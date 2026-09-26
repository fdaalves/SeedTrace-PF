import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import {
  finiteNumber,
  normalizedCode,
  optionalFiniteNumber,
  optionalText,
  requiredText,
  validateVarietalValue,
  validationMessage
} from '../lib/validation.js';

type CreateExperimentBody = {
  code: string;
  name: string;
  crop_id: string;
  season?: string;
  location_name?: string;
  objective?: string;
  design_type?: string;
  replications?: number;
  sowing_date?: string;
  harvest_date?: string;
  status?: string;
  responsible_name?: string;
  notes?: string;
};

type UpdateExperimentBody = Partial<Omit<CreateExperimentBody, 'crop_id'>> & {
  is_active?: boolean;
};

type CreateBlockBody = {
  block_number: number;
  name?: string;
  notes?: string;
};

type CreatePlotBody = {
  block_id?: string;
  plot_number: number;
  plot_code: string;
  seed_lot_id?: string;
  treatment_label: string;
  rows_count?: number;
  plot_length_m?: number;
  row_spacing_m?: number;
  planned_seed_count?: number;
  status?: string;
  notes?: string;
};

type CreateAssessmentBody = {
  descriptor_id: string;
  assessed_at?: string;
  phenological_stage?: string;
  value_text?: unknown;
  value_number?: unknown;
  min_value?: unknown;
  max_value?: unknown;
  notes?: unknown;
};

const experimentStatuses = ['draft', 'planned', 'active', 'completed', 'cancelled'] as const;
const plotStatuses = ['planned', 'sown', 'active', 'harvested', 'discarded'] as const;

function enumValue<T extends readonly string[]>(value: unknown, field: string, allowed: T, fallback?: T[number]) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T[number])) {
    throw new Error(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T[number];
}

function optionalDate(value: unknown, field: string) {
  const normalized = optionalText(value, field, 10);
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }
  return normalized;
}

function optionalTimestamp(value: unknown, field: string) {
  const normalized = optionalText(value, field, 40);
  if (!normalized) return undefined;
  if (Number.isNaN(Date.parse(normalized))) throw new Error(`${field} must be a valid date/time`);
  return new Date(normalized).toISOString();
}

export async function experimentRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('experiments')
      .select('*, crops(code, common_name, scientific_name)')
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateExperimentBody }>('/', async (request, reply) => {
    try {
      const code = normalizedCode(request.body.code, 'code', 80);
      const name = requiredText(request.body.name, 'name', 180);
      const cropId = requiredText(request.body.crop_id, 'crop_id', 36);
      const season = optionalText(request.body.season, 'season', 30);
      const locationName = optionalText(request.body.location_name, 'location_name', 180);
      const objective = optionalText(request.body.objective, 'objective', 4000);
      const designType = optionalText(request.body.design_type, 'design_type', 60) ?? 'RCBD';
      const replications = request.body.replications === undefined
        ? 1
        : finiteNumber(request.body.replications, 'replications', { min: 1, integer: true });
      const sowingDate = optionalDate(request.body.sowing_date, 'sowing_date');
      const harvestDate = optionalDate(request.body.harvest_date, 'harvest_date');
      const status = enumValue(request.body.status, 'status', experimentStatuses, 'planned');
      const responsibleName = optionalText(request.body.responsible_name, 'responsible_name', 160);
      const notes = optionalText(request.body.notes, 'notes', 4000);

      if (sowingDate && harvestDate && harvestDate < sowingDate) {
        return reply.code(400).send({ error: 'harvest_date cannot be earlier than sowing_date' });
      }

      const [{ data: crop }, { data: duplicate }] = await Promise.all([
        supabase.from('crops').select('id').eq('id', cropId).eq('is_active', true).maybeSingle(),
        supabase.from('experiments').select('id').eq('code', code).maybeSingle()
      ]);

      if (!crop) return reply.code(400).send({ error: 'crop_id must reference an active crop' });
      if (duplicate) return reply.code(409).send({ error: `Experiment code ${code} already exists` });

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('experiments')
        .insert({
          code,
          name,
          crop_id: cropId,
          season,
          location_name: locationName,
          objective,
          design_type: designType,
          replications,
          sowing_date: sowingDate,
          harvest_date: harvestDate,
          status,
          responsible_name: responsibleName,
          notes,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdateExperimentBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('experiments').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Experiment not found' });

      const update: Record<string, unknown> = {
        updated_by: request.authUser!.id,
        updated_at: new Date().toISOString()
      };

      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 80);
      if (request.body.name !== undefined) update.name = requiredText(request.body.name, 'name', 180);
      if (request.body.season !== undefined) update.season = optionalText(request.body.season, 'season', 30) ?? null;
      if (request.body.location_name !== undefined) update.location_name = optionalText(request.body.location_name, 'location_name', 180) ?? null;
      if (request.body.objective !== undefined) update.objective = optionalText(request.body.objective, 'objective', 4000) ?? null;
      if (request.body.design_type !== undefined) update.design_type = requiredText(request.body.design_type, 'design_type', 60);
      if (request.body.replications !== undefined) update.replications = finiteNumber(request.body.replications, 'replications', { min: 1, integer: true });
      if (request.body.sowing_date !== undefined) update.sowing_date = optionalDate(request.body.sowing_date, 'sowing_date') ?? null;
      if (request.body.harvest_date !== undefined) update.harvest_date = optionalDate(request.body.harvest_date, 'harvest_date') ?? null;
      if (request.body.status !== undefined) update.status = enumValue(request.body.status, 'status', experimentStatuses);
      if (request.body.responsible_name !== undefined) update.responsible_name = optionalText(request.body.responsible_name, 'responsible_name', 160) ?? null;
      if (request.body.notes !== undefined) update.notes = optionalText(request.body.notes, 'notes', 4000) ?? null;
      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        update.is_active = request.body.is_active;
      }

      const nextSowing = (update.sowing_date ?? current.sowing_date) as string | null;
      const nextHarvest = (update.harvest_date ?? current.harvest_date) as string | null;
      if (nextSowing && nextHarvest && nextHarvest < nextSowing) {
        return reply.code(400).send({ error: 'harvest_date cannot be earlier than sowing_date' });
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase
          .from('experiments')
          .select('id')
          .eq('code', update.code)
          .neq('id', current.id)
          .maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Experiment code ${String(update.code)} already exists` });
      }

      const { data, error } = await supabase
        .from('experiments')
        .update(update)
        .eq('id', current.id)
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });

  app.get<{ Params: { id: string } }>('/:id/blocks', async (request, reply) => {
    const { data, error } = await supabase
      .from('experiment_blocks')
      .select('*')
      .eq('experiment_id', request.params.id)
      .order('block_number');

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Params: { id: string }; Body: CreateBlockBody }>('/:id/blocks', async (request, reply) => {
    try {
      const blockNumber = finiteNumber(request.body.block_number, 'block_number', { min: 1, integer: true });
      const name = optionalText(request.body.name, 'name', 120);
      const notes = optionalText(request.body.notes, 'notes', 2000);

      const { data: experiment } = await supabase
        .from('experiments')
        .select('id, is_active')
        .eq('id', request.params.id)
        .maybeSingle();

      if (!experiment || experiment.is_active === false) {
        return reply.code(404).send({ error: 'Active experiment not found' });
      }

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('experiment_blocks')
        .insert({
          experiment_id: experiment.id,
          block_number: blockNumber,
          name,
          notes,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });

  app.get<{ Params: { id: string } }>('/:id/plots', async (request, reply) => {
    const { data, error } = await supabase
      .from('experiment_plots')
      .select('*, block:experiment_blocks(block_number, name), seed_lots(code, status, genetic_materials(code, cultivars(code, name)))')
      .eq('experiment_id', request.params.id)
      .order('plot_number');

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Params: { id: string }; Body: CreatePlotBody }>('/:id/plots', async (request, reply) => {
    try {
      const plotNumber = finiteNumber(request.body.plot_number, 'plot_number', { min: 1, integer: true });
      const plotCode = normalizedCode(request.body.plot_code, 'plot_code', 100);
      const treatmentLabel = requiredText(request.body.treatment_label, 'treatment_label', 180);
      const blockId = optionalText(request.body.block_id, 'block_id', 36);
      const seedLotId = optionalText(request.body.seed_lot_id, 'seed_lot_id', 36);
      const rowsCount = optionalFiniteNumber(request.body.rows_count, 'rows_count', { min: 1, integer: true });
      const plotLength = optionalFiniteNumber(request.body.plot_length_m, 'plot_length_m', { min: 0.001 });
      const rowSpacing = optionalFiniteNumber(request.body.row_spacing_m, 'row_spacing_m', { min: 0.001 });
      const plannedSeedCount = optionalFiniteNumber(request.body.planned_seed_count, 'planned_seed_count', { min: 0, integer: true });
      const status = enumValue(request.body.status, 'status', plotStatuses, 'planned');
      const notes = optionalText(request.body.notes, 'notes', 2000);

      const { data: experiment } = await supabase
        .from('experiments')
        .select('id, is_active')
        .eq('id', request.params.id)
        .maybeSingle();
      if (!experiment || experiment.is_active === false) {
        return reply.code(404).send({ error: 'Active experiment not found' });
      }

      if (blockId) {
        const { data: block } = await supabase
          .from('experiment_blocks')
          .select('id')
          .eq('id', blockId)
          .eq('experiment_id', experiment.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!block) return reply.code(400).send({ error: 'block_id must belong to the active experiment' });
      }

      if (seedLotId) {
        const { data: lot } = await supabase
          .from('seed_lots')
          .select('id')
          .eq('id', seedLotId)
          .eq('is_active', true)
          .maybeSingle();
        if (!lot) return reply.code(400).send({ error: 'seed_lot_id must reference an active seed lot' });
      }

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('experiment_plots')
        .insert({
          experiment_id: experiment.id,
          block_id: blockId,
          plot_number: plotNumber,
          plot_code: plotCode,
          seed_lot_id: seedLotId,
          treatment_label: treatmentLabel,
          rows_count: rowsCount,
          plot_length_m: plotLength,
          row_spacing_m: rowSpacing,
          planned_seed_count: plannedSeedCount,
          status,
          notes,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });

  app.get<{ Params: { plotId: string } }>('/plots/:plotId/assessments', async (request, reply) => {
    const { data, error } = await supabase
      .from('plot_assessments')
      .select('*, descriptor_definitions(code, name, data_type, unit, phenological_stage)')
      .eq('plot_id', request.params.plotId)
      .order('assessed_at', { ascending: false });

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Params: { plotId: string }; Body: CreateAssessmentBody }>('/plots/:plotId/assessments', async (request, reply) => {
    try {
      const descriptorId = requiredText(request.body.descriptor_id, 'descriptor_id', 36);
      const assessedAt = optionalTimestamp(request.body.assessed_at, 'assessed_at') ?? new Date().toISOString();
      const phenologicalStage = optionalText(request.body.phenological_stage, 'phenological_stage', 80);

      const { data: plot } = await supabase
        .from('experiment_plots')
        .select('id, is_active, experiments(crop_id, is_active)')
        .eq('id', request.params.plotId)
        .maybeSingle();

      if (!plot || plot.is_active === false) return reply.code(404).send({ error: 'Active plot not found' });

      const experimentRelation = Array.isArray(plot.experiments) ? plot.experiments[0] : plot.experiments;
      if (!experimentRelation || experimentRelation.is_active === false) {
        return reply.code(400).send({ error: 'Plot experiment is not active' });
      }

      const { data: descriptor } = await supabase
        .from('descriptor_definitions')
        .select('id, crop_id, data_type, allowed_values, is_active')
        .eq('id', descriptorId)
        .maybeSingle();

      if (!descriptor || descriptor.is_active === false) {
        return reply.code(400).send({ error: 'descriptor_id must reference an active descriptor' });
      }
      if (descriptor.crop_id !== experimentRelation.crop_id) {
        return reply.code(400).send({ error: 'descriptor_id must belong to the experiment crop' });
      }

      const normalized = validateVarietalValue(descriptor, request.body);
      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('plot_assessments')
        .insert({
          plot_id: plot.id,
          descriptor_id: descriptor.id,
          assessed_at: assessedAt,
          phenological_stage: phenologicalStage,
          ...normalized,
          created_by: actorId,
          updated_by: actorId
        })
        .select()
        .single();

      if (error) return reply.code(400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
