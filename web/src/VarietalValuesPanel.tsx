import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Cultivar, Descriptor, VarietalValue } from './types';
import './varietal.css';

export function VarietalValuesPanel({ cultivars, descriptors }: { cultivars: Cultivar[]; descriptors: Descriptor[] }) {
  const [values, setValues] = useState<VarietalValue[]>([]);
  const [descriptorId, setDescriptorId] = useState('');
  const selectedDescriptor = useMemo(() => descriptors.find(d => d.id === descriptorId), [descriptors, descriptorId]);
  const allowedValues = Array.isArray(selectedDescriptor?.allowed_values) ? selectedDescriptor.allowed_values : [];

  async function load() {
    try { setValues(await api.listVarietalValues()); } catch { setValues([]); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: Omit<VarietalValue, 'id'> = {
      cultivar_id: String(form.get('cultivar_id')),
      descriptor_id: String(form.get('descriptor_id')),
      notes: String(form.get('notes') || '')
    };

    if (selectedDescriptor?.data_type === 'decimal') {
      payload.value_number = Number(form.get('value_number'));
    } else if (selectedDescriptor?.data_type === 'range') {
      payload.min_value = Number(form.get('min_value'));
      payload.max_value = Number(form.get('max_value'));
    } else {
      payload.value_text = String(form.get('value_text') || '');
    }

    await api.setVarietalValue(payload);
    e.currentTarget.reset();
    setDescriptorId('');
    await load();
  }

  const cultivarName = (id: string) => cultivars.find(c => c.id === id)?.name ?? id;
  const descriptorName = (id: string) => descriptors.find(d => d.id === id)?.name ?? id;
  const formattedValue = (value: VarietalValue) => {
    if (value.min_value != null || value.max_value != null) return `${value.min_value ?? '—'} a ${value.max_value ?? '—'}`;
    return value.value_text ?? value.value_number ?? '—';
  };

  return (
    <div className="panel varietal-values">
      <h3>Padrão esperado por cultivar</h3>
      <p className="helper">O valor salvo aqui será a referência para comparar o observado nas futuras inspeções de campo.</p>
      <form className="inline-form" onSubmit={submit}>
        <select name="cultivar_id" required><option value="">Cultivar</option>{cultivars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="descriptor_id" required value={descriptorId} onChange={e => setDescriptorId(e.target.value)}><option value="">Descritor</option>{descriptors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <ValueInput descriptor={selectedDescriptor} allowedValues={allowedValues} />
        <input name="notes" placeholder="Observação opcional" />
        <button className="primary" disabled={!descriptorId}>Salvar padrão</button>
      </form>
      <div className="value-list">
        {values.length === 0 ? <p className="empty">Nenhum padrão varietal registrado.</p> : values.map(value => (
          <div className="value-row" key={value.id}>
            <strong>{cultivarName(value.cultivar_id)}</strong>
            <span>{descriptorName(value.descriptor_id)}</span>
            <b>{formattedValue(value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueInput({ descriptor, allowedValues }: { descriptor?: Descriptor; allowedValues: string[] }) {
  if (!descriptor) return <input disabled placeholder="Selecione um descritor" />;
  if (descriptor.data_type === 'option' && allowedValues.length > 0) {
    return <select name="value_text" required><option value="">Valor esperado</option>{allowedValues.map(value => <option key={value} value={value}>{value}</option>)}</select>;
  }
  if (descriptor.data_type === 'decimal') {
    return <input name="value_number" required type="number" step="any" placeholder={descriptor.unit ? `Valor (${descriptor.unit})` : 'Valor numérico'} />;
  }
  if (descriptor.data_type === 'range') {
    return <div className="range-inputs"><input name="min_value" required type="number" step="any" placeholder="Mínimo" /><input name="max_value" required type="number" step="any" placeholder="Máximo" /></div>;
  }
  return <input name="value_text" required placeholder="Valor esperado" />;
}
