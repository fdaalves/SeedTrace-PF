import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Crop, Cultivar, Descriptor, UserProfile } from './types';
import { VarietalValuesPanel } from './VarietalValuesPanel';
import { LotsPanel, MaterialsPanel } from './TraceabilityPanels';
import { UserManagementPanel } from './UserManagementPanel';
import { AuditLogPanel } from './AuditLogPanel';

type View = 'dashboard' | 'crops' | 'cultivars' | 'descriptors' | 'materials' | 'lots' | 'users' | 'audit';

type AppProps = {
  profile: UserProfile;
  onLogout: () => Promise<void>;
};

export default function App({ profile, onLogout }: AppProps) {
  const [view, setView] = useState<View>('dashboard');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [cultivars, setCultivars] = useState<Cultivar[]>([]);
  const [descriptors, setDescriptors] = useState<Descriptor[]>([]);
  const [error, setError] = useState('');
  const canWrite = ['admin', 'manager', 'technician'].includes(profile.role);
  const isAdmin = profile.role === 'admin';
  const canViewAudit = ['admin', 'manager'].includes(profile.role);

  async function reload() {
    try {
      setError('');
      const [cropData, cultivarData, descriptorData] = await Promise.all([
        api.listCrops(), api.listCultivars(), api.listDescriptors()
      ]);
      setCrops(cropData);
      setCultivars(cultivarData);
      setDescriptors(descriptorData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados');
    }
  }

  useEffect(() => { void reload(); }, []);
  const activeCultivars = useMemo(() => cultivars.length, [cultivars]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">ST</span><div><strong>SeedTrace PF</strong><small>Pre-Foundation</small></div></div>
        <nav>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Visão geral</button>
          <button className={view === 'crops' ? 'active' : ''} onClick={() => setView('crops')}>Culturas</button>
          <button className={view === 'cultivars' ? 'active' : ''} onClick={() => setView('cultivars')}>Cultivares</button>
          <button className={view === 'descriptors' ? 'active' : ''} onClick={() => setView('descriptors')}>Ficha varietal</button>
          <button className={view === 'materials' ? 'active' : ''} onClick={() => setView('materials')}>Materiais genéticos</button>
          <button className={view === 'lots' ? 'active' : ''} onClick={() => setView('lots')}>Lotes</button>
          {canViewAudit && <button className={view === 'audit' ? 'active' : ''} onClick={() => setView('audit')}>Auditoria</button>}
          {isAdmin && <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>Usuários</button>}
        </nav>
        <div className="sidebar-foot">Build 001 · 0.1.0-alpha<br />{profile.email}</div>
      </aside>

      <main className={`content ${canWrite ? '' : 'readonly'}`}>
        <header>
          <div><p className="eyebrow">GESTÃO GENÉTICA E RASTREABILIDADE</p><h1>{title(view)}</h1></div>
          <div className="user-tools">
            <div className="user-chip"><strong>{profile.full_name || profile.email || 'Usuário'}</strong><span>{roleLabel(profile.role)}</span></div>
            <button className="logout-button" onClick={() => void onLogout()}>Sair</button>
          </div>
        </header>
        {error && <div className="alert">{error}</div>}
        {!canWrite && <div className="readonly-note">Seu perfil está em modo consulta. Alterações de cadastros estão bloqueadas pela API.</div>}

        {view === 'dashboard' && (
          <section>
            <div className="hero"><div><p className="eyebrow">BUILD 001</p><h2>Identidade varietal antes da escala.</h2><p>Cadastre cultura, cultivar, padrão varietal, material genético e lote. Essa cadeia será a referência para inspeções, off-types e rastreabilidade nas próximas builds.</p></div><div className="hero-tag">PF</div></div>
            <div className="stats">
              <Card label="Culturas" value={crops.length} note="cadastros ativos" />
              <Card label="Cultivares" value={activeCultivars} note="identidades varietais" />
              <Card label="Descritores" value={descriptors.length} note="características monitoradas" />
            </div>
            <div className="panel"><h3>Fluxo do núcleo</h3><div className="flow"><span>Cultura</span><b>→</b><span>Cultivar</span><b>→</b><span>Padrão varietal</span><b>→</b><span>Material</span><b>→</b><span>Lote</span></div></div>
          </section>
        )}

        {view === 'crops' && <Crops crops={crops} onSaved={reload} />}
        {view === 'cultivars' && <Cultivars crops={crops} cultivars={cultivars} onSaved={reload} />}
        {view === 'descriptors' && <Descriptors crops={crops} cultivars={cultivars} descriptors={descriptors} onSaved={reload} />}
        {view === 'materials' && <MaterialsPanel cultivars={cultivars} />}
        {view === 'lots' && <LotsPanel />}
        {view === 'audit' && canViewAudit && <AuditLogPanel />}
        {view === 'users' && isAdmin && <UserManagementPanel currentUserId={profile.id} />}
      </main>
    </div>
  );
}

function Card({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Crops({ crops, onSaved }: { crops: Crop[]; onSaved: () => Promise<void> }) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    await api.createCrop({ code: String(form.get('code')), common_name: String(form.get('common_name')), scientific_name: String(form.get('scientific_name') || '') });
    e.currentTarget.reset(); await onSaved();
  }
  return <section className="grid"><form className="panel form" onSubmit={submit}><h3>Nova cultura</h3><label>Código<input name="code" required placeholder="SOY" /></label><label>Nome comum<input name="common_name" required placeholder="Soja" /></label><label>Nome científico<input name="scientific_name" placeholder="Glycine max" /></label><button className="primary">Cadastrar cultura</button></form><List title="Culturas cadastradas" rows={crops.map(c => [c.code, c.common_name, c.scientific_name || '—'])} /></section>;
}

function Cultivars({ crops, cultivars, onSaved }: { crops: Crop[]; cultivars: Cultivar[]; onSaved: () => Promise<void> }) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await api.createCultivar({ crop_id: String(f.get('crop_id')), code: String(f.get('code')), name: String(f.get('name')), breeder: String(f.get('breeder') || ''), cultivar_type: String(f.get('cultivar_type') || '') });
    e.currentTarget.reset(); await onSaved();
  }
  return <section className="grid"><form className="panel form" onSubmit={submit}><h3>Nova cultivar</h3><label>Cultura<select name="crop_id" required><option value="">Selecione</option>{crops.map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}</select></label><label>Código<input name="code" required placeholder="SOY-PF-001" /></label><label>Nome<input name="name" required /></label><label>Obtentor<input name="breeder" /></label><label>Tipo<input name="cultivar_type" placeholder="Cultivar / linhagem" /></label><button className="primary">Cadastrar cultivar</button></form><List title="Cultivares cadastradas" rows={cultivars.map(c => [c.code, c.name, c.crops?.common_name || '—'])} /></section>;
}

