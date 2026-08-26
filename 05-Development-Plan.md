# Development Plan
## Project: Hotel Room Booking System (2-Day Build)

---

## 1. Guiding Priority

Correctness of the concurrency-safe booking flow > breadth of features > visual polish. If time runs short, cut UI polish and stretch features first — never cut the transactional locking logic or its test/demo.

## 2. Roadmap

### Day 1 — Design (no implementation code)
- [ ] Finalize PRD, SRS, Architecture, UI/UX (this set of documents).
- [ ] Produce the actual submission Design Document (3–6 pages, condensed from these docs) with HLD diagram, schema, API contract, Redis plan, concurrency approach, security approach, limitations.
- [ ] Set up repo skeleton (folders, `.gitignore`, `.env.example`, `docker-compose.yml` for Postgres/Mongo/Redis).

### Day 2 — Build

**Milestone 1: Foundation (no dependencies on other milestones)**
- [ ] Docker Compose: Postgres, MongoDB, Redis containers running locally.
- [ ] Postgres schema migration: `users`, `rooms`, `bookings` tables + indexes.
- [ ] Express app skeleton: config, env loading, DB connections (pg, mongoose, ioredis), health check endpoint.

**Milestone 2: Auth (depends on M1 — users table)**
- [ ] Register/login endpoints, bcrypt hashing, JWT issuing.
- [ ] Auth middleware + role middleware.

**Milestone 3: Rooms (depends on M1)**
- [ ] CRUD endpoints for rooms (admin-protected for write).
- [ ] Room list endpoint with pagination + Redis caching.

**Milestone 4: Booking Core — the critical path (depends on M1, M2, M3)**
- [ ] Availability-check endpoint (overlap query logic).
- [ ] Booking creation endpoint with Postgres transaction + `SELECT ... FOR UPDATE` row lock.
- [ ] Redis distributed lock as secondary guard on the same endpoint.
- [ ] Cancel-booking endpoint (frees the date range).
- [ ] Cache invalidation on booking create/cancel.
- [ ] Rate limiting on booking-creation endpoint.
- [ ] **Concurrency test script**: fire N simultaneous booking requests for the same room/dates (e.g., a small Node script using `Promise.all` + `axios`), confirm exactly 1 success — this is your proof for the video walkthrough.

**Milestone 5: Audit Logging (depends on M4)**
- [ ] MongoDB connection + `activity_logs` schema.
- [ ] Log every booking attempt outcome, best-effort/non-blocking.
- [ ] Admin endpoint to list logs (paginated).

**Milestone 6: Frontend (can start in parallel with M4/M5 once API contract is stable, using mock data first)**
- [ ] Auth pages (login/register) + protected routing.
- [ ] Room list + date-range search + availability display.
- [ ] Booking flow (create + confirmation + conflict handling).
- [ ] My Bookings (view/cancel).
- [ ] Admin dashboard (rooms CRUD, all bookings, activity logs).
- [ ] Loading/empty/error states throughout.

**Milestone 7: Error Handling & Security Pass (depends on M2–M6 existing)**
- [ ] Centralized Express error handler (no stack traces to client).
- [ ] Input validation (Zod/Joi) on every write endpoint.
- [ ] Helmet, CORS lock-down, confirm all secrets are env-based.
- [ ] Re-verify rate limiting works as expected.

**Milestone 8: Testing & Polish**
- [ ] Manual pass through every user story in the PRD.
- [ ] Re-run the concurrency test script and capture output/logs for the video.
- [ ] README: setup steps, env vars, how to run (docker-compose up + npm scripts).

**Milestone 9: Deliverables**
- [ ] Push to GitHub with clean, incremental commit history.
- [ ] Condensed Design Document exported as PDF/Word.
- [ ] Record 5–10 min video: live demo happy path → design walkthrough (diagram/schema/API) → concurrency scenario demo (run the test script live) → one trade-off mentioned.

## 3. Dependency Summary

```
M1 Foundation
 ├─▶ M2 Auth
 ├─▶ M3 Rooms
 │     └─▶ M4 Booking Core ─▶ M5 Audit Logging
 │                          └─▶ M6 Frontend (API-contract-driven, can start early with mocks)
 └────────────────────────────────▶ M7 Error/Security Pass ─▶ M8 Testing ─▶ M9 Deliverables
```

## 4. MVP Definition of Done

A build is "done" for submission when:
- All acceptance criteria in the SRS §10 pass, including the concurrent-request test (exactly 1 success out of N simultaneous overlapping requests).
- Guest and admin flows both work end-to-end through the actual UI (not just Postman).
- No hard-coded secrets; `.env.example` provided.
- README lets a stranger clone, configure `.env`, `docker-compose up`, and run the app without asking you questions.
- Video walkthrough recorded covering demo + design + concurrency proof + one trade-off.

## 5. If Time Runs Out (cut list, in order)

1. Admin activity-log UI (keep the data logged, skip the pretty table).
2. Cancel-booking UI polish (keep the endpoint, simple button is enough).
3. Full responsive design (desktop-first is acceptable, don't skip auth/booking correctness for this).
4. Docker-compose (nice-to-have per the brief, not mandatory) — but keep a clear manual setup README as the fallback.

Never cut: transactional overlap-check logic, the concurrency test/demo, input validation, and JWT auth.
