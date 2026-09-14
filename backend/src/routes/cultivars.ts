import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

type CreateCultivarBody = {
  crop_id: string;
  code: string;
  name: string;
  breeder?: string;
  cultivar_type?: string;
  notes?: string;
};

export async function cultivarRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('cultivars')
      .select('*, crops(code, common_name, scientific_name)')
      .order('name');

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateCultivarBody }>('/', async (request, reply) => {
    const body = request.body;

    if (!body.crop_id || !body.code || !body.name) {
      return reply.code(400).send({ error: 'crop_id, code and name are required' });
    }

    const { data, error } = await supabase
      .from('cultivars')
      .insert(body)
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(201).send(data);
  });
}
