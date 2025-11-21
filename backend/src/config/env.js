import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  wsPort: process.env.WS_PORT || 8081,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-dev',
  db: {
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'chat_user',
    password: process.env.DB_PASSWORD || 'chat_pass',
    database: process.env.DB_NAME || 'chat_db',
  },
  rabbit: {
    url: process.env.RABBIT_URL || 'amqp://rabbitmq'
  }
};
