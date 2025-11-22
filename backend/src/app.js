// src/app.js
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { pool } from './config/db.js';
import { authRouter } from './api/auth.routes.js';
import { roomsRouter } from './api/rooms.routes.js';
import { messagesRouter } from './api/messages.routes.js';
import { requireAuth } from './api/middleware/auth.middleware.js';
import { recordHttpRequest, getMetrics } from './core/metrics/metrics.js';

const app = express();

app.use(cors());
app.use(express.json());

// Middleware de métricas HTTP (cuenta requests y latencia)
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // req.path = ruta sin query string
    recordHttpRequest(req.method, req.path, duration);
  });

  next();
});

// Health
app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      service: 'api-gateway',
      time: new Date().toISOString(),
      db_time: dbRes.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'DB connection failed',
      error: err.message,
    });
  }
});

// Métricas en JSON
app.get('/metrics', (req, res) => {
  res.json(getMetrics());
});

// Auth
app.use('/auth', authRouter);

// Rooms
app.use('/rooms', requireAuth, roomsRouter);

// Messages (historial)
app.use('/rooms', requireAuth, messagesRouter);

export { app };
