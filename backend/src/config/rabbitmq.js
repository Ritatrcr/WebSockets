// src/config/rabbitmq.js
import amqplib from 'amqplib';
import { config } from './env.js';

let channel = null;
export const CHAT_QUEUE = 'chat_messages';

export async function initRabbit() {
  if (channel) {
    return channel;
  }

  console.log('🔌 Conectando a RabbitMQ en', config.rabbit.url);

  const connection = await amqplib.connect(config.rabbit.url);
  const ch = await connection.createChannel();

  await ch.assertQueue(CHAT_QUEUE, {
    durable: true,
  });

  channel = ch;
  console.log(`✅ RabbitMQ conectado. Cola asegurada: ${CHAT_QUEUE}`);
  return channel;
}

export async function getRabbitChannel() {
  // Si aún no hay canal, lo inicializamos aquí
  if (!channel) {
    await initRabbit();
  }
  return channel;
}

export async function publishChatMessage(payload) {
  const ch = await getRabbitChannel();

  const buffer = Buffer.from(JSON.stringify(payload));

  const ok = ch.sendToQueue(CHAT_QUEUE, buffer, {
    persistent: true,
  });

  if (!ok) {
    console.warn('⚠️ sendToQueue devolvió false (backpressure en RabbitMQ)');
  }
}
