// src/pages/RoomsPage.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRooms, createRoomApi, joinRoomApi, inviteToRoomApi } from '../api/rooms';
import {
  RefreshCw,
  LogOut,
  MessageCircle,
  PlusCircle,
  UserCircle2,
  UserPlus,
  Globe2,
  Lock,
  Filter,
} from 'lucide-react';

export function RoomsPage({ onEnterRoom }) {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState('');

  // Formulario para crear sala
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Para mostrar/ocultar formulario de invitación por sala
  const [inviteRoomId, setInviteRoomId] = useState(null);

  // Filtro de salas (all | public | private)
  const [filter, setFilter] = useState('all');

  async function loadRooms() {
    setLoadingRooms(true);
    setError('');
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las salas');
    } finally {
      setLoadingRooms(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('El nombre de la sala es obligatorio');
      return;
    }

    if (isPrivate && !password) {
      setError('Las salas privadas requieren password');
      return;
    }

    setCreating(true);
    try {
      await createRoomApi({ name: name.trim(), isPrivate, password });
      setName('');
      setPassword('');
      setIsPrivate(false);
      await loadRooms();
      setShowCreate(false); // cerrar modal al crear
    } catch (err) {
      console.error(err);
      setError('Error al crear la sala');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinAndEnter(room) {
    setError('');

    try {
      // Si no es miembro aún, hacer join
      if (!room.isMember) {
        let pwd = undefined;
        if (room.isPrivate) {
          pwd = window.prompt('Esta sala es privada. Introduce el password:');
          if (!pwd) {
            return; // canceló
          }
        }
        await joinRoomApi(room.id, pwd);
        await loadRooms();
      }

      if (onEnterRoom) {
        onEnterRoom(room);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al unirse a la sala');
      }
    }
  }

  // Normalizar flags por si vienen en snake_case
  const normalizeRoom = (room) => ({
    ...room,
    isPrivate:
      typeof room.isPrivate === 'boolean' ? room.isPrivate : !!room.is_private,
    isMember:
      typeof room.isMember === 'boolean' ? room.isMember : !!room.is_member,
  });

  const normalized = rooms.map(normalizeRoom);

  // Aplicar filtro público/privado
  const filtered = normalized.filter((room) => {
    if (filter === 'public') return !room.isPrivate;
    if (filter === 'private') return room.isPrivate;
    return true;
  });

  // “Mis chats” vs “Unirse a un chat”
  const myRooms = filtered.filter((room) => room.isMember);
  const joinableRooms = filtered.filter((room) => !room.isMember);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900/80 bg-slate-950">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-sky-400" />
            Hola, {user?.username}!
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            <span className="text-slate-400 hidden sm:inline">
              Conectado
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-full border border-slate-700 hover:bg-slate-900 transition flex items-center justify-center"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col gap-4 p-4 md:p-6">
        <section className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
          {/* Barra superior con título secundario + filtro + acciones */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-1">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-100">
                Salas disponibles
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none pl-6 pr-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-slate-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="all">Todas</option>
                  <option value="public">Públicas</option>
                  <option value="private">Privadas</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowCreate(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-950/80 hover:border-sky-500 hover:bg-slate-900 px-3 py-1.5 text-[11px] text-slate-100"
              >
                <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                Crear sala
              </button>

              <button
                onClick={loadRooms}
                className="p-2 rounded-full hover:bg-slate-800 flex items-center justify-center"
                aria-label="Recargar salas"
                title="Recargar salas"
              >
                <RefreshCw className="w-4 h-4 text-slate-200" />
              </button>
            </div>
          </div>

          {/* Contenido de salas */}
          {loadingRooms ? (
            <p className="text-sm text-slate-400">Cargando salas...</p>
          ) : (
            <>
              {/* MIS CHATS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                    <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    Mis chats
                  </h3>
                  {myRooms.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/40 text-indigo-200">
                      {myRooms.length} sala
                      {myRooms.length > 1 && 's'}
                    </span>
                  )}
                </div>

                {myRooms.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Todavía no eres miembro de ninguna sala.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {myRooms.map((room) => (
                      <li
                        key={room.id}
                        className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900/80 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-stretch gap-2 flex-1">
                            <div className="w-1 rounded-full bg-indigo-400/80" />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                                {room.name}
                              </span>

                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                                  {room.isPrivate ? (
                                    <>
                                      <Lock className="w-3 h-3 text-slate-300" />
                                      Privada
                                    </>
                                  ) : (
                                    <>
                                      <Globe2 className="w-3 h-3 text-slate-300" />
                                      Pública
                                    </>
                                  )}
                                </span>

                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 flex items-center gap-1">
                                  Miembro
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
  <button
    className="p-2 rounded-full hover:bg-slate-800 flex items-center justify-center"
    onClick={() => handleJoinAndEnter(room)}
    aria-label="Entrar al chat"
    title="Entrar al chat"
  >
    <MessageCircle className="w-4 h-4 text-slate-100" />
  </button>

  {room.isPrivate && (
    <button
      type="button"
      className="p-2 rounded-full hover:bg-slate-800 flex items-center justify-center"
      onClick={() =>
        setInviteRoomId(inviteRoomId === room.id ? null : room.id)
      }
      aria-label="Invitar usuarios"
      title="Invitar usuarios"
    >
      <UserPlus className="w-4 h-4 text-sky-400" />
    </button>
  )}
</div>

                        </div>

                        {inviteRoomId === room.id && (
                          <div className="mt-2 pt-2 border-t border-slate-800">
                            <InviteUser roomId={room.id} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* UNIRSE A UN CHAT */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 mb-0 uppercase tracking-wide flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                    Explorar salas
                  </h3>
                  {joinableRooms.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/40 text-sky-200">
                      {joinableRooms.length} disponible
                      {joinableRooms.length > 1 && 's'}
                    </span>
                  )}
                </div>

                {joinableRooms.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No hay más salas disponibles para unirte con este filtro.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {joinableRooms.map((room) => (
                      <li
                        key={room.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900/80 transition"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-100 flex items-center gap-1.5">
                            {room.isPrivate ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {room.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400">
                              {room.isPrivate ? 'Privada' : 'Pública'}
                            </span>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/40 text-sky-200 flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              Disponible
                            </span>
                          </div>
                        </div>

                        <button
                          className="text-xs px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center gap-1"
                          onClick={() => handleJoinAndEnter(room)}
                        >
                          <UserPlus className="w-3 h-3" />
                          Unirse
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Error global de salas si no está el modal abierto */}
              {error && !showCreate && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </>
          )}
        </section>
      </main>

      {/* MODAL Crear sala */}
      {showCreate && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="w-full max-w-md mx-4 rounded-2xl border border-slate-700 bg-slate-900 shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 rounded-full bg-slate-800 items-center justify-center">
                  <PlusCircle className="w-4 h-4 text-sky-400" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-100">
                    Crear Sala
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form className="space-y-3 text-xs" onSubmit={handleCreateRoom}>
              <div className="space-y-1">
                <label className="block text-slate-300 text-[11px]">
                  Nombre de la sala
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1.5 text-slate-50 text-xs outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="privateRoom"
                  className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"
                >
                  <input
                    id="privateRoom"
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-600"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Sala privada
                  </span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Las públicas no requieren contraseña.
                </span>
              </div>

              {isPrivate && (
                <div className="space-y-1">
                  <label className="block text-slate-300 text-[11px]">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-2 py-1.5 text-slate-50 text-xs outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-3 py-1.5 text-[11px] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creando...' : 'Crear Sala'}
                </button>
                {error && (
                  <span className="text-[11px] text-red-400 truncate">
                    {error}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para invitar usuarios a una sala concreta
 */
function InviteUser({ roomId }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');

  async function handleInvite(e) {
    e.preventDefault();
    setStatus('');
    try {
      await inviteToRoomApi(roomId, username);
      setStatus(`Invitación enviada a @${username}`);
      setUsername('');
    } catch (err) {
      console.error(err);
      setStatus('No se pudo invitar al usuario');
    }
  }

  return (
    <form onSubmit={handleInvite} className="flex gap-2 text-xs items-center">
      <input
        type="text"
        placeholder="Username a invitar"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="flex-1 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-slate-50 outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
      />
      <button
        type="submit"
        className="px-3 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
      >
        Invitar
      </button>
      {status && (
        <p className="text-[11px] text-slate-300 ml-2 truncate">{status}</p>
      )}
    </form>
  );
}
