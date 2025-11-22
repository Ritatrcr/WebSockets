// src/core/messages/message.repository.js
import { pool } from '../../config/db.js';

export async function insertMessage({ roomId, userId, content }) {
  const result = await pool.query(
    `
    INSERT INTO messages (room_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, room_id, user_id, content, created_at
    `,
    [roomId, userId, content]
  );

  return result.rows[0];
}

// Obtener mensajes de una sala, ordenados del más reciente al más antiguo
export async function getMessagesByRoom({ roomId, limit = 20, offset = 0 }) {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.room_id,
      m.user_id,
      m.content,
      m.created_at,
      u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
    WHERE m.room_id = $1
    ORDER BY m.created_at DESC
    LIMIT $2
    OFFSET $3
    `,
    [roomId, limit, offset]
  );

  return result.rows;
}

// Contar mensajes totales en una sala
export async function countMessagesByRoom(roomId) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM messages
    WHERE room_id = $1
    `,
    [roomId]
  );

  return result.rows[0]?.total ?? 0;
}
