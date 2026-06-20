---
trigger: always_on
---

# SafeCommute — Code Style Rules

## General Principles

- **Clarity over cleverness** — SafeCommute handles safety-critical data; code must be readable by anyone on the team
- **Explicit over implicit** — name things for what they do, not what they are
- **Fail loudly in dev, fail gracefully in prod** — throw in development, handle + log in production
- **Security is not optional** — sanitize, validate, and encrypt by default, not as an afterthought

-----

## Language & Tooling

|Tool |Config |
|-----------|--------------------------------------|
|Language |TypeScript (strict mode) |
|Linter |ESLint with `@typescript-eslint` |
|Formatter |Prettier |
|Test runner|Vitest (frontend), Jest (backend) |
|ORM |Sequelize (parameterized queries only)|

**TypeScript strict mode is non-negotiable.** No `any` types without explicit suppression comment explaining why.

-----

## Naming Conventions

```ts
// Variables and functions — camelCase
const shareToken = generateShareToken();
function startTrip(userId: string): Promise<Trip> {}

// Components — PascalCase
function TripSummaryCard({ trip }: TripSummaryCardProps) {}

// Constants — SCREAMING_SNAKE_CASE
const MAX_LOCATION_UPDATE_INTERVAL_MS = 10_000;
const SHARE_LINK_EXPIRY_HOURS = 2;

// Types and interfaces — PascalCase, no "I" prefix
type TripStatus = 'active' | 'completed' | 'emergency';
interface CreateTripPayload { ... }

// Database columns — snake_case (Sequelize maps to camelCase in models)
// API route params — kebab-case e.g. /api/v1/trips/:trip-id/end
// Files — kebab-case e.g. trip-summary-card.tsx, create-trip.service.ts
```

-----

## TypeScript Rules

```ts
// Always type function return values explicitly
async function getTrip(shareToken: string): Promise<Trip | null> { ... }

// Use discriminated unions for state
type TripState =
| { status: 'idle' }
| { status: 'active'; tripId: string; startedAt: Date }
| { status: 'emergency'; alertId: string };

// Prefer type over interface for unions/intersections; interface for object shapes
// Never use `as` casts except when interacting with untyped third-party libs
// Always handle null/undefined — no non-null assertion (!) without comment
```

-----

## React / Frontend Rules

```tsx
// Components: functional only, no class components
// Props: always typed with explicit interface
interface TripCardProps {
trip: Trip;
onEndTrip: (tripId: string) => void;
}

// State: prefer local state for UI; Context only for cross-cutting concerns (auth, trip)
// Side effects: always clean up (clear intervals, cancel subscriptions)
useEffect(() => {
const interval = setInterval(sendLocationUpdate, 30_000);
return () => clearInterval(interval);
}, []);

// Event handlers: prefixed with "handle"
const handleEndTrip = () => { ... };

// Boolean props: no value = true
<EmergencyButton disabled /> // ✅
<EmergencyButton disabled={true} /> // ✅ (verbose but fine)

// Sanitize all user content before rendering
import DOMPurify from 'dompurify';
const safeNote = DOMPurify.sanitize(userNote);

// No inline styles — use Tailwind classes only
// No hardcoded colors — use design system tokens (see Design-system.md)
```

-----

## Backend / Express Rules

```ts
// Route handlers: thin — delegate to service layer
router.post('/trips', validateCsrf, authenticate, async (req, res) => {
const result = await tripService.createTrip(req.user.id, req.body);
res.status(201).json({ success: true, data: result });
});

// Services: pure business logic, no req/res objects
// Models: DB access only — no business logic in models

// Middleware order (always this order):
// helmet → cors → cookieParser → csrfProtection → rateLimit → authenticate → validate → handler

// Always validate and sanitize before processing
// Always use parameterized queries — never template literals in SQL
// Always return consistent error shapes
res.status(400).json({ success: false, error: 'Invalid phone number format' });

// Async errors: wrap handlers or use express-async-errors
// Never leak stack traces to client in production
```

-----

## Error Handling

```ts
// Custom error classes
class AppError extends Error {
constructor(
public message: string,
public statusCode: number,
public code: string
) { super(message); }
}

throw new AppError('Share link expired', 410, 'SHARE_LINK_EXPIRED');

// Global error handler (backend)
app.use((err, req, res, next) => {
logger.error({ err, path: req.path, ip: req.ip });
const status = err.statusCode ?? 500;
const message = isProd ? 'Something went wrong' : err.message;
res.status(status).json({ success: false, error: message, code: err.code });
});

// Frontend: always handle API errors in UI — never let network errors crash silently
```

-----

## Security Code Patterns

```ts
// Phone number validation (always server-side)
const NIGERIA_PHONE_REGEX = /^\+234[0-9]{10}$/;

// License plate validation
const PLATE_REGEX = /^[A-Z]{3}-\d{3}-[A-Z]{2}$/;

// Share token generation — never use Math.random()
import { randomBytes } from 'crypto';
const shareToken = randomBytes(16).toString('hex'); // 32 chars

// HMAC signing for location updates
import { createHmac } from 'crypto';
const signature = createHmac('sha256', process.env.HMAC_SECRET!)
.update(JSON.stringify(locationPayload))
.digest('hex');

// Masked plate display — only last 4 visible
const maskedPlate = plate.replace(/^.{5}/, '**-');
// e.g. "LAG-123-FK" → "**-123-FK" (adjust to format)
```

-----

## Git Conventions

```
feat(trip): add license plate OCR with server-side fallback
fix(auth): link contact after OTP verification
security(contacts): encrypt phone numbers at rest
chore(deps): update express-rate-limit to v7
```

Format: `type(scope): description`
Types: `feat`, `fix`, `security`, `perf`, `chore`, `test`, `docs`

**Branch naming:**

```
feature/trip-ocr
fix/share-link-expiry
security/csrf-middleware
```

**Never commit:**

- API keys, secrets, or KMS key ARNs
- Unencrypted PII (phone numbers, coordinates, plate numbers)
- `console.log` statements (use Winston logger)
- Disabled ESLint rules without explanatory comment

-----

## Testing Rules

- Every service function has a unit test
- Every API endpoint has an integration test (happy path + at least 2 error cases)
- Security-sensitive paths (auth, CSRF, rate limiting, encryption) require dedicated tests
- Minimum coverage target: **80%** on backend services
- Test file location: co-located (`trip.service.test.ts` beside `trip.service.ts`)
- Mock external services (Google Vision, Twilio, WhatsApp API) in all tests
- Use factories for test data — never hardcode real phone numbers or plates in tests

-----

## Environment Variables

```env
# Always accessed via a typed config module — never process.env directly in business logic
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CSRF_SECRET=
HMAC_SECRET=
KMS_KEY_ARN=
GOOGLE_MAPS_API_KEY=
GOOGLE_VISION_API_KEY=
WHATSAPP_API_TOKEN=
AFRICA_TALKING_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

Config module validates all required vars on startup and throws if any are missing.