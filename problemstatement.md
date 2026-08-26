🏨 Hotel Room Booking System
Full-Stack System Design & Build Challenge · 2-Day Timeline
🧩 Problem Statement
Build a system to manage hotel room bookings. Rooms are booked for date ranges. When booking, check whether the room is available for the requested dates and prevent overlapping bookings for the same room.
Example
Room 101 is free for the whole month. Guest A books it from 10th to 12th. Guest B then tries to book Room 101 from 11th to 13th — this overlaps with Guest A's stay (11th and 12th are shared), so the system rejects it. Guest B instead books it from 12th to 14th, which starts the same day Guest A checks out, and this is allowed.
🔧 Core Features to Build
•	Book a room with check-in and check-out dates
•	View all bookings for a room
•	Prevent overlapping date-range bookings

⚠️ Key Challenge You Must Handle
Two guests both try to book Room 101 for the 10th–12th within moments of each other. Only one booking should be confirmed — the system must never create two overlapping bookings for the same room, even under concurrent requests.
⚙️ Constraints
•	Fixed number of rooms
📋 Quick Reference
Full details for every section below are in the accompanying "Assignment Guidelines" document. Read that first.

🛠️ Tech Stack (Mandatory)
• Frontend: React.js
• Backend: Node.js + Express.js
• Primary Database: PostgreSQL — use this for the core transactional data (bookings, orders, accounts, inventory, etc.). Use real transactions / row-level locking here — this is where your concurrency-safety work will show.
• Secondary Database: MongoDB — use this for anything unstructured or write-heavy that doesn't need strict relations, e.g. activity logs, audit trail, notifications history. (This is what makes it a full MERN + SQL stack.)
• Cache / In-memory layer: Redis — use it for at least one real purpose: caching hot reads (e.g. available-slots count), a distributed lock to prevent race conditions, and/or rate-limiting an endpoint.

📦 What You Must Submit
• Design Document (PDF or Word, ~3–6 pages) — see the required sections in the Assignment Guidelines document.
• Source Code — a GitHub repo link (preferred) or a zip file, with a README explaining how to set up and run the project locally (docker-compose is a nice bonus, not mandatory).
• Video Walkthrough (5–10 minutes, screen recording with your voice) — demo the app, walk through your design, and explain how you solved the concurrency problem for this specific system.

⏱️ Timeline
• Total: 2 Days
• Day 1 — Design the system and share your Design Document
• Day 2 — Build it, add error handling/security, record your video walkthrough

