# Skill: component-builder

## Purpose

Build a complete, accessible React component for SafeCommute following the Design System, Code Style, and Security rules. Every component is mobile-first, Tailwind-only, and safety-context-aware.

-----

## When to Use

Trigger this skill when asked to:

- “Build the ___ component”
- “Create a React component for ___”
- “I need a ___ UI component”
- “Design the ___ screen/card/modal”

-----

## Component Anatomy (always generate in this order)

### 1. Types (`Props interface at top of file`)

```tsx
interface TripCardProps {
trip: Trip;
onEndTrip: (tripId: string) => void;
onEmergency: (tripId: string) => void;
}
```

### 2. Component File (`/frontend/src/components/{ComponentName}.tsx`)

```tsx
import DOMPurify from 'dompurify';
import { AlertTriangle, MapPin, Clock } from 'lucide-react';

export function TripCard({ trip, onEndTrip, onEmergency }: TripCardProps) {
const handleEndTrip = () => onEndTrip(trip.id);
const handleEmergency = () => onEmergency(trip.id);

// Sanitize any user-generated content before rendering
const safeDestination = DOMPurify.sanitize(trip.destinationAddress);

return (
<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
{/* component content */}
</div>
);
}
```

### 3. Companion Test (`/frontend/src/components/{ComponentName}.test.tsx`)

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TripCard } from './TripCard';

describe('TripCard', () => {
it('renders destination address', () => { ... });
it('calls onEndTrip with tripId when End Trip clicked', () => { ... });
it('renders masked plate, not full plate', () => { ... });
it('meets minimum touch target size on emergency button', () => { ... });
});
```

-----

## Design Token Reference (use exact Tailwind classes)

```
Brand teal: bg-[#0891B2] text-[#0891B2] border-[#0891B2]
Teal hover: hover:bg-[#0E7490]
Teal light bg: bg-[#E0F2FE]
Emergency red: bg-[#DC2626] text-[#DC2626] — ONLY for emergency actions
Success green: text-[#16A34A] bg-[#DCFCE7]
Warning amber: text-[#D97706] bg-[#FEF3C7]
Primary text: text-gray-900
Secondary text: text-gray-700
Placeholder: text-gray-500
Border: border-gray-300
Surface: bg-gray-100
Card: bg-white rounded-2xl shadow-sm border border-gray-100
Screen padding: px-6
```

-----

## Component Patterns by Type

### Primary CTA Button

```tsx
<button
onClick={handleStartTrip}
className="w-full bg-[#0891B2] hover:bg-[#0E7490] active:scale-95
text-white font-semibold text-base rounded-2xl py-4 px-6
min-h-[56px] transition-all"
>
Start Trip
</button>
```

### Emergency Button (red — ONLY for emergency)

```tsx
<button
onClick={handleEmergency}
className="w-full bg-[#DC2626] text-white font-bold text-base
rounded-2xl py-3 px-6 min-h-[44px] transition-all active:scale-95"
aria-label="Send emergency alert"
>
<AlertTriangle className="inline w-5 h-5 mr-2" />
Send Emergency Alert
</button>
```

### Text Input

```tsx
<div className="flex flex-col gap-1">
<label htmlFor={id} className="text-sm font-medium text-gray-700">
{label}
</label>
<input
id={id}
type={type}
className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-3
text-base text-gray-900 placeholder:text-gray-500
focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] outline-none"
{...props}
/>
{error && <span className="text-sm text-red-500">{error}</span>}
</div>
```

### Safety Note Chip (multi-select pill)

```tsx
<button
onClick={() => onToggle(label)}
className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
selected
? 'bg-[#BAE6FD] text-[#0E7490] border border-[#0891B2]'
: 'bg-gray-100 text-gray-700 border border-transparent'
}`}
>
{label}
</button>
```

### Live Status Indicator

```tsx
<span className="flex items-center gap-2 text-sm text-gray-700">
<span className={`w-3 h-3 rounded-full ${
status === 'active' ? 'bg-[#0891B2] animate-pulse' :
status === 'emergency' ? 'bg-[#DC2626] animate-pulse' :
'bg-[#16A34A]'
}`} />
{status === 'active' ? 'Live' : status === 'emergency' ? 'EMERGENCY' : 'Ended'}
</span>
```

### Masked Data Display

```tsx
{/* Phone numbers and plates always masked in UI */}
<span className="font-mono text-sm text-gray-700">{maskedPhone}</span>
{/* e.g. +234***5678 */}
<span className="font-mono text-sm text-gray-700">{maskedPlate}</span>
{/* e.g. **-FK */}
```

### Confirmation Modal (for emergency / destructive actions)

```tsx
<div role="dialog" aria-modal="true" aria-labelledby="modal-title"
className="fixed inset-0 bg-black/50 flex items-end justify-center p-4">
<div className="bg-white rounded-2xl p-6 w-full max-w-sm">
<h2 id="modal-title" className="text-lg font-semibold text-gray-900 mb-2">
Send Emergency Alert?
</h2>
<p className="text-sm text-gray-700 mb-6">
{contactName} and authorities will be notified immediately.
</p>
<div className="flex gap-3">
<button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700">
Cancel
</button>
<button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-[#DC2626] text-white font-bold">
Send Alert
</button>
</div>
</div>
</div>
```

-----

## Accessibility Checklist

- [ ] Every interactive element: `min-h-[44px] min-w-[44px]`
- [ ] All inputs have explicit `<label>` with matching `htmlFor` / `id`
- [ ] Images have descriptive `alt` text
- [ ] Color is never the only status indicator (always add icon + text)
- [ ] Focus rings on all interactive elements: `focus:ring-2 focus:ring-[#0891B2]`
- [ ] `aria-live="polite"` on status updates (trip started, OTP sent)
- [ ] `aria-live="assertive"` on emergency state changes
- [ ] Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Logical tab order — no `tabIndex > 0`

-----

## Security Checklist

- [ ] All user-generated strings sanitized with `DOMPurify.sanitize()` before render
- [ ] Phone numbers and plates displayed masked (never full values)
- [ ] No sensitive data in `console.log` or component state names visible in DevTools
- [ ] Emergency button only appears on active trip screens
- [ ] Confirmation modal always required before emergency trigger

-----

## Notes

- Font: Inter (loaded via Google Fonts in `index.html`)
- Icons: Lucide React only — import individual icons, not the full bundle
- No inline styles — Tailwind only
- No hardcoded hex colors outside the token list above