/// <reference types="vite/client" />

/**
 * SafeCommute Design Tokens — Single Source of Truth
 *
 * Every color, radius, font size, and spacing value the app uses.
 * No hardcoded hex codes or arbitrary pixel values in components.
 */

export const colors = {
  /** Primary / CTA — buttons, active states, links, focus rings */
  primary: '#0891B2' as const,
  /** Primary hover state */
  primaryHover: '#0E7490' as const,
  /** Secondary — headings, primary body text, dark UI elements */
  secondary: '#0F172A' as const,
  /** Success — checkmarks, "Completed" states, positive confirmations */
  success: '#059669' as const,
  /** Error / destructive — Delete, Logout, validation errors, enabled emergency button */
  error: '#DC2626' as const,
  /** Accent — used sparingly, e.g. sparkle icon, highlights */
  accent: '#F9C60A' as const,
  /** Warning — rate-limit approaching, caution states */
  warning: '#F86911' as const,
  /** Page background */
  pageBg: '#FAFAFA' as const,
  /** Card background */
  cardBg: '#FFFFFF' as const,
  /** Card border / divider color */
  border: '#F3EFEF' as const,
  /** Input border color */
  inputBorder: '#D1D5DB' as const,
  /** Muted / secondary text */
  mutedText: '#6B7280' as const,
} as const

export const radii = {
  card: '1rem' as const,       // 16px — rounded-2xl
  input: '0.5rem' as const,    // 8px  — rounded-lg
  pill: '9999px' as const,
} as const

export const fontSizes = {
  pageTitle: '1.5rem' as const,     // 24px — all page titles
  sectionTitle: '1.125rem' as const, // 18px — section headings
  body: '1rem' as const,            // 16px — body text
  caption: '0.875rem' as const,     // 14px — secondary text
  small: '0.75rem' as const,       // 12px — timestamps, labels
} as const

export const spacing = {
  pageX: '1.5rem' as const,         // 24px — px-6
  sectionTop: '3.5rem' as const,    // 56px — pt-14
  cardGap: '0.75rem' as const,      // 12px — space-y-3
  touchTarget: '2.75rem' as const,  // 44px — min-h-[44px]
} as const

export const shadows = {
  card: 'none' as const,
} as const
