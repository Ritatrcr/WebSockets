// src/core/auth/auth.service.js
import bcrypt from 'bcrypt';
import { findUserByUsername } from '../users/user.repository.js';
import { signToken } from './jwt.js';

export async function loginUser(username, password) {
  const user = await findUserByUsername(username);

  if (!user) {
    // No revelamos si es usuario o contraseña el problema
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = signToken({ userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  };
}
