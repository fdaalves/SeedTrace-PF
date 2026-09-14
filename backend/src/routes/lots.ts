import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';

type CreateLotBody = {
  code: string;
  genetic_material_id: string;
  parent_lot_id?: string;
  season?: string;
  quantity?: number;
  unit?: string;
  status?: string;
};

export async function lotRoutes(app: FastifyInstance) {
  app.get('/', async (_request, reply) => {
    const { data, error } = await supabase
      .from('seed_lots')
      .select('*, genetic_materials(code, material_category), parent:parent_lot_id(code)')
      .order('created_at', { ascending: false });

    if (error) return reply.code(500).send({ error: error.message });
    return data;
  });

  app.post<{ Body: CreateLotBody }>('/', async (request, reply) => {
    const body = request.body;

    if (!body.code || !body.genetic_material_id) {
      return reply.code(400).send({ error: 'code and genetic_material_id are required' });
    }

    const { data, error } = await supabase
      .from('seed_lots')
      .insert(body)
      .select()
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    return reply.code(201).send(data);
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { data, error } = await supabase
      .from('seed_lots')
      .select('*, genetic_materials(*, cultivars(*)), parent:parent_lot_id(*)')
      .eq('id', request.params.id)
      .single();

    if (error) return reply.code(404).send({ error: error.message });
    return data;
  });
}
