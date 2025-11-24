// backend/test/auth.service.test.js
import bcrypt from 'bcrypt';
import { pool } from '../src/config/db.js';
import { loginUser } from '../src/core/auth/auth.service.js';

const TEST_USERNAME = 'demoo';
const TEST_PASSWORD = '123456';

beforeAll(async () => {
  // Creamos/actualizamos usuario de prueba
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [TEST_USERNAME, passwordHash]
  );
});

describe('auth.service - loginUser', () => {
  it('debe lanzar INVALID_CREDENTIALS si el usuario no existe', async () => {
    await expect(loginUser('noexiste', 'pass')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('debe devolver token y user si las credenciales son correctas (demoo/123456)', async () => {
    const result = await loginUser(TEST_USERNAME, TEST_PASSWORD);

    expect(result).toHaveProperty('token');
    expect(result.user).toEqual(
      expect.objectContaining({
        username: TEST_USERNAME,
      })
    );
  });

  it('debe lanzar INVALID_CREDENTIALS si la contraseña es incorrecta', async () => {
    await expect(loginUser(TEST_USERNAME, 'clave-mala')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});
