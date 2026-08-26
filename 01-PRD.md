# Product Requirements Document (PRD)
## Project: Hotel Room Booking System

---

## 1. Problem Statement

Hotels need a reliable way to let guests book rooms for specific date ranges without ever double-booking a room. The core failure mode this system must prevent: two guests booking the same room for overlapping dates, especially when both requests happen at nearly the same instant (concurrent requests).

**Example:** Room 101 is free all month. Guest A books 10th–12th. Guest B tries 11th–13th → overlaps (shares 11th, 12th) → rejected. Guest B then tries 12th–14th → starts the day Guest A checks out → allowed (checkout day = checkin day is NOT an overlap).

## 2. Target Users

| Role | Description |
|---|---|
| **Guest** | Registers/logs in, searches room availability, creates/cancels bookings, views own booking history |
| **Admin/Staff** | Manages room inventory (add/edit/deactivate rooms), views all bookings, views audit/activity logs |

## 3. Goals & Objectives

- Guests can reliably book an available room for a date range.
- The system must **never** allow two confirmed overlapping bookings for the same room, even under concurrent requests.
- System must be secure (authenticated, validated, no plaintext secrets).
- System must perform well under increasing load (indexed queries, caching, pagination).

## 4. Core Features (MVP)

1. **Auth**: Register / Login (JWT-based).
2. **Room Catalog**: List rooms with type, price/night, capacity, active status.
3. **Availability Check**: Given a room + date range, return available/unavailable.
4. **Create Booking**: Book a room for check-in/check-out dates — protected against overlap and race conditions.
5. **View Bookings**: Guest sees own bookings; Admin sees all bookings (paginated, filterable by room/date/status).
6. **Cancel Booking**: Guest can cancel their own upcoming booking.
7. **Admin Room Management**: Add/edit/deactivate rooms.
8. **Audit Trail**: Every booking attempt (success/conflict/failure) logged to MongoDB.
9. **Caching**: Redis caches hot reads (e.g., room availability/list) with sensible invalidation.
10. **Rate Limiting**: At least the booking-creation endpoint is rate-limited.

## 5. MVP Scope Boundaries

**In scope:** single-hotel, fixed number of rooms, date-range (whole-day) bookings, one booking = one room, guest & admin roles.

**Out of scope (for MVP):** payments, multi-hotel/multi-property support, hourly bookings, room upgrades/room-change flow, email/SMS notifications (log-only is enough), guest profile editing beyond basics, multi-language/i18n, reviews/ratings.

## 6. User Stories

- As a **guest**, I want to search which rooms are free for my chosen dates, so I can pick one to book.
- As a **guest**, I want to book a room for a date range, so that I have a confirmed reservation.
- As a **guest**, I want to be told immediately if my chosen dates are unavailable, so I can pick different dates.
- As a **guest**, I want to see all my bookings, so I can track upcoming stays.
- As a **guest**, I want to cancel a booking, so I can free up the room if my plans change.
- As an **admin**, I want to add/manage rooms, so the inventory reflects reality.
- As an **admin**, I want to see all bookings and activity logs, so I can audit and resolve disputes.
- As the **system**, when two guests try to book the same room for overlapping dates at the same time, I must confirm exactly one and reject the other with a clear conflict error.

## 7. Success Metrics

- 0% double-booking rate under load testing (e.g., 50 concurrent requests for the same room/dates → exactly 1 success).
- Booking creation API p95 latency < 300ms under normal load.
- Availability-read endpoint cache hit ratio > 70% during repeated searches.
- All write endpoints return structured error responses (no raw stack traces).

## 8. Assumptions

- Single hotel, fixed room count (no dynamic hotel onboarding).
- Dates are whole-day granularity (check-in/check-out), no time-of-day slots.
- One currency, no dynamic pricing engine required for MVP.
- Guests do not need email verification for MVP (can be a stretch goal).

## 9. Risks

| Risk | Mitigation |
|---|---|
| Race condition creates overlapping bookings | Postgres transaction + row-level lock (`SELECT ... FOR UPDATE`) or unique constraint via exclusion constraint on date range |
| Redis down | Read path falls back to Postgres directly (cache-aside, fail-open on read; never rely on Redis for correctness, only for locking as a secondary guard) |
| MongoDB down | Booking flow must not fail because audit logging failed — log write is best-effort/async, wrapped in try/catch |
| Scope creep in 2-day window | Strict MVP list above; anything else is a stretch goal only after MVP works end-to-end |

## 10. Acceptance Criteria (MVP Definition of Done)

- [ ] Guest can register, log in, and receive a JWT.
- [ ] Guest can view rooms and check availability for a date range.
- [ ] Guest can successfully book an available room.
- [ ] Overlapping booking attempts are rejected with HTTP 409 and a clear message.
- [ ] Under simulated concurrent requests for the same room/date range, exactly one booking is confirmed.
- [ ] Guest can view and cancel their own bookings.
- [ ] Admin can manage rooms and view all bookings + audit logs.
- [ ] All inputs validated server-side; all secrets in `.env`; passwords hashed with bcrypt.
- [ ] At least one endpoint rate-limited; list endpoints paginated and indexed.
