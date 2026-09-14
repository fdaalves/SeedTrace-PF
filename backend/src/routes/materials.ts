import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { normalizedCode, optionalText, validationMessage } from '../lib/validation.js';

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
    try {
      const code = normalizedCode(request.body.code, 'code', 80);
      const cultivarId = optionalText(request.body.cultivar_id, 'cultivar_id', 36);
      const materialCategory = optionalText(request.body.material_category, 'material_category', 80);
      const origin = optionalText(request.body.origin, 'origin', 255);
      const receivedAt = optionalText(request.body.received_at, 'received_at', 10);
      const responsibleName = optionalText(request.body.responsible_name, 'responsible_name', 160);
      const notes = optionalText(request.body.notes, 'notes', 2000);

      if (receivedAt && !/^\d{4}-\d{2}-\d{2}$/.test(receivedAt)) {
        return reply.code(400).send({ error: 'received_at must use YYYY-MM-DD format' });
      }

      const { data: duplicate } = await supabase.from('genetic_materials').select('id').eq('code', code).maybeSingle();
      if (duplicate) return reply.code(409).send({ error: `Genetic material code ${code} already exists` });

      if (cultivarId) {
        const { data: cultivar } = await supabase
          .from('cultivars')
          .select('id')
          .eq('id', cultivarId)
          .eq('is_active', true)
          .maybeSingle();
        if (!cultivar) return reply.code(400).send({ error: 'cultivar_id must reference an active cultivar' });
      }

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('genetic_materials')
        .insert({
          code,
          cultivar_id: cultivarId,
          material_category: materialCategory,
          origin,
          received_at: receivedAt,
          responsible_name: responsibleName,
          notes,
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
}
