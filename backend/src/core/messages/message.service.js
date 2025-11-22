// src/core/messages/message.service.js
import {
  insertMessage,
  getMessagesByRoom,
  countMessagesByRoom,
} from './message.repository.js';
import {
  findRoomById,
  isUserMemberOfRoom,
} from '../rooms/room.repository.js';

function createError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

// Envía un mensaje a una sala: valida sala, membresía y guarda en DB
export async function sendMessageInRoom({ roomId, userId, content }) {
  if (!roomId || Number.isNaN(Number(roomId))) {
    throw createError('INVALID_ROOM', 'roomId inválido');
  }

  if (!content || content.trim() === '') {
    throw createError('CONTENT_REQUIRED', 'El mensaje no puede estar vacío');
  }

  const room = await findRoomById(roomId);
  if (!room) {
    throw createError('ROOM_NOT_FOUND', 'Sala no encontrada');
  }

  const membership = await isUserMemberOfRoom(roomId, userId);
  if (!membership) {
    throw createError('NOT_MEMBER', 'No eres miembro de esta sala');
  }

  const row = await insertMessage({
    roomId,
    userId,
    content: content.trim(),
  });

  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

// Historial paginado de mensajes
export async function getRoomMessagesWithPagination({
  roomId,
  userId,
  limit = 20,
  offset = 0,
}) {
  if (!roomId || Number.isNaN(Number(roomId))) {
    throw createError('INVALID_ROOM', 'roomId inválido');
  }

  const room = await findRoomById(roomId);
  if (!room) {
    throw createError('ROOM_NOT_FOUND', 'Sala no encontrada');
  }

  // El usuario debe ser miembro para ver el historial (incluso si es pública)
  const membership = await isUserMemberOfRoom(roomId, userId);
  if (!membership) {
    throw createError('NOT_MEMBER', 'No eres miembro de esta sala');
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100); // 1..100
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [items, total] = await Promise.all([
    getMessagesByRoom({ roomId, limit: safeLimit, offset: safeOffset }),
    countMessagesByRoom(roomId),
  ]);

  const hasMore = safeOffset + safeLimit < total;

  return {
    items: items.map((m) => ({
      id: m.id,
      roomId: m.room_id,
      userId: m.user_id,
      username: m.username,
      content: m.content,
      createdAt: m.created_at,
    })),
    pagination: {
      total,
      limit: safeLimit,
      offset: safeOffset,
      hasMore,
    },
  };
}
