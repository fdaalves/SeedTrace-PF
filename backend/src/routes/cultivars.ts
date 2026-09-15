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

type UpdateCultivarBody = Partial<Omit<CreateCultivarBody, 'crop_id'>> & { is_active?: boolean };

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

  app.patch<{ Params: { id: string }; Body: UpdateCultivarBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('cultivars').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Cultivar not found' });

      const update: Record<string, unknown> = { updated_by: request.authUser!.id };
      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 50);
      if (request.body.name !== undefined) update.name = requiredText(request.body.name, 'name', 160);
      if (request.body.breeder !== undefined) update.breeder = optionalText(request.body.breeder, 'breeder', 160) ?? null;
      if (request.body.cultivar_type !== undefined) update.cultivar_type = optionalText(request.body.cultivar_type, 'cultivar_type', 60) ?? null;
      if (request.body.notes !== undefined) update.notes = optionalText(request.body.notes, 'notes', 2000) ?? null;

      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        if (current.is_active && request.body.is_active === false) {
          const { count } = await supabase.from('genetic_materials').select('id', { count: 'exact', head: true }).eq('cultivar_id', current.id).eq('is_active', true);
          if ((count ?? 0) > 0) return reply.code(409).send({ error: 'Deactivate active genetic materials before deactivating this cultivar' });
        }
        update.is_active = request.body.is_active;
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase.from('cultivars').select('id').eq('code', update.code).neq('id', current.id).maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Cultivar code ${String(update.code)} already exists` });
      }

      const { data, error } = await supabase.from('cultivars').update(update).eq('id', current.id).select().single();
      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
