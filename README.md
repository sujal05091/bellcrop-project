<div align="center">

# 🏨 BellCrop Hotel Booking System

**A production-quality, concurrency-safe hotel room booking platform**

Built for a 2-day full-stack technical evaluation — designed to prevent double-bookings even under simultaneous, conflicting requests.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](#-license)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Concurrency Architecture](#️-concurrency-architecture)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Concurrency Test](#-concurrency-test)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#️-roadmap)
- [License](#-license)

---

## 🧭 Overview

BellCrop is a full-stack hotel room booking system where the central engineering challenge is **correctness under concurrency**: when two guests attempt to book the same room for overlapping dates at the same instant, the system must confirm exactly one and reject the other — never both.

This is solved with a **PostgreSQL transaction + row-level lock** (`SELECT ... FOR UPDATE`) as the single source of truth, backed by a **Redis distributed lock** as a fast-fail optimization layer, with **MongoDB** handling high-volume, non-blocking audit logging.

> **TL;DR** — fire 20 simultaneous booking requests at the same room and dates → exactly **1** succeeds, **19** are cleanly rejected with `409 Conflict`. See [Concurrency Test](#-concurrency-test).

---

## 📸 Screenshots

<table>
<tr>
<td width="50%">

**Room Search & Availability**
<img src="./docs/screenshots/room-search.png" alt="Room search and availability screen" width="100%" />

</td>
<td width="50%">

**Booking Confirmation**
<img src="./docs/screenshots/booking-confirmation.png" alt="Booking confirmation screen" width="100%" />

</td>
</tr>
<tr>
<td width="50%">

**My Bookings**
<img src="./docs/screenshots/my-bookings.png" alt="Guest bookings dashboard" width="100%" />

</td>
<td width="50%">

**Admin — Activity Logs**
<img src="./docs/screenshots/admin-activity-logs.png" alt="Admin activity and audit logs" width="100%" />

</td>
</tr>
</table>

---

## ✨ Features

| | |
|---|---|
| 🔒 **Concurrency-safe booking** | Postgres row-level locking guarantees zero double-bookings, even under load |
| 🗄️ **Polyglot persistence** | PostgreSQL (transactional core) · MongoDB (audit logs) · Redis (cache / lock / rate-limit) |
| 🎨 **Premium boutique UI** | Playfair Display + Inter typography, deep emerald accent, editorial spacing |
| 🔑 **JWT authentication** | Role-based access control for Guest and Admin |
| 🛎️ **Full admin dashboard** | Room management, all bookings, live activity/audit logs |
| 🚦 **Rate limiting** | Protects booking-creation and login endpoints from abuse |
| ⚡ **Smart caching** | Redis-cached hot reads with invalidation on every booking state change |
| ✅ **Server-side validation** | Every input validated with Zod — the frontend is never trusted |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js (Vite), React Router, Axios |
| **Backend** | Node.js + Express.js |
| **Primary DB** | PostgreSQL 16 — source of truth for rooms, users, bookings |
| **Audit DB** | MongoDB 7 — append-only activity/audit logs |
| **Cache / Lock** | Redis 7 — caching, distributed lock, rate limiting |
| **Auth** | JWT + bcrypt |
| **Validation** | Zod |

---

## 🏗️ Concurrency Architecture

The booking-creation endpoint follows this exact flow ([full design rationale](./03-Architecture.md#5-concurrency-solution-core-of-the-challenge)):

```
Client Request (roomId, checkIn, checkOut)
        │
        ▼
 1. Redis distributed lock  ──  SET lock:room:{id} <token> NX PX 5000
        │                       (defense-in-depth — fails fast under heavy contention)
        ▼
 2. PostgreSQL transaction  ──  source of truth for correctness
        │
        │   BEGIN;
        │   SELECT id FROM rooms WHERE id = $roomId FOR UPDATE;
        │   SELECT id FROM bookings WHERE room_id = $roomId AND status = 'CONFIRMED'
        │     AND check_in < $checkOut AND check_out > $checkIn;
        │   -- overlap found  → ROLLBACK, return 409
        │   -- no overlap     → INSERT, COMMIT, return 201
        │
        ▼
 3. Release Redis lock
        ▼
 4. Invalidate Redis cache for this room
        ▼
 5. Fire-and-forget audit log → MongoDB
```

**Why this is correct:** the row-level lock on the room serializes every concurrent transaction for that room — a competing request must wait for the first transaction to commit or roll back before its own overlap check even runs, so it always evaluates against fresh data. The Redis lock is a performance optimization only; **it is never relied on for correctness.**

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 18+
- npm

### 1 · Clone & configure

```bash
git clone <repo-url>
cd BellCrop-project
cp .env.example .env
```

### 2 · Start the databases

```bash
docker-compose up -d
```

Spins up PostgreSQL, MongoDB, and Redis. The Postgres database is automatically initialized with schema + seed data.

### 3 · Start the backend

```bash
cd server
npm install
npm run dev
```

API server → `http://localhost:5000`

### 4 · Start the frontend

```bash
cd client
npm install
npm run dev
```

React app → `http://localhost:5173`

### 5 · Log in

| Role | Credentials |
|---|---|
| **Admin** | `admin@bellcrop.com` / `admin123` |
| **Guest** | Register a new account via the UI |

---

## 🔐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://bellcrop:bellcrop_pass@localhost:5432/bellcrop_hotel` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/bellcrop_logs` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | **must set — no default** |
| `JWT_EXPIRES_IN` | JWT token expiry | `24h` |
| `PORT` | Backend port | `5000` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |

> ⚠️ Never commit a real `.env` file. `.env.example` is provided as a template — copy it, don't rename the source.

---

## 🧪 Concurrency Test

This script is the empirical proof behind the [Concurrency Architecture](#️-concurrency-architecture) above — it fires many simultaneous booking requests at the same room and overlapping dates, and confirms exactly one wins.

```bash
node scripts/concurrency-test.js 20
```

**Expected output:**

```
✅ Succeeded (201): 1
❌ Conflicted (409): 19
✅ PASS — Exactly 1 booking confirmed, 19 correctly rejected.
```

---

## 📋 API Endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | none | Create account |
| `POST` | `/api/auth/login` | none | Get JWT |
| `GET` | `/api/rooms` | optional | List rooms *(paginated, cached)* |
| `GET` | `/api/rooms/:id` | optional | Room detail |
| `GET` | `/api/rooms/:id/availability` | optional | Check availability |
| `POST` | `/api/bookings` | guest | Create booking 🔒 *(concurrency-safe)* |
| `GET` | `/api/bookings/me` | guest | Own bookings |
| `GET` | `/api/bookings/:id` | guest | Booking detail |
| `PATCH` | `/api/bookings/:id/cancel` | guest | Cancel booking |
| `POST` | `/api/rooms` | admin | Create room |
| `PATCH` | `/api/rooms/:id` | admin | Update room |
| `GET` | `/api/admin/stats` | admin | Dashboard stats |
| `GET` | `/api/admin/rooms` | admin | All rooms |
| `GET` | `/api/admin/bookings` | admin | All bookings |
| `GET` | `/api/admin/logs` | admin | Activity logs |
| `GET` | `/api/health` | none | Health check |

Every error response follows a consistent shape: `{ "error": "<TYPE>", "message": "<details>" }` — see the [design document](./Luminoire-Design-Document.docx) §4 for full request/response examples.

---

## 📁 Project Structure

```
BellCrop-project/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth context
│       ├── pages/           # Page components
│       │   └── admin/       # Admin pages
│       └── services/        # API client
├── server/                  # Express backend
│   ├── config/              # DB connections, env
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Auth, error handling, rate limiting
│   ├── migrations/          # SQL schema
│   ├── routes/              # Express routes
│   ├── services/            # Business logic (booking, cache, audit)
│   └── validators/          # Zod schemas
├── scripts/                 # Concurrency test
├── docker-compose.yml       # Postgres + MongoDB + Redis
└── .env.example             # Environment template
```

---

## 🩹 Troubleshooting

<details>
<summary><strong>Backend can't connect to PostgreSQL / MongoDB / Redis</strong></summary>

Make sure `docker-compose up -d` finished successfully and all three containers are healthy:

```bash
docker-compose ps
```

Confirm `DATABASE_URL`, `MONGO_URI`, and `REDIS_URL` in your `.env` match the ports exposed by `docker-compose.yml`.
</details>

<details>
<summary><strong>Concurrency test shows more than 1 success</strong></summary>

This means the transaction isn't correctly locking the room row before the overlap check. Verify the booking service wraps the lock + overlap check + insert in a single `BEGIN...COMMIT` transaction, and that the connection pool isn't reusing a client outside the transaction.
</details>

<details>
<summary><strong>401 Unauthorized on protected routes</strong></summary>

Confirm the frontend is sending `Authorization: Bearer <token>` and that `JWT_SECRET` is identical between what signed the token and what the backend is verifying against.
</details>

<details>
<summary><strong>CORS errors in the browser console</strong></summary>

Check that `FRONTEND_URL` in the backend `.env` exactly matches the origin the React app is served from (protocol + host + port).
</details>

---

## 🗺️ Roadmap

- [ ] Payment gateway integration
- [ ] Multi-property support (`hotel_id`)
- [ ] Email/SMS booking confirmations
- [ ] Postgres read replicas for search traffic at scale

---

## 📄 License

MIT — see [`LICENSE`](./LICENSE) for details.

<div align="center">

Built with ❤️ for a technical evaluation — full design rationale in the accompanying [Design Document](./Luminoire-Design-Document.docx).

</div>