# Skill: api-route-scaffolder

## Purpose

Scaffold a complete, production-ready Express API route for SafeCommute — including router, service layer, validation middleware, and test file — following all Architecture, Security, and Code-style rules.

-----

## When to Use

Trigger this skill when asked to:

- “Add a new API endpoint for ___”
- “Scaffold the route for ___”
- “Create the backend for ___”
- “Build the API to handle ___”

-----

## What to Generate (always in this order)

### 1. Validation Schema (`/backend/src/middleware/validate/{resource}.schema.ts`)

```ts
import { z } from 'zod';

export const createTripSchema = z.object({
destinationAddress: z.string().max(200),
destinationLat: z.number().min(-90).max(90),
destinationLng: z.number().min(-180).max(180),
vehiclePlate: z.string().regex(/^[A-Z]{3}-\d{3}-[A-Z]{2}$/),
contactId: z.string().uuid(),
safetyNotes: z.array(z.string().max(500)).optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
```

### 2. Service Layer (`/backend/src/services/{resource}.service.ts`)

```ts
// Pure business logic — no req/res, no Express imports
export class TripService {
async createTrip(userId: string, input: CreateTripInput): Promise<Trip> {
// 1. Encrypt sensitive data before writing to DB
// 2. Generate share_token with randomBytes(16).toString('hex')
// 3. Write to DB via Sequelize model
// 4. Trigger WhatsApp notification
// 5. Log to audit_logs: event_type = 'trip_created'
// 6. Return created trip (with masked plate, not decrypted)
}
}
```

### 3. Router (`/backend/src/routes/{resource}.routes.ts`)

```ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateCsrf } from '../middleware/csrf';
import { rateLimitTrips } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import { createTripSchema } from '../middleware/validate/trip.schema';
import { TripService } from '../services/trip.service';

const router = Router();
const tripService = new TripService();

// GET — no CSRF needed
router.get('/:shareToken', authenticate, async (req, res) => {
const trip = await tripService.getTripByToken(req.params.shareToken);
if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
res.json({ success: true, data: trip });
});

// POST — CSRF + rate limit + validate
router.post(
'/',
validateCsrf,
authenticate,
rateLimitTrips,
validate(createTripSchema),
async (req, res) => {
const trip = await tripService.createTrip(req.user.id, req.body);
res.status(201).json({ success: true, data: trip });
}
);

export default router;
```

### 4. Register in App (`/backend/src/app.ts`)

```ts
import tripRoutes from './routes/trip.routes';
app.use('/api/v1/trips', tripRoutes);
```

### 5. Test File (`/backend/src/routes/{resource}.routes.test.ts`)

```ts
describe('POST /api/v1/trips', () => {
it('creates trip with valid payload', async () => { ... });
it('rejects missing CSRF token', async () => { ... });
it('rejects invalid plate format', async () => { ... });
it('rejects if rate limit exceeded', async () => { ... });
it('logs trip_created to audit_logs', async () => { ... });
});
```

-----

## Checklist Before Outputting

- [ ] CSRF middleware on all state-changing routes (POST, PUT, PATCH, DELETE)
- [ ] `authenticate` middleware on all protected routes
- [ ] Rate limit applied (check limits in Security.md)
- [ ] Zod schema validates all inputs server-side
- [ ] Service layer does not access `req`/`res`
- [ ] Sensitive data encrypted before DB write (plates → envelope encryption, phones → AES-256)
- [ ] Share tokens use `randomBytes`, never `Math.random()` or trip UUID
- [ ] Audit log entry created for sensitive operations
- [ ] Response shape: `{ success: boolean, data?: T, error?: string }`
- [ ] Error handler delegates to global middleware (no inline `console.error`)
- [ ] Test file includes happy path + at least 2 security edge cases

-----

## SafeCommute Rate Limits (Reference)

```
Trip creation: 10/hour/user → rateLimitTrips
OTP requests: 3/hour/phone → rateLimitOtp
Emergency alerts: 3/24hours/user → rateLimitEmergency
Location updates: 1/10seconds/trip → enforced in Socket.io handler
Share link views: 10/minute/IP → rateLimitShareView
Login attempts: 5/15min/IP → rateLimitLogin
```

-----

## Notes

- All location data in/out uses `DECIMAL(10, 7)` precision
- Trip status enum: `'active' | 'completed' | 'emergency'`
- Never return decrypted plates in API responses — return masked version unless user is the trip owner viewing their own history
