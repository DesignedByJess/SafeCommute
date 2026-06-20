# AGENTS.md — SafeCommute

> This file is the single source of truth for any AI coding agent working on SafeCommute.
> Read this entire file before writing a single line of code.

-----

## What Is SafeCommute?

SafeCommute is a **Progressive Web App (PWA)** for public transport passenger safety in Nigeria. Users share live trip details — destination, vehicle license plate, and real-time location — with trusted contacts while traveling on danfos, kekes, and taxis.

**Core flows:**

1. User adds a trusted contact (OTP-verified)
1. User starts a trip (license plate scan → destination → contact → share)
1. Contact receives a WhatsApp/SMS link and tracks the journey live
1. User ends trip or triggers emergency alert

**Target users:** Women 18–45, university students, daily public transport commuters in Lagos and Port Harcourt, Nigeria.

This is a **safety-critical product**. Bugs in authentication, encryption, notifications, or location tracking are not just technical failures — they are safety failures. Treat every task with that weight.

-----

## Repository Structure

```
/
├── frontend/ # React 18 + Vite PWA
│ └── src/
│ ├── components/ # Shared UI components
│ ├── features/ # Feature-scoped modules
│ │ ├── auth/
│ │ ├── trip/
│ │ ├── contacts/
│ │ ├── dashboard/
│ │ ├── history/
│ │ ├── privacy/
│ │ └── subscription/
│ ├── hooks/ # Custom React hooks
│ ├── context/ # React Context providers
│ ├── utils/ # Helpers (encryption, sanitization, formatting)
│ ├── services/ # API call wrappers
│ └── workers/ # Service Worker (PWA offline)
│
├── backend/ # Node.js 18 + Express
│ └── src/
│ ├── routes/ # Express routers (grouped by resource)
│ ├── middleware/ # Auth, CSRF, rate-limit, validation
│ ├── services/ # Business logic (no req/res)
│ ├── models/ # Sequelize models
│ ├── utils/ # HMAC, envelope encryption, logging
│ ├── sockets/ # Socket.io event handlers
│ └── database/
│ └── migrations/ # Sequelize migrations
│
├── rules/ # Agent rules context files
│ ├── Architecture.md
│ ├── Security.md
│ ├── Code-style.md
│ └── Design-system.md
│
└── skills/ # Agent skill context files
├── Api-route-scaffolder.md
├── Component-builder.md
├── Db-migration-runner.md
├── Flutterwave-integration.md
├── New-api-route.md
└── New-component.md
```

-----

## Rules Files — Read Before Every Task

|File |Read When |
|------------------------|---------------------------------------------------------|
|`rules/Architecture.md` |Any backend, infrastructure, or real-time task |
|`rules/Security.md` |Any task touching auth, encryption, data storage, or APIs|
|`rules/Code-style.md` |Every task — always |
|`rules/Design-system.md`|Any frontend or UI task |

**Do not skip rule files.** They encode decisions that are not negotiable.

-----

## Skills Files — Use as Templates

|File |Use When |
|-----------------------------------|------------------------------------------------------------------------|
|`skills/Api-route-scaffolder.md` |Scaffolding a full REST resource (router + service + validation + tests)|
|`skills/Component-builder.md` |Building a complete feature screen or multi-component UI |
|`skills/Db-migration-runner.md` |Writing any database migration |
|`skills/Flutterwave-integration.md`|Any payment, subscription, or webhook task |
|`skills/New-api-route.md` |Adding a single API endpoint quickly |
|`skills/New-component.md` |Creating a single focused React component |

-----

## Tech Stack (Quick Reference)

**Frontend:** React 18, Vite, TailwindCSS, React Context, Google Maps JS API, Socket.io-client (WSS), Tesseract.js, DOMPurify, LocalForage, Lucide React

**Backend:** Node.js 18+, Express, PostgreSQL 14+, Sequelize ORM, Supabase Auth, Socket.io (WSS), Google Vision API, WhatsApp Business API → Africa’s Talking → Twilio

