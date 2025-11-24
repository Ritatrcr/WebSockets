// src/api/rooms.routes.js
import { Router } from 'express';
import {
  createRoomForUser,
  listRoomsForUser,
  joinRoom,
  leaveRoom,
  inviteUserToRoom, // ✅ importante
} from '../core/rooms/room.service.js';

export const roomsRouter = Router();

// GET /rooms - listar salas visibles
roomsRouter.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const rooms = await listRoomsForUser(userId);
    return res.json(rooms);
  } catch (err) {
    console.error('Error en GET /rooms:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /rooms - crear sala
roomsRouter.post('/', async (req, res) => {
  const { name, isPrivate, password } = req.body || {};
  const userId = req.user.id;

  try {
    const room = await createRoomForUser(userId, { name, isPrivate, password });
    return res.status(201).json(room);
  } catch (err) {
    console.error('Error en POST /rooms:', err);

    if (err.code === 'NAME_REQUIRED') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'PASSWORD_REQUIRED') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'INVALID_COMBINATION') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /rooms/:roomId/join - unirse a sala
roomsRouter.post('/:roomId/join', async (req, res) => {
  const roomId = Number(req.params.roomId);
  const { password } = req.body || {};
  const userId = req.user.id;

  if (Number.isNaN(roomId)) {
    return res.status(400).json({ message: 'roomId inválido' });
  }

  try {
    const result = await joinRoom(roomId, userId, password);
    return res.json(result);
  } catch (err) {
    console.error('Error en POST /rooms/:roomId/join:', err);

    if (err.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === 'PASSWORD_REQUIRED') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'INVALID_ROOM_PASSWORD') {
      return res.status(403).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /rooms/:roomId/leave - salir de sala
roomsRouter.post('/:roomId/leave', async (req, res) => {
  const roomId = Number(req.params.roomId);
  const userId = req.user.id;

  if (Number.isNaN(roomId)) {
    return res.status(400).json({ message: 'roomId inválido' });
  }

  try {
    const result = await leaveRoom(roomId, userId);
    return res.json(result);
  } catch (err) {
    console.error('Error en POST /rooms/:roomId/leave:', err);

    if (err.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === 'OWNER_CANNOT_LEAVE') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /rooms/:roomId/invite - invitar a sala por username
roomsRouter.post('/:roomId/invite', async (req, res) => {
  const roomId = Number(req.params.roomId);
  const { username } = req.body || {};
  const requesterId = req.user.id; // el que invita

  if (Number.isNaN(roomId)) {
    return res.status(400).json({ message: 'roomId inválido' });
  }

  try {
    const result = await inviteUserToRoom({ roomId, requesterId, username });
    return res.json(result);
  } catch (err) {
    console.error('Error en POST /rooms/:roomId/invite:', err);

    if (err.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === 'NOT_OWNER') {
      return res.status(403).json({ message: err.message });
    }
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: err.message });
    }
    if (err.code === 'ALREADY_MEMBER') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'USERNAME_REQUIRED') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});
