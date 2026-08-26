Assignment Guidelines
2-Day System Design & Build Challenge (MERN + PostgreSQL + Redis)
👋 Read This First
Welcome! You've been given one problem statement from the attached set (e.g. "Parking Lot System", "Movie Ticket Booking", etc.). This document explains the rules, tech stack, and expectations that apply to every problem. Your problem-specific document only covers what's unique to your assignment — everything else is here.
You have 2 days. Day 1 is about thinking and designing before you touch code. Day 2 is about building it properly and explaining what you built. We are far more interested in how you think and how solid your system is under pressure than in fancy UI.
🧭 The Two Phases
Phase 1 — Design (Day 1)
Before writing implementation code, design the system on paper/doc. This is not optional — candidates who skip straight to coding usually build something that breaks under the concurrency scenario described in their problem document.
Your Design Document should include:
•	Problem understanding, in your own words, and any assumptions you're making
•	A High-Level Design (HLD) diagram: client → API layer → cache → database(s)
•	Database schema: tables/collections, fields, relationships, and which parts go in PostgreSQL vs MongoDB and why
•	API contract: list of endpoints, method, request body, response shape, and error responses
•	Redis usage plan: exactly what you will cache, how you'll invalidate it, and whether you'll use it for locking or rate-limiting
•	How you will solve the specific concurrency problem described in your assignment (this is the most important part — be concrete, e.g. "row-level SELECT ... FOR UPDATE inside a transaction" or "Redis-based distributed lock per resource ID")
•	Your security approach (auth, validation, secrets)
•	Known limitations or trade-offs, and what you'd improve with more time

Phase 2 — Build (Day 2)
Implement the system to match your design, using the mandatory tech stack below. Prioritize correctness of the core flow and the concurrency scenario over adding extra features. A smaller, correct, well-explained system beats a large, broken one.
🛠️ Tech Stack (Mandatory for every assignment)
•	Frontend: React.js
•	Backend: Node.js + Express.js
•	Primary Database: PostgreSQL — use this for the core transactional data (bookings, orders, accounts, inventory, etc.). Use real transactions / row-level locking here — this is where your concurrency-safety work will show.
•	Secondary Database: MongoDB — use this for anything unstructured or write-heavy that doesn't need strict relations, e.g. activity logs, audit trail, notifications history. (This is what makes it a full MERN + SQL stack.)
•	Cache / In-memory layer: Redis — use it for at least one real purpose: caching hot reads (e.g. available-slots count), a distributed lock to prevent race conditions, and/or rate-limiting an endpoint.

Why this stack: it's a standard MERN app (MongoDB + Express + React + Node) with PostgreSQL added for the transactional core, and Redis added for caching/locking/rate-limiting. Using the right database for the right kind of data is itself part of what's being evaluated.
📈 Non-Functional Requirements (apply to all problems)
Scalability
•	Design the DB schema and API so the system can handle growing data and traffic (proper indexes, pagination on list endpoints, no unbounded queries).
•	Explain in your design doc how you would scale this horizontally if traffic increased 100x (e.g. more app servers behind a load balancer, read replicas, sharding, connection pooling).
Performance
•	Identify the 1–2 endpoints that are read the most and cache them in Redis with a sensible expiry / invalidation strategy.
•	Avoid N+1 queries; use proper indexes on columns you filter/sort by.
Error Handling
•	Every API should return meaningful HTTP status codes and clear error messages (never a raw stack trace to the client).
•	Validate all inputs on the backend (never trust the frontend).
•	Handle failure paths explicitly: DB down, Redis down, invalid input, not-found, conflict (e.g. "already booked") — each should behave predictably.
Security
•	Use JWT-based authentication for at least a basic login/identify-the-user flow.
•	Sanitize and validate all inputs to prevent SQL injection / NoSQL injection.
•	Never store plain-text passwords — hash them (e.g. bcrypt).
•	Keep secrets (DB URLs, JWT secret, etc.) in environment variables, never hard-coded or committed.
•	Add basic rate-limiting on at least one write endpoint to prevent abuse.
📦 What You Must Submit
1.	Design Document (PDF or Word, ~3–6 pages) — see the required sections in the Assignment Guidelines document.
2.	Source Code — a GitHub repo link (preferred) or a zip file, with a README explaining how to set up and run the project locally (docker-compose is a nice bonus, not mandatory).
3.	Video Walkthrough (5–10 minutes, screen recording with your voice) — demo the app, walk through your design, and explain how you solved the concurrency problem for this specific system.

A. Design Document
See the required sections listed in Phase 1 above. PDF or Word, roughly 3–6 pages — clear and readable, not padded.
B. Source Code
GitHub repo link (preferred so we can see your commit history) or a zip file. Include a README with setup steps, how to run it locally, and any environment variables needed.
C. Video Walkthrough (5–10 minutes)
•	A quick live demo of the working app (show the main happy path).
•	Walk through your design — the diagram, schema, and API contract.
•	Explain, specifically, how your system handles the concurrency scenario in your problem document — ideally show it happening (e.g. two requests fired at once) and how your system resolves it correctly.
•	Mention one trade-off or shortcut you took, and what you'd do differently with more time.
Screen recording with your voice is enough — no editing required. Loom, OBS, or your phone recording a screen-share call all work fine.
 
✅ Evaluation Criteria
Criteria	Weight
System design quality	20%
Correctness of core features	20%
Handling of the concurrency scenario	15%
Scalability & performance choices	10%
Error handling	10%
Security basics	10%
Code quality & README	10%
Clarity of design doc & video walkthrough	5%

💡 A Few Tips
•	It's okay to keep the UI simple. A plain, functional React frontend is fine — we're not grading design skills here.
•	Don't skip the Design Document to "save time for coding" — a good design with a partially-built app scores better than a full app with no design thinking behind it.
•	If you run out of time on Day 2, a smaller feature set that correctly handles the concurrency scenario is much better than every feature working "most of the time".
•	Docker Compose for Postgres + Redis (+ Mongo) is optional but makes local setup and your video demo much smoother.
•	If you get stuck, document the blocker and your plan for it in the README rather than leaving it unexplained.
