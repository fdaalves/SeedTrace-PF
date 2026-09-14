import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import type { Cultivar, Descriptor, VarietalValue } from './types';
import './varietal.css';

export function VarietalValuesPanel({ cultivars, descriptors }: { cultivars: Cultivar[]; descriptors: Descriptor[] }) {
  const [values, setValues] = useState<VarietalValue[]>([]);

  async function load() {
    try { setValues(await api.listVarietalValues()); } catch { setValues([]); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await api.setVarietalValue({
      cultivar_id: String(form.get('cultivar_id')),
      descriptor_id: String(form.get('descriptor_id')),
      value_text: String(form.get('value_text') || ''),
      notes: String(form.get('notes') || '')
    });
    e.currentTarget.reset();
    await load();
  }

  const cultivarName = (id: string) => cultivars.find(c => c.id === id)?.name ?? id;
  const descriptorName = (id: string) => descriptors.find(d => d.id === id)?.name ?? id;

  return (
    <div className="panel varietal-values">
      <h3>Padrão esperado por cultivar</h3>
      <form className="inline-form" onSubmit={submit}>
        <select name="cultivar_id" required><option value="">Cultivar</option>{cultivars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="descriptor_id" required><option value="">Descritor</option>{descriptors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input name="value_text" required placeholder="Valor esperado, ex.: Roxa" />
        <input name="notes" placeholder="Observação opcional" />
        <button className="primary">Salvar padrão</button>
      </form>
      <div className="value-list">
        {values.length === 0 ? <p className="empty">Nenhum padrão varietal registrado.</p> : values.map(value => (
          <div className="value-row" key={value.id}>
            <strong>{cultivarName(value.cultivar_id)}</strong>
            <span>{descriptorName(value.descriptor_id)}</span>
            <b>{value.value_text ?? value.value_number ?? '—'}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
