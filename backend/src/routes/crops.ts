import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { normalizedCode, requiredText, optionalText, validationMessage } from '../lib/validation.js';

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
    try {
      const code = normalizedCode(request.body.code, 'code', 30);
      const commonName = requiredText(request.body.common_name, 'common_name', 120);
      const scientificName = optionalText(request.body.scientific_name, 'scientific_name', 180);
      const actorId = request.authUser!.id;

      const { data: duplicate } = await supabase.from('crops').select('id').eq('code', code).maybeSingle();
      if (duplicate) return reply.code(409).send({ error: `Crop code ${code} already exists` });

      const { data, error } = await supabase
        .from('crops')
        .insert({ code, common_name: commonName, scientific_name: scientificName, created_by: actorId, updated_by: actorId })
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
