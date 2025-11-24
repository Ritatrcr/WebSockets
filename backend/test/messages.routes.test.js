// backend/test/messages.routes.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import request from 'supertest';
import { app } from '../src/app.js';
import { joinRoom } from '../src/core/rooms/room.service.js';
import { sendMessageInRoom } from '../src/core/messages/message.service.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

let token;
let testUserId;
let roomId;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [TEST_USERNAME, passwordHash]
  );

  const resLogin = await request(app)
    .post('/auth/login')
    .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

  token = resLogin.body.token;

  const resUser = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [TEST_USERNAME]
  );
  testUserId = resUser.rows[0].id;

  // Sala general
  const resRoom = await pool.query(
    "SELECT id FROM rooms WHERE name = 'general'"
  );
  roomId = resRoom.rows[0].id;

  // Aseguramos membresía y un mensaje
  await joinRoom(roomId, testUserId, null);

  await sendMessageInRoom({
    roomId,
    userId: testUserId,
    content: 'Mensaje desde integration test',
  });
});

describe('Messages routes', () => {
  it('GET /rooms/:roomId/messages devuelve historial con token válido', async () => {
    const res = await request(app)
      .get(`/rooms/${roomId}/messages`)
      .query({ limit: 10, offset: 0 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /rooms/:roomId/messages sin token devuelve 401', async () => {
    const res = await request(app)
      .get(`/rooms/${roomId}/messages`)
      .query({ limit: 10, offset: 0 });

    expect(res.status).toBe(401);
  });
});
