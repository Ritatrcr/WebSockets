// src/scripts/migrate.js (o como lo tengas)
import { pool } from '../config/db.js';

const migrationSQL = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash VARCHAR(255), -- NULL si no tiene password
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOM MEMBERS (membresía / invitaciones)
CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner' o 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_room_user UNIQUE (room_id, user_id)
);

-- 🔹 Asegurarnos de que room_members tenga columna last_read_at
ALTER TABLE room_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para historial paginado por sala
CREATE INDEX IF NOT EXISTS idx_messages_room_created_at
  ON messages (room_id, created_at DESC);

-- Usuario inicial de prueba
INSERT INTO users (username, password_hash)
VALUES ('demo', '$2b$10$L0O8BEEgH8XMGeX01d9X5OhB29dQxUMI62fqpTUVTA2d29tAKamX2') -- contraseña: 'demo123'
ON CONFLICT (username) DO NOTHING;

-- Sala pública inicial
INSERT INTO rooms (name, is_private, owner_id)
SELECT 'general', FALSE, id FROM users WHERE username = 'demo'
ON CONFLICT DO NOTHING;
`;

async function runMigration() {
  console.log('🚀 Running DB migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
