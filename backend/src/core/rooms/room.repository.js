// src/core/rooms/room.repository.js
import { pool } from '../../config/db.js';

// Crear sala
export async function createRoom({ name, isPrivate, passwordHash, ownerId }) {
  const result = await pool.query(
    `
    INSERT INTO rooms (name, is_private, password_hash, owner_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, is_private, owner_id, created_at
    `,
    [name, isPrivate, passwordHash, ownerId]
  );

  const room = result.rows[0];

  // Hacemos al owner miembro de la sala
  await pool.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, 'owner')
    ON CONFLICT (room_id, user_id) DO NOTHING
    `,
    [room.id, ownerId]
  );

  return room;
}

// Buscar sala por id
export async function findRoomById(roomId) {
  const result = await pool.query(
    `
    SELECT id, name, is_private, password_hash, owner_id, created_at
    FROM rooms
    WHERE id = $1
    `,
    [roomId]
  );

  return result.rows[0] || null;
}

// Ver si usuario es miembro de una sala
export async function isUserMemberOfRoom(roomId, userId) {
  const result = await pool.query(
    `
    SELECT id, role
    FROM room_members
    WHERE room_id = $1 AND user_id = $2
    `,
    [roomId, userId]
  );

  return result.rows[0] || null;
}

// Añadir miembro
export async function addMemberToRoom(roomId, userId, role = 'member') {
  const result = await pool.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (room_id, user_id) DO NOTHING
    RETURNING id, room_id, user_id, role, created_at
    `,
    [roomId, userId, role]
  );

  return result.rows[0] || null;
}

// Eliminar miembro
export async function removeMemberFromRoom(roomId, userId) {
  const result = await pool.query(
    `
    DELETE FROM room_members
    WHERE room_id = $1 AND user_id = $2
    `,
    [roomId, userId]
  );

  return result.rowCount > 0;
}

// Listar salas visibles para el usuario
export async function getVisibleRoomsForUser(userId) {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.name,
      r.is_private,
      r.owner_id,
      r.created_at,
      CASE WHEN rm.user_id IS NOT NULL THEN true ELSE false END AS is_member,
      CASE WHEN r.owner_id = $1 THEN true ELSE false END AS is_owner
    FROM rooms r
    LEFT JOIN room_members rm
      ON rm.room_id = r.id AND rm.user_id = $1
    WHERE
      r.is_private = FALSE
      OR rm.user_id IS NOT NULL
    ORDER BY r.id ASC
    `,
    [userId]
  );

  return result.rows;
}
