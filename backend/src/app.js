import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck simple (sirve luego para observabilidad/pruebas)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    time: new Date().toISOString()
  });
});

export { app };
