import http from 'http';
import { app } from './app.js';
import { config } from './config/env.js';

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`API Gateway listening on port ${config.port}`);
});
