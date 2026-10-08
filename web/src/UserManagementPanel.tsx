import { useEffect, useState } from 'react';
import { adminApi } from './adminApi';
import type { AppRole, ManagedUser } from './types';
import './users.css';

const roleOptions: Array<{ value: AppRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gestor' },
  { value: 'technician', label: 'Técnico' },
  { value: 'field_operator', label: 'Operador de campo' },
  { value: 'viewer', label: 'Consulta' }
];

export function UserManagementPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  async function load() {
    try {
      setError('');
      setUsers(await adminApi.listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar usuários');
    }
  }

  useEffect(() => { void load(); }, []);

  function changeUser(id: string, patch: Partial<ManagedUser>) {
    setUsers((current) => current.map((user) => user.id === id ? { ...user, ...patch } : user));
  }

  async function save(user: ManagedUser) {
    try {
      setSavingId(user.id);
      setError('');
      const updated = await adminApi.updateUser(user.id, {
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      });
      changeUser(user.id, updated);
    } catch (e) {
      await load();
      setError(e instanceof Error ? e.message : 'Falha ao atualizar usuário');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="users-panel panel">
      <div className="users-heading">
        <div>
          <h3>Usuários e permissões</h3>
          <p>Somente administradores podem alterar função, nome e status de acesso.</p>
        </div>
        <span>{users.length} usuário(s)</span>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="users-table">
        <div className="users-row users-head">
          <span>Usuário</span><span>Nome</span><span>Função</span><span>Status</span><span>Ação</span>
        </div>
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <div className="users-row" key={user.id}>
              <div><strong>{user.email || 'Sem e-mail'}</strong>{isSelf && <small>Você</small>}</div>
              <input
                value={user.full_name ?? ''}
                placeholder="Nome completo"
                onChange={(e) => changeUser(user.id, { full_name: e.target.value })}
              />
              <select value={user.role} onChange={(e) => changeUser(user.id, { role: e.target.value as AppRole })}>
                {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <label className="status-toggle">
                <input
                  type="checkbox"
                  checked={user.is_active}
                  disabled={isSelf}
                  onChange={(e) => changeUser(user.id, { is_active: e.target.checked })}
                />
                <span>{user.is_active ? 'Ativo' : 'Inativo'}</span>
              </label>
              <button className="primary small-button" disabled={savingId === user.id} onClick={() => void save(user)}>
                {savingId === user.id ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
