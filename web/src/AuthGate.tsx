import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import { api } from './api';
import { supabase } from './supabase';
import type { UserProfile } from './types';
import './auth.css';

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!session) { setLoading(false); return; }
      try {
        setLoading(true);
        setError('');
        setProfile(await api.getMe());
      } catch (e) {
        setProfile(null);
        setError(e instanceof Error ? e.message : 'Não foi possível carregar o perfil');
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [session?.access_token]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password'))
    });
    if (authError) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  if (loading) return <div className="auth-screen"><div className="auth-card"><strong>SeedTrace PF</strong><p>Carregando sessão...</p></div></div>;

  if (!session) {
    return <div className="auth-screen">
      <form className="auth-card" onSubmit={signIn}>
        <div className="auth-logo">ST</div>
        <p className="eyebrow">SEEDTRACE PF</p>
        <h1>Acesso ao sistema</h1>
        <p className="auth-helper">Entre com uma conta autorizada para acessar dados de identidade varietal e rastreabilidade.</p>
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>;
  }

  if (!profile) {
    return <div className="auth-screen"><div className="auth-card"><strong>Acesso não liberado</strong><p>{error || 'Seu usuário ainda não possui um perfil ativo no SeedTrace PF.'}</p><button className="primary" onClick={signOut}>Sair</button></div></div>;
  }

  return <App profile={profile} onLogout={signOut} />;
}
