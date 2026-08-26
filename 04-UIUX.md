# UI/UX Document
## Project: Hotel Room Booking System

---

## 1. Design Principles

- **Premium hospitality feel**: this should read like a boutique five-star hotel brand (Aman / Four Seasons / Airbnb Luxe), not a generic SaaS admin tool — even on admin-facing screens.
- **Clarity over clutter**: premium ≠ busy. Generous whitespace and restraint carry the "expensive" feel more than decoration does.
- **Immediate feedback**: availability and conflict states must be obvious the moment they happen (no silent failures) — surfaced in the same refined visual language, not jarring alert colors.
- **Trustworthy booking flow**: guest should never be unsure whether a booking succeeded.

## 1a. Premium Style Brief (applies to every screen below)

- **Typography**: refined serif for headings (e.g. Playfair Display / Fraunces) paired with a clean sans-serif for body/UI text (e.g. Inter). Generous letter-spacing on labels, badges, and small-caps text.
- **Color palette**: warm off-white or charcoal base (not stark white/gray SaaS default). One sophisticated accent color for CTAs and highlights — deep emerald, burgundy, or gold/bronze — instead of a generic blue. Semantic status colors (green/red/amber) kept muted and tasteful, always paired with a text label, never color alone.
- **Imagery**: large, high-quality room/hotel photography with soft overlays where text sits on top — not icon placeholders.
- **Surfaces & details**: soft rounded corners (8–12px), subtle elevated shadows, fine hairline dividers between rows/sections, smooth hover/transition states, gold-foil-style accents on badges or primary buttons where appropriate.
- **Layout rhythm**: airy, editorial/magazine-like spacing rather than dense grids — this applies to admin tables too, which should feel consistent with the guest-facing brand rather than dropping into a bare-bones back-office look.

## 2. User Journeys

**Guest journey:**
`Register/Login → Browse Rooms → Pick dates → Check availability → Confirm booking → View confirmation → My Bookings (view/cancel)`

**Admin journey:**
`Login → Admin Dashboard → Manage Rooms (add/edit/deactivate) → View All Bookings → View Activity Logs`

## 3. Screens

### 3.1 Login / Register
- Simple form: email, password (register also has confirm-password).
- Inline validation errors (email format, password length).
- On success → redirect to Room List; JWT stored in memory/httpOnly-preferred (localStorage acceptable for MVP demo).
- **Premium treatment**: split-screen layout — full-bleed elegant hotel-lobby photograph on one half, form on a minimal card on the other. Serif "Welcome Back" heading, thin-underline input style, accent-color primary button.

### 3.2 Room List / Search
- Top bar: date-range picker (check-in / check-out) + "Search availability" action.
- Grid/list of room cards: room number, type, capacity, price/night, status badge (Available / Unavailable for selected dates, or "Select dates" prompt if none chosen).
- Pagination controls at bottom.
- Empty state: "No rooms match your dates — try different dates."
- **Premium treatment**: full-width hero banner with hotel imagery and serif "Find Your Stay" heading, date picker + CTA overlaid on the hero. Editorial-style card grid below with large photography and small-caps meta text (capacity/price), generous gaps between cards.

### 3.3 Room Detail + Booking
- Room info (type, capacity, price).
- Date-range picker (pre-filled from search if coming from list).
- "Check availability" → "Book Now" button, enabled only when available.
- On submit: loading spinner on button → success toast + redirect to My Bookings, OR inline conflict error: "These dates are no longer available" (409 case) with dates highlighted.
- **Premium treatment**: large image gallery at top, two-column layout below — description + minimal line-icon amenities on the left, a sticky elevated "booking card" on the right with date pickers, live availability badge, price breakdown, and a bold accent "Reserve Now" button.

### 3.4 Booking Confirmation
- Summary card: room, dates, total nights, status = Confirmed.
- CTA: "View My Bookings."
- **Premium treatment**: soft full-width room hero image fading into the background behind a centered confirmation card; refined checkmark motif, serif "Your Stay is Confirmed" heading, hairline dividers between summary rows.

### 3.5 My Bookings (Guest)
- Tabs or filter: Upcoming / Past / Cancelled.
- Each row: room, dates, status, "Cancel" button (only for upcoming + confirmed).
- Cancel confirmation modal ("Are you sure?").
- Empty state: "You have no bookings yet — browse rooms to get started."
- **Premium treatment**: labeled "My Trips" for brand tone. Wide cards with a room thumbnail, serif room name, muted status badge, and a subtle text-link-style "Cancel Reservation" action. Empty state uses tasteful imagery with "Your next stay awaits" copy.

