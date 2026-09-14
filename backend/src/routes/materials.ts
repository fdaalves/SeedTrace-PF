import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

type CreateMaterialBody = {
  code: string;
  cultivar_id?: string;
  material_category?: string;
  origin?: string;
  received_at?: string;
  responsible_name?: string;
  notes?: string;
};

export async function materialRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('genetic_materials')
      .select('*, cultivars(code, name)')
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateMaterialBody }>('/', async (request, reply) => {
    const body = request.body;

    if (!body.code) {
      return reply.code(400).send({ error: 'code is required' });
    }

    const actorId = request.authUser!.id;
    const { data, error } = await supabase
      .from('genetic_materials')
      .insert({ ...body, created_by: actorId, updated_by: actorId })
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(201).send(data);
  });
}
