# Software Requirements Specification (SRS)
## Project: Hotel Room Booking System

---

## 1. User Roles & Permissions

| Role | Permissions |
|---|---|
| **Guest** (authenticated) | Search availability, create booking, view own bookings, cancel own upcoming booking |
| **Admin** | All guest permissions + create/edit/deactivate rooms, view all bookings, view audit logs |
| **Anonymous** | Register, log in, view public room list (read-only, no dates-specific availability requires auth — configurable) |

## 2. Functional Requirements

### Auth
- **FR-1**: System shall allow user registration with email + password (bcrypt-hashed, min 8 chars).
- **FR-2**: System shall issue a signed JWT on successful login, expiring in a configurable window (e.g., 24h).
- **FR-3**: All booking-mutating endpoints require a valid JWT; invalid/expired tokens return 401.
- **FR-4**: Role-based checks: admin-only endpoints return 403 for non-admin JWTs.

### Rooms
- **FR-5**: System shall list all active rooms with id, number, type, capacity, price/night.
- **FR-6**: Admin can create/update/deactivate a room. Deactivated rooms are excluded from search but retain booking history.

### Availability & Booking
- **FR-7**: Given `roomId`, `checkIn`, `checkOut`, system shall return whether the room is available for that range.
- **FR-8**: Two date ranges `[A_in, A_out)` and `[B_in, B_out)` overlap iff `A_in < B_out AND B_in < A_out`. Checkout day == another booking's check-in day is **not** an overlap (half-open interval semantics).
- **FR-9**: `checkOut` must be strictly after `checkIn` (minimum 1 night).
- **FR-10**: On booking creation, system shall atomically verify no overlapping **confirmed** booking exists for that room before inserting the new booking, within a single database transaction using row-level locking (see Architecture doc §5 for exact mechanism).
- **FR-11**: If overlap is detected, system returns HTTP 409 Conflict with a message identifying the conflicting date range (no need to expose the other guest's identity).
- **FR-12**: Under concurrent requests for the same room/overlapping dates, exactly one request succeeds; all others receive 409, never a duplicate confirmed booking.
- **FR-13**: A cancelled booking's date range becomes immediately available for re-booking.
- **FR-14**: Guest can view only their own bookings, paginated, filterable by status (upcoming/past/cancelled).
- **FR-15**: Admin can view all bookings, paginated, filterable by room/date-range/status.

### Audit / Logging (MongoDB)
- **FR-16**: Every booking attempt (success, conflict, validation-failure) is logged with timestamp, userId, roomId, requested dates, outcome — written to MongoDB, best-effort (does not block/fail the booking transaction).
- **FR-17**: Admin can query recent activity logs (paginated).

### Caching (Redis)
- **FR-18**: Room list / availability reads are cached in Redis with a short TTL (e.g., 30–60s) and are invalidated on any booking create/cancel affecting that room.
- **FR-19**: Booking-creation endpoint is rate-limited per user/IP (e.g., 10 requests/minute) via Redis.

## 3. Business Rules

- BR-1: A "booking" always belongs to exactly one room and one guest.
- BR-2: Only bookings with status `CONFIRMED` count toward overlap checks. `CANCELLED` bookings are ignored.
- BR-3: A guest cannot cancel a booking that has already started (check-in date has passed) — configurable, default: allow cancellation only while `status = CONFIRMED` and `checkIn > now`.
- BR-4: Room deactivation does not cancel existing future bookings; it only removes the room from new-search results.

## 4. Data Requirements & Validation

| Field | Type | Validation |
|---|---|---|
| `email` | string | valid email format, unique |
| `password` | string | min 8 chars, hashed before storage, never returned in API responses |
| `roomId` | UUID/int | must reference an existing room |
| `checkIn`, `checkOut` | date | ISO 8601, `checkOut > checkIn`, `checkIn >= today` |
| `status` | enum | `CONFIRMED`, `CANCELLED` |

All inputs are validated server-side (never trust frontend) using a schema validator (e.g., Zod/Joi). Reject with HTTP 400 and field-level error messages on failure.

## 5. Authentication & Authorization

- JWT signed with a secret from environment variables (`JWT_SECRET`), never hard-coded.
- Password hashing via bcrypt (min 10 salt rounds).
- Middleware verifies JWT on protected routes; separate middleware enforces `role === 'admin'` on admin routes.

## 6. Error Handling

| Scenario | HTTP Status | Response |
|---|---|---|
| Invalid input | 400 | `{ error: "ValidationError", details: [...] }` |
| Missing/invalid token | 401 | `{ error: "Unauthorized" }` |
| Insufficient role | 403 | `{ error: "Forbidden" }` |
| Room/booking not found | 404 | `{ error: "NotFound" }` |
| Overlapping booking | 409 | `{ error: "Conflict", message: "Room unavailable for selected dates" }` |
| Unexpected server error | 500 | `{ error: "InternalServerError" }` (never leak stack trace to client; log server-side) |
| Postgres unreachable | 503 | `{ error: "ServiceUnavailable" }` |
| Redis unreachable | — | Degrade gracefully: skip cache, hit Postgres directly; log warning, do not fail the request |

## 7. Edge Cases

- Booking exactly adjacent to another (checkout = other's checkin) → allowed (FR-8).
- Same guest tries to book the same room/dates twice → second attempt is a duplicate booking, not inherently blocked unless it overlaps their own existing booking (still runs through the same overlap check).
- Concurrent cancel + new-booking race on the same room → cancellation and creation both go through the same transactional/lock path.
- Booking with `checkIn` in the past → rejected (400).
- Very large `limit`/unbounded list queries → server enforces max page size (e.g., 50).

## 8. Security Requirements

- SEC-1: Parameterized queries only (no string-concatenated SQL) — prevents SQL injection.
- SEC-2: Mongoose/Mongo driver with schema validation — prevents NoSQL injection.
- SEC-3: Passwords hashed with bcrypt; never logged or returned.
- SEC-4: Secrets (`DATABASE_URL`, `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`) only in `.env`, excluded via `.gitignore`.
- SEC-5: Rate limiting on booking-creation endpoint (and login, recommended) via Redis-backed limiter.
- SEC-6: CORS configured to allow only the known frontend origin.
- SEC-7: Helmet (or equivalent) for standard HTTP security headers.

## 9. Performance Requirements

- PERF-1: All list endpoints paginated (default page size 20, max 50).
- PERF-2: Indexes on `bookings(room_id, check_in, check_out)` and `bookings(user_id)`.
- PERF-3: Room-availability reads cached in Redis; cache invalidated on writes affecting that room.
- PERF-4: No N+1 queries — batch/join room + booking data where needed.

## 10. Acceptance Criteria (Testable)

- Given Room 101 is free, when a guest books 10th–12th, then the booking is `CONFIRMED`.
- Given Room 101 has a `CONFIRMED` booking 10th–12th, when another guest requests 11th–13th, then the API returns 409.
- Given Room 101 has a `CONFIRMED` booking 10th–12th, when another guest requests 12th–14th, then the booking succeeds (adjacent, not overlapping).
- Given 20 concurrent requests to book Room 101 for the same overlapping range, when all fire near-simultaneously, then exactly 1 succeeds and 19 return 409.
- Given an unauthenticated request to create a booking, when submitted, then the API returns 401.
- Given a non-admin JWT, when calling an admin-only endpoint, then the API returns 403.
