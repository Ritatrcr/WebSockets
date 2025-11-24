# Chat en tiempo real – Node.js, React, Socket.IO


Aplicación de chat en tiempo real con salas públicas/privadas, autenticación con JWT, backend en Node.js (Express + Socket.IO), frontend en React y persistencia asíncrona de mensajes usando RabbitMQ + PostgreSQL.  
Todo está orquestado con **Docker Compose**.

---

## 1. Tecnologías principales

- **Frontend:** React + Vite, Socket.IO client, TailwindCSS.
- **Backend:** Node.js, Express, Socket.IO.
- **Mensajería:** RabbitMQ (cola de mensajes de chat).
- **Base de datos:** PostgreSQL.
- **Autenticación:** JWT.
- **Infraestructura local:** Docker + Docker Compose.
- **Pruebas de carga:** Apache JMeter.

> El código de la app está en la rama `dev` del repositorio.

---

## 2. Requisitos previos

Antes de correr el proyecto, asegúrate de tener instalado:

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (>= 18) y npm (para el frontend)

---

## 3. Pasos reproducibles para correr el proyecto

### 3.1. Clonar el repositorio y cambiar a la rama `dev`

```bash
git clone <URL-del-repo>
cd <carpeta-del-repo>
git checkout dev
```

### 3.2. Levantar PostgreSQL y RabbitMQ
Desde la raíz del proyecto (donde está docker-compose.yml):

```bash
docker-compose up -d db rabbitmq
```
Esto levanta:

Postgres en localhost:5432

RabbitMQ:

AMQP: amqp://localhost:5672

Panel web: http://localhost:15672



### 3.3. Ejecutar migraciones de la base de datos (una sola vez)

```bash
docker-compose run --rm backend npm run migrate
```

Esto crea las tablas de usuarios, salas y mensajes en PostgreSQL.

### 3.4. Levantar backend + worker (+ db y Rabbit si no estaban)
```bash
docker-compose up --build
```

Este comando deja corriendo:

API REST + WebSocket (backend):
http://localhost:8080

PostgreSQL: localhost:5432

RabbitMQ (broker):

AMQP: amqp://localhost:5672

Panel web: http://localhost:15672 (guest/guest)

Worker de mensajes: proceso que consume la cola de RabbitMQ y persiste mensajes en la BD.

Deja esta terminal abierta, porque aquí quedan los logs del backend y el worker.

### 3.5. Levantar el frontend (React)
En otra terminal:

```bash
Copiar código
cd WebSockets/frontend
npm install
npm run dev
```
Por defecto, Vite levanta la app en algo como:

http://localhost:5173 (o el puerto que indique la consola)

Ahí podrás:

- Loguearte
- Ver la lista de salas
- Crear salas públicas/privadas
- Entrar a una sala y chatear en tiempo real

## 4. Usuarios de prueba

Puedes abrir dos navegadores/ventanas (o modo incógnito) y loguearte con usuarios distintos para ver el chat en tiempo real entre cuentas.

## 5. Servicios y URLs importantes
Frontend (Vite + React):
http://localhost:5173 (o el puerto que indique npm run dev)

Backend (API REST + WebSocket):
http://localhost:8080

PostgreSQL:
localhost:5432 (configurado en docker-compose.yml y variables de entorno del backend)

RabbitMQ:

AMQP: amqp://localhost:5672

Panel web: http://localhost:15672 (user/pass: guest / guest)

## 6. Pruebas de carga con Apache JMeter
Se realizó una prueba de carga en Apache JMeter simulando varios usuarios que:

Hacen login.

Consultan las salas disponibles.

Se unen a una sala.

Piden el historial de mensajes.

Con el Summary Report de JMeter se midieron tiempos de respuesta y errores para comprobar que la API del chat mantiene una latencia baja y estable bajo carga (objetivo: tiempos promedio por debajo de ~850 ms).

### 6.1. Campos principales del Summary Report
# Samples
Número total de peticiones realizadas para ese sampler (por ejemplo, cuántos logins o cuántos requests a /rooms se ejecutaron).

Average (ms) / Avg
Tiempo de respuesta promedio en milisegundos.
Es la latencia media que tarda el servidor en responder a ese endpoint.
Es el valor que se compara contra el requisito de “< 850 ms”.

Min
Tiempo de respuesta mínimo observado (en ms).

Max
Tiempo de respuesta máximo observado (en ms). Representa el peor caso medido durante la prueba.

Std. Dev.
Desviación estándar de los tiempos de respuesta.
Un valor bajo implica que los tiempos son más estables y menos dispersos.

Error %
Porcentaje de peticiones que devolvieron error (código HTTP ≠ 2xx).
Idealmente debe estar en 0.00 % o lo más cercano posible.

Throughput
Número de peticiones procesadas por segundo (o por minuto, según la configuración de JMeter).
Indica cuánta carga soporta el sistema manteniendo la latencia aceptable.

KB/sec
Kilobytes transferidos por segundo.
Sirve para entender el volumen de datos que mueve el servidor bajo la carga simulada.

## 7. Notas y tips
Si cambias el esquema de la base de datos, recuerda actualizar las migraciones y volver a ejecutar:

```bash
docker-compose run --rm backend npm run migrate
```
Si algo queda raro con los contenedores, puedes resetear rápido:

```bash
docker-compose down
docker-compose up -d db rabbitmq
docker-compose run --rm backend npm run migrate
docker-compose up --build
```
Revisa los logs del backend y del worker en la terminal donde se ejecutó docker-compose up para diagnosticar problemas de autenticación, WebSocket, RabbitMQ o base de datos.
