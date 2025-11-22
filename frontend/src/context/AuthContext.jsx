// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, username }
  const [token, setToken] = useState(null);    // JWT
  const [loading, setLoading] = useState(true);

  // Cargar token desde localStorage cuando arranca la app
  useEffect(() => {
    const saved = localStorage.getItem('chat_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setToken(parsed.token);
        setUser(parsed.user);
        setAuthToken(parsed.token);
      } catch (err) {
        console.error('Error al parsear auth guardada:', err);
      }
    }
    setLoading(false);
  }, []);

  function login({ token, user }) {
    setToken(token);
    setUser(user);
    setAuthToken(token);
    localStorage.setItem('chat_auth', JSON.stringify({ token, user }));
  }

  function logout() {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('chat_auth');
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
