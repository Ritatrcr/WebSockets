// backend/test/messages.service.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import {
  getRoomMessagesWithPagination,
  sendMessageInRoom,
} from '../src/core/messages/message.service.js';
import { joinRoom } from '../src/core/rooms/room.service.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

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

  const resUser = await pool.query(
    'SELECT id FROM users WHERE username = $1',
    [TEST_USERNAME]
  );
  testUserId = resUser.rows[0].id;

  // Usamos la sala 'general' creada por tu migración
  const resRoom = await pool.query(
    "SELECT id FROM rooms WHERE name = 'general'"
  );
  roomId = resRoom.rows[0].id;

  // Aseguramos que demoo es miembro de la sala general
  await joinRoom(roomId, testUserId, null);

  // Insertamos algunos mensajes de prueba
  await sendMessageInRoom({
    roomId,
    userId: testUserId,
    content: 'Mensaje 1 desde unit test',
  });
  await sendMessageInRoom({
    roomId,
    userId: testUserId,
    content: 'Mensaje 2 desde unit test',
  });
});

describe('message.service - getRoomMessagesWithPagination', () => {
  it('debe traer mensajes paginados para un usuario miembro', async () => {
    const result = await getRoomMessagesWithPagination({
      roomId,
      userId: testUserId,
      limit: 10,
      offset: 0,
    });

    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result).toHaveProperty('pagination');
    expect(result.pagination.limit).toBe(10);
  });

  it('debe lanzar NOT_MEMBER si el usuario no es miembro', async () => {
    const otherUserRes = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ('jest_no_member', 'x') RETURNING id"
    );
    const otherUserId = otherUserRes.rows[0].id;

    await expect(
      getRoomMessagesWithPagination({
        roomId,
        userId: otherUserId,
        limit: 10,
        offset: 0,
      })
    ).rejects.toMatchObject({
      code: 'NOT_MEMBER',
    });

    await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });
});
