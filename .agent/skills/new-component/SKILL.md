# Skill: new-component

## Purpose

A fast-reference guide for creating a single new React component in SafeCommute. Use this for quick, focused component work. For full feature screens with multiple components, use `component-builder`.

-----

## When to Use

Trigger this skill when asked to:

- “Create a ___ component”
- “Build a ___ card / button / input / modal”
- “I need a small component for ___”
- “Add a ___ to the UI”

-----

## File Location

```
Shared/reusable: /frontend/src/components/{ComponentName}.tsx
Feature-specific: /frontend/src/features/{feature}/{ComponentName}.tsx
Screen: /frontend/src/features/{feature}/{ScreenName}Screen.tsx
```

Feature folders: `auth`, `trip`, `contacts`, `dashboard`, `history`, `privacy`, `subscription`

-----

## Minimal Component Template

```tsx
// /frontend/src/components/{ComponentName}.tsx

import { ReactNode } from 'react';
import DOMPurify from 'dompurify';

interface {ComponentName}Props {
// Define all props explicitly — no implicit any
}

export function {ComponentName}({ }: {ComponentName}Props) {
return (
<div className="">
{/* content */}
</div>
);
}
```

-----

## Quick Token Reference

```
Brand teal: bg-[#0891B2] text-[#0891B2] border-[#0891B2]
Teal hover: hover:bg-[#0E7490]
Teal light: bg-[#BAE6FD] bg-[#E0F2FE]
Emergency: bg-[#DC2626] text-[#DC2626] ← ONLY for emergency actions
Success: text-[#16A34A] bg-[#DCFCE7]
Warning: text-[#D97706] bg-[#FEF3C7]
Text primary: text-gray-900
Text secondary: text-gray-700
Placeholder: text-gray-500
Border: border-gray-300
Surface: bg-gray-100
Card: bg-white rounded-2xl shadow-sm border border-gray-100 p-4
Screen padding: px-6
Font: Inter (loaded globally)
Icons: Lucide React (import individually)
```

-----

## Common Component Snippets

### Button — Primary CTA

```tsx
<button
onClick={onClick}
disabled={disabled}
className="w-full bg-[#0891B2] hover:bg-[#0E7490] active:scale-95
text-white font-semibold text-base rounded-2xl py-4 px-6
min-h-[56px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>
{label}
</button>
```

### Button — Secondary (outlined)

```tsx
<button className="w-full border border-[#0891B2] text-[#0891B2] bg-white
font-semibold text-base rounded-2xl py-4 px-6 min-h-[56px]">
{label}
</button>
```

### Button — Ghost (for skip / cancel / back)

```tsx
<button className="text-gray-700 text-sm underline">
{label}
</button>
```

### Input Field

```tsx
<div className="flex flex-col gap-1">
<label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
<input
id={id}
type={type}
placeholder={placeholder}
className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-3
text-base text-gray-900 placeholder:text-gray-500
focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] outline-none"
/>
{error && <p className="text-sm text-red-500">{error}</p>}
</div>
```

### Card

```tsx
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
{children}
</div>
```

### Badge / Status Tag

```tsx
<span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
status === 'active' ? 'bg-[#BAE6FD] text-[#0E7490]' :
status === 'emergency' ? 'bg-[#FEE2E2] text-[#DC2626]' :
'bg-[#DCFCE7] text-[#16A34A]'
}`}>
{label}
</span>
```

### Section Header

```tsx
<h2 className="text-lg font-semibold text-gray-900">{title}</h2>
```

### Divider

```tsx
<hr className="border-gray-200" />
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
<img src="/illustrations/empty-trips.svg" alt="" className="w-40 mb-4" />
<p className="text-base font-semibold text-gray-900 mb-1">{title}</p>
<p className="text-sm text-gray-500">{subtitle}</p>
</div>
```

### Masked Data (phone / plate)

```tsx
<span className="font-mono text-sm text-gray-700">{maskedValue}</span>
// phone: +234***5678
// plate: **-FK
```

-----

## Hooks to Know

```ts
// Location permission + tracking (already built — import don't rebuild)
const { location, accuracy, error } = useLocation();

// WebSocket connection for active trip
const { sendLocation, onLocationUpdate } = useTripSocket(tripId);

// Session / auth state
const { session, isAuthenticated } = useAuth();

// Trip context (active trip data)
const { activeTip, startTrip, endTrip } = useTripContext();
```

-----

## Security Rules for Components

```tsx
// ALWAYS sanitize user-generated content before rendering
const safe = DOMPurify.sanitize(userInput);
<p>{safe}</p>

// NEVER render full plate or phone number — always use masked version
// NEVER store sensitive values in component state with obvious names

// Emergency button: always requires confirmation modal
// Pattern: button click → open modal → modal confirm → trigger action

// Status changes announced for screen readers
<div aria-live="polite">{statusMessage}</div>
<div aria-live="assertive">{emergencyMessage}</div>
```

-----

## Accessibility (minimum bar)

```tsx
// Touch targets
className="min-h-[44px] min-w-[44px]"

// Focus rings (on every interactive element)
className="focus:ring-2 focus:ring-[#0891B2] focus:outline-none"

// Labels (never placeholder-only)
<label htmlFor="phone">Phone number</label>
<input id="phone" ... />

// Icons with text (never icon-only for actions)
<>
<MapPin className="w-5 h-5" aria-hidden="true" />
<span>Destination</span>
</>
```

-----

## Before You Ship the Component

- [ ] Props interface typed explicitly (no `any`)
- [ ] User content sanitized with DOMPurify
- [ ] Sensitive data displayed masked only
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] Focus ring on all focusable elements
- [ ] Labels associated with inputs (htmlFor/id)
- [ ] Red used only for emergency actions
- [ ] No inline styles — Tailwind only
- [ ] No hardcoded hex colors outside the token list above
- [ ] Icons from Lucide React only