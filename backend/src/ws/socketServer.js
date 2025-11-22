// src/ws/socketServer.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import {
  isUserMemberOfRoom,
  findRoomById,
} from '../core/rooms/room.repository.js';
import { publishChatMessage } from '../config/rabbitmq.js';
import {
  recordWsConnectionChange,
  recordWsMessageReceived,
  recordWsMessageSent,
} from '../core/metrics/metrics.js';

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
      socket.data.username = payload.username; 
      return next();
    } catch (err) {
      console.error('Error auth Socket.IO:', err.message);
      return next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
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

        // Notificar a todos en la sala (incluido el que entra)
        io.to(roomName(roomId)).emit('user_joined', {
          roomId,
          userId,
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

        io.to(roomName(roomId)).emit('user_left', {
          roomId,
          userId,
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
        // Métrica: mensaje entrante al servidor
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

        const room = await findRoomById(roomId);
        if (!room) {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'Sala no encontrada',
          });
        }

        const membership = await isUserMemberOfRoom(roomId, userId);
        if (!membership) {
          return socket.emit('ws_error', {
            type: 'send_message',
            message: 'No eres miembro de esta sala',
          });
        }

        const content = rawContent.trim();
        const createdAt = new Date().toISOString();

        // 1) Publicar en RabbitMQ para que el worker lo persista en DB
        publishChatMessage({
          roomId,
          userId,
          content,
          createdAt,
        });

        // 2) Broadcast inmediato a la sala (sin esperar a que DB confirme)
        recordWsMessageSent(); // métrica: mensaje enviado a clientes

        io.to(roomName(roomId)).emit('message', {
        id: null,
        roomId,
        userId,
        username: socket.data.username,
        content,
        createdAt,
        type: 'message',
        });

      } catch (err) {
        console.error('Error en send_message:', err);
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
      console.log(`❌ Usuario desconectado: userId=${userId}, socket=${socket.id}`);

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
