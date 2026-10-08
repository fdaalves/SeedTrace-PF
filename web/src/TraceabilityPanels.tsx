import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import type { Cultivar, GeneticMaterial, SeedLot } from './types';
import './traceability.css';

export function MaterialsPanel({ cultivars }: { cultivars: Cultivar[] }) {
  const [materials, setMaterials] = useState<GeneticMaterial[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try { setMaterials(await api.listMaterials()); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar materiais'); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    try {
      const form = new FormData(formElement);
      await api.createMaterial({
        code: String(form.get('code')),
        cultivar_id: String(form.get('cultivar_id') || '') || null,
        material_category: String(form.get('material_category') || ''),
        origin: String(form.get('origin') || ''),
        received_at: String(form.get('received_at') || '') || null,
        responsible_name: String(form.get('responsible_name') || ''),
        notes: String(form.get('notes') || '')
      });
      formElement.reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao cadastrar material'); }
  }

  return <section className="grid">
    <form className="panel form" onSubmit={submit}>
      <h3>Novo material genético</h3>
      <p className="trace-note">Identifique a origem do material antes de criar os lotes que serão multiplicados.</p>
      <label>Código<input name="code" required placeholder="MAT-PF-001" /></label>
      <label>Cultivar<select name="cultivar_id"><option value="">Sem vínculo</option>{cultivars.filter(c => c.is_active !== false).map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
      <label>Categoria<select name="material_category"><option value="Pre-Foundation">Pre-Foundation</option><option value="Genetic">Genetic</option><option value="Foundation">Foundation</option><option value="Linhagem">Linhagem</option></select></label>
      <label>Origem<input name="origin" placeholder="Programa de melhoramento / local" /></label>
      <label>Data de recebimento<input name="received_at" type="date" /></label>
      <label>Responsável<input name="responsible_name" /></label>
      <label>Observações<input name="notes" /></label>
      <button className="primary">Cadastrar material</button>
      {error && <p className="form-error">{error}</p>}
    </form>
    <div className="panel list"><h3>Materiais cadastrados</h3>{materials.length === 0 ? <p className="empty">Nenhum material cadastrado.</p> : materials.map(m => <div className="list-row" key={m.id}><strong>{m.code}</strong><span>{m.cultivars?.name || 'Sem cultivar'}</span><span>{m.is_active === false ? 'Inativo' : m.material_category || '—'}</span></div>)}</div>
  </section>;
}

export function LotsPanel() {
  const [materials, setMaterials] = useState<GeneticMaterial[]>([]);
  const [lots, setLots] = useState<SeedLot[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [materialData, lotData] = await Promise.all([api.listMaterials(), api.listLots()]);
      setMaterials(materialData); setLots(lotData); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar lotes'); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    try {
      const form = new FormData(formElement);
      const quantity = String(form.get('quantity') || '');
      await api.createLot({
        code: String(form.get('code')),
        genetic_material_id: String(form.get('genetic_material_id')),
        parent_lot_id: String(form.get('parent_lot_id') || '') || null,
        season: String(form.get('season') || ''),
        quantity: quantity ? Number(quantity) : null,
        unit: String(form.get('unit') || ''),
        status: String(form.get('status') || 'active')
      });
      formElement.reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao cadastrar lote'); }
  }

  const activeMaterials = materials.filter(m => m.is_active !== false);
  const activeLots = lots.filter(l => l.is_active !== false);

  return <section className="grid">
    <form className="panel form" onSubmit={submit}>
      <h3>Novo lote</h3>
      <p className="trace-note">O lote pai mantém a genealogia entre gerações de multiplicação.</p>
      <label>Código<input name="code" required placeholder="LOT-PF-2026-001" /></label>
      <label>Material genético<select name="genetic_material_id" required><option value="">Selecione</option>{activeMaterials.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}</select></label>
      <label>Lote pai<select name="parent_lot_id"><option value="">Sem lote pai</option>{activeLots.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}</select></label>
      <label>Safra<input name="season" placeholder="2026/27" /></label>
      <label>Quantidade<input name="quantity" type="number" min="0" step="0.001" /></label>
      <label>Unidade<select name="unit"><option value="kg">kg</option><option value="g">g</option><option value="seeds">sementes</option><option value="bags">sacos</option></select></label>
      <label>Status<select name="status"><option value="active">Ativo</option><option value="blocked">Bloqueado</option><option value="approved">Aprovado</option><option value="consumed">Consumido</option></select></label>
      <button className="primary">Cadastrar lote</button>
      {error && <p className="form-error">{error}</p>}
    </form>
    <div className="panel list"><h3>Lotes e genealogia</h3>{lots.length === 0 ? <p className="empty">Nenhum lote cadastrado.</p> : lots.map(l => <div className="list-row" key={l.id}><strong>{l.code}</strong><span>{l.parent?.code ? `Filho de ${l.parent.code}` : 'Lote inicial'}</span><span>{l.is_active === false ? 'Inativo' : `${l.quantity ?? '—'} ${l.unit || ''}`}</span></div>)}</div>
  </section>;
}
