# Skill: new-api-route

## Purpose

A quick-reference checklist and minimal template for adding a single new API route to SafeCommute. Use this for fast scaffolding of individual endpoints (not full resource CRUD — use `api-route-scaffolder` for that).

-----

## When to Use

Trigger this skill when asked to:

- “Add an endpoint to ___”
- “Create a route that ___”
- “I need a POST/GET/DELETE route for ___”
- “Wire up the API for ___”

-----

## Minimal Route Template

```ts
// /backend/src/routes/{resource}.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateCsrf } from '../middleware/csrf';
import { rateLimit } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import { mySchema } from '../middleware/validate/my.schema';
import { myService } from '../services/my.service';

const router = Router();

router.{method}(
'/{path}',
// Middleware stack — always in this order:
validateCsrf, // on POST, PUT, PATCH, DELETE only
authenticate, // on all protected routes
rateLimit(config), // apply relevant limit (see below)
validate(mySchema),// Zod schema validation
async (req, res) => {
const result = await myService.doThing(req.session.id, req.body);
res.status({statusCode}).json({ success: true, data: result });
}
);

export default router;
```

-----

## Middleware Decision Tree

```
Is this a GET request?
→ Skip validateCsrf
→ Keep authenticate (if protected)
→ Keep rate limit

Is this POST / PUT / PATCH / DELETE?
→ Add validateCsrf (always)
→ Add authenticate (always)
→ Add rate limit (always)
→ Add validate(schema) (always)

Is the route accessed by unauthenticated users? (e.g. share link view)
→ Skip authenticate
→ Add stricter rate limit (10/min/IP for share links)
→ Still validate inputs
```

-----

## Middleware Order (Non-Negotiable)

```
helmet → cors → cookieParser → csrfProtection → rateLimit → authenticate → validate → handler
```

Never put `authenticate` before `validateCsrf`. Never put `validate` before `rateLimit`.

-----

## Rate Limit Reference

```ts
// Import from /backend/src/middleware/rate-limit.ts
rateLimitLogin // 5 per 15 min per IP
rateLimitOtp // 3 per hour per phone
rateLimitTrips // 10 per hour per session
rateLimitEmergency // 3 per 24 hours per session
rateLimitShareView // 10 per minute per IP
rateLimitLocation // 1 per 10 seconds per trip (Socket.io, not REST)
```

-----

## Response Shape (always consistent)

```ts
// Success
res.status(200).json({ success: true, data: result });
res.status(201).json({ success: true, data: created });

// No content (e.g. DELETE)
res.status(204).send();

// Client error
res.status(400).json({ success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' });
res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' });
res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' });
res.status(410).json({ success: false, error: 'Share link expired', code: 'SHARE_LINK_EXPIRED' });
res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' });

// Server error — never expose stack trace
res.status(500).json({ success: false, error: 'Something went wrong', code: 'SERVER_ERROR' });
```

-----

## Zod Schema (always server-side)

```ts
// /backend/src/middleware/validate/my.schema.ts
import { z } from 'zod';

export const mySchema = z.object({
// Phone: always Nigerian format
phone: z.string().regex(/^\+234[0-9]{10}$/),

// License plate
plate: z.string().regex(/^[A-Z]{3}-\d{3}-[A-Z]{2}$/),

// Text fields: max length + strip HTML
note: z.string().max(500),

// Coordinates
lat: z.number().min(-90).max(90),
lng: z.number().min(-180).max(180),

// UUIDs for references
contactId: z.string().uuid(),
});
```

-----

## Audit Log (required for sensitive routes)

```ts
// Log at the end of handler, before returning response
await auditLog(req.session.id, 'event_type', {
// Include relevant non-sensitive context
tripId: result.id,
plan: req.body.plan,
ip: req.ip,
});

// Common event_type values:
// 'trip_created' | 'trip_ended' | 'emergency_triggered' | 'emergency_retracted'
// 'contact_added' | 'contact_deleted' | 'otp_requested' | 'otp_verified'
// 'share_link_accessed' | 'share_link_revoked'
// 'data_exported' | 'account_deleted'
// 'payment_initiated' | 'payment_completed'
// 'plate_decrypted'
```

-----

## Register Route in App

```ts
// /backend/src/app.ts
import myRoutes from './routes/my.routes';
app.use('/api/v1/my-resource', myRoutes);
```

-----

## Quick Checklist Before Committing

- [ ] CSRF on all non-GET routes
- [ ] `authenticate` on all protected routes
- [ ] Rate limit applied (correct limit for this action)
- [ ] Zod schema validates all inputs server-side
- [ ] Response uses standard `{ success, data/error }` shape
- [ ] No sensitive data (full plate, decrypted phone) in response or logs
- [ ] Audit log written for any sensitive operation
- [ ] No raw SQL — Sequelize parameterized queries only
- [ ] Error delegated to global error handler — no inline try/catch that swallows errors
