// src/App.jsx
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomsPage } from './pages/RoomsPage';
import { ChatPage } from './pages/ChatPage';

function AppInner() {
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'register' | 'rooms' | 'chat'
  const [currentRoom, setCurrentRoom] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Cargando...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (view === 'register') {
      return (
        <RegisterPage
          onRegisterSuccess={() => setView('rooms')}
          onSwitchToLogin={() => setView('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={() => setView('rooms')}
        onSwitchToRegister={() => setView('register')}
      />
    );
  }

  if (view === 'chat' && currentRoom) {
    return (
      <ChatPage
        room={currentRoom}
        onBack={() => {
          setView('rooms');
          setCurrentRoom(null);
        }}
      />
    );
  }

  return (
    <RoomsPage
      onEnterRoom={(room) => {
        setCurrentRoom(room);
        setView('chat');
      }}
    />
  );
}

export default AppInner;
