# System Design Document — Luminoire (BellCrop Hotel)
**High-Concurrency Boutique Hotel Room Booking Platform**

---

## 1. Scope & Core Domain Rules
- **Domain Model**: Rooms reserved via half-open intervals `[check_in, check_out)`. Conflict exists iff `checkIn_A < checkOut_B AND checkIn_B < checkOut_A`. Same-day check-in/out is allowed.
- **Race Condition Challenge**: Concurrent availability checks read stale states before inserts complete.
- **System Scope**: Single property, whole-day granularity, zero double-booking tolerance, non-blocking logs.

---

## 2. High-Level System Architecture (HLD)

```
[ React 18 SPA ] ---> (REST/JWT) ---> [ Express API ]
                                          |-- PostgreSQL 16 (Source of Truth: rooms, bookings, users)
                                          |-- Redis 7       (Distributed Lock, Search Cache, Limits)
                                          +-- MongoDB 7     (Async Non-Blocking Audit Logs)
```

**Request Flow**: Client `(roomId, dates)` $\rightarrow$ Express JWT validation $\rightarrow$ Redis rate limit $\rightarrow$ Redis lock `lock:room:{id}` $\rightarrow$ Postgres Transaction (`SELECT FOR UPDATE` $\rightarrow$ Overlap check $\rightarrow$ Insert) $\rightarrow$ Invalidate Redis cache $\rightarrow$ Async MongoDB log.

---

## 3. Polyglot Database Schemas

- **PostgreSQL**: Relational ACID store for rooms, users, and transactional bookings.
  - `users`: `(id UUID PK, email UNIQUE, password_hash, role)`
  - `rooms`: `(id SERIAL PK, room_number UNIQUE, type, capacity, price_per_night, is_active)`
  - `bookings`: `(id UUID PK, room_id FK, user_id FK, check_in DATE, check_out DATE, status)`
  - *Index*: `idx_bookings_overlap ON bookings(room_id, check_in, check_out) WHERE status = 'CONFIRMED'`
- **MongoDB**: Document store for append-only audit activity.
  - `activity_logs`: `(type, userId, roomId, requestedRange, outcome, timestamp)`

---

## 4. API Specification & Error Contract

| Method | Endpoint | Auth | Purpose | Status |
|:---|:---|:---|:---|:---|
| **POST** | `/api/auth/register` \| `/login` | Public | Account registration & JWT issuance | 201 / 200 |
| **GET** | `/api/rooms` \| `/:id/availability` | Public | List rooms (Redis cached) & check dates | 200 OK |
| **POST** | `/api/bookings` | Guest | Create booking (Row lock protected) | 201 / 409 |
| **GET / PATCH**| `/api/bookings/me` \| `/:id/cancel` | Guest | View guest trips / Cancel booking | 200 OK |
| **POST / DELETE**| `/api/rooms` \| `/admin/bookings/:id`| Admin | Create/Update rooms & manage bookings | 200 / 201 |

**Error Shape**: All errors return `{ "error": "<TYPE>", "message": "<DETAILS>" }` (400 Bad Input, 401 Unauthorized, 409 Conflict, 500 Internal Error without stack traces).

---

## 5. Concurrency Guarantee (`SELECT ... FOR UPDATE`)

To enforce zero double-bookings under simultaneous requests:

```sql
BEGIN;
SELECT id FROM rooms WHERE id = $roomId FOR UPDATE; -- Pessimistic Row Lock
SELECT id FROM bookings WHERE room_id = $roomId AND status = 'CONFIRMED'
  AND check_in < $checkOut AND check_out > $checkIn;
-- If count > 0 -> ROLLBACK & 409 Conflict; Else -> INSERT INTO bookings & COMMIT;
```

**Why It Works**: `SELECT FOR UPDATE` serializes concurrent transactions per room. Concurrent requests wait until the holder commits, forcing subsequent checks to evaluate against fresh data.  
**Empirical Proof**: Tested with 20 simultaneous requests (`node scripts/concurrency-test.js 20`) $\rightarrow$ **1 booking confirmed (201)**, **19 rejected (409 Conflict)** in 94ms.

---

## 6. Redis Caching, Locking & Rate Limiting
- **Caching**: Room searches cached (30s TTL). Cache invalidated instantly on booking state changes.
- **Distributed Lock**: Short key `lock:room:{id}` (3s TTL) fails fast under extreme traffic spikes.
- **Rate Limiting**: Sliding window limit (10 requests/min per IP) prevents API abuse.

---

## 7. Scalability & Security Strategy
- **100x Scaling**: Stateless API tier behind AWS ALB/NGINX; Postgres Read Replicas for search; PgBouncer connection pooling; sharded MongoDB audit cluster.
- **Security**: JWT tokens (HS256), `bcrypt` password hashing (salt=10), parameterized SQL queries.

---

## 8. Trade-offs & Future Roadmap
- **Shortcuts**: Booking simulated as instant reservation without payment gateway.
- **Roadmap**: Stripe Webhooks, Multi-property (`hotel_id`), Amazon SES email confirmations.

---

## 9. System UI & Concurrency Screenshots

### Guest Portal & Room Availability Search
<img src="docs/screenshots/media__1787688080616.png" width="650" alt="Luminoire UI" />

### Admin Activity & Audit Logs (MongoDB)
<img src="docs/screenshots/media__1787723042005.png" width="650" alt="Admin Logs UI" />
