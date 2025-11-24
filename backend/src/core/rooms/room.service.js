// src/core/rooms/room.service.js
import bcrypt from 'bcrypt';
import {
  createRoom,
  findRoomById,
  getVisibleRoomsForUser,
  isUserMemberOfRoom,
  addMemberToRoom,
  removeMemberFromRoom,
} from './room.repository.js';
import { findUserByUsername } from '../users/user.repository.js'; // 👈 ajusta el path si tu estructura es distinta

// Helper para crear errores tipados
function createError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

// Crear sala (pública o privada con password)
export async function createRoomForUser(ownerId, { name, isPrivate, password }) {
  if (!name || name.trim() === '') {
    throw createError('NAME_REQUIRED', 'El nombre de la sala es obligatorio');
  }

  const isPrivateBool = Boolean(isPrivate);

  if (isPrivateBool && !password) {
    throw createError('PASSWORD_REQUIRED', 'Las salas privadas requieren password');
  }

  if (!isPrivateBool && password) {
    throw createError('INVALID_COMBINATION', 'No se puede poner password en sala pública');
  }

  let passwordHash = null;
  if (isPrivateBool && password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  const room = await createRoom({
    name: name.trim(),
    isPrivate: isPrivateBool,
    passwordHash,
    ownerId,
  });

  return {
    id: room.id,
    name: room.name,
    isPrivate: room.is_private,
    ownerId: room.owner_id,
    createdAt: room.created_at,
  };
}

// Listar salas visibles
export async function listRoomsForUser(userId) {
  const rooms = await getVisibleRoomsForUser(userId);

  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    isPrivate: r.is_private,
    isMember: r.is_member,
    isOwner: r.is_owner,
    createdAt: r.created_at,
    // Si tu query trae unread_count puedes ignorarlo o pasarlo:
    // unreadCount: r.unread_count ?? 0,
  }));
}

// Unirse a una sala (pública o privada con password)
export async function joinRoom(roomId, userId, password) {
  const room = await findRoomById(roomId);
  if (!room) {
    throw createError('ROOM_NOT_FOUND', 'Sala no encontrada');
  }

  const membership = await isUserMemberOfRoom(roomId, userId);
  if (membership) {
    return {
      roomId: room.id,
      alreadyMember: true,
    };
  }

  // Validar password si es privada
  if (room.is_private) {
    if (!password) {
      throw createError('PASSWORD_REQUIRED', 'Esta sala requiere password');
    }

    const ok = await bcrypt.compare(password, room.password_hash || '');
    if (!ok) {
      throw createError('INVALID_ROOM_PASSWORD', 'Password de sala incorrecto');
    }
  }

  await addMemberToRoom(roomId, userId, 'member');

  return {
    roomId: room.id,
    joined: true,
  };
}

// Salir de una sala
export async function leaveRoom(roomId, userId) {
  const room = await findRoomById(roomId);
  if (!room) {
    throw createError('ROOM_NOT_FOUND', 'Sala no encontrada');
  }

  if (room.owner_id === userId) {
    throw createError(
      'OWNER_CANNOT_LEAVE',
      'El owner no puede salir de su propia sala (tendría que transferir o borrar la sala)'
    );
  }

  const removed = await removeMemberFromRoom(roomId, userId);

  return {
    roomId: room.id,
    left: removed,
  };
}

// Invitar usuario a una sala privada (o cualquier sala) por username
export async function inviteUserToRoom({ roomId, requesterId, username }) {
  if (!username || username.trim() === '') {
    throw createError('USERNAME_REQUIRED', 'El username es obligatorio');
  }

  const room = await findRoomById(roomId);
  if (!room) {
    throw createError('ROOM_NOT_FOUND', 'Sala no encontrada');
  }

  // Solo el owner puede invitar (puedes relajar esta regla si quieres)
  if (room.owner_id !== requesterId) {
    throw createError('NOT_OWNER', 'Solo el owner puede invitar a esta sala');
  }

  // Buscar usuario por username
  const user = await findUserByUsername(username.trim());
  if (!user) {
    throw createError('USER_NOT_FOUND', 'Usuario no encontrado');
  }

  // Ya es miembro?
  const membership = await isUserMemberOfRoom(roomId, user.id);
  if (membership) {
    throw createError('ALREADY_MEMBER', 'Este usuario ya es miembro de la sala');
  }

  // Lo añadimos como member sin pedir password
  await addMemberToRoom(roomId, user.id, 'member');

  return {
    roomId: room.id,
    invitedUserId: user.id,
    invitedUsername: user.username,
    added: true,
  };
}
