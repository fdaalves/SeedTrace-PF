import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

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
    const body = request.body;

    if (!body.crop_id || !body.code || !body.name || !body.data_type) {
      return reply.code(400).send({ error: 'crop_id, code, name and data_type are required' });
    }

    const actorId = request.authUser!.id;
    const { data, error } = await supabase
      .from('descriptor_definitions')
      .insert({ ...body, created_by: actorId, updated_by: actorId })
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(201).send(data);
  });

  app.post<{ Body: SetCultivarValueBody }>('/values', async (request, reply) => {
    const body = request.body;

    if (!body.cultivar_id || !body.descriptor_id) {
      return reply.code(400).send({ error: 'cultivar_id and descriptor_id are required' });
    }

    const actorId = request.authUser!.id;
    const { data: existing, error: lookupError } = await supabase
      .from('cultivar_descriptor_values')
      .select('id')
      .eq('cultivar_id', body.cultivar_id)
      .eq('descriptor_id', body.descriptor_id)
      .maybeSingle();

    if (lookupError) return reply.code(400).send({ error: lookupError.message });

    const mutation = existing
      ? supabase
          .from('cultivar_descriptor_values')
          .update({ ...body, updated_by: actorId })
          .eq('id', existing.id)
      : supabase
          .from('cultivar_descriptor_values')
          .insert({ ...body, created_by: actorId, updated_by: actorId });

    const { data, error } = await mutation.select().single();
    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(200).send(data);
  });
}
