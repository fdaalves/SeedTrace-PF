import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

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
    if (!request.body.cultivar_id || !request.body.descriptor_id) {
      return reply.code(400).send({ error: 'cultivar_id and descriptor_id are required' });
    }
    const { data, error } = await supabase
      .from('cultivar_descriptor_values')
      .upsert(request.body, { onConflict: 'cultivar_id,descriptor_id' })
      .select()
      .single();
    if (error) return reply.code(400).send({ error: error.message });
    return data;
  });
}
