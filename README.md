# Appointment Booking System

A full-stack, production-style appointment booking platform — providers define
their availability, customers browse and book open slots, and both sides can
cancel or reschedule within policy. Built to demonstrate real system-design
thinking (concurrency-safe booking, timezone correctness, role-based access,
notifications, audit trails) rather than a simple CRUD demo.

## 1. Problem statement / why this exists

Almost every service business — clinics, salons, consultants, tutors, repair
shops, interview scheduling — needs the same core mechanic: *let people claim
a fixed slot of someone's time, without ever double-booking it.* That sounds
simple until you account for concurrent requests, timezones, cancellation
policies, and providers changing their availability after bookings already
exist. This project builds that mechanic properly, then wraps it in the
features a real product needs around it.

## 2. Scope

**In scope**
- Multi-role accounts: Customer, Provider, Admin (RBAC)
- Provider setup: business profile, services (name/duration/price), recurring
  weekly availability rules, one-off exceptions (holidays / extra hours)
- Timezone- and DST-safe slot generation from those rules
- Concurrency-safe booking: hold → confirm flow backed by DB transactions and
  unique indexes, so two customers can never be granted the same slot
- Cancellation with a provider-configurable notice window, and rescheduling
- Waitlist for full slots, with notify-on-cancellation
- Outbox-pattern email notifications (confirmations, cancellations, reminders)
- Provider dashboard (bookings, mark completed / no-show)
- Admin dashboard (providers, analytics, audit log)
- Rate limiting on auth/booking endpoints, idempotent booking requests
- Automated tests, including a concurrency test that fires parallel booking
  requests at one slot to prove the race is actually closed
- CI + live deployment

**Out of scope (deliberately, for this version)**
- Payments/deposits (schema and flow are structured so this can be added
  without a redesign — see "Future enhancements")
- SMS notifications (email only for now; same outbox model would carry SMS)
- Multi-language/i18n

## 3. Roles — what each account type can do

The system has three roles, each with a different dashboard and permission set:

**Customer** (default role on signup)
- Browse all active providers and their services
- View a provider's real-time open slots for a chosen service
- Book a slot (hold → confirm), with retry-safe idempotent submission
- View "My Bookings" and cancel a confirmed booking (subject to the
  provider's minimum cancellation-notice window)
- Join a waitlist for a fully booked slot and get notified if it opens up

**Provider**
- Everything a customer can do, plus a dedicated Provider Dashboard:
  - **Profile**: business name, bio, timezone, buffer time between
    appointments, minimum cancellation-notice policy
  - **Services**: create/deactivate services (name, duration, price)
  - **Availability**: recurring weekly working hours, plus one-off
    exceptions (blackout days off, or extra hours)
  - **Bookings**: see all bookings against their calendar, mark a
    completed appointment or a no-show
- Cancelling a booking as a provider is not subject to the customer's
  notice-window restriction

**Admin** (created via a seed script, not self-registration — see
`server/src/scripts/createAdmin.js`)
- View and activate/deactivate any provider account
- Permanently delete a provider account — only allowed when it has zero
  booking history (a test/junk account); a provider with any real booking
  history (even cancelled) can only be deactivated, never hard-deleted, so
  transaction history is never destroyed
- View platform-wide analytics: total bookings, no-show rate,
  cancellation rate, per-provider breakdown
- View the full audit log (who did what, and when) across the platform

## 5. Who this is for / how it's useful

- **As a portfolio project**: it proves end-to-end ownership — data modeling,
  API design, auth, a real concurrency problem solved correctly, background
  jobs, testing, and cloud deployment — not just a UI over a database.
- **As a reusable pattern**: the slot/hold/confirm mechanism generalizes
  directly to reservations, room booking, interview scheduling, ticketing —
  anywhere a fixed resource-over-time needs to be claimed exactly once.
- **As a working tool**: a small business could realistically run on this —
  it isn't a toy that falls over under real usage (two customers clicking
  "book" at the same moment, a provider going on holiday with bookings
  already on the books, etc.).

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + React Router + Tailwind CSS | Fast dev loop, no framework lock-in, small bundle |
| Backend | Node.js + Express 5 | Ubiquitous, simple to reason about, async-error-aware |
| Database | MongoDB (Mongoose) | Flexible schema for availability rules; transactions + unique/partial indexes give us the concurrency guarantees we need |
| Auth | JWT access token + httpOnly refresh cookie | Stateless access token for APIs, rotate-able refresh token for sessions |
| Validation | Zod | Schema validation at the API boundary |
| Scheduling/jobs | node-cron | Slot generation, stale-hold cleanup, notification dispatch |
| Email | Nodemailer | Outbox-pattern sender, swappable provider (SMTP/Resend/etc.) |
| Testing | Jest + Supertest + mongodb-memory-server | API + concurrency tests without a real DB dependency |
| Deployment | Vercel (frontend) · Render (API) · MongoDB Atlas (DB) | Free-tier friendly, realistic 3-tier deployment |

## 7. Key design decisions (worth highlighting when presenting)

- **Slots are materialized, not computed on the fly.** A background job
  expands each provider's recurring rules + exceptions into concrete `Slot`
  documents ahead of time. This is what makes atomic, indexed booking
  possible — you can't put a unique index on a slot that doesn't exist yet.
- **Double-booking is prevented at the database layer, twice over**: a
  unique compound index on `(providerId, startTime)` stops duplicate slots
  from ever being created, and a partial unique index on `Booking.slotId`
  stops two active bookings from ever referencing the same slot. The
  hold→confirm transition itself runs inside a MongoDB transaction that
  re-checks for time-overlapping holds/bookings before committing.
- **All timestamps are stored in UTC.** Provider working hours are wall-clock
  strings (`"09:00"`) interpreted against the provider's IANA timezone only at
  generation time and at render time — so daylight-saving transitions are
  handled correctly instead of hard-coded as fixed offsets.
- **Notifications use an outbox pattern.** Booking actions write a row to a
  `Notification` collection instead of sending email inline; a cron worker
  drains it. A slow or down email provider can never make a booking request
  hang or fail.
- **Availability edits never retroactively touch existing bookings.** Turning
  off a rule or deactivating a service only stops *future* slot generation —
  slots that are already booked stay valid and must go through the explicit
  cancellation flow.

## 8. Edge cases explicitly handled

Double-booking race conditions · abandoned-checkout slot holds (auto-released
after 5 min) · timezone/DST correctness · cancellation notice windows ·
provider-initiated cancellation with customer notification · provider
changing availability after bookings exist · waitlist notify-on-cancel ·
idempotent booking submission (retry-safe) · rate limiting on auth/booking ·
no-show tracking · soft-deleted providers/services with existing future
bookings still honored.

## 9. Project structure

```
/client   React + Vite frontend
/server   Express API, Mongoose models, cron jobs, tests
```

## 10. Running locally

See `server/.env.example` and `client/.env.example` for required environment
variables. Broadly:

```
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

MongoDB must be reachable as a replica set (a single free-tier MongoDB Atlas
cluster satisfies this) since transactional booking requires it — a bare
standalone `mongod` will not support the transaction used in the hold/confirm
flow.

## 11. Deployment

Frontend → Vercel · API → Render (or Railway) · Database → MongoDB Atlas
(M0 free tier). See `DEPLOYMENT.md` for the step-by-step guide.

## 12. Future enhancements

Payments/deposits on booking, SMS reminders, calendar sync (Google
Calendar/ICS export), recurring bookings, multi-service combo bookings.
