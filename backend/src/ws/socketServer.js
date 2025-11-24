// src/ws/socketServer.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import {
  isUserMemberOfRoom,
  findRoomById,
} from '../core/rooms/room.repository.js';
import { publishChatMessage } from '../config/rabbitmq.js'; // opcional, lo puedes quitar si no lo usas
import {
  recordWsConnectionChange,
  recordWsMessageReceived,
  recordWsMessageSent,
} from '../core/metrics/metrics.js';

// 👇 NUEVO: service que guarda el mensaje en la DB
import { sendMessageInRoom } from '../core/messages/message.service.js';

// Mapa sencillo para online/offline: userId -> nº de sockets activos
const onlineUsers = new Map();

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // en dev, luego puedes restringir a tu frontend
    },
  });

  // Middleware de autenticación por JWT en el handshake de Socket.IO
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const payload = jwt.verify(token, config.jwtSecret);
      socket.data.userId = payload.userId;
      socket.data.username = payload.username; // guardamos username
      return next();
    } catch (err) {
      console.error('Error auth Socket.IO:', err.message);
      return next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const username = socket.data.username;
    console.log(`🔌 Usuario conectado: userId=${userId}, socket=${socket.id}`);

    // Métrica: +1 conexión WS
    recordWsConnectionChange(1);

    // Tracking de usuarios online (por número de sockets)
    const prevCount = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, prevCount + 1);
    if (prevCount === 0) {
      // Primera conexión de este usuario -> pasa a online
      io.emit('user_status', { userId, status: 'online' });
    }

    // Helper para nombre interno de sala en Socket.IO
    const roomName = (roomId) => `room:${roomId}`;

    // --- Evento: join_room ---
    socket.on('join_room', async (payload) => {
      try {
        const roomId = Number(payload?.roomId);
        if (Number.isNaN(roomId)) {
          return socket.emit('ws_error', {
            type: 'join_room',
            message: 'roomId inválido',
          });
        }

        const room = await findRoomById(roomId);
        if (!room) {
          return socket.emit('ws_error', {
            type: 'join_room',
            message: 'Sala no encontrada',
          });
        }

        const membership = await isUserMemberOfRoom(roomId, userId);
        if (!membership) {
          return socket.emit('ws_error', {
            type: 'join_room',
            message: 'No eres miembro de esta sala. Usa primero /rooms/:id/join',
          });
        }

        socket.join(roomName(roomId));
        console.log(`✅ userId=${userId} joined room=${roomId}`);

        // Notificar a los OTROS en la sala (no hace falta al que entra)
        socket.to(roomName(roomId)).emit('user_joined', {
          roomId,
          userId,
          username,
        });
      } catch (err) {
        console.error('Error en join_room:', err);
        socket.emit('ws_error', {
          type: 'join_room',
          message: 'Error interno del servidor',
        });
      }
    });

    // --- Evento: leave_room ---
    socket.on('leave_room', async (payload) => {
      try {
        const roomId = Number(payload?.roomId);
        if (Number.isNaN(roomId)) {
          return socket.emit('ws_error', {
            type: 'leave_room',
            message: 'roomId inválido',
          });
        }

        socket.leave(roomName(roomId));
        console.log(`🚪 userId=${userId} left room=${roomId}`);

        // Notificar a los OTROS en la sala
        socket.to(roomName(roomId)).emit('user_left', {
          roomId,
          userId,
          username,
        });
      } catch (err) {
        console.error('Error en leave_room:', err);
        socket.emit('ws_error', {
          type: 'leave_room',
          message: 'Error interno del servidor',
        });
      }
    });

    // --- Evento: send_message ---
    socket.on('send_message', async (payload) => {
      try {
        recordWsMessageReceived();

        const roomId = Number(payload?.roomId);
        const rawContent = payload?.content;

        if (Number.isNaN(roomId)) {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'roomId inválido',
          });
        }

        if (!rawContent || !rawContent.trim()) {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'El mensaje no puede estar vacío',
          });
        }

        // Usamos el service que:
        // - Valida roomId
        // - Valida que el usuario sea miembro
        // - Guarda en la tabla messages
        const saved = await sendMessageInRoom({
          roomId,
          userId,
          content: rawContent,
        });
        // saved: { id, roomId, userId, content, createdAt }

        // (Opcional) RabbitMQ para analytics / otras cosas
        // publishChatMessage({
        //   roomId: saved.roomId,
        //   userId: saved.userId,
        //   content: saved.content,
        //   createdAt: saved.createdAt,
        // });

        recordWsMessageSent();

        // Broadcast a todos en la sala con datos reales de DB
        io.to(roomName(saved.roomId)).emit('message', {
          id: saved.id,
          roomId: saved.roomId,
          userId: saved.userId,
          username,
          content: saved.content,
          createdAt: saved.createdAt,
          type: 'message',
        });
      } catch (err) {
        console.error('Error en send_message:', err);

        if (err.code === 'ROOM_NOT_FOUND') {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'Sala no encontrada',
          });
        }
        if (err.code === 'NOT_MEMBER') {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'No eres miembro de esta sala',
          });
        }
        if (err.code === 'CONTENT_REQUIRED') {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'El mensaje no puede estar vacío',
          });
        }
        if (err.code === 'INVALID_ROOM') {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'roomId inválido',
          });
        }

        socket.emit('ws_error', {
          type: 'send_message',
          message: 'Error interno del servidor',
        });
      }
    });

    // --- Evento: typing (indicador "está escribiendo") ---
    socket.on('typing', (payload) => {
      const roomId = Number(payload?.roomId);
      const isTyping = Boolean(payload?.isTyping);

      if (Number.isNaN(roomId)) return;

      io.to(roomName(roomId)).emit('typing', {
        roomId,
        userId,
        isTyping,
      });
    });

    // --- Evento: message_read (read receipts simples, no persistidos aún) ---
    socket.on('message_read', (payload) => {
      const roomId = Number(payload?.roomId);
      const messageId = Number(payload?.messageId);
      if (Number.isNaN(roomId) || Number.isNaN(messageId)) return;

      io.to(roomName(roomId)).emit('message_read', {
        roomId,
        messageId,
        userId,
      });
    });

    // --- Evento: disconnect ---
    socket.on('disconnect', () => {
      console.log(
        `❌ Usuario desconectado: userId=${userId}, socket=${socket.id}`
      );

      // Avisar a todas las salas donde estaba que se fue
      // socket.rooms incluye también el propio socket.id, lo filtramos
      for (const room of socket.rooms) {
        if (room === socket.id) continue; // no es una sala de chat real

        io.to(room).emit('user_left', {
          roomId: Number(room.replace('room:', '')),
          userId,
          username,
        });
      }

      // Métrica: -1 conexión WS
      recordWsConnectionChange(-1);

      const prev = onlineUsers.get(userId) || 0;
      const next = prev - 1;

      if (next <= 0) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
      } else {
        onlineUsers.set(userId, next);
      }
    });
  });

  return io;
}
