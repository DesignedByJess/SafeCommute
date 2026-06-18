---
trigger: always_on
---

# SafeCommute — Architecture Rules
## Product Overview
SafeCommute is a **Progressive Web App (PWA)** for public transport passenger safety in Nigeria. Users share live trip details (location, license plate, destination) with trusted contacts during journeys on danfos, kekes, and taxis.

## Tech Stack
### Frontend
|Layer |Technology |
|--------------|---------------------------------------|
|Framework |React 18 + Vite |
|Styling |TailwindCSS |
|State |React Context + LocalForage (encrypted)|
|Maps |Google Maps JavaScript API |
|Location |Geolocation API (high accuracy) |
|Camera |HTML5 Media Capture API |
|OCR (fallback)|Tesseract.js (client-side) |
|Real-time |Socket.io-client (WSS only — never WS) |
|XSS Prevention|DOMPurify |
|PWA |Service Worker (offline UI caching) |

### Backend
|Layer |Technology |
|------------------|------------------------------------------------------------------|
|Runtime |Node.js 18+ + Express |
|Database |PostgreSQL 14+ (encryption at rest enabled) |
|Real-time |Socket.io (WSS) |
|Caching / Sessions|Upstash Redis |
|OCR (primary) |Google Vision API (server-side) |
|Notifications |WhatsApp Business API → Africa’s Talking → Twilio (failover chain)|
|Key Management |AWS KMS or Google Cloud KMS |
|Object Storage |S3-compatible (encrypted, for license plate images) |

### Infrastructure
|Service |Provider |
|----------------|-----------------------------------------------------|
|Frontend hosting|Vercel |
|Backend hosting |Railway or Render |
|Database |Supabase or Neon (PostgreSQL) |
|Redis |Upstash |
|CDN + DDoS |Cloudflare |
|Monitoring |Winston → Elasticsearch, Grafana, Sentry, UptimeRobot|

## Database Schema (Core Tables)
```
sessions — session_token, csrf_token, ip_address, user_agent, expires_at
contacts — phone_number_encrypted (AES-256), phone_number_hash (SHA-256), otp_code, verified
trips — share_token (32-char UUID), vehicle_plate_encrypted, vehicle_plate_data_key_encrypted,
origin_lat/lng, destination_lat/lng, contact_id, safety_notes (JSONB), status, expires_at
trip_locations — lat, lng, accuracy, recorded_at (deleted immediately on trip end)
emergency_alerts — lat, lng, ip_address, triggered_at, retracted_at, verified
audit_logs — session_id, event_type, event_data, ip_address, created_at
encryption_keys — key_version, master_key_encrypted, active
```
**Always use UUIDs as primary keys.** Never expose sequential integer IDs in APIs.

## Communication Patterns
### REST API
- All endpoints under `/api/v1/`
- State-changing requests (POST, PUT, DELETE, PATCH) **must** include CSRF token in header
- Return shape: `{ success: boolean, data: T, error?: string }`

### WebSocket (WSS)
- Socket.io over WSS only — reject plain WS connections at the server level
- Authenticate with session token on connection handshake
- Location updates signed with HMAC to prevent tampering
- Rate limit: **1 location update per 10 seconds per trip**
- Emit events: `location:update`, `trip:ended`, `emergency:triggered`

### Notifications (Failover Chain)

```
WhatsApp Business API → Africa's Talking → Twilio SMS
```
Always attempt WhatsApp first. Log delivery status for each channel. Emergency alerts use all channels simultaneously.

## OCR Strategy
```
1. Client runs Tesseract.js
2. If confidence ≥ 80% → use result, skip server call
3. If confidence < 80% → POST image to /api/v1/trips/ocr (Google Vision)
4. Max 3 retries total (client + server combined)
5. Manual entry always available as final fallback
```
## Key Constraints
- **No plain WS** — WSS only for all real-time communication
- **No sequential IDs in public URLs** — use `share_token` (32-char random), not `trip.id`
- **Share links expire 2 hours after trip ends** — enforced at DB and API level
- **Location breadcrumbs deleted immediately when trip ends** — no async delay
- **Session stored in HTTP-only, Secure, SameSite=Strict cookie** — never localStorage
- **All sensitive data encrypted** — license plates use envelope encryption (per-trip data key + master key)
- **30-day data retention** for trips; 90-day for emergency trips (legal); immediate deletion for location breadcrumbs
- **PWA offline mode** — Service Worker caches UI assets; queue location updates on disconnect, sync on reconnect

## Folder Structure (Convention)
```
/frontend
/src
/components # Shared UI components
/features # Feature-scoped folders (trip, contacts, auth, dashboard)
/hooks # Custom React hooks
/context # React Context providers
/utils # Helpers (encryption, sanitization, formatting)
/services # API call wrappers
/workers # Service Worker

/backend
/src
/routes # Express route handlers (grouped by resource)
/middleware # Auth, CSRF, rate-limit, validation
/services # Business logic (trip, notification, OCR, encryption)
/models # Sequelize models / DB layer
/utils # HMAC, envelope encryption, logging
/sockets # Socket.io event handlers
```

## Performance Targets
- App loads in < 3s on 3G
- Location updates every 30 seconds during active trip
- Server-side OCR processes plate in < 3 seconds
- Share link loads in < 2 seconds
- Emergency alert delivery < 10 seconds (95th percentile)
- Maps render at 60fps target

: