/**
 * Design tokens, transcribed from DESIGN.md front-matter and
 * docs/design/design-tokens.json. DESIGN.md is the law: if the two disagree,
 * DESIGN.md wins and this file is corrected.
 *
 * These are the single source of truth for TypeScript consumers. The CSS
 * custom properties in ./styles/theme.css carry the same values and must be
 * kept in step — src/__tests__/tokens.test.ts fails if they drift.
 */

export const LIGHT_COLORS = {
  primary: '#C8401C',
  'primary-hover': '#B33716',
  'on-primary': '#FFFFFF',
  accent: '#FF5A36',
  'accent-soft': '#FFE8E1',
  'on-accent-soft': '#8F2C11',
  background: '#FAFAF7',
  surface: '#FFFFFF',
  'surface-subtle': '#F4F4F1',
  border: '#E6E4DD',
  'border-strong': '#D6D3CA',
  text: '#14171C',
  'text-muted': '#5F6672',
  ink: '#14171C',
  'on-ink': '#F2F2EE',
  success: '#1F9D6B',
  'success-soft': '#E3F4EC',
  'on-success-soft': '#145C40',
  warning: '#C98A12',
  'warning-soft': '#FBF0D9',
  'on-warning-soft': '#6E4A07',
  danger: '#D23F3F',
  'danger-soft': '#FBE3E3',
  'on-danger-soft': '#8E2626',
  info: '#2F6FDE',
  'info-soft': '#E3ECFB',
  'on-info-soft': '#1F4FA8',
  'neutral-soft': '#EFEDE7',
  'on-neutral-soft': '#3E444D',
} as const

/**
 * Dark theme. DESIGN.md fixes background, surface, border, text, text-muted
 * and accent; 02_BRAND_AND_VOICE.md fixes the status hues. The soft/on-soft
 * pairs are derived here so every pill keeps >= 4.5:1 text contrast in dark
 * mode too — src/__tests__/contrast.test.ts proves it.
 */
export const DARK_COLORS = {
  primary: '#C8401C',
  // Darkens on hover in BOTH themes. The instinct in dark mode is to lighten,
  // but #D9491F drops white to 4.27:1 and fails AA. #B33716 holds 6.07:1.
  'primary-hover': '#B33716',
  'on-primary': '#FFFFFF',
  accent: '#FF7A5C',
  'accent-soft': '#3A2019',
  'on-accent-soft': '#FFC0AE',
  background: '#0E1116',
  surface: '#161A21',
  'surface-subtle': '#1E242E',
  border: '#2A2F38',
  'border-strong': '#3B4250',
  text: '#F2F2EE',
  'text-muted': '#A3A9B4',
  ink: '#06080B',
  'on-ink': '#F2F2EE',
  success: '#3CC98F',
  'success-soft': '#10281F',
  'on-success-soft': '#7FE3BA',
  warning: '#E8B23A',
  'warning-soft': '#2C2411',
  'on-warning-soft': '#F3CE7B',
  danger: '#F06A6A',
  'danger-soft': '#2E1717',
  'on-danger-soft': '#FFA8A8',
  info: '#6B9BF2',
  'info-soft': '#141F33',
  'on-info-soft': '#A9C5FA',
  'neutral-soft': '#22272F',
  'on-neutral-soft': '#C7CCD5',
} as const

/** Demo-brand colours. These live inside video thumbnails only. */
export const DEMO_COLORS = {
  teal: '#12545A',
  'teal-deep': '#1E3A40',
  'teal-slate': '#2F3E46',
  'warm-earth': '#6B4F3A',
  sand: '#F3E9DC',
} as const

/** Thumbnails rotate through these four, in this order. DESIGN.md "Colors". */
export const THUMBNAIL_COLORS = [
  DEMO_COLORS.teal,
  DEMO_COLORS['teal-deep'],
  DEMO_COLORS['teal-slate'],
  DEMO_COLORS['warm-earth'],
] as const

export const RADIUS = {
  sm: '6px',
  /** DESIGN.md "Shapes": "Video thumbnails 8px". Between sm and md. */
  thumb: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '40px',
  sidebar: '240px',
  touch: '44px',
} as const

export const TYPOGRAPHY = {
  display: { family: 'Inter Tight', size: '44px', weight: 700, leading: '1.1', tracking: '-0.01em' },
  headline: { family: 'Inter Tight', size: '32px', weight: 700, leading: '1.15' },
  title: { family: 'Inter Tight', size: '20px', weight: 600, leading: '1.3' },
  subtitle: { family: 'Inter Tight', size: '18px', weight: 600, leading: '1.3' },
  body: { family: 'Inter', size: '15px', weight: 400, leading: '1.55' },
  'body-strong': { family: 'Inter', size: '15px', weight: 600, leading: '1.55' },
  label: { family: 'Inter', size: '14px', weight: 600, leading: '1.4' },
  meta: { family: 'Inter', size: '13px', weight: 400, leading: '1.45' },
  caption: { family: 'Inter', size: '12px', weight: 600, leading: '1.35' },
  metric: { family: 'Inter', size: '30px', weight: 600, leading: '1.1' },
  'overlay-caption': { family: 'Inter Tight', size: '17px', weight: 700, leading: '1.25' },
} as const

export type ColorToken = keyof typeof LIGHT_COLORS
export type RadiusToken = keyof typeof RADIUS
export type SpacingToken = keyof typeof SPACING
export type TypographyToken = keyof typeof TYPOGRAPHY
