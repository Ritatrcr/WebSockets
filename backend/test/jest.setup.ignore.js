// backend/test/jest.setup.js
import { pool } from '../src/config/db.js';

afterAll(async () => {
  try {
    await pool.end();
  } catch (err) {
    console.error('Error cerrando pool de DB en afterAll:', err.message);
  }
});
