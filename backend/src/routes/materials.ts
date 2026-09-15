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

type UpdateMaterialBody = Partial<Omit<CreateMaterialBody, 'cultivar_id'>> & { is_active?: boolean };

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

  app.patch<{ Params: { id: string }; Body: UpdateMaterialBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('genetic_materials').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Genetic material not found' });

      const update: Record<string, unknown> = { updated_by: request.authUser!.id };
      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 80);
      if (request.body.material_category !== undefined) update.material_category = optionalText(request.body.material_category, 'material_category', 80) ?? null;
      if (request.body.origin !== undefined) update.origin = optionalText(request.body.origin, 'origin', 255) ?? null;
      if (request.body.responsible_name !== undefined) update.responsible_name = optionalText(request.body.responsible_name, 'responsible_name', 160) ?? null;
      if (request.body.notes !== undefined) update.notes = optionalText(request.body.notes, 'notes', 2000) ?? null;
      if (request.body.received_at !== undefined) {
        const receivedAt = optionalText(request.body.received_at, 'received_at', 10);
        if (receivedAt && !/^\d{4}-\d{2}-\d{2}$/.test(receivedAt)) return reply.code(400).send({ error: 'received_at must use YYYY-MM-DD format' });
        update.received_at = receivedAt ?? null;
      }
      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        if (current.is_active && request.body.is_active === false) {
          const { count } = await supabase.from('seed_lots').select('id', { count: 'exact', head: true }).eq('genetic_material_id', current.id).eq('is_active', true);
          if ((count ?? 0) > 0) return reply.code(409).send({ error: 'Deactivate active seed lots before deactivating this material' });
        }
        update.is_active = request.body.is_active;
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase.from('genetic_materials').select('id').eq('code', update.code).neq('id', current.id).maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Genetic material code ${String(update.code)} already exists` });
      }

      const { data, error } = await supabase.from('genetic_materials').update(update).eq('id', current.id).select().single();
      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
