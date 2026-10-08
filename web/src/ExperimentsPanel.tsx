import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type {
  Crop,
  Descriptor,
  Experiment,
  ExperimentBlock,
  ExperimentPlot,
  PlotAssessment,
  SeedLot
} from './types';

type Props = {
  crops: Crop[];
  descriptors: Descriptor[];
};

export function ExperimentsPanel({ crops, descriptors }: Props) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [lots, setLots] = useState<SeedLot[]>([]);
  const [blocks, setBlocks] = useState<ExperimentBlock[]>([]);
  const [plots, setPlots] = useState<ExperimentPlot[]>([]);
  const [assessments, setAssessments] = useState<PlotAssessment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [selectedDescriptorId, setSelectedDescriptorId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedExperiment = experiments.find(item => item.id === selectedExperimentId);
  const activeLots = useMemo(() => lots.filter(item => item.is_active !== false), [lots]);
  const experimentDescriptors = useMemo(
    () => descriptors.filter(item => item.is_active !== false && (!selectedExperiment || item.crop_id === selectedExperiment.crop_id)),
    [descriptors, selectedExperiment]
  );
  const selectedDescriptor = experimentDescriptors.find(item => item.id === selectedDescriptorId);

  async function loadBase() {
    try {
      setError('');
      const [experimentData, lotData] = await Promise.all([api.listExperiments(), api.listLots()]);
      setExperiments(experimentData);
      setLots(lotData);
      if (!selectedExperimentId && experimentData.length > 0) setSelectedExperimentId(experimentData[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar experimentos');
    }
  }

  async function loadExperiment(experimentId: string) {
    if (!experimentId) {
      setBlocks([]);
      setPlots([]);
      return;
    }
    try {
      setError('');
      const [blockData, plotData] = await Promise.all([
        api.listExperimentBlocks(experimentId),
        api.listExperimentPlots(experimentId)
      ]);
      setBlocks(blockData);
      setPlots(plotData);
      if (!plotData.some(item => item.id === selectedPlotId)) {
        setSelectedPlotId(plotData[0]?.id ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar parcelas');
    }
  }

  async function loadAssessments(plotId: string) {
    if (!plotId) {
      setAssessments([]);
      return;
    }
    try {
      setAssessments(await api.listPlotAssessments(plotId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar avaliações');
    }
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { void loadExperiment(selectedExperimentId); }, [selectedExperimentId]);
  useEffect(() => { void loadAssessments(selectedPlotId); }, [selectedPlotId]);

  async function createExperiment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    try {
      setError(''); setMessage('');
      const f = new FormData(formElement);
      const created = await api.createExperiment({
        code: String(f.get('code')),
        name: String(f.get('name')),
        crop_id: String(f.get('crop_id')),
        season: String(f.get('season') || ''),
        location_name: String(f.get('location_name') || ''),
        design_type: String(f.get('design_type') || 'RCBD'),
        replications: Number(f.get('replications') || 1),
        sowing_date: String(f.get('sowing_date') || ''),
        responsible_name: String(f.get('responsible_name') || ''),
        status: 'planned'
      });
      formElement.reset();
      setMessage('Experimento criado.');
      await loadBase();
      setSelectedExperimentId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar experimento');
    }
  }

  async function createBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    if (!selectedExperimentId) return;
    try {
      setError(''); setMessage('');
      const f = new FormData(formElement);
      await api.createExperimentBlock(selectedExperimentId, {
        block_number: Number(f.get('block_number')),
        name: String(f.get('name') || ''),
        notes: String(f.get('notes') || '')
      });
      formElement.reset();
      setMessage('Bloco adicionado.');
      await loadExperiment(selectedExperimentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar bloco');
    }
  }

  async function createPlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    if (!selectedExperimentId) return;
    try {
      setError(''); setMessage('');
      const f = new FormData(formElement);
      const numeric = (name: string) => {
        const raw = String(f.get(name) || '');
        return raw ? Number(raw) : undefined;
      };
      await api.createExperimentPlot(selectedExperimentId, {
        block_id: String(f.get('block_id') || '') || undefined,
        plot_number: Number(f.get('plot_number')),
        plot_code: String(f.get('plot_code')),
        seed_lot_id: String(f.get('seed_lot_id') || '') || undefined,
        treatment_label: String(f.get('treatment_label')),
        rows_count: numeric('rows_count'),
        plot_length_m: numeric('plot_length_m'),
        row_spacing_m: numeric('row_spacing_m'),
        planned_seed_count: numeric('planned_seed_count'),
        status: 'planned',
        notes: String(f.get('notes') || '')
      });
      formElement.reset();
      setMessage('Parcela adicionada.');
      await loadExperiment(selectedExperimentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar parcela');
    }
  }

  async function createAssessment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const formElement = e.currentTarget;
    if (!selectedPlotId || !selectedDescriptor) return;
    try {
      setError(''); setMessage('');
      const f = new FormData(formElement);
      const payload: Parameters<typeof api.createPlotAssessment>[1] = {
        descriptor_id: selectedDescriptor.id,
        assessed_at: String(f.get('assessed_at') || '') || undefined,
        phenological_stage: String(f.get('phenological_stage') || '') || undefined,
        notes: String(f.get('notes') || '') || undefined
      };

      if (selectedDescriptor.data_type === 'integer' || selectedDescriptor.data_type === 'decimal') {
        payload.value_number = Number(f.get('value_number'));
      } else if (selectedDescriptor.data_type === 'range') {
        payload.min_value = Number(f.get('min_value'));
        payload.max_value = Number(f.get('max_value'));
      } else {
        payload.value_text = String(f.get('value_text'));
      }

      await api.createPlotAssessment(selectedPlotId, payload);
      formElement.reset();
      setMessage('Avaliação registrada.');
      await loadAssessments(selectedPlotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao registrar avaliação');
    }
  }

  return <section>
    {error && <div className="alert">{error}</div>}
    {message && <div className="success-note">{message}</div>}

    <div className="grid">
      <form className="panel form" onSubmit={createExperiment}>
        <h3>Novo experimento</h3>
        <label>Código<input name="code" required placeholder="EXP-SOY-2026-001" /></label>
        <label>Nome<input name="name" required placeholder="Ensaio de multiplicação PF" /></label>
        <label>Cultura<select name="crop_id" required><option value="">Selecione</option>{crops.filter(c => c.is_active !== false).map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}</select></label>
        <label>Safra<input name="season" placeholder="2026/27" /></label>
        <label>Local<input name="location_name" placeholder="Unidade / talhão / município" /></label>
        <label>Delineamento<select name="design_type" defaultValue="RCBD"><option value="RCBD">Blocos casualizados (DBC/RCBD)</option><option value="CRD">Inteiramente casualizado (DIC/CRD)</option><option value="STRIP">Faixas</option><option value="OTHER">Outro</option></select></label>
        <label>Repetições<input name="replications" type="number" min="1" defaultValue="1" /></label>
        <label>Data de semeadura<input name="sowing_date" type="date" /></label>
        <label>Responsável<input name="responsible_name" /></label>
        <button className="primary">Criar experimento</button>
      </form>

      <div className="panel list">
        <h3>Experimentos</h3>
        {experiments.length === 0 ? <p className="empty">Nenhum experimento cadastrado.</p> : experiments.map(item =>
          <button key={item.id} className={selectedExperimentId === item.id ? 'list-row active' : 'list-row'} onClick={() => setSelectedExperimentId(item.id)}>
            <strong>{item.code}</strong>
            <span>{item.name}</span>
            <span>{item.status} · {item.season || 'sem safra'}</span>
          </button>
        )}
      </div>
    </div>

    {selectedExperiment && <div className="panel" style={{ marginTop: 18 }}>
      <h3>{selectedExperiment.code} · {selectedExperiment.name}</h3>
      <p className="trace-note">{selectedExperiment.crops?.common_name || 'Cultura'} · {selectedExperiment.location_name || 'Local não informado'} · {selectedExperiment.design_type} · {selectedExperiment.replications} repetição(ões)</p>
    </div>}

    {selectedExperiment && <div className="grid" style={{ marginTop: 18 }}>
      <form className="panel form" onSubmit={createBlock}>
        <h3>Novo bloco</h3>
        <label>Número<input name="block_number" type="number" min="1" required /></label>
        <label>Nome<input name="name" placeholder="Bloco 1" /></label>
        <label>Observações<textarea name="notes" /></label>
        <button className="primary">Adicionar bloco</button>
      </form>

      <form className="panel form" onSubmit={createPlot}>
        <h3>Nova parcela</h3>
        <label>Bloco<select name="block_id"><option value="">Sem bloco</option>{blocks.filter(b => b.is_active !== false).map(b => <option key={b.id} value={b.id}>Bloco {b.block_number}{b.name ? ` · ${b.name}` : ''}</option>)}</select></label>
        <label>Número da parcela<input name="plot_number" type="number" min="1" required /></label>
        <label>Código<input name="plot_code" required placeholder="P001" /></label>
        <label>Tratamento / material<input name="treatment_label" required placeholder="Cultivar ou tratamento" /></label>
        <label>Lote de origem<select name="seed_lot_id"><option value="">Sem vínculo</option>{activeLots.map(lot => <option key={lot.id} value={lot.id}>{lot.code}</option>)}</select></label>
        <label>Nº de linhas<input name="rows_count" type="number" min="1" /></label>
        <label>Comprimento (m)<input name="plot_length_m" type="number" min="0.001" step="0.01" /></label>
        <label>Espaçamento (m)<input name="row_spacing_m" type="number" min="0.001" step="0.01" /></label>
        <label>Sementes planejadas<input name="planned_seed_count" type="number" min="0" /></label>
        <label>Observações<textarea name="notes" /></label>
        <button className="primary">Adicionar parcela</button>
      </form>
    </div>}

    {selectedExperiment && <div className="panel list" style={{ marginTop: 18 }}>
      <h3>Parcelas do experimento</h3>
      {plots.length === 0 ? <p className="empty">Nenhuma parcela cadastrada.</p> : plots.map(plot =>
        <button key={plot.id} className={selectedPlotId === plot.id ? 'list-row active' : 'list-row'} onClick={() => setSelectedPlotId(plot.id)}>
          <strong>{plot.plot_code}</strong>
          <span>{plot.treatment_label}</span>
          <span>{plot.block ? `Bloco ${plot.block.block_number}` : 'Sem bloco'} · {plot.seed_lots?.code || 'sem lote'}</span>
        </button>
      )}
    </div>}

    {selectedPlotId && <div className="grid" style={{ marginTop: 18 }}>
      <form className="panel form" onSubmit={createAssessment}>
        <h3>Registrar avaliação</h3>
        <label>Descritor<select value={selectedDescriptorId} onChange={e => setSelectedDescriptorId(e.target.value)} required><option value="">Selecione</option>{experimentDescriptors.map(d => <option key={d.id} value={d.id}>{d.name}{d.unit ? ` (${d.unit})` : ''}</option>)}</select></label>
        <label>Data/hora<input name="assessed_at" type="datetime-local" /></label>
        <label>Estágio fenológico<input name="phenological_stage" placeholder={selectedDescriptor?.phenological_stage || 'V4, R1, R8...'} /></label>
        <AssessmentValueFields descriptor={selectedDescriptor} />
        <label>Observações<textarea name="notes" /></label>
        <button className="primary" disabled={!selectedDescriptor}>Registrar avaliação</button>
      </form>

      <div className="panel list">
        <h3>Avaliações da parcela</h3>
        {assessments.length === 0 ? <p className="empty">Nenhuma avaliação registrada.</p> : assessments.map(item =>
          <div className="list-row" key={item.id}>
            <strong>{item.descriptor_definitions?.name || 'Descritor'}</strong>
            <span>{assessmentValue(item)}</span>
            <span>{new Date(item.assessed_at).toLocaleString('pt-BR')}</span>
          </div>
        )}
      </div>
    </div>}
  </section>;
}

function AssessmentValueFields({ descriptor }: { descriptor?: Descriptor }) {
  if (!descriptor) return <p className="trace-note">Selecione um descritor para informar o valor.</p>;

  if (descriptor.data_type === 'range') {
    return <>
      <label>Mínimo<input name="min_value" type="number" step="any" required /></label>
      <label>Máximo<input name="max_value" type="number" step="any" required /></label>
    </>;
  }

  if (descriptor.data_type === 'integer' || descriptor.data_type === 'decimal') {
    return <label>Valor<input name="value_number" type="number" step={descriptor.data_type === 'integer' ? '1' : 'any'} required /></label>;
  }

  if (descriptor.data_type === 'option') {
    return <label>Valor<select name="value_text" required><option value="">Selecione</option>{(descriptor.allowed_values ?? []).map(value => <option key={value} value={value}>{value}</option>)}</select></label>;
  }

  if (descriptor.data_type === 'boolean') {
    return <label>Valor<select name="value_text" required><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select></label>;
  }

  return <label>Valor<input name="value_text" required /></label>;
}

function assessmentValue(item: PlotAssessment) {
  if (item.value_number !== null && item.value_number !== undefined) return String(item.value_number);
  if (item.min_value !== null && item.min_value !== undefined) return `${item.min_value}–${item.max_value ?? ''}`;
  return item.value_text || '—';
}
