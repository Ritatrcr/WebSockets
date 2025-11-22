// src/server.js
import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';
import { createSocketServer } from './ws/socketServer.js';
import { initRabbit } from './config/rabbitmq.js';

async function bootstrap() {
  try {
    // Inicializar RabbitMQ (cola, canal, etc.)
    await initRabbit();
  } catch (err) {
    console.error('❌ Error inicializando RabbitMQ:', err.message);
    // Puedes decidir si quieres salir o seguir sin broker
    // process.exit(1);
  }

  const server = http.createServer(app);

  // Montar Socket.IO sobre el mismo server HTTP
  createSocketServer(server);

  server.listen(config.port, () => {
    console.log(`🚀 API + WebSocket escuchando en puerto ${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Error en bootstrap:', err);
  process.exit(1);
});
