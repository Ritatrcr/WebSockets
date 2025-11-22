// src/pages/ChatPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { io } from 'socket.io-client';

export function ChatPage({ room, onBack }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Cargar historial al entrar
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      setError('');
      try {
        const res = await api.get(`/rooms/${room.id}/messages`, {
          params: { limit: 50, offset: 0 },
        });
        // Los mensajes vienen del más nuevo al más viejo; invertimos para mostrar cronológico
        const ordered = [...res.data.items].reverse();
        setMessages(ordered);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el historial');
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [room.id]);

  // Conectar Socket.IO
  useEffect(() => {
    const s = io('http://localhost:8080', {
      auth: { token },
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('WS conectado, uniendo a sala', room.id);
      s.emit('join_room', { roomId: room.id });
    });

    s.on('message', (msg) => {
      // msg: { id, roomId, userId, content, createdAt }
      setMessages((prev) => [...prev, msg]);
    });

    s.on('typing', ({ roomId, userId, isTyping }) => {
      if (roomId !== room.id || userId === user.id) return;
      setTypingUsers((prev) => {
        const copy = { ...prev };
        if (isTyping) {
          copy[userId] = true;
        } else {
          delete copy[userId];
        }
        return copy;
      });
    });

    s.on('user_status', ({ userId, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status,
      }));
    });

    s.on('user_joined', ({ roomId, userId }) => {
      if (roomId !== room.id) return;
      console.log('user_joined', userId);
    });

    s.on('user_left', ({ roomId, userId }) => {
      if (roomId !== room.id) return;
      console.log('user_left', userId);
    });

    s.on('ws_error', (err) => {
      console.error('WS error:', err);
    });

    return () => {
      s.emit('leave_room', { roomId: room.id });
      s.disconnect();
    };
  }, [room.id, token, user.id]);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleInputChange(e) {
    const value = e.target.value;
    setInput(value);

    if (!socket) return;
    socket.emit('typing', { roomId: room.id, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: room.id, isTyping: false });
    }, 1000);
  }

  function handleSendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('send_message', {
      roomId: room.id,
      content: input.trim(),
    });

    setInput('');
  }

  // Helper para mostrar “alguien escribiendo...”
  const isSomeoneTyping = Object.keys(typingUsers).length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex flex-col">
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-slate-100 mb-1"
          >
            ← Volver a salas
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{room.name}</h1>
            <span className="text-xs text-slate-400">
              {room.isPrivate ? 'Privada 🔒' : 'Pública 🌐'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Chateando como {user?.username}
          </span>
        </div>
      </header>

      {/* Mensajes */}
      <main className="flex-1 flex flex-col px-4 py-3">
        {loadingHistory ? (
          <p className="text-sm text-slate-400">Cargando historial...</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pb-3">
            {messages.map((msg) => {
              const isMine = msg.userId === user.id;
              return (
                <div
                  key={msg.id ?? `${msg.createdAt}-${msg.content}-${Math.random()}`}
                  className={`flex ${
                    isMine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-3 py-2 rounded-2xl text-sm ${
                      isMine
                        ? 'bg-sky-500 text-slate-950 rounded-br-none'
                        : 'bg-slate-800 text-slate-50 rounded-bl-none'
                    }`}
                  >
                    {!isMine && (
                      <div className="text-[10px] text-slate-300 mb-1">
                        {msg.username || `Usuario ${msg.userId}`}
                      </div>
                    )}
                    <div>{msg.content}</div>
                    <div className="text-[10px] text-slate-300 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Indicador de typing */}
        {isSomeoneTyping && (
          <div className="text-xs text-slate-400 mb-1">
            Alguien está escribiendo...
          </div>
        )}
      </main>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-slate-800 px-4 py-3 flex gap-2"
      >
        <input
          type="text"
          className="flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          placeholder="Escribe un mensaje..."
          value={input}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
