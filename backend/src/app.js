import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { pool } from './config/db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as now');
    res.json({
      status: 'ok',
      service: 'api-gateway',
      time: new Date().toISOString(),
      db_time: dbRes.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'DB connection failed',
      error: err.message
    });
  }
});

export { app };
