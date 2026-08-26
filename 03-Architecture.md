# System Architecture Document
## Project: Hotel Room Booking System

---

## 1. Tech Stack (Mandatory)

- **Frontend**: React.js (Vite), React Router, Axios/fetch, a date-range picker component
- **Backend**: Node.js + Express.js
- **Primary DB**: PostgreSQL (rooms, bookings, users — transactional core)
- **Secondary DB**: MongoDB (activity/audit logs, notification history)
- **Cache/Lock/Rate-limit**: Redis
- **Auth**: JWT + bcrypt
- ORM/driver suggestions: `pg` or Prisma for Postgres, `mongoose` for MongoDB, `ioredis` for Redis, `express-rate-limit` + `rate-limit-redis` for limiting.

## 2. High-Level Design (HLD)

```
                 ┌─────────────┐
                 │   Browser    │
                 │  React SPA   │
                 └──────┬──────┘
                        │ HTTPS (JWT in Authorization header)
                        ▼
                 ┌─────────────┐
                 │  Express API │
                 │ (Node.js)    │
                 └──┬───┬───┬──┘
        ┌───────────┘   │   └───────────────┐
        ▼                ▼                    ▼
 ┌─────────────┐  ┌─────────────┐     ┌─────────────┐
 │   Redis      │  │ PostgreSQL   │     │  MongoDB     │
 │ - cache      │  │ - users      │     │ - audit_logs │
 │ - lock       │  │ - rooms      │     │ - notif.     │
 │ - rate-limit │  │ - bookings   │     │   history    │
 └─────────────┘  └─────────────┘     └─────────────┘
```

**Request path for booking creation:**
1. Client sends `POST /api/bookings` with JWT + `{roomId, checkIn, checkOut}`.
2. Express validates JWT, validates input schema.
3. (Optional first line of defense) Acquire a short-lived Redis lock keyed by `roomId` (e.g., `lock:room:101`, `SET NX PX 5000`).
4. Open a Postgres transaction: `SELECT ... FOR UPDATE` on the room row (or on overlapping candidate bookings), re-check overlap inside the transaction, `INSERT` the booking, `COMMIT`.
5. Release Redis lock.
6. Invalidate Redis cache entries for that room's availability.
7. Fire-and-forget: write an audit log entry to MongoDB.
8. Return 201 with booking, or 409 on conflict.

## 3. Database Schema

### PostgreSQL

**`users`**
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| email | text unique | |
| password_hash | text | bcrypt |
| role | text | `guest` \| `admin`, default `guest` |
| created_at | timestamptz | |

**`rooms`**
| column | type | notes |
|---|---|---|
| id | serial/UUID PK | |
| room_number | text unique | |
| type | text | e.g. Standard/Deluxe |
| capacity | int | |
| price_per_night | numeric | |
| is_active | boolean | default true |

**`bookings`**
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| room_id | FK → rooms.id | |
| user_id | FK → users.id | |
| check_in | date | |
| check_out | date | |
| status | text | `CONFIRMED` \| `CANCELLED` |
| created_at | timestamptz | |

**Indexes**:
- `CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in, check_out) WHERE status = 'CONFIRMED';`
- `CREATE INDEX idx_bookings_user ON bookings(user_id);`

**Why Postgres**: bookings are strictly relational (room ↔ user ↔ dates) and need ACID transactions + row-level locking for correctness under concurrency — this is exactly what a relational DB with `SELECT ... FOR UPDATE` is built for.

### MongoDB

**`activity_logs`** (collection)
```json
{
  "_id": "...",
  "type": "BOOKING_ATTEMPT",
  "userId": "...",
  "roomId": "...",
  "requestedRange": { "checkIn": "...", "checkOut": "..." },
  "outcome": "CONFIRMED | CONFLICT | ERROR",
  "timestamp": "..."
}
```

**`notifications`** (collection) — optional stretch: booking-confirmation log entries.

**Why Mongo**: this data is write-heavy, append-only, doesn't need relational integrity or joins, and its shape may evolve (different log types) — a good fit for a schema-flexible document store, and keeps this high-volume write traffic off the transactional Postgres tables.