### 3.6 Admin Dashboard
- Summary cards: total rooms, active bookings, occupancy-ish stat (optional).
- Nav to: Rooms, All Bookings, Activity Logs.
- **Premium treatment**: light, airy background — not a dark generic SaaS panel. Stat tiles use serif numerals with thin borders instead of heavy boxes. Sidebar nav uses minimal line icons and refined type, consistent with the guest-facing brand.

### 3.7 Admin — Manage Rooms
- Table of rooms with edit/deactivate actions.
- "Add Room" form/modal: room number, type, capacity, price.
- **Premium treatment**: room thumbnail photos in the table's first column, generous row height, muted status pills. "Add Room" opens a soft-shadowed, well-spaced modal.

### 3.8 Admin — All Bookings
- Filterable/paginated table: room, guest, dates, status.
- **Premium treatment**: pill-style filter chips instead of harsh dropdowns, generous table spacing, muted status badges — kept visually consistent with the rest of the brand.

### 3.9 Admin — Activity Logs
- Paginated table of log entries pulled from Mongo: timestamp, user, room, outcome (Confirmed/Conflict/Error) — this doubles as your concurrency-scenario proof for the video walkthrough.
- **Premium treatment**: refined status pills — Confirmed (muted green), Conflict (muted red/terracotta), Error (muted amber) — hairline row dividers, ample whitespace so the table stays legible, not alarming.

## 4. Components

- `DateRangePicker` — disallow past dates, enforce checkout > checkin.
- `RoomCard`
- `AvailabilityBadge` (green = available, red = unavailable, gray = pick dates)
- `BookingForm`
- `Toast/Notification` for success/error
- `Modal` (cancel confirmation, add/edit room)
- `Pagination`
- `LoadingSpinner` / skeleton loaders for lists
- `ProtectedRoute` wrapper (redirect to login if no JWT; redirect if role mismatch on admin routes)

## 5. States to Handle (every data-fetching screen)

- **Loading**: skeleton or spinner, not a blank screen.
- **Empty**: friendly message + relevant CTA (e.g., "browse rooms").
- **Error**: readable message, retry action where sensible (never show raw error/stack trace).
- **Conflict (409 specifically)**: distinct messaging from generic errors — "Someone just booked these dates" is more useful than "Something went wrong."

## 6. Responsive Behavior

- Mobile-first grid: room cards stack to single column below ~768px.
- Date picker collapses to a stacked (check-in above check-out) layout on mobile.
- Admin tables become horizontally scrollable or card-based on small screens.

## 7. Accessibility

- All interactive elements keyboard-navigable and focus-visible.
- Form inputs have associated `<label>`s.
- Color is never the only status indicator (pair badges with text: "Available"/"Unavailable", not just color).
- Sufficient contrast ratios (WCAG AA) for text on background.

## 8. Typography, Color, Spacing (premium system)

- **Fonts**: serif for headings (e.g. Playfair Display / Fraunces) + clean sans-serif for body/UI text (e.g. Inter). Small-caps + wider letter-spacing for meta labels (capacity, price, status).
- **Scale**: base 16px, headings at 1.25x steps (16/20/25/31/39), serif headings slightly larger/looser line-height for an editorial feel.
- **Color**: warm off-white or charcoal base (not stark gray SaaS default). One sophisticated accent color for CTAs/highlights (deep emerald, burgundy, or gold/bronze — pick one and use it consistently). Semantic colors kept muted/tasteful: green (available/confirmed), red/terracotta (unavailable/conflict/error), amber (pending/warning) — always paired with a text label.
- **Spacing**: 4px base unit, but lean toward the generous end of the 8/16/24/32px rhythm — airy, not cramped, including on admin screens.
- **Corners/shadows**: soft rounded corners (8–12px), subtle elevated shadows, fine hairline dividers between rows/sections; avoid heavy skeuomorphism but allow gold-foil-style accents on badges/primary buttons where it fits the brand.
- **Imagery**: large, high-quality photography (rooms, hotel exterior/lobby) used generously — hero banners, gallery views, thumbnails — rather than icon-only placeholders.

## 9. Navigation

- Top nav: Logo | Rooms | My Bookings | (Admin: Dashboard) | Login/Logout.
- Role-aware nav: Admin-only links hidden for guest role.