function Descriptors({ crops, cultivars, descriptors, onSaved }: { crops: Crop[]; cultivars: Cultivar[]; descriptors: Descriptor[]; onSaved: () => Promise<void> }) {
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const rawOptions = String(f.get('allowed_values') || '');
    const allowedValues = rawOptions.split(',').map(value => value.trim()).filter(Boolean);
    await api.createDescriptor({
      crop_id: String(f.get('crop_id')),
      code: String(f.get('code')),
      name: String(f.get('name')),
      data_type: String(f.get('data_type')),
      unit: String(f.get('unit') || ''),
      phenological_stage: String(f.get('phenological_stage') || ''),
      criticality: String(f.get('criticality') || ''),
      allowed_values: allowedValues.length ? allowedValues : null
    });
    e.currentTarget.reset(); await onSaved();
  }
  return <section><div className="grid"><form className="panel form" onSubmit={submit}><h3>Novo descritor</h3><label>Cultura<select name="crop_id" required><option value="">Selecione</option>{crops.map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}</select></label><label>Código<input name="code" required placeholder="flower_color" /></label><label>Característica<input name="name" required placeholder="Cor da flor" /></label><label>Tipo<select name="data_type" required><option value="option">Lista controlada</option><option value="text">Texto</option><option value="decimal">Número</option><option value="range">Faixa</option></select></label><label>Opções da lista<input name="allowed_values" placeholder="Branca, Roxa" /></label><label>Unidade<input name="unit" placeholder="cm, dias, %, etc." /></label><label>Estágio fenológico<input name="phenological_stage" placeholder="R1-R2" /></label><label>Criticidade<select name="criticality"><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option><option value="low">Baixa</option></select></label><button className="primary">Cadastrar descritor</button></form><List title="Ficha de descritores" rows={descriptors.map(d => [d.name, d.phenological_stage || '—', Array.isArray(d.allowed_values) ? d.allowed_values.join(' / ') : d.criticality || '—'])} /></div><VarietalValuesPanel cultivars={cultivars} descriptors={descriptors} /></section>;
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return <div className="panel list"><h3>{title}</h3>{rows.length === 0 ? <p className="empty">Nenhum registro ainda.</p> : rows.map((r, i) => <div className="list-row" key={i}>{r.map((v, j) => j === 0 ? <strong key={j}>{v}</strong> : <span key={j}>{v}</span>)}</div>)}</div>;
}

function title(view: View) {
  return { dashboard: 'Visão geral', crops: 'Culturas', cultivars: 'Cultivares', descriptors: 'Ficha de identidade varietal', materials: 'Materiais genéticos', lots: 'Lotes e genealogia', users: 'Usuários e permissões', audit: 'Trilha de auditoria' }[view];
}

function roleLabel(role: UserProfile['role']) {
  return { admin: 'Administrador', manager: 'Gestor', technician: 'Técnico', field_operator: 'Operador de campo', viewer: 'Consulta' }[role];
}
