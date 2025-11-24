// src/pages/ChatPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { io } from 'socket.io-client';
import { ArrowLeft, Send, Globe2, Lock } from 'lucide-react';

export function ChatPage({ room, onBack }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // { userId: true }
  const [onlineUsers, setOnlineUsers] = useState({});
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // sonidos
  const joinSoundRef = useRef(null);
  const leaveSoundRef = useRef(null);
  const notificationSoundRef = useRef(null); // 🔔 mensaje nuevo

  // AVATAR: paleta de colores y helpers
  const AVATAR_COLORS = [
    'bg-emerald-400',
    'bg-sky-400',
    'bg-indigo-400',
    'bg-amber-400',
    'bg-rose-400',
    'bg-lime-400',
    'bg-fuchsia-400',
    'bg-cyan-400',
  ];

  const getAvatarColor = (userId) => {
    if (!userId) return 'bg-slate-500';
    const index = userId % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const getDisplayNameFromMessage = (msg) => {
    if (msg.username) return msg.username;
    if (msg.userId) return `Usuario ${msg.userId}`;
    return 'Usuario';
  };

  const getInitial = (msg) => {
    const name = getDisplayNameFromMessage(msg);
    return name.charAt(0).toUpperCase();
  };

  // 👇 helper para sacar el username a partir del userId y el historial
  const getNameByUserId = (userId) => {
    if (!userId) return 'Usuario';
    // buscamos el último mensaje de ese usuario que tenga username
    const lastMsg = [...messages]
      .slice()
      .reverse()
      .find((m) => m.userId === userId && m.username);

    if (lastMsg) return lastMsg.username;
    return `Usuario ${userId}`;
  };

  // 🔹 Cargar historial al entrar a la sala
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      setError('');
      try {
        const res = await api.get(`/rooms/${room.id}/messages`, {
          params: { limit: 50, offset: 0 },
        });
        const ordered = [...res.data.items].reverse();
        setMessages(ordered);
      } catch (err) {
        console.error('Error cargando historial:', err);
        setError('No se pudo cargar el historial');
      } finally {
        setLoadingHistory(false);
      }
    }

    setMessages([]);
    loadHistory();
  }, [room.id]);

  // 🔹 Conectar Socket.IO
  useEffect(() => {
    const s = io('http://localhost:8080', {
      auth: { token },
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('WS conectado, uniendo a sala', room.id);
      s.emit('join_room', { roomId: room.id });
    });

    // Mensajes nuevos
    s.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);

      const isMine = msg.userId === user.id;
      if (!isMine && !msg.isSystem && notificationSoundRef.current) {
        notificationSoundRef.current.play().catch(() => {});
      }
    });

    // typing
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

    // estado online/offline
    s.on('user_status', ({ userId, status }) => {
  setOnlineUsers((prev) => ({
    ...prev,
    [userId]: status,
  }));
});

// Al conectar, marca a TI mismo como online en el estado local
s.on('connect', () => {
  console.log('WS conectado, uniendo a sala', room.id);
  s.emit('join_room', { roomId: room.id });

  setOnlineUsers((prev) => ({
    ...prev,
    [user.id]: 'online',
  }));
});

    s.on('user_joined', ({ roomId, userId, username }) => {
  if (roomId !== room.id || userId === user.id) return;

  // ✅ Marca usuario como online
  setOnlineUsers((prev) => ({
    ...prev,
    [userId]: 'online',
  }));

  const systemMessage = {
    id: `join-${roomId}-${userId}-${Date.now()}`,
    roomId,
    userId: null,
    username: 'Sistema',
    content: `${username || `Usuario ${userId}`} se unió a la sala`,
    createdAt: new Date().toISOString(),
    isSystem: true,
    systemType: 'join',
  };

  setMessages((prev) => [...prev, systemMessage]);

  if (joinSoundRef.current) {
    joinSoundRef.current.play().catch(() => {});
  }
});

