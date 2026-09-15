import type { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase.js';
import {
  normalizedCode,
  optionalFiniteNumber,
  optionalText,
  requiredText,
  validationMessage
} from '../lib/validation.js';

type CreateLotBody = {
  code: string;
  genetic_material_id: string;
  parent_lot_id?: string;
  season?: string;
  quantity?: number;
  unit?: string;
  status?: string;
};

type UpdateLotBody = {
  code?: string;
  season?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  is_active?: boolean;
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
    try {
      const code = normalizedCode(request.body.code, 'code', 80);
      const materialId = requiredText(request.body.genetic_material_id, 'genetic_material_id', 36);
      const parentLotId = optionalText(request.body.parent_lot_id, 'parent_lot_id', 36);
      const season = optionalText(request.body.season, 'season', 30);
      const quantity = optionalFiniteNumber(request.body.quantity, 'quantity', { min: 0 });
      const unit = optionalText(request.body.unit, 'unit', 20);
      const status = optionalText(request.body.status, 'status', 30) ?? 'active';

      const [{ data: material }, { data: duplicate }] = await Promise.all([
        supabase.from('genetic_materials').select('id, cultivar_id, is_active').eq('id', materialId).maybeSingle(),
        supabase.from('seed_lots').select('id').eq('code', code).maybeSingle()
      ]);
      if (!material?.is_active) return reply.code(400).send({ error: 'genetic_material_id must reference an active material' });
      if (duplicate) return reply.code(409).send({ error: `Seed lot code ${code} already exists` });

      if (parentLotId) {
        const { data: parent } = await supabase
          .from('seed_lots')
          .select('id, is_active, genetic_materials(cultivar_id)')
          .eq('id', parentLotId)
          .maybeSingle();

        if (!parent?.is_active) return reply.code(400).send({ error: 'parent_lot_id must reference an active lot' });
        const parentMaterial = Array.isArray(parent.genetic_materials)
          ? parent.genetic_materials[0]
          : parent.genetic_materials;
        const parentCultivarId = parentMaterial?.cultivar_id ?? null;
        if (material.cultivar_id && parentCultivarId && material.cultivar_id !== parentCultivarId) {
          return reply.code(400).send({ error: 'Parent and child lots must reference genetic materials of the same cultivar' });
        }
      }

      const actorId = request.authUser!.id;
      const { data, error } = await supabase
        .from('seed_lots')
        .insert({
          code,
          genetic_material_id: materialId,
          parent_lot_id: parentLotId,
          season,
          quantity,
          unit,
          status,
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

  app.patch<{ Params: { id: string }; Body: UpdateLotBody }>('/:id', async (request, reply) => {
    try {
      const { data: current } = await supabase.from('seed_lots').select('*').eq('id', request.params.id).maybeSingle();
      if (!current) return reply.code(404).send({ error: 'Seed lot not found' });

      const update: Record<string, unknown> = { updated_by: request.authUser!.id };
      if (request.body.code !== undefined) update.code = normalizedCode(request.body.code, 'code', 80);
      if (request.body.season !== undefined) update.season = optionalText(request.body.season, 'season', 30) ?? null;
      if (request.body.quantity !== undefined) update.quantity = optionalFiniteNumber(request.body.quantity, 'quantity', { min: 0 }) ?? null;
      if (request.body.unit !== undefined) update.unit = optionalText(request.body.unit, 'unit', 20) ?? null;
      if (request.body.status !== undefined) update.status = optionalText(request.body.status, 'status', 30) ?? 'active';
      if (request.body.is_active !== undefined) {
        if (typeof request.body.is_active !== 'boolean') return reply.code(400).send({ error: 'is_active must be boolean' });
        if (current.is_active && request.body.is_active === false) {
          const { count } = await supabase.from('seed_lots').select('id', { count: 'exact', head: true }).eq('parent_lot_id', current.id).eq('is_active', true);
          if ((count ?? 0) > 0) return reply.code(409).send({ error: 'Deactivate active child lots before deactivating this lot' });
        }
        update.is_active = request.body.is_active;
      }

      if (update.code && update.code !== current.code) {
        const { data: duplicate } = await supabase.from('seed_lots').select('id').eq('code', update.code).neq('id', current.id).maybeSingle();
        if (duplicate) return reply.code(409).send({ error: `Seed lot code ${String(update.code)} already exists` });
      }

      const { data, error } = await supabase.from('seed_lots').update(update).eq('id', current.id).select().single();
      if (error) return reply.code(error.code === '23505' ? 409 : 400).send({ error: error.message });
      return data;
    } catch (error) {
      return reply.code(400).send({ error: validationMessage(error) });
    }
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
