import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import {
  assertDescriptorDefinition,
  normalizedCode,
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
