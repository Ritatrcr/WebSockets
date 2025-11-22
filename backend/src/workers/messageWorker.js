// src/workers/messageWorker.js
import { initRabbit, CHAT_QUEUE } from '../config/rabbitmq.js';
import { sendMessageInRoom } from '../core/messages/message.service.js';

async function startWorker() {
  console.log('🚀 Iniciando worker de mensajes...');

  const channel = await initRabbit();

  await channel.consume(
    CHAT_QUEUE,
    async (msg) => {
      if (!msg) return;

      try {
        const contentStr = msg.content.toString();
        const payload = JSON.parse(contentStr);
        const { roomId, userId, content } = payload;

        console.log('📨 Mensaje recibido de RabbitMQ:', payload);

        // Reutilizamos la lógica de negocio: valida sala, membresía y persiste
        await sendMessageInRoom({ roomId, userId, content });

        channel.ack(msg);
        console.log('✅ Mensaje persistido en DB');
      } catch (err) {
        console.error('❌ Error procesando mensaje de cola:', err);

        // NACK sin requeue para no bloquear la cola con mensajes corruptos
        channel.nack(msg, false, false);
      }
    },
    {
      noAck: false,
    }
  );

  console.log(`👂 Worker escuchando en cola: ${CHAT_QUEUE}`);
}

startWorker().catch((err) => {
  console.error('❌ Worker no pudo iniciar:', err);
  process.exit(1);
});
