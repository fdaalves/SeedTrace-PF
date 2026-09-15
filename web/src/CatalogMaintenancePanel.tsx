import { useEffect, useState } from 'react';
import { api } from './api';
import type { Crop, Cultivar, Descriptor, GeneticMaterial, SeedLot } from './types';
import './maintenance.css';

type Section = 'crops' | 'cultivars' | 'descriptors' | 'materials' | 'lots';

export function CatalogMaintenancePanel() {
  const [section, setSection] = useState<Section>('crops');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [cultivars, setCultivars] = useState<Cultivar[]>([]);
  const [descriptors, setDescriptors] = useState<Descriptor[]>([]);
  const [materials, setMaterials] = useState<GeneticMaterial[]>([]);
  const [lots, setLots] = useState<SeedLot[]>([]);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      setError('');
      const [cropData, cultivarData, descriptorData, materialData, lotData] = await Promise.all([
        api.listCrops(), api.listCultivars(), api.listDescriptors(), api.listMaterials(), api.listLots()
      ]);
      setCrops(cropData);
      setCultivars(cultivarData);
      setDescriptors(descriptorData);
      setMaterials(materialData);
      setLots(lotData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar cadastros');
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(id: string, action: () => Promise<unknown>) {
    try {
      setSaving(id); setError(''); setMessage('');
      await action();
      setMessage('Alteração salva e registrada na trilha de auditoria.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar alteração');
    } finally {
      setSaving('');
    }
  }

  return <section className="maintenance panel">
    <div className="maintenance-heading">
      <div><h3>Manutenção de cadastros</h3><p>Edição controlada e inativação sem apagar o histórico.</p></div>
      <span>Identidade e genealogia protegidas</span>
    </div>

    <div className="maintenance-tabs">
      {(['crops', 'cultivars', 'descriptors', 'materials', 'lots'] as Section[]).map(item =>
        <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{sectionLabel(item)}</button>
      )}
    </div>

    {error && <div className="alert">{error}</div>}
    {message && <div className="success-note">{message}</div>}

    {section === 'crops' && <div className="maintenance-list">{crops.map(item =>
      <EditRow key={item.id} title={item.common_name} code={item.code} active={item.is_active !== false} saving={saving === item.id}
        fields={<>
          <input value={item.common_name} onChange={e => setCrops(rows => rows.map(r => r.id === item.id ? { ...r, common_name: e.target.value } : r))} aria-label="Nome comum" />
          <input value={item.scientific_name ?? ''} onChange={e => setCrops(rows => rows.map(r => r.id === item.id ? { ...r, scientific_name: e.target.value } : r))} placeholder="Nome científico" />
        </>}
        onCode={value => setCrops(rows => rows.map(r => r.id === item.id ? { ...r, code: value } : r))}
        onActive={value => setCrops(rows => rows.map(r => r.id === item.id ? { ...r, is_active: value } : r))}
        onSave={() => save(item.id, () => api.updateCrop(item.id, { code: item.code, common_name: item.common_name, scientific_name: item.scientific_name, is_active: item.is_active !== false }))} />
    )}</div>}

    {section === 'cultivars' && <div className="maintenance-list">{cultivars.map(item =>
      <EditRow key={item.id} title={item.name} code={item.code} active={item.is_active !== false} saving={saving === item.id}
        fields={<>
          <input value={item.name} onChange={e => setCultivars(rows => rows.map(r => r.id === item.id ? { ...r, name: e.target.value } : r))} aria-label="Nome" />
          <input value={item.breeder ?? ''} onChange={e => setCultivars(rows => rows.map(r => r.id === item.id ? { ...r, breeder: e.target.value } : r))} placeholder="Obtentor" />
          <input value={item.cultivar_type ?? ''} onChange={e => setCultivars(rows => rows.map(r => r.id === item.id ? { ...r, cultivar_type: e.target.value } : r))} placeholder="Tipo" />
        </>}
        onCode={value => setCultivars(rows => rows.map(r => r.id === item.id ? { ...r, code: value } : r))}
        onActive={value => setCultivars(rows => rows.map(r => r.id === item.id ? { ...r, is_active: value } : r))}
        onSave={() => save(item.id, () => api.updateCultivar(item.id, { code: item.code, name: item.name, breeder: item.breeder, cultivar_type: item.cultivar_type, notes: item.notes, is_active: item.is_active !== false }))} />
    )}</div>}

    {section === 'descriptors' && <div className="maintenance-list">{descriptors.map(item =>
      <EditRow key={item.id} title={item.name} code={item.code} active={item.is_active !== false} saving={saving === item.id}
        meta={`${item.data_type} · ${item.crops?.common_name ?? '—'}`}
        fields={<>
          <input value={item.name} onChange={e => setDescriptors(rows => rows.map(r => r.id === item.id ? { ...r, name: e.target.value } : r))} aria-label="Característica" />
          <input value={item.phenological_stage ?? ''} onChange={e => setDescriptors(rows => rows.map(r => r.id === item.id ? { ...r, phenological_stage: e.target.value } : r))} placeholder="Estágio" />
          {item.data_type === 'option' && <input value={(item.allowed_values ?? []).join(', ')} onChange={e => setDescriptors(rows => rows.map(r => r.id === item.id ? { ...r, allowed_values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) } : r))} placeholder="Opções" />}
        </>}
        onCode={value => setDescriptors(rows => rows.map(r => r.id === item.id ? { ...r, code: value } : r))}
        onActive={value => setDescriptors(rows => rows.map(r => r.id === item.id ? { ...r, is_active: value } : r))}
        onSave={() => save(item.id, () => api.updateDescriptor(item.id, { code: item.code, name: item.name, unit: item.unit, phenological_stage: item.phenological_stage, criticality: item.criticality, allowed_values: item.data_type === 'option' ? item.allowed_values : undefined, is_active: item.is_active !== false }))} />
    )}</div>}

    {section === 'materials' && <div className="maintenance-list">{materials.map(item =>
      <EditRow key={item.id} title={item.code} code={item.code} active={item.is_active !== false} saving={saving === item.id}
        meta={`Cultivar: ${item.cultivars?.name ?? 'sem vínculo'}`}
        fields={<>
          <input value={item.material_category ?? ''} onChange={e => setMaterials(rows => rows.map(r => r.id === item.id ? { ...r, material_category: e.target.value } : r))} placeholder="Categoria" />
          <input value={item.origin ?? ''} onChange={e => setMaterials(rows => rows.map(r => r.id === item.id ? { ...r, origin: e.target.value } : r))} placeholder="Origem" />
          <input value={item.responsible_name ?? ''} onChange={e => setMaterials(rows => rows.map(r => r.id === item.id ? { ...r, responsible_name: e.target.value } : r))} placeholder="Responsável" />
        </>}
        onCode={value => setMaterials(rows => rows.map(r => r.id === item.id ? { ...r, code: value } : r))}
        onActive={value => setMaterials(rows => rows.map(r => r.id === item.id ? { ...r, is_active: value } : r))}
        onSave={() => save(item.id, () => api.updateMaterial(item.id, { code: item.code, material_category: item.material_category, origin: item.origin, received_at: item.received_at, responsible_name: item.responsible_name, notes: item.notes, is_active: item.is_active !== false }))} />
    )}</div>}

    {section === 'lots' && <div className="maintenance-list">{lots.map(item =>
      <EditRow key={item.id} title={item.code} code={item.code} active={item.is_active !== false} saving={saving === item.id}
        meta={item.parent?.code ? `Filho de ${item.parent.code}` : 'Lote inicial'}
        fields={<>
          <input value={item.season ?? ''} onChange={e => setLots(rows => rows.map(r => r.id === item.id ? { ...r, season: e.target.value } : r))} placeholder="Safra" />
          <input type="number" min="0" step="0.001" value={item.quantity ?? ''} onChange={e => setLots(rows => rows.map(r => r.id === item.id ? { ...r, quantity: e.target.value ? Number(e.target.value) : null } : r))} placeholder="Quantidade" />
          <select value={item.status ?? 'active'} onChange={e => setLots(rows => rows.map(r => r.id === item.id ? { ...r, status: e.target.value } : r))}><option value="active">Ativo</option><option value="blocked">Bloqueado</option><option value="approved">Aprovado</option><option value="consumed">Consumido</option></select>
        </>}
        onCode={value => setLots(rows => rows.map(r => r.id === item.id ? { ...r, code: value } : r))}
        onActive={value => setLots(rows => rows.map(r => r.id === item.id ? { ...r, is_active: value } : r))}
        onSave={() => save(item.id, () => api.updateLot(item.id, { code: item.code, season: item.season, quantity: item.quantity, unit: item.unit, status: item.status, is_active: item.is_active !== false }))} />
    )}</div>}
  </section>;
}

function EditRow({ title, code, active, fields, meta, saving, onCode, onActive, onSave }: {
  title: string; code: string; active: boolean; fields: React.ReactNode; meta?: string; saving: boolean;
  onCode: (value: string) => void; onActive: (value: boolean) => void; onSave: () => void;
}) {
  return <article className={`maintenance-row ${active ? '' : 'inactive'}`}>
    <div className="maintenance-id"><strong>{title}</strong>{meta && <small>{meta}</small>}</div>
    <input value={code} onChange={e => onCode(e.target.value)} aria-label="Código" />
    <div className="maintenance-fields">{fields}</div>
    <label className="status-toggle"><input type="checkbox" checked={active} onChange={e => onActive(e.target.checked)} /><span>{active ? 'Ativo' : 'Inativo'}</span></label>
    <button className="primary small-button" disabled={saving} onClick={onSave}>{saving ? 'Salvando...' : 'Salvar'}</button>
  </article>;
}

function sectionLabel(section: Section) {
  return { crops: 'Culturas', cultivars: 'Cultivares', descriptors: 'Descritores', materials: 'Materiais', lots: 'Lotes' }[section];
}
