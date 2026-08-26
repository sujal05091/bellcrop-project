# 🏨 Luminoire (BellCrop Hotel) — High-Concurrency Booking Platform

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg) ![React](https://img.shields.io/badge/React-v18-blue.svg) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue.svg) ![MongoDB](https://img.shields.io/badge/MongoDB-v7-green.svg) ![Redis](https://img.shields.io/badge/Redis-v7-red.svg) ![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)

A production-grade, high-concurrency hotel room reservation platform built for extreme booking traffic with zero double-booking tolerance.

---

## ✨ Features & Engineering Highlights

- 🔒 **Concurrency-Safe Engine**: Employs PostgreSQL pessimistic row-level locking (`SELECT ... FOR UPDATE`) inside ACID transactions to guarantee zero double-bookings under concurrent traffic bursts.
- 🗄️ **Polyglot Multi-Database Architecture**:
  - **PostgreSQL 16**: Primary transactional engine & source of truth (users, rooms, bookings).
  - **MongoDB 7**: Append-only activity & audit logging stream (non-blocking async writes).
  - **Redis 7**: Distributed room locking, 30s TTL room search caching, and sliding-window rate limiting.
- 🎨 **Luxury Hotel Aesthetics**: Premium UI built with React 18 & Vanilla CSS featuring Playfair Display typography, warm off-white tones (`#FAF8F5`), and deep emerald accents (`#2D6A4F`).
- 🔑 **Stateless Security**: JWT authentication with role-based authorization (Guest vs Admin) and `bcrypt` password hashing (10 salt rounds).
- 🛡️ **Defensive Engineering**: Zod server-side payload validation, parameterized SQL queries, sliding-window rate limiting, and unified error responses.
- 🛠️ **Full Admin Suite**: Create/update rooms, delete user accounts, delete booking records, and inspect real-time MongoDB audit logs.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, React Router v6, Axios | Responsive Single Page Application |
| **Backend** | Node.js, Express.js | REST API & Transaction Manager |
| **Primary DB** | PostgreSQL 16 | ACID Transaction Core & Source of Truth |
| **Audit DB** | MongoDB 7 | Asynchronous Append-Only Log Storage |
| **Cache & Lock** | Redis 7 | Distributed Lock, Search Cache, Rate Limiting |
| **Auth & Security** | JWT, bcrypt, Zod | Token Auth, Password Hashing & Schema Validation |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker & Docker Desktop](https://www.docker.com/) (running in background)
- [Node.js 18+](https://nodejs.org/) & `npm`

---

### 1. Start Database Services (Docker)

Launch PostgreSQL, MongoDB, and Redis with a single command:

```powershell
docker compose up -d
```

*Verification*: Check container status with `docker compose ps`.

---

### 2. Start Backend API Server

```powershell
cd server
npm install
npm run dev
```

*The API server will launch on `http://localhost:5000`.*

---

### 3. Start Frontend App

Open a new terminal window:

```powershell
cd client
npm install
npm run dev
```

*The React app will open on `http://localhost:5173`.*

---

## 🔑 Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@bellcrop.com` | `admin123` | Full Admin Dashboard, Room Controls, Deletions, Audit Logs |
| **Guest** | `test@gmail.com` | `test123` | Room Booking, Availability Search, My Trips |

*(Or register any new guest account via the UI).*

---

## 🧪 Concurrency Test Script

To prove that the system handles heavy concurrent traffic without double-booking:

```powershell
# Fires 20 simultaneous booking requests for the same room and dates
node scripts/concurrency-test.js 20
```

### Expected Output:
```text
🏨 BellCrop Hotel — Concurrency Test
--------------------------------------------------
Requests:  20 simultaneous booking attempts
Target:    Same room, same overlapping dates
Expected:  Exactly 1 success, 19 conflicts

══════════════════════════════════════════════════
  RESULTS (94ms total)
══════════════════════════════════════════════════
  ✅ Succeeded (201): 1
  ❌ Conflicted (409): 19
══════════════════════════════════════════════════

✅ PASS — Exactly 1 booking confirmed, 19 correctly rejected.
   Concurrency protection is working correctly!
```

### Resetting Test Data:
To clean up `concurrency_test_*` users and logs from MongoDB and PostgreSQL:
```powershell
node scripts/clean-test-logs.js
```

---

## 📮 Postman API Collection

A ready-to-import Postman collection is included in the project root:
- **File**: [`BellCrop_Hotel_Booking_API.postman_collection.json`](file:///d:/project%20by%20sujal/BellCrop-project/BellCrop_Hotel_Booking_API.postman_collection.json)

### How to Import & Use:
1. Open **Postman** $\rightarrow$ Click **Import**.
2. Drag and drop `BellCrop_Hotel_Booking_API.postman_collection.json`.
3. Pre-configured folders include:
   - `01 Auth`: Register, Login Admin, Login Guest
   - `02 Rooms`: List Rooms (Cached), Availability Search
   - `03 Bookings`: Create Booking, My Bookings, Cancel Booking
   - `04 Admin`: Manage Rooms, Delete Users, Delete Bookings, Activity Logs
   - `05 System Health`: Health Check

---

## 📋 API Endpoints Specification

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| **POST** | `/api/auth/register` | Public | Register new guest account |
| **POST** | `/api/auth/login` | Public | Authenticate user & issue JWT |
| **GET** | `/api/rooms` | Public | List rooms (Redis cached 30s) |
| **GET** | `/api/rooms/:id/availability` | Public | Check availability for date range |
| **POST** | `/api/bookings` | Guest | Create booking (Row lock protected) |
| **GET** | `/api/bookings/me` | Guest | View guest trip history |
| **PATCH** | `/api/bookings/:id/cancel` | Guest | Cancel booking |
| **POST** | `/api/rooms` | Admin | Create new hotel room |
| **PATCH** | `/api/rooms/:id` | Admin | Update / Deactivate room |
| **DELETE** | `/api/admin/users/:id` | Admin | Delete user account |
| **DELETE** | `/api/admin/bookings/:id` | Admin | Delete booking record |
| **GET** | `/api/admin/logs` | Admin | Query MongoDB activity logs |
| **GET** | `/api/health` | Public | Service health & DB ping |

---

## 🔐 Environment Variables (`.env`)

| Variable | Description | Default Value |
|---|---|---|
| `PORT` | Express Server Port | `5000` |
| `DATABASE_URL` | PostgreSQL Connection URI | `postgresql://bellcrop:bellcrop_pass@localhost:5432/bellcrop_hotel` |
| `MONGO_URI` | MongoDB Connection URI | `mongodb://localhost:27017/bellcrop_logs` |
| `REDIS_URL` | Redis Connection URI | `redis://localhost:6379` |
| `JWT_SECRET` | Secret Key for JWT Signing | `super_secret_bellcrop_key_2026` |
| `JWT_EXPIRES_IN` | Token Expiry Duration | `24h` |
| `FRONTEND_URL` | CORS Allowed Origin | `http://localhost:5173` |

---

## 🏗️ System Architecture Diagram

```text
                       +-----------------------------+
                       | React 18 SPA (Vite Client)  |
                       +--------------+--------------+
                                      | HTTP / REST (JWT)
                                      v
                       +-----------------------------+
                       | Node.js / Express API Layer |
                       +--+-----------------------+--+
                          |                       |
        +-----------------+                       +------------------+
        | Read/Write (ACID)                       | Cache/Lock/Limit | Non-Blocking Audit Log
        v                                         v                  v
+------------------+                    +------------------+ +------------------+
| PostgreSQL 16 DB |                    | Redis 7 Server   | | MongoDB 7 DB     |
| (Source of Truth)|                    | (Distributed Lock| | (Append-Only     |
| rooms, bookings, |                    |  & Search Cache) | |  Activity Logs)  |
| users            |                    +------------------+ +------------------+
+------------------+
```

---

## 📁 Repository Structure

```text
BellCrop-project/
├── client/                  # React Frontend (Vite)
│   ├── src/
│   │   ├── components/      # UI components (Navbar, ProtectedRoute, Modals)
│   │   ├── context/         # Auth context provider
│   │   ├── pages/           # Client & Admin page views
│   │   └── services/        # Axios API client
├── server/                  # Express API Server
│   ├── config/              # PostgreSQL, MongoDB & Redis connectors
│   ├── controllers/         # Route business handlers
│   ├── middleware/          # Auth JWT, Rate Limiter, Error handler
│   ├── migrations/          # SQL database schema & initial seeds
│   ├── routes/              # Express API routers
│   ├── services/            # Concurrency booking, Cache & Audit services
│   └── validators/          # Zod schema validation
├── scripts/
│   ├── concurrency-test.js  # 20-request simultaneous load tester
│   └── clean-test-logs.js   # Test data cleanup utility
├── docs/
│   └── screenshots/         # UI & Concurrency proof images
├── Design-Document.md       # 4-5 Page HLD & Technical System Document
├── docker-compose.yml       # Container orchestration (Postgres, Mongo, Redis)
└── README.md                # Project documentation
```
