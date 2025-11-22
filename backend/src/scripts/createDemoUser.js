// src/scripts/createDemoUser.js
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

async function createOrUpdateDemoUser() {
  const username = 'demo';
  const plainPassword = 'demo123';

  try {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    console.log('Hash generado para demo123:', passwordHash);

    const query = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `;

    await pool.query(query, [username, passwordHash]);
    console.log('✅ Usuario demo creado/actualizado correctamente');
  } catch (err) {
    console.error('❌ Error creando/actualizando usuario demo:', err.message);
  } finally {
    await pool.end();
  }
}

createOrUpdateDemoUser();
