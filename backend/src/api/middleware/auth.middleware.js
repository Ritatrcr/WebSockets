// src/api/middleware/auth.middleware.js
import { verifyToken } from '../../core/auth/jwt.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token faltante o inválido (formato)' });
  }

  try {
    const payload = verifyToken(token);
    // Guardamos el userId para usarlo en los controladores
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
