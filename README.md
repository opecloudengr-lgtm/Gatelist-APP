# GateList

Private event access control. GateList replaces the paper guest list and printed
invitation cards at invite-only events (weddings, galas, private parties,
association meetings) with a single secure digital ticket per guest, importance
tagging (VIP / Special Guest / Reserved / General), and a scan-and-verify door
app that makes duplicate or unauthorized entries impossible.

There is no public ticketing, no guest-facing account, and no discovery surface.
Every event is private by default; guests are added by the organizer and never
sign up themselves.

## How it's built

A two-workspace monorepo:

- **`server/`** — Node.js + TypeScript + Express API, PostgreSQL via Prisma,
  Socket.IO for live check-in updates.
- **`web/`** — React + TypeScript + Vite, installable as a PWA. Mobile-first —
  the staff scanner and organizer dashboard both work well on a phone in a
  browser, no app store required.

### Why a PWA instead of a native app

The PRD suggested Flutter/React Native. GateList ships as an installable,
camera-capable web app instead: it covers the same jobs (door scanning, ticket
display, offline queueing) without an app store review cycle, and every
feature in this repo runs and is testable in a normal browser. If a native
shell is wanted later, the API in `server/` doesn't change — it's a thin
client swap.

## Core design decisions

- **Tickets are signed reference tokens, not data.** Each ticket's QR code
  encodes an HMAC-signed token (`server/src/lib/ticketToken.ts`) containing the
  ticket, event, and guest IDs plus a random nonce — never the guest's name or
  any personal data. The signature stops a copied/edited QR from pointing at a
  different event or guest; the database row is still the single source of
  truth for whether it's actually usable.
- **Duplicate check-ins are prevented at the database, not in application
  logic.** A scan transitions a ticket `ISSUED → CHECKED_IN` with a single
  conditional `UPDATE ... WHERE status = 'ISSUED'`. Postgres serializes
  concurrent writes to the same row, so when two devices scan the same QR
  code at the same instant, exactly one succeeds — verified under real
  concurrency in `server/tests/checkin.test.ts`.
- **Offline is a first-class scanning mode.** The staff scanner queues scans
  in IndexedDB when offline and syncs them once connectivity returns
  (`web/src/lib/offlineQueue.ts`, `POST /checkin/sync`). Sync is idempotent —
  a retried batch never double-logs or double-checks-in a guest — and the
  reconciliation rule is explicit: scans are replayed in the order the device
  queued them, and across devices, first to reach the server wins.
- **Every check-in attempt is audited**, valid, duplicate, invalid, or manual,
  with who scanned it, when, and from what device (`CheckInLog`).
- **Plus-ones get their own tickets.** Adding a guest with `plusOnesAllowed: N`
  creates N linked guest records, each with its own signed ticket, so every
  attendee — not just the named invitee — has a distinct scannable code.

## Getting started

Requires Node 20+ and a PostgreSQL 16 server.

```bash
npm install

# create the databases (adjust for your local Postgres setup)
createdb gatelist
createdb gatelist_test

cp server/.env.example server/.env   # edit DATABASE_URL / secrets as needed
npm run --workspace server prisma:migrate

npm run dev:server   # API on :4000
npm run dev:web      # app on :5173 (proxies /api and /socket.io to :4000)
```

Sign up as an organizer, verify the account (the dev email transport prints
the verification link to the server console — there's no real mail provider
wired up locally), create an event, and add guests. Open the same event as
`/events/:id/scan` to use the door scanner.

### Running the backend test suite

```bash
npm run --workspace server prisma:deploy   # against gatelist_test, once
npm test
```

The suite runs against a real PostgreSQL database (not mocks) and includes a
concurrency test that fires five simultaneous scans of the same ticket and
asserts exactly one is accepted — the app's core promise.

## Environment variables

See `server/.env.example`. Notably:

- `TICKET_SIGNING_SECRET` — HMAC key for ticket tokens. Rotating it
  invalidates every issued ticket, so treat it like any other production
  secret.
- `EMAIL_TRANSPORT=console` — the default dev transport logs verification and
  invite emails to stdout instead of sending them. Swap in a real provider by
  implementing `sendEmail()` in `server/src/lib/email.ts`.

## What's deliberately out of scope (v1, per the PRD)

Public event listings, ticket sales/payments, a guest-facing app, virtual
event support, and a visual seating-chart designer. GateList only does
registration, ticketing, guest classification, and check-in.
