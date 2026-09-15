import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { normalizedCode, requiredText, optionalText, validationMessage } from '../lib/validation.js';

type CreateCropBody = {
  code: string;
  common_name: string;
  scientific_name?: string;
};

type UpdateCropBody = Partial<CreateCropBody> & { is_active?: boolean };

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

  app.patch<{ Params: { id: string }; Body: UpdateCropBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('crops').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Crop not found' });

      const update: Record<string, unknown> = { updated_by: request.authUser!.id };
      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 30);
      if (request.body.common_name !== undefined) update.common_name = requiredText(request.body.common_name, 'common_name', 120);
      if (request.body.scientific_name !== undefined) update.scientific_name = optionalText(request.body.scientific_name, 'scientific_name', 180) ?? null;
      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        if (current.is_active && request.body.is_active === false) {
          const [{ count: cultivarCount }, { count: descriptorCount }] = await Promise.all([
            supabase.from('cultivars').select('id', { count: 'exact', head: true }).eq('crop_id', current.id).eq('is_active', true),
            supabase.from('descriptor_definitions').select('id', { count: 'exact', head: true }).eq('crop_id', current.id).eq('is_active', true)
          ]);
          if ((cultivarCount ?? 0) > 0 || (descriptorCount ?? 0) > 0) {
            return reply.code(409).send({ error: 'Deactivate active cultivars and descriptors before deactivating this crop' });
          }
        }
        update.is_active = request.body.is_active;
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase.from('crops').select('id').eq('code', update.code).neq('id', current.id).maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Crop code ${String(update.code)} already exists` });
      }

      const { data, error } = await supabase.from('crops').update(update).eq('id', current.id).select().single();
      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
  });
}