## 4. API Contract (summary)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | none | create account |
| POST | `/api/auth/login` | none | returns JWT |
| GET | `/api/rooms` | optional | list active rooms (paginated, cached) |
| GET | `/api/rooms/:id/availability?checkIn=&checkOut=` | optional | boolean availability (cached) |
| GET | `/api/rooms/:id/bookings` | admin | all bookings for a room (paginated) |
| POST | `/api/bookings` | guest | create booking (the critical concurrency path) |
| GET | `/api/bookings/me` | guest | own bookings (paginated) |
| PATCH | `/api/bookings/:id/cancel` | guest (owner) | cancel own booking |
| POST | `/api/rooms` | admin | create room |
| PATCH | `/api/rooms/:id` | admin | update/deactivate room |
| GET | `/api/admin/logs` | admin | paginated activity logs from Mongo |

Every endpoint returns JSON with a consistent error shape: `{ error: string, message?: string, details?: [] }`.

## 5. Concurrency Solution (Core of the Challenge)

**Primary mechanism — Postgres transactional row locking:**

```sql
BEGIN;

-- Lock the room row itself to serialize all booking attempts for this room
SELECT id FROM rooms WHERE id = $roomId FOR UPDATE;

-- Re-check overlap for CONFIRMED bookings on this room within the lock
SELECT id FROM bookings
WHERE room_id = $roomId
  AND status = 'CONFIRMED'
  AND check_in < $checkOut
  AND check_out > $checkIn;

-- If any row returned → ROLLBACK, return 409
-- If none → INSERT INTO bookings (...) VALUES (...); COMMIT;
```

Locking the **room row** (not just the candidate bookings) means every concurrent transaction for the same room is fully serialized: the second transaction blocks at `FOR UPDATE` until the first commits or rolls back, then re-evaluates the overlap check against up-to-date data. This is what guarantees "exactly one booking confirmed" under concurrent requests.

**Secondary guard — Redis distributed lock (defense in depth, not the source of truth):**
Before opening the Postgres transaction, acquire `SET lock:room:{id} <token> NX PX 5000`. This fails fast under very high contention (avoids piling up DB connections waiting on row locks) and is released after the transaction completes. Correctness still comes from Postgres; Redis lock is an optimization/backpressure layer.

**Why not rely on Redis alone**: Redis locks alone don't give you the durable ACID guarantee tied to the actual row of truth; using Postgres row locks as the source of correctness, with Redis as a fast-fail optimization, is the safer combination.

## 6. Security Architecture

- JWT (HS256) signed with `JWT_SECRET` env var; middleware validates + attaches `req.user`.
- bcrypt password hashing (10+ rounds).
- express-validator/Zod schema validation on every request body.
- Parameterized queries (pg) / Mongoose schemas — no raw string interpolation.
- `express-rate-limit` + `rate-limit-redis` on `/api/bookings` (POST) and `/api/auth/login`.
- `helmet` for security headers, `cors` locked to frontend origin.
- All secrets via `.env`, never committed (`.gitignore`).

## 7. Deployment & Monitoring

- Local dev: `docker-compose.yml` running Postgres, MongoDB, Redis containers + `.env.example` for the Node app.
- Backend: single Express service (stateless — horizontally scalable).
- Frontend: static build served separately (Vite build → any static host) or via the same Express service in dev.
- Basic logging: request logger middleware (e.g., morgan) + structured error logging.
- Health check endpoint `/api/health` checking Postgres/Mongo/Redis connectivity.

## 8. Scalability Plan (100x traffic)

- **App layer**: stateless Express servers behind a load balancer; scale horizontally.
- **Postgres**: connection pooling (pgBouncer), read replicas for read-heavy endpoints (room list), keep bookings writes on the primary for correctness.
- **Redis**: cluster mode for cache/lock/rate-limit at scale.
- **Mongo**: shard `activity_logs` by date/roomId if volume grows significantly; it's append-only and tolerant of eventual consistency.
- **Caching**: increase TTL tuning and add CDN for static frontend assets.

## 9. Known Limitations / Trade-offs

- No payment integration (out of MVP scope).
- Redis lock TTL is a fixed heuristic (5s) — long-running transactions could theoretically exceed it; mitigated by keeping the transaction critical section minimal.
- Single-hotel/fixed-room-count assumption simplifies schema (no multi-tenant hotel_id needed for MVP).
