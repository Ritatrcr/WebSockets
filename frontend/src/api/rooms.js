// src/api/rooms.js
import { api } from './client';

export async function inviteToRoomApi(roomId, username) {
  const res = await api.post(`/rooms/${roomId}/invite`, { username });
  return res.data;
}


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

export async function fetchUsersApi() {
  const res = await api.get('/users');
  return res.data;
}


