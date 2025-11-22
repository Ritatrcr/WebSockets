// src/pages/RoomsPage.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRooms, createRoomApi, joinRoomApi } from '../api/rooms';

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
          // Por ahora algo simple (luego podemos hacer modal bonito)
          pwd = window.prompt('Esta sala es privada. Introduce el password:');
          if (!pwd) {
            return; // canceló
          }
        }
        await joinRoomApi(room.id, pwd);
        // recargar salas para actualizar isMember
        await loadRooms();
      }

      // Ir a vista de chat con esta sala
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">Salas de chat</h1>
          <span className="text-xs text-slate-400">
            Backend: Node + WebSockets + RabbitMQ + Postgres
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-400">
            Conectado como <span className="text-slate-100">{user?.username}</span>
          </span>
          <button
            onClick={logout}
            className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 transition text-xs"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col md:flex-row gap-6 p-6">
        {/* Columna izquierda: crear sala */}
        <section className="w-full md:w-1/3 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3">Crear nueva sala</h2>
          <form className="space-y-3" onSubmit={handleCreateRoom}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre de la sala
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-50 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="p.ej. equipo-analitica"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="privateRoom"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <label
                htmlFor="privateRoom"
                className="text-xs text-slate-300 cursor-pointer"
              >
                Sala privada (con password)
              </label>
            </div>

            {isPrivate && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password de la sala
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-50 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full mt-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? 'Creando...' : 'Crear sala'}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </section>

        {/* Columna derecha: lista de salas */}
        <section className="flex-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Salas disponibles</h2>
            <button
              onClick={loadRooms}
              className="text-xs px-2 py-1 border border-slate-700 rounded-lg hover:bg-slate-800"
            >
              Recargar
            </button>
          </div>

          {loadingRooms ? (
            <p className="text-sm text-slate-400">Cargando salas...</p>
          ) : rooms.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay salas todavía. Crea una a la izquierda.
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between px-3 py-2 bg-slate-950/40 rounded-xl border border-slate-800"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-100">
                      {room.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {room.isPrivate ? 'Privada 🔒' : 'Pública 🌐'} ·{' '}
                      {room.isMember ? 'Ya eres miembro' : 'No eres miembro aún'}
                    </span>
                  </div>
                  <button
                    className="text-xs px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                    onClick={() => handleJoinAndEnter(room)}
                  >
                    {room.isMember ? 'Entrar' : 'Unirse y entrar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