**Infrastructure:** Vercel (frontend), Railway/Render (backend), Supabase/Neon (DB), Cloudflare (CDN + DDoS), AWS KMS / Google Cloud KMS

**Payment:** Flutterwave (NGN, primary) — see `skills/Flutterwave-integration.md`

**Security:** helmet, csurf, express-rate-limit, bcrypt, Node.js crypto, Snyk

**Monitoring:** Winston → Elasticsearch, Grafana, Sentry, UptimeRobot

-----

## Absolute Rules (Never Break These)

### Security

- **No plain WS** — WebSocket connections are WSS only, always
- **No sequential IDs in public URLs** — use `share_token` (32-char random hex), never `trip.id`
- **No auth JWT in localStorage** — Supabase Auth JWT (access/refresh tokens) must be stored in HTTP-only, Secure, SameSite=Strict cookies only
- **No raw SQL** — Sequelize parameterized queries only
- **No Math.random() for tokens** — use `crypto.randomBytes()`
- **No secrets in source code** — all keys via environment variables
- **No client-side validation only** — always re-validate on server with Zod
- **No decrypted plates in API responses** — return masked version unless the owner is viewing their own history
- **CSRF token required** on every POST, PUT, PATCH, DELETE request

### Data

- **Location breadcrumbs deleted immediately when trip ends** — no delay, no scheduled job
- **Share links expire 2 hours after trip ends** — enforced at DB level, not just application logic
- **30-day retention** for trips; 90-day for emergency trips; 7-day soft-delete for contacts
- **All sensitive columns encrypted** — plates use envelope encryption; phones use AES-256

### Frontend

- **Tailwind only** — no inline styles, no CSS modules, no styled-components
- **No hardcoded hex colors** — use only the tokens defined in `rules/Design-system.md`
- **Red (`#DC2626`) is for emergency actions only** — never use for errors, delete buttons, or warnings
- **DOMPurify on all user-generated content** before rendering
- **Masked display always** — phone numbers as `+234***5678`, plates as `**-FK`
- **Minimum touch target: 44×44px** on all interactive elements

### Code

- **TypeScript strict mode** — no `any` without comment explaining why
- **No `console.log`** — use Winston logger
- **Explicit return types** on all functions
- **Service layer has no `req`/`res`** — business logic is Express-agnostic

-----

## Database Schema (Key Tables)

```
contacts — user_id (UUID), phone_number_encrypted (AES-256), phone_number_hash (SHA-256), verified, deleted_at (soft delete)
trips — user_id (UUID), share_token (32-char random), vehicle_plate_encrypted (envelope), status, expires_at
trip_locations — lat, lng, accuracy (deleted immediately on trip end — no expires_at)
emergency_alerts — lat, lng, ip_address, triggered_at, retracted_at, verified
audit_logs — user_id (UUID), event_type, event_data (JSONB), ip_address
encryption_keys — key_version, master_key_encrypted, active
```

All primary keys are UUIDs. All timestamps are UTC. All coordinates are `DECIMAL(10, 7)`.

-----

## API Conventions

- Base path: `/api/v1/`
- Response shape: `{ success: boolean, data?: T, error?: string, code?: string }`
- Status codes: 200 (ok), 201 (created), 204 (no content), 400 (bad input), 401 (unauth), 403 (forbidden), 404 (not found), 410 (share link expired), 429 (rate limited), 500 (server error)
- Middleware order: `helmet → cors → cookieParser → csrfProtection → rateLimit → authenticate (verify Supabase JWT from cookie) → validate → handler`

### Rate Limits

```
Login: 5 / 15 min / IP (handled by Supabase or server fallback)
OTP requests: 3 / hour / phone
Trip creation: 10 / hour / user
Location updates: 1 / 10 sec / trip (Socket.io)
Share link views: 10 / min / IP
Emergency alerts: 3 / 24 hours / user
```

-----

## Notification Failover Chain

