// src/core/metrics/metrics.js

// Métricas súper simples en memoria (se pierden al reiniciar el server)
const metrics = {
  httpRequestsTotal: 0,
  httpRequestsByRoute: {},      // clave: "GET /rooms"
  httpLatencySamples: 0,
  httpAvgLatencyMs: 0,

  wsConnections: 0,
  wsMessagesReceived: 0,        // mensajes que entran al servidor (send_message, etc.)
  wsMessagesSent: 0,            // mensajes que el servidor envía a clientes (message)
};

export function recordHttpRequest(method, path, durationMs) {
  metrics.httpRequestsTotal += 1;

  const key = `${method.toUpperCase()} ${path}`;
  metrics.httpRequestsByRoute[key] = (metrics.httpRequestsByRoute[key] || 0) + 1;

  // promedio global de latencia HTTP
  metrics.httpLatencySamples += 1;
  const n = metrics.httpLatencySamples;
  metrics.httpAvgLatencyMs =
    ((metrics.httpAvgLatencyMs * (n - 1)) + durationMs) / n;
}

export function recordWsConnectionChange(delta) {
  metrics.wsConnections = Math.max(0, metrics.wsConnections + delta);
}

export function recordWsMessageReceived() {
  metrics.wsMessagesReceived += 1;
}

export function recordWsMessageSent() {
  metrics.wsMessagesSent += 1;
}

export function getMetrics() {
  return {
    ...metrics,
    timestamp: new Date().toISOString(),
  };
}
