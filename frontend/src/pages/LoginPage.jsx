// src/pages/LoginPage.jsx
import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });

      login({
        token: res.data.token,
        user: res.data.user,
      });

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-50 mb-2 text-center">
          Real-time Chat
        </h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Inicia sesión con tu usuario registrado
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Usuario
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Regístrate
          </button>
        </p>
      </div>
    </div>
  );
}
