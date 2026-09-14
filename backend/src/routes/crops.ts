import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

type CreateCropBody = {
  code: string;
  common_name: string;
  scientific_name?: string;
};

export async function cropRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('common_name');

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateCropBody }>('/', async (request, reply) => {
    const { code, common_name, scientific_name } = request.body;

    if (!code || !common_name) {
      return reply.code(400).send({ error: 'code and common_name are required' });
    }

    const { data, error } = await supabase
      .from('crops')
      .insert({ code, common_name, scientific_name })
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(201).send(data);
  });
}
