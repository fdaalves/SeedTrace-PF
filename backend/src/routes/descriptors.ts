import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import {
  assertDescriptorDefinition,
  normalizedCode,
  normalizeOptionList,
  optionalText,
  requiredText,
  validateVarietalValue,
  validationMessage
} from '../lib/validation.js';

type CreateDescriptorBody = {
  crop_id: string;
  code: string;
  name: string;
  data_type: string;
  unit?: string;
  phenological_stage?: string;
  criticality?: string;
  allowed_values?: unknown;
};

type UpdateDescriptorBody = {
  code?: string;
  name?: string;
  unit?: string;
  phenological_stage?: string;
  criticality?: string;
  allowed_values?: unknown;
  is_active?: boolean;
};

type SetCultivarValueBody = {
  cultivar_id: string;
  descriptor_id: string;
  value_text?: string;
  value_number?: number;
  min_value?: number;
  max_value?: number;
  notes?: string;
};

export async function descriptorRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('descriptor_definitions')
      .select('*, crops(code, common_name)')
      .order('name');

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateDescriptorBody }>('/', async (request, reply) => {
    try {
      const cropId = requiredText(request.body.crop_id, 'crop_id', 36);
      const code = normalizedCode(request.body.code, 'code', 80);
      const name = requiredText(request.body.name, 'name', 160);
      const allowedValues = assertDescriptorDefinition(request.body);
      const unit = optionalText(request.body.unit, 'unit', 40);
      const phenologicalStage = optionalText(request.body.phenological_stage, 'phenological_stage', 80);
      const criticality = optionalText(request.body.criticality, 'criticality', 20);

      const [{ data: crop }, { data: duplicate }] = await Promise.all([
        supabase.from('crops').select('id').eq('id', cropId).eq('is_active', true).maybeSingle(),
        supabase.from('descriptor_definitions').select('id').eq('crop_id', cropId).eq('code', code).maybeSingle()
      ]);
      if (!crop) return reply.code(400).send({ error: 'crop_id must reference an active crop' });
      if (duplicate) return reply.code(409).send({ error: `Descriptor code ${code} already exists for this crop` });

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('descriptor_definitions')
        .insert({
          crop_id: cropId,
          code,
          name,
          data_type: request.body.data_type,
          unit,
          phenological_stage: phenologicalStage,
          criticality,
          allowed_values: allowedValues,
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

  app.patch<{ Params: { id: string }; Body: UpdateDescriptorBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('descriptor_definitions').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Descriptor not found' });

      const update: Record<string, unknown> = { updated_by: request.authUser!.id };
      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 80);
      if (request.body.name !== undefined) update.name = requiredText(request.body.name, 'name', 160);
      if (request.body.unit !== undefined) update.unit = optionalText(request.body.unit, 'unit', 40) ?? null;
      if (request.body.phenological_stage !== undefined) update.phenological_stage = optionalText(request.body.phenological_stage, 'phenological_stage', 80) ?? null;
      if (request.body.criticality !== undefined) {
        const criticality = optionalText(request.body.criticality, 'criticality', 20);
        if (criticality && !['low', 'medium', 'high', 'critical'].includes(criticality)) {
          return reply.code(400).send({ error: 'criticality must be one of: low, medium, high, critical' });
        }
        update.criticality = criticality ?? null;
      }

      if (request.body.allowed_values !== undefined) {
        if (current.data_type !== 'option') return reply.code(400).send({ error: 'allowed_values is only valid for option descriptors' });
        const allowed = normalizeOptionList(request.body.allowed_values);
        if (!allowed || allowed.length < 2) return reply.code(400).send({ error: 'option descriptors require at least two allowed_values' });
        const { data: usedValues } = await supabase.from('cultivar_descriptor_values').select('value_text').eq('descriptor_id', current.id);
        const missing = (usedValues ?? []).map((row) => row.value_text).filter((value): value is string => Boolean(value) && !allowed.includes(value));
        if (missing.length > 0) return reply.code(409).send({ error: `Cannot remove option values currently in use: ${[...new Set(missing)].join(', ')}` });
        update.allowed_values = allowed;
      }

      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        update.is_active = request.body.is_active;
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase.from('descriptor_definitions').select('id').eq('crop_id', current.crop_id).eq('code', update.code).neq('id', current.id).maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Descriptor code ${String(update.code)} already exists for this crop` });
      }

      const { data, error } = await supabase.from('descriptor_definitions').update(update).eq('id', current.id).select().single();
      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });

  app.post<{ Body: SetCultivarValueBody }>('/values', async (request, reply) => {
    try {
      const cultivarId = requiredText(request.body.cultivar_id, 'cultivar_id', 36);
      const descriptorId = requiredText(request.body.descriptor_id, 'descriptor_id', 36);

      const [{ data: cultivar }, { data: descriptor }] = await Promise.all([
        supabase.from('cultivars').select('id, crop_id, is_active').eq('id', cultivarId).maybeSingle(),
        supabase.from('descriptor_definitions').select('id, crop_id, data_type, allowed_values, is_active').eq('id', descriptorId).maybeSingle()
      ]);

      if (!cultivar?.is_active) return reply.code(400).send({ error: 'cultivar_id must reference an active cultivar' });
      if (!descriptor?.is_active) return reply.code(400).send({ error: 'descriptor_id must reference an active descriptor' });
      if (cultivar.crop_id !== descriptor.crop_id) {
        return reply.code(400).send({ error: 'Cultivar and descriptor must belong to the same crop' });
      }

      const value = validateVarietalValue(descriptor, request.body);
      const actorId = request.authUser!.id;
      const { data: existing, error: lookupError } = await supabase
        .from('cultivar_descriptor_values')
        .select('id')
        .eq('cultivar_id', cultivarId)
        .eq('descriptor_id', descriptorId)
        .maybeSingle();

      if (lookupError) return reply.code(400).send({ error: lookupError.message });

      const payload = { cultivar_id: cultivarId, descriptor_id: descriptorId, ...value };
      const mutation = existing
        ? supabase.from('cultivar_descriptor_values').update({ ...payload, updated_by: actorId }).eq('id', existing.id)
        : supabase.from('cultivar_descriptor_values').insert({ ...payload, created_by: actorId, updated_by: actorId });

      const { data, error } = await mutation.select().single();
      if (error) return reply.code(400).send({ error: error.message });
      return reply.code(200).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
