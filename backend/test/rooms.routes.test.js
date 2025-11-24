// backend/test/rooms.routes.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import request from 'supertest';
import { app } from '../src/app.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

let token;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [TEST_USERNAME, passwordHash]
  );

  const res = await request(app)
    .post('/auth/login')
    .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

  token = res.body.token;
});

describe('Rooms routes', () => {
  it('GET /rooms sin token devuelve 401', async () => {
    const res = await request(app).get('/rooms');

    expect(res.status).toBe(401);
  });

  it('GET /rooms con token devuelve 200 y una lista', async () => {
    const res = await request(app)
      .get('/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /rooms crea una sala pública', async () => {
    const res = await request(app)
      .post('/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'jest-room-route-public',
        isPrivate: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.isPrivate).toBe(false);
  });
});
