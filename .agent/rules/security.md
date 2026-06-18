---
trigger: always_on
---

# SafeCommute — Security Rules

> Safety is the product. A breach is not a technical failure — it’s a product failure. Every engineer is a security engineer.

## Core Principles

1. **Privacy by design** — collect minimum data, explain every collection point
1. **Data minimization** — never store what you don’t need
1. **User control** — users can delete any data, anytime, without contacting support
1. **Transparent practices** — audit every sensitive operation

## Authentication & Sessions
- Sessions managed **server-side** with Redis (Upstash)
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- **Never store session token in localStorage or sessionStorage**
- Session expires after **30 days of inactivity**
- Session rotated after password change or any security-sensitive action
- Session metadata logged: IP, user-agent, creation time, last activity

```js
// Cookie config (Express)
res.cookie('session', token, {
httpOnly: true,
secure: true,
sameSite: 'strict',
maxAge: 30 * 24 * 60 * 60 * 1000
});
```

## CSRF Protection
- Use `csurf` middleware on **all state-changing operations** (POST, PUT, PATCH, DELETE)
- Embed CSRF token in every form and API request
- Token generated per session, validated server-side
- Never trust CSRF tokens sent via URL query params

## Encryption
### Data at Rest

|Data |Method |
|------------------------|--------------------------------------------------------------------------------|
|License plates |Envelope encryption: AES-256-GCM data key (per-trip) + RSA-2048 master key (KMS)|
|Phone numbers (contacts)|AES-256 encrypted column |
|Phone deduplication |SHA-256 hash (separate column) |
|Session tokens |bcrypt (hashing) |

### Data in Transit
- **TLS 1.3 only** for all HTTPS and WSS connections
- Reject plain HTTP and plain WS at load balancer level (Cloudflare)
- Certificate managed via Cloudflare or Let’s Encrypt

### Key Management
- Master keys stored in **AWS KMS or Google Cloud KMS** — never in source code or environment variables
- Keys rotated every **30 days** (automated)
- Old key versions retained for decryption of existing data; marked `active = false`
- Cryptographic erasure on deletion: delete data key → plate becomes unrecoverable

## Input Validation (Server-Side)
**Never trust client-side validation.** All inputs re-validated on the server.

```
Phone number: /^\+234[0-9]{10}$/
License plate: /^[A-Z]{3}-\d{3}-[A-Z]{2}$/ max 3 retries
Destination: max 200 chars, sanitize HTML
Safety notes: max 500 chars, no script tags, sanitize HTML
Coordinates: lat ∈ [-90, 90], lng ∈ [-180, 180]
```
- Use **DOMPurify** on the client for display-layer XSS prevention
- Use **parameterized queries via Sequelize ORM** — never raw SQL string interpolation
- Strip and reject any `<script>` or event handler attributes from user content

## Rate Limiting
|Endpoint / Action|Limit |
|-----------------|---------------------------|
|Login attempts |5 per 15 min per IP |
|OTP requests |3 per hour per phone number|
|Trip creation |10 per hour per session |
|Location updates |1 per 10 seconds per trip |
|Share link views |10 per minute per IP |
|Emergency alerts |3 per 24 hours per session |

Use `express-rate-limit` + Redis store (Upstash) for distributed rate limiting.

## Share Links
- Share token: **32-char cryptographically random string** — not the trip UUID
- URL format: `https://safecommute.app/track/{share_token}`
- Links **expire 2 hours after trip ends** — enforced at DB query level, not just application logic
- User can **revoke share link mid-trip** from Privacy Dashboard
- SMS/WhatsApp message contains **only name + link** — never plate number or full destination
- Contact view: show only masked plate (last 4 chars: `**-FK`) and city-level location

## Output Encoding & HTTP Security Headers

Via `helmet` middleware:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' wss:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self)
```
- Escape all user-generated content before rendering
- CORS: whitelist only known origins; `credentials: true` for cookies

## Location Data Rules
- Transmitted over **WSS only** (TLS 1.3)
- Stored only during active trip
- **Deleted immediately when trip ends** — no scheduled job, immediate DELETE on `trip:ended`
- Only `origin` and `destination` retained in trip history (no breadcrumb trail)
- WebSocket location updates **signed with HMAC** — server rejects unsigned updates
- Geofence alert triggered if user deviates > 5km from expected route

## Emergency Alerts
- Confirmation modal required before sending — accidental tap prevention
- SMS verification code required to confirm (prevents mis-taps)
- Triggers **audit log** with IP, device, GPS accuracy, timestamp
- **Rate limited**: 3 per 24 hours per session
- 2-minute **retraction window** with reason logging
- Tracked: 3+ false alarms → account review flag

## Audit Logging
Log **all sensitive operations** to `audit_logs` table:
- `login`, `logout`, `session_created`
- `trip_created`, `trip_ended`, `emergency_triggered`
- `contact_added`, `contact_deleted`
- `plate_decrypted`, `data_exported`, `account_deleted`
- `share_link_accessed`, `share_link_revoked`

Log fields: `session_id`, `event_type`, `event_data` (JSONB), `ip_address`, `user_agent`, `created_at`

## Data Retention & Deletion
|Data |Retention |Deletion |
|-----------------------|------------------|---------------------------------------------|
|Trip history |30 days |User can delete anytime; auto-purge after 30d|
|Emergency trips |90 days |Legal compliance |
|Location breadcrumbs |Trip duration only|Immediate on trip end |
|Contacts (soft-deleted)|7 days |Hard delete after 7d |
|Deleted trip backups |48 hours |Purged from backups within 48h |
|Session data |30 days inactivity|Auto-expire |
|Audit logs |30 days |Encrypted, auto-purge |

## NDPA 2023 Compliance
- Lawful basis: Consent + Legitimate Interest (safety)
- Privacy Policy: plain language, Grade 8 reading level, always accessible
- User rights self-service (no support ticket required):
- **Access** → Export My Data (JSON)
- **Delete** → Delete Trip / Delete Account (48h processing)
- **Export** → JSON download
- **Revoke** → Revoke share link from Privacy Dashboard
- Data breach notification within **72 hours** to NITDA + affected users
- DPO contact: `dpo@safecommute.app`
- Third-party DPAs signed with: Google, Twilio, Africa’s Talking, Supabase

## Vulnerability Management
- Automated dependency scanning: Snyk + Dependabot
- Quarterly internal security reviews
- Annual penetration testing (before major releases)
- Bug bounty: HackerOne
- Critical vulnerabilities patched within **24 hours**
- Lighthouse Security score target: **100**
- OWASP Top 10