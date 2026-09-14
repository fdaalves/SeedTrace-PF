import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { requiredText, validateVarietalValue, validationMessage } from '../lib/validation.js';

type Query = { cultivar_id?: string };

type Body = {
  cultivar_id: string;
  descriptor_id: string;
  value_text?: string;
  value_number?: number;
  min_value?: number;
  max_value?: number;
  notes?: string;
};

export async function varietalValueRoutes(app: FastifyInstance) {
  app.get<{ Querystring: Query }>('/', async (request, reply) => {
    let query = supabase.from('cultivar_descriptor_values').select('*');
    if (request.query.cultivar_id) query = query.eq('cultivar_id', request.query.cultivar_id);
    const { data, error } = await query;
    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: Body }>('/', async (request, reply) => {
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
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
