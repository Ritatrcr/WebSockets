// src/api/messages.routes.js
import { Router } from 'express';
import { getRoomMessagesWithPagination } from '../core/messages/message.service.js';

export const messagesRouter = Router();

// GET /rooms/:roomId/messages?limit=&offset=
messagesRouter.get('/:roomId/messages', async (req, res) => {
  const userId = req.user.id;
  const roomId = Number(req.params.roomId);
  const { limit, offset } = req.query;

  if (Number.isNaN(roomId)) {
    return res.status(400).json({ message: 'roomId inválido' });
  }

  try {
    const result = await getRoomMessagesWithPagination({
      roomId,
      userId,
      limit,
      offset,
    });

    return res.json(result);
  } catch (err) {
    console.error('Error en GET /rooms/:roomId/messages:', err);

    if (err.code === 'ROOM_NOT_FOUND') {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    if (err.code === 'NOT_MEMBER') {
      return res.status(403).json({ message: 'No eres miembro de esta sala' });
    }
    if (err.code === 'INVALID_ROOM') {
      return res.status(400).json({ message: 'roomId inválido' });
    }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});
