// src/api/rooms.js
import { api } from './client';

// GET /rooms
export async function fetchRooms() {
  const res = await api.get('/rooms');
  return res.data; // array de salas
}

// POST /rooms
export async function createRoomApi({ name, isPrivate, password }) {
  const body = { name, isPrivate };
  if (isPrivate && password) {
    body.password = password;
  }
  const res = await api.post('/rooms', body);
  return res.data; // sala creada
}

// POST /rooms/:id/join
export async function joinRoomApi(roomId, password) {
  const body = password ? { password } : {};
  const res = await api.post(`/rooms/${roomId}/join`, body);
  return res.data;
}
