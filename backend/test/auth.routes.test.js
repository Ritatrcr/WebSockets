// backend/test/auth.routes.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import request from 'supertest';
import { app } from '../src/app.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [TEST_USERNAME, passwordHash]
  );
});

describe('Auth routes', () => {
  it('POST /auth/login devuelve 401 con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'foo', password: 'bar' });

    expect(res.status).toBe(401);
  });

  it('POST /auth/login devuelve 200 y token con demoo/123456', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: TEST_USERNAME });
  });
});
