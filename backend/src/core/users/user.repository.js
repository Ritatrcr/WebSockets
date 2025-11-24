// src/core/users/user.repository.js
import { pool } from '../../config/db.js';

export async function findUserByUsername(username) {
  const query = `
    SELECT id, username, password_hash
    FROM users
    WHERE username = $1
  `;
  const values = [username];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}



