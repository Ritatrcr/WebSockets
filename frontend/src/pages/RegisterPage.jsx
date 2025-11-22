// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function RegisterPage({ onRegisterSuccess, onSwitchToLogin }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

    async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username || !password || !password2) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username,
        password,
      });

      login({
        token: res.data.token,
        user: res.data.user,
      });

      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
    } catch (err) {
      console.error('Register error:', err);

      const msg =
        err?.response?.data?.message ||
        (err.response
          ? `Error ${err.response.status}`
          : 'No se pudo contactar con el servidor');

      setError(msg);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-50 mb-2 text-center">
          Crear cuenta
        </h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Regístrate para usar el chat en tiempo real
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
              placeholder="tu_usuario"
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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Repetir contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
