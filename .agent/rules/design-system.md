---
trigger: always_on
---

# SafeCommute — Design System

## Design Philosophy

SafeCommute is a **safety-critical product** used in high-stress, low-attention moments (boarding a danfo, late at night). Every design decision optimizes for:

- **Speed** — one-tap actions wherever possible
- **Clarity** — no ambiguity in status or action
- **Trust** — visual language that feels secure and reliable
- **Accessibility** — works for all users, all lighting conditions

-----

## Color Palette

### Primary

```
Teal (brand): #0891B2 — CTAs, active states, links, live indicators
Teal Dark: #0E7490 — hover states, pressed states
Teal Light: #BAE6FD — backgrounds, highlights, chips (selected)
Teal XLight: #E0F2FE — tinted backgrounds, onboarding cards
```

### Semantic

```
Emergency Red: #DC2626 — Emergency Alert button, alert states only
Emergency Light: #FEE2E2 — Emergency alert banners, backgrounds
Success Green: #16A34A — Trip ended safely, OTP verified, arrival confirmed
Success Light: #DCFCE7 — Success banners
Warning Amber: #D97706 — Caution states, expiring share links
Warning Light: #FEF3C7 — Warning banners
```

### Neutrals

```
Gray 900: #111827 — Primary text
Gray 700: #374151 — Secondary text, labels
Gray 500: #6B7280 — Placeholder text, captions
Gray 300: #D1D5DB — Borders, dividers
Gray 100: #F3F4F6 — Input backgrounds, card fills
White: #FFFFFF — Page backgrounds, modals
```

### Usage Rules

- **Red is for emergencies only** — never use `#DC2626` for anything except the Emergency Alert button/state
- **Never use red for destructive UI actions** (delete, cancel) — use Gray 700 or a subtle border button
- **Teal is the single accent** — no secondary brand color competing with it
- **Status must be communicated through color + icon + text** — never color alone (accessibility)

-----

## Typography

### Font Family

```
Primary: Inter (Google Fonts)
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
```

### Type Scale (Tailwind classes)

```
Display: text-2xl font-bold (24px/700) — Screen titles e.g. "Your Safety, Our Priority"
Heading 1: text-xl font-semibold (20px/600) — Section headings
Heading 2: text-lg font-semibold (18px/600) — Card titles, modal headings
Body: text-base font-normal (16px/400) — Primary body copy
Body SM: text-sm font-normal (14px/400) — Labels, secondary info
Caption: text-xs font-normal (12px/400) — Timestamps, masked data
```

### Text Rules

- Minimum body text: `text-base` (16px) — never go below on primary content
- Line height: `leading-relaxed` for body, `leading-tight` for headings
- Masked data (phone numbers, plates): `font-mono text-sm` — `+234***5678`, `**-FK`
- Never use font weight below 400 in the product

-----

## Spacing System

Using Tailwind’s default 4px base unit.

```
4px → p-1 / m-1 — Tight chip padding
8px → p-2 / m-2 — Icon spacing
12px → p-3 / m-3 — Input inner padding
16px → p-4 / m-4 — Card padding (default)
20px → p-5 / m-5 — Section gaps
24px → p-6 / m-6 — Screen horizontal padding
32px → p-8 / m-8 — Large section separation
```

Screen edge padding: `px-6` (24px) on all screens.

-----

## Components

### Buttons

```
Primary CTA:
bg-[#0891B2] text-white rounded-2xl py-4 px-6 text-base font-semibold
hover:bg-[#0E7490] active:scale-95 transition-all
min-height: 56px — large tap target

Emergency Button:
bg-[#DC2626] text-white rounded-2xl py-4 px-6 text-base font-bold
ONLY used for Send Emergency Alert action
Requires confirmation modal before triggering

Secondary:
border border-[#0891B2] text-[#0891B2] bg-white rounded-2xl py-4 px-6

Ghost / Destructive:
text-gray-700 underline (for delete, skip, cancel actions)
Never red — red is reserved for emergency
```

**Minimum touch target: 44px × 44px** (WCAG AA). Use `min-h-[44px] min-w-[44px]`.

### Inputs

```
bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-base
focus:border-[#0891B2] focus:ring-2 focus:ring-[#BAE6FD] outline-none
error: border-red-400 (only for validation errors, not emergency)
placeholder: text-gray-500
```

### Cards

```
bg-white rounded-2xl shadow-sm border border-gray-100 p-4
```

### Chips (Safety Note Pills — multi-select)

```
default: bg-gray-100 text-gray-700 rounded-full px-4 py-2 text-sm
selected: bg-[#BAE6FD] text-[#0E7490] border border-[#0891B2]
```

### Live Status Indicator

```
Active trip: animated pulse dot — bg-[#0891B2] rounded-full w-3 h-3 animate-pulse
Emergency: bg-[#DC2626] animate-pulse
Ended: bg-[#16A34A] (no pulse)
```

### Bottom Navigation

```
4 tabs: Home, Start Trip (center, elevated), History, Profile
Active tab: text-[#0891B2] icon filled
Inactive: text-gray-400 icon outline
Center CTA tab: bg-[#0891B2] rounded-full p-4 — elevated with shadow
```

-----

## Iconography

- Icon library: **Lucide React** (consistent with Tailwind ecosystem)
- Icon size: 20px (`w-5 h-5`) default; 24px (`w-6 h-6`) for navigation; 16px (`w-4 h-4`) for inline
- Icons paired with text labels on all interactive elements (never icon-only for critical actions)
- Emergency icon: `AlertTriangle` from Lucide — always in `#DC2626`

-----

## Screen-Specific Patterns

### Onboarding (3 steps)

- Progress indicator: 3 dots, active = filled teal
- Skip/Back: ghost text link, top-left
- CTA: full-width primary button, bottom of screen

### Trip Flow (Steps 1–6)

- Step indicator: `1 of 6` caption, top-right
- Each step: single focus — one task per screen
- “Next” CTA disabled until step complete
- License plate: monospace display `font-mono text-2xl font-bold text-gray-900`

### Active Trip Screen

- Full-screen map (Google Maps) with overlay card at bottom
- Card shows: destination, masked plate, contact name, elapsed timer
- Two buttons: `End Trip` (primary teal) + `Send Emergency Alert` (red, smaller)
- Live pulse indicator top-right of card

### Trip History

- Chronological list, newest first
- Each row: route summary, date/time, duration, masked plate (`**-FK`)
- Full plate only visible when tapped (requires session auth)

### Dashboard — Empty State

- Illustration (diverse, Nigerian context — woman on phone boarding keke)
- Tagline: “Your safety, our priority”
- Single large “Start Trip” CTA

-----

## Accessibility (WCAG 2.1 AA)

- Color contrast: minimum **4.5:1** for normal text, **3:1** for large text
- Interactive elements: minimum 44×44px touch targets
- All images: descriptive `alt` text
- Form inputs: explicit `<label>` associations (no placeholder-only labels)
- Screen reader: semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>`)
- Keyboard navigation: logical tab order, visible focus rings (`focus:ring-2 focus:ring-[#0891B2]`)
- Status changes announced via `aria-live="polite"` (trip started, alert sent, OTP verified)
- Emergency alerts: `aria-live="assertive"`

-----

## Responsive Targets

- **Primary**: Mobile (375px–430px) — design mobile-first
- **Secondary**: Tablet (768px) — single column, wider padding
- PWA install prompt shown after 3 successful trips
- Safe area insets: `pb-safe` on iOS (bottom nav above home indicator)