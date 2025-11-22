// src/core/auth/jwt.js
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';

export function signToken(payload) {
  // Por ejemplo, token válido por 8 horas
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
