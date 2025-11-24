// backend/test/rooms.service.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import {
  createRoomForUser,
  listRoomsForUser,
  joinRoom,
} from '../src/core/rooms/room.service.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

let testUserId;

beforeAll(async () => {
  // Usuario de prueba
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [TEST_USERNAME, passwordHash]
  );

  const res = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [TEST_USERNAME]
  );
  testUserId = res.rows[0].id;
});

afterAll(async () => {
  // Limpiamos salas de prueba (opcional)
  await pool.query("DELETE FROM rooms WHERE name LIKE 'jest-%'");
});

describe('room.service', () => {
  it('debe lanzar error si no se pasa nombre de sala', async () => {
    await expect(
      createRoomForUser(testUserId, { name: '', isPrivate: false })
    ).rejects.toMatchObject({
      code: 'NAME_REQUIRED',
    });
  });

  it('debe crear una sala pública sin password', async () => {
    const room = await createRoomForUser(testUserId, {
      name: 'jest-public-room',
      isPrivate: false,
    });

    expect(room).toHaveProperty('id');
    expect(room.isPrivate).toBe(false);

    const rooms = await listRoomsForUser(testUserId);
    const found = rooms.find((r) => r.id === room.id);
    expect(found).toBeDefined();
  });

  it('debe crear una sala privada con password y permitir joinRoom con password', async () => {
    const room = await createRoomForUser(testUserId, {
      name: 'jest-private-room',
      isPrivate: true,
      password: 'secreto123',
    });

    // Creamos otro usuario de prueba para unirse
    const otherUserResult = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ('jest_user', 'x') RETURNING id"
    );
    const otherUserId = otherUserResult.rows[0].id;

    // Sin password => error
    await expect(joinRoom(room.id, otherUserId, null)).rejects.toMatchObject({
      code: 'PASSWORD_REQUIRED',
    });

    // Password incorrecto => error
    await expect(
      joinRoom(room.id, otherUserId, 'malo')
    ).rejects.toMatchObject({
      code: 'INVALID_ROOM_PASSWORD',
    });

    // Password correcto => join ok
    const joinResult = await joinRoom(room.id, otherUserId, 'secreto123');
    expect(joinResult.joined).toBe(true);

    // Limpieza de user de prueba
    await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });
});
