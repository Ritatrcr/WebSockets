# Aplicación de Chat en Tiempo Real con WebSockets y RabbitMQ

## 1. Introducción y objetivo

Este documento describe el diseño, la arquitectura y las decisiones técnicas de una aplicación de chat en tiempo real desarrollada como proyecto del curso **Patrones Arquitectónicos Avanzados**.

El objetivo del sistema es ofrecer un chat tipo “salas” que permita a los usuarios:
- Autenticarse con usuario y contraseña (JWT).
- Crear y gestionar salas públicas y privadas (con password).
- Enviar y recibir mensajes en tiempo real mediante WebSockets.
- Consultar el historial de mensajes persistido en una base de datos relacional.
- Mantener ciertas garantías de durabilidad y observabilidad usando un **broker de mensajes (RabbitMQ)** y métricas básicas.

La solución se implementa con un stack **Node.js + Express + Socket.IO + PostgreSQL + RabbitMQ**, con un cliente web en **React**.

---

## 2. Requisitos

### 2.1. Requisitos funcionales

1. Usuarios pueden conectarse mediante autenticación simple JWT (username + password).
2. Crear, listar, entrar y salir de salas de chat (rooms).
3. Enviar y recibir mensajes en tiempo real a través de WebSockets.
4. Persistir todos los mensajes en una base de datos relacional (PostgreSQL).
5. Consultar el historial de mensajes por sala con paginación (offset + limit).
6. Notificar cuando un usuario entra o sale de una sala.
7. Control de acceso a salas:
   - Salas públicas.
   - Salas privadas protegidas por password.
8. Funcionalidades adicionales:
   - Estado online/offline.
   - Indicador de “está escribiendo…” (typing).
   - Base para “read receipts” (evento `message_read`).

### 2.2. Requisitos no funcionales

- **Concurrencia**: soportar decenas de usuarios simultáneos en la PoC.
- **Latencia**: entrega de mensajes por WebSocket con latencias observadas por debajo de **850 ms** en pruebas de carga.
- **Durabilidad**: todos los mensajes confirmados se almacenan en PostgreSQL mediante un worker conectado a RabbitMQ.
- **Observabilidad**:
  - Endpoint `/health` para verificar estado del servicio y conexión a la BD.
  - Endpoint `/metrics` con métricas simples: peticiones HTTP, latencia promedio, conexiones WS activas, mensajes WS recibidos/enviados.
- **Despliegue**: orquestación con **docker-compose**, incluyendo servicios de:
  - `backend` (API + WS + RabbitMQ client),
  - `worker` (persistencia asíncrona),
  - `db` (Postgres),
  - `rabbitmq` (broker).
- **Seguridad básica**:
  - JWT para todas las operaciones protegidas.
  - Control de acceso a salas según membresía y/o password.

---

## 3. Arquitectura

### 3.1. Visión general

A nivel lógico, el sistema se compone de:

- **Cliente Web (React)**: SPA que gestiona login, listado de salas y vista de chat.
- **API REST (Express)**:
  - `/auth/login`
  - `/rooms` (creación, listado, join/leave)
  - `/rooms/:id/messages` (historial paginado)
- **Servidor WebSocket (Socket.IO)**:
  - Autentica conexiones usando el token JWT.
  - Maneja eventos `join_room`, `leave_room`, `send_message`, `typing`, `message_read`.
  - Publica los mensajes en RabbitMQ y hace broadcast inmediato a los clientes.
- **Broker (RabbitMQ)**:
  - Cola `chat_messages` donde se encolan los mensajes de chat para persistencia.
- **Worker de mensajes (Node.js)**:
  - Consume la cola `chat_messages`.
  - Valida y persiste los mensajes en PostgreSQL usando la lógica de negocio.
- **Base de datos (PostgreSQL)**:
  - Tablas: `users`, `rooms`, `room_members`, `messages`.
  - Uso de índices para paginación eficiente por sala.

### 3.2. Diagrama de componentes (texto)

```text
[ Cliente Web (React) ]
        |  REST (Axios)
        v
[ API REST (Express) ] ----------------------------+
        |                                         |
        | PG                                      |
        v                                         |
[ PostgreSQL ]                                    |
                                                  |
[ Servidor WebSocket (Socket.IO) ]                |
        ^                                         |
        | (WS + JWT)                              |
        |                                         |
[ Cliente Web (React) – Socket.IO client ]        |
        |                                         |
        v        publish                          |
[ RabbitMQ (cola: chat_messages) ]  <-------------+
        |
        | consume
        v
[ Worker de mensajes ]
        |
        v
[ PostgreSQL (persistencia de messages) ]
