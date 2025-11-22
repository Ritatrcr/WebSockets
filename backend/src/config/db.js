import pkg from 'pg';
import { config } from './env.js';

const { Pool } = pkg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as now');
    console.log('✅ DB connected. Time:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Error connecting to DB:', err.message);
    throw err;
  }
}
