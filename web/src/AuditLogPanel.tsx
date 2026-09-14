import { FormEvent, useEffect, useState } from 'react';
import { auditApi } from './auditApi';
import type { AuditLog } from './types';
import './audit.css';

const entityOptions = [
  ['', 'Todas as entidades'],
  ['crops', 'Culturas'],
  ['cultivars', 'Cultivares'],
  ['descriptor_definitions', 'Descritores'],
  ['cultivar_descriptor_values', 'Valores varietais'],
  ['genetic_materials', 'Materiais genéticos'],
  ['seed_lots', 'Lotes'],
  ['user_profiles', 'Usuários']
];

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load(nextEntity = entityType, nextAction = action) {
    try {
      setLoading(true);
      setError('');
      setLogs(await auditApi.list({ entity_type: nextEntity || undefined, action: nextAction || undefined, limit: 100 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load('', ''); }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void load();
  }

  return (
    <section className="audit-panel panel">
      <div className="audit-heading">
        <div>
          <h3>Trilha de auditoria</h3>
          <p>Histórico imutável das alterações realizadas no núcleo do SeedTrace PF.</p>
        </div>
        <span>{logs.length} evento(s)</span>
      </div>

      <form className="audit-filters" onSubmit={submit}>
        <label>Entidade
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {entityOptions.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}
          </select>
        </label>
        <label>Ação
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Todas</option>
            <option value="insert">Inclusão</option>
            <option value="update">Alteração</option>
            <option value="delete">Exclusão</option>
          </select>
        </label>
        <button className="primary" disabled={loading}>{loading ? 'Carregando...' : 'Filtrar'}</button>
      </form>

      {error && <div className="alert">{error}</div>}

      <div className="audit-list">
        {logs.length === 0 && !loading && <p className="empty">Nenhum evento encontrado.</p>}
        {logs.map((log) => (
          <article className="audit-event" key={log.id}>
            <div className="audit-summary">
              <div>
                <strong>{actionLabel(log.action)} · {entityLabel(log.entity_type)}</strong>
                <span>{formatDate(log.occurred_at)} · {log.actor_email || 'Sistema / autoria não disponível'}</span>
              </div>
              <span className={`audit-badge ${log.action}`}>{actionLabel(log.action)}</span>
            </div>
            {log.changed_fields && log.changed_fields.length > 0 && (
              <p className="audit-fields">Campos alterados: {log.changed_fields.join(', ')}</p>
            )}
            <details>
              <summary>Ver detalhes</summary>
              <div className="audit-details">
                <div><small>Antes</small><pre>{pretty(log.before_data)}</pre></div>
                <div><small>Depois</small><pre>{pretty(log.after_data)}</pre></div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function actionLabel(action: AuditLog['action']) {
  return { insert: 'Inclusão', update: 'Alteração', delete: 'Exclusão' }[action];
}

function entityLabel(entity: string) {
  return Object.fromEntries(entityOptions).get?.(entity) ?? ({
    crops: 'Culturas',
    cultivars: 'Cultivares',
    descriptor_definitions: 'Descritores',
    cultivar_descriptor_values: 'Valores varietais',
    genetic_materials: 'Materiais genéticos',
    seed_lots: 'Lotes',
    user_profiles: 'Usuários'
  } as Record<string, string>)[entity] ?? entity;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function pretty(value: Record<string, unknown> | null | undefined) {
  return value ? JSON.stringify(value, null, 2) : '—';
}
