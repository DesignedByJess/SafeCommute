# Skill: flutterwave-integration

## Purpose

Handle all payment flows in SafeCommute using Flutterwave as the payment gateway — premium subscriptions, family plans, and future B2B billing. Covers frontend checkout, backend webhook verification, and subscription state management.

-----

## When to Use

Trigger this skill when asked to:

- “Add payment for premium subscription”
- “Integrate Flutterwave”
- “Handle subscription checkout”
- “Process the premium plan payment”
- “Verify a Flutterwave webhook”

-----

## SafeCommute Pricing Reference

|Plan |Amount |Period |
|------------------|-------|------------------------|
|Premium Individual|₦10,000|Yearly |
|Premium Individual|₦833 |Monthly |
|Family Plan |₦15,000|Yearly (up to 5 members)|

Currency: `NGN`. Always pass amounts in the **full Naira value** (Flutterwave uses Naira, not kobo).

-----

## Environment Variables Required

```env
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxx
FLUTTERWAVE_ENCRYPTION_KEY=xxxx
FLUTTERWAVE_WEBHOOK_SECRET=xxxx # set in Flutterwave dashboard → Webhooks
APP_URL=https://safecommute.app
```

-----

## Backend: Initialize Payment

### Endpoint: `POST /api/v1/payments/initialize`

```ts
// /backend/src/services/payment.service.ts

import { randomBytes } from 'crypto';

interface InitializePaymentInput {
plan: 'premium_monthly' | 'premium_yearly' | 'family_yearly';
sessionId: string;
userEmail: string; // collected during onboarding
userName: string;
}

const PLAN_CONFIG = {
premium_monthly: { amount: 833, currency: 'NGN', duration: '1 month' },
premium_yearly: { amount: 10000, currency: 'NGN', duration: '1 year' },
family_yearly: { amount: 15000, currency: 'NGN', duration: '1 year' },
};

export async function initializePayment(input: InitializePaymentInput) {
const { plan, sessionId, userEmail, userName } = input;
const config = PLAN_CONFIG[plan];

// Generate idempotent transaction ref
const txRef = `SC-${sessionId.slice(0, 8)}-${randomBytes(4).toString('hex')}`;

const payload = {
tx_ref: txRef,
amount: config.amount,
currency: config.currency,
redirect_url: `${process.env.APP_URL}/payment/callback`,
customer: {
email: userEmail,
name: userName,
},
customizations: {
title: 'SafeCommute',
description: `${plan.replace(/_/g, ' ')} subscription`,
logo: `${process.env.APP_URL}/logo.png`,
},
meta: {
session_id: sessionId,
plan,
},
};

const response = await fetch('https://api.flutterwave.com/v3/payments', {
method: 'POST',
headers: {
Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
'Content-Type': 'application/json',
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (data.status !== 'success') {
throw new AppError('Payment initialization failed', 502, 'PAYMENT_INIT_FAILED');
}

// Store pending transaction in DB for webhook reconciliation
await PendingPayment.create({ txRef, sessionId, plan, amount: config.amount });

// Log to audit_logs
await auditLog(sessionId, 'payment_initiated', { txRef, plan });

return { paymentLink: data.data.link, txRef };
}
```

-----

## Backend: Verify Payment (Callback)

### Endpoint: `GET /api/v1/payments/callback`

```ts
router.get('/callback', authenticate, async (req, res) => {
const { transaction_id, tx_ref, status } = req.query;

if (status !== 'successful') {
return res.redirect('/payment/failed');
}

// Re-verify with Flutterwave — never trust query params alone
const verification = await verifyTransaction(transaction_id as string);

if (!verification.success) {
return res.redirect('/payment/failed');
}

// Activate subscription
await subscriptionService.activate(req.session.id, verification.plan);
await auditLog(req.session.id, 'payment_completed', { txRef: tx_ref });

res.redirect('/payment/success');
});

async function verifyTransaction(transactionId: string) {
const response = await fetch(
`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
{ headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
);
const data = await response.json();

if (
data.status === 'success' &&
data.data.status === 'successful' &&
data.data.currency === 'NGN'
) {
// Cross-check amount against pending payment record
const pending = await PendingPayment.findOne({ where: { txRef: data.data.tx_ref } });
if (!pending || pending.amount !== data.data.amount) {
return { success: false }; // Amount mismatch — possible tampering
}
return { success: true, plan: pending.plan };
}
return { success: false };
}
```

-----

## Backend: Webhook Handler

### Endpoint: `POST /api/v1/payments/webhook`

```ts
import { createHmac } from 'crypto';

// Webhook must NOT require authentication middleware — Flutterwave calls it directly
// But MUST verify the Flutterwave signature
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
const signature = req.headers['verif-hash'];

// Verify webhook signature
if (signature !== process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
return res.status(401).json({ error: 'Invalid signature' });
}

const event = JSON.parse(req.body.toString());

if (event.event === 'charge.completed' && event.data.status === 'successful') {
const { tx_ref, amount, currency } = event.data;

const pending = await PendingPayment.findOne({ where: { txRef: tx_ref } });
if (!pending) return res.status(200).json({ received: true }); // idempotent

// Verify amount matches expected
if (pending.amount !== amount || currency !== 'NGN') {
await auditLog(null, 'payment_amount_mismatch', { tx_ref, amount });
return res.status(200).json({ received: true });
}

await subscriptionService.activate(pending.sessionId, pending.plan);
await pending.destroy();
await auditLog(pending.sessionId, 'payment_webhook_confirmed', { tx_ref });
}

// Always return 200 to Flutterwave — even on ignored events
res.status(200).json({ received: true });
});
```

-----

## Frontend: Trigger Checkout

```tsx
// /frontend/src/features/subscription/UpgradeModal.tsx

async function handleUpgrade(plan: 'premium_monthly' | 'premium_yearly' | 'family_yearly') {
setLoading(true);
try {
const res = await api.post('/payments/initialize', { plan });
// Redirect to Flutterwave hosted page
window.location.href = res.data.paymentLink;
} catch (err) {
setError('Could not start payment. Please try again.');
} finally {
setLoading(false);
}
}
```

-----

## Subscription State (DB)

```ts
// Add to sessions table or create subscriptions table
interface Subscription {
sessionId: string;
plan: 'premium_monthly' | 'premium_yearly' | 'family_yearly';
status: 'active' | 'expired' | 'cancelled';
startsAt: Date;
expiresAt: Date;
txRef: string;
}
```

-----

## Security Checklist

- [ ] Never trust callback query params — always re-verify with Flutterwave API
- [ ] Webhook: verify `verif-hash` header against `FLUTTERWAVE_WEBHOOK_SECRET`
- [ ] Cross-check payment amount against DB record before activating subscription
- [ ] Store `FLUTTERWAVE_SECRET_KEY` in environment only — never in source code
- [ ] Use `express.raw()` on webhook route to preserve raw body for signature verification
- [ ] Webhook endpoint returns `200` on all events — even those you ignore (prevents retries)
- [ ] Log all payment events to `audit_logs`
- [ ] Use idempotent `tx_ref` — prevent double-activation on duplicate webhook delivery

-----

## Notes

- Flutterwave hosted payment page handles card/bank/USSD — no PCI scope on SafeCommute servers
- Offer annual plan at checkout as default (better value, lower transaction fees)
- If Flutterwave is down, queue payment intent and retry — do not block user from free tier