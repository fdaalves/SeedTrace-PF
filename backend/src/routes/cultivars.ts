import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { normalizedCode, optionalText, requiredText, validationMessage } from '../lib/validation.js';

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
    try {
      const cropId = requiredText(request.body.crop_id, 'crop_id', 36);
      const code = normalizedCode(request.body.code, 'code', 50);
      const name = requiredText(request.body.name, 'name', 160);
      const breeder = optionalText(request.body.breeder, 'breeder', 160);
      const cultivarType = optionalText(request.body.cultivar_type, 'cultivar_type', 60);
      const notes = optionalText(request.body.notes, 'notes', 2000);

      const [{ data: crop }, { data: duplicate }] = await Promise.all([
        supabase.from('crops').select('id').eq('id', cropId).eq('is_active', true).maybeSingle(),
        supabase.from('cultivars').select('id').eq('code', code).maybeSingle()
      ]);
      if (!crop) return reply.code(400).send({ error: 'crop_id must reference an active crop' });
      if (duplicate) return reply.code(409).send({ error: `Cultivar code ${code} already exists` });

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('cultivars')
        .insert({ crop_id: cropId, code, name, breeder, cultivar_type: cultivarType, notes, created_by: actorId, updated_by: actorId })
        .select()
        .single();

      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return reply.code(201).send(data);
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