```
1. WhatsApp Business API (primary — cheaper, higher open rate)
2. Africa's Talking SMS (first fallback)
3. Twilio SMS (second fallback)
```

Emergency alerts: trigger **all three simultaneously**, do not chain.
Trip start SMS content: name + secure link only — never include plate number or full destination.

-----

## Pricing (For Payment Tasks)

```
Premium Individual — Monthly: ₦833
Premium Individual — Yearly: ₦10,000
Family Plan — Yearly: ₦15,000 (up to 5 members)
```

Currency: NGN. Payment gateway: Flutterwave. See `skills/Flutterwave-integration.md`.

-----

## Audit Logging (Required Events)

Any task that touches these flows must write to `audit_logs` (logging `user_id` instead of `session_id`):

```
Authentication: login, logout, otp_requested, otp_verified
Trips: trip_created, trip_ended, emergency_triggered, emergency_retracted
Contacts: contact_added, contact_deleted
Data: plate_decrypted, data_exported, account_deleted
Share links: share_link_accessed, share_link_revoked
Payments: payment_initiated, payment_completed
```

-----

## Design Tokens (For UI Tasks)

```
Brand teal: #0891B2 (CTAs, active states, links)
Teal dark: #0E7490 (hover, pressed)
Teal light: #BAE6FD / #E0F2FE (backgrounds, chips)
Emergency: #DC2626 (ONLY for Send Emergency Alert — nothing else)
Success: #16A34A (arrived safely, OTP verified)
Warning: #D97706 (expiring links, caution states)
Text primary: #111827 (gray-900)
Text secondary: #374151 (gray-700)
Border: #D1D5DB (gray-300)
Surface: #F3F4F6 (gray-100)
Font: Inter
Icons: Lucide React
```

-----

## Testing Expectations

Every task that introduces new logic must include tests:

- **Backend services:** unit tests for all service functions
- **API routes:** integration tests — happy path + at least 2 security edge cases
- **Frontend components:** render tests + interaction tests
- **Security paths:** dedicated tests for CSRF rejection, rate limit enforcement, invalid tokens, expired share links
- **Mock all external services:** Google Vision, Twilio, Africa’s Talking, WhatsApp API, Flutterwave

Test files co-located with source: `trip.service.ts` → `trip.service.test.ts`

-----

## What Good Output Looks Like

When completing a task, an agent should:

1. **Read** the relevant rules file(s) first
1. **Use** the relevant skill file(s) as a template
1. **Produce** TypeScript with strict types and explicit return types
1. **Include** the full middleware stack on every route
1. **Encrypt** sensitive data before writing to the database
1. **Sanitize** user content before rendering in the UI
1. **Write** an audit log entry for sensitive operations
1. **Include** tests alongside the implementation
1. **Not** leave `TODO` comments for security-critical items — implement them

-----

## What Bad Output Looks Like (Reject These)

- Storing Supabase Auth JWT or session tokens in `localStorage`
- Using custom session tables/Redis instead of Supabase Auth
- Using `Math.random()` for share tokens or OTP codes
- Returning full (unmasked) plate numbers or phone numbers in API responses
- Using plain WS instead of WSS for Socket.io
- Skipping CSRF middleware on a POST route
- Using red (`#DC2626`) for a delete button or error state
- Writing raw SQL strings instead of Sequelize queries
- Deleting location breadcrumbs on a schedule instead of immediately on trip end
- Generating share links using `trip.id` instead of `share_token`
- Skipping the audit log on a sensitive operation

-----

## Compliance Notes

SafeCommute is subject to the **Nigeria Data Protection Act (NDPA) 2023**. Any task that touches data collection, storage, or deletion must respect:

- Minimum data collection — only what the feature requires
- User control — users can delete any data without contacting support
- Retention limits — do not store data beyond its defined retention period
- Breach readiness — sensitive data must be encrypted such that a DB breach causes minimal exposure

DPO contact: `dpo@safecommute.app`
Privacy contact: `privacy@safecommute.app`