s.on('user_left', ({ roomId, userId, username }) => {
  if (roomId !== room.id || userId === user.id) return;

  // ✅ Marca usuario como offline
  setOnlineUsers((prev) => ({
    ...prev,
    [userId]: 'offline',
  }));

  const systemMessage = {
    id: `left-${roomId}-${userId}-${Date.now()}`,
    roomId,
    userId: null,
    username: 'Sistema',
    content: `${username || `Usuario ${userId}`} salió de la sala`,
    createdAt: new Date().toISOString(),
    isSystem: true,
    systemType: 'leave',
  };

  setMessages((prev) => [...prev, systemMessage]);

  if (leaveSoundRef.current) {
    leaveSoundRef.current.play().catch(() => {});
  }
});


    s.on('ws_error', (err) => {
      console.error('WS error:', err);
    });

    return () => {
      s.emit('leave_room', { roomId: room.id });
      s.disconnect();
    };
  }, [room.id, token, user.id]);

  // 🔹 Scroll automático al último mensaje
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

  // 🔹 Texto de "X está escribiendo..."
  const typingIds = Object.keys(typingUsers);
  const typingNames = typingIds.map((id) => getNameByUserId(Number(id)));

  let typingLabel = '';
  if (typingNames.length === 1) {
    typingLabel = `${typingNames[0]} está`;
  } else if (typingNames.length > 1) {
    typingLabel = 'Varias personas están';
  }

  // 🔹 NUEVO: usuarios online + avatars en el header
  const onlineUserEntries = Object.entries(onlineUsers || {});
  const onlineUserIds = onlineUserEntries
    .filter(([, status]) => status === 'online')
    .map(([id]) => Number(id))
    .filter((id) => !!id);

  const onlineCount = onlineUserIds.length;
  const visibleAvatars = onlineUserIds.slice(0, 4);
  const extraCount =
    onlineCount > visibleAvatars.length
      ? onlineCount - visibleAvatars.length
      : 0;

  return (
    <div className="h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* sonidos */}
      <audio ref={joinSoundRef} src="/sounds/join.wav" preload="auto" />
      <audio ref={leaveSoundRef} src="/sounds/leave.wav" preload="auto" />
      <audio ref={notificationSoundRef} src="/sounds/notify.wav" preload="auto" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        {/* IZQUIERDA: info sala */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full border border-slate-700 hover:bg-slate-800 transition flex items-center justify-center"
            aria-label="Volver a salas"
            title="Volver a salas"
          >
            <ArrowLeft className="w-4 h-4 text-slate-100" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{room.name}</h1>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                {room.isPrivate ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Privada
                  </>
                ) : (
                  <>
                    <Globe2 className="w-3.5 h-3.5" />
                    Pública
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              <span className="flex items-center gap-1">
                Chateando como{' '}
                <span className="text-slate-100 font-medium">
                  {user?.username}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* DERECHA: usuarios conectados + avatars */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <div className="flex -space-x-2">
            {visibleAvatars.map((userId) => {
              const name = getNameByUserId(userId);
              const avatarColor = getAvatarColor(userId);
              const initial = name.charAt(0).toUpperCase();
              return (
                <div
                  key={userId}
                  className={`w-7 h-7 rounded-full border border-slate-950 flex items-center justify-center text-[11px] font-semibold text-slate-950 ${avatarColor}`}
                  title={name}
                >
                  {initial}
                </div>
              );
            })}
            {extraCount > 0 && (
              <div className="w-7 h-7 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-[11px] text-slate-300">
                +{extraCount}
              </div>
            )}
          </div>
          <span>
            {onlineCount === 0
              ? 'Sin usuarios conectados'
              : onlineCount === 1
              ? '1 persona en línea'
              : `${onlineCount} personas en línea`}
          </span>
        </div>
      </header>

      {/* Contenido */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mensajes */}
        <main className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
          {loadingHistory ? (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pb-3">
              {messages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center text-[11px] text-slate-400"
                    >
                      <span className="px-3 py-1 rounded-full bg-slate-800/60">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isMine = msg.userId === user.id;
                const initial = getInitial(msg);
                const avatarColor = getAvatarColor(msg.userId);

                return (
                  <div
                    key={
                      msg.id ??
                      `${msg.createdAt}-${msg.content}-${Math.random()}`
                    }
                    className={`flex items-end ${
                      isMine ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isMine && (
                      <div
                        className={`mr-2 flex items-center justify-center w-8 h-8 rounded-full ${avatarColor} text-xs font-semibold text-slate-950 select-none`}
                      >
                        {initial}
                      </div>
                    )}

                    <div
                      className={`max-w-xs md:max-w-md px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-sky-500 text-slate-950 rounded-br-none'
                          : 'bg-slate-800 text-slate-50 rounded-bl-none'
                      }`}
                    >
                      {!isMine && (
                        <div className="text-[10px] text-slate-300 mb-1">
                          {getDisplayNameFromMessage(msg)}
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

                    {isMine && (
                      <div
                        className={`ml-2 flex items-center justify-center w-8 h-8 rounded-full ${avatarColor} text-xs font-semibold text-slate-950 select-none`}
                      >
                        {initial}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Indicador de typing */}
          {typingLabel && (
            <div className="mt-1 mb-1 flex items-center gap-2 text-xs text-slate-400">
              <span>{typingLabel} escribiendo</span>
              <div className="flex gap-[3px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </main>

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-slate-800 px-4 py-3 flex gap-2 items-center"
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
            className="p-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center"
            aria-label="Enviar mensaje"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
