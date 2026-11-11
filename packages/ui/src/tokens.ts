/**
 * Design tokens, transcribed from DESIGN.md front-matter.
 * DESIGN.md is the law: if the two disagree, DESIGN.md wins and this file is
 * corrected.
 *
 * These are the single source of truth for TypeScript consumers. The CSS
 * custom properties in ./styles/theme.css carry the same values and must be
 * kept in step — src/__tests__/tokens.test.ts fails if they drift.
 *
 * The system is called "glass box": Mirrorline's differentiator is that you
 * can see the machine working, so the surfaces read like precision
 * instrumentation you are allowed to inspect. Two consequences run through
 * every token below.
 *
 *  1. Two voices. Geist is what the studio says to you. Geist Mono is the
 *     machine: log lines, costs, timings, similarity percentages, spend caps,
 *     counts, rates. The split is semantic, never decorative.
 *  2. The viewer surface. 9:16 video always sits on `viewer`, a true dark
 *     lightbox, in BOTH themes. It is not `ink` (the emphasis panel).
 */

/**
 * Light theme.
 *
 * Neutrals. The old page was a warm off-white (#FAFAF7, a paper tone). A tool
 * you inspect should not read as paper, so the whole neutral ramp moved onto a
 * single cool axis — roughly hue 220, chroma kept near zero so it never looks
 * tinted, only cold. Three things fall out of that choice:
 *
 *  - `background` #F6F7F9 sits 1.07:1 against white `surface`, where #FAFAF7
 *    sat 1.02:1. Cards now have a visible edge without needing a shadow,
 *    which is what "flat by default" requires to actually work.
 *  - `text` #0E1116 replaces #14171C. Cooler and deeper, and it is close to
 *    the dark theme's page, so the two themes are one system seen from two
 *    sides rather than two palettes.
 *  - `border` and `border-strong` lose their beige cast (#E6E4DD / #D6D3CA →
 *    #E2E5EA / #CBD0D8). A 1px cool grey line reads as a rule; a 1px beige
 *    line reads as a crease.
 *
 * Brand. `primary` #C8401C and `accent` #FF5A36 are untouched. They are the
 * identity, they are not AI-purple, and the coral is what the cool neutrals
 * exist to make louder.
 *
 * Status hues sharpen by a few points of chroma against the colder ground so
 * they stay legible as signal rather than decoration; every soft/on-soft pair
 * is proved at >= 4.5:1 by src/__tests__/contrast.test.ts.
 */
export const LIGHT_COLORS = {
  primary: '#C8401C',
  'primary-hover': '#B33716',
  'on-primary': '#FFFFFF',
  accent: '#FF5A36',
  'accent-soft': '#FFE7E0',
  'on-accent-soft': '#8F2C11',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  'surface-subtle': '#EFF1F4',
  border: '#E2E5EA',
  'border-strong': '#CBD0D8',
  text: '#0E1116',
  'text-muted': '#596273',
  ink: '#11151B',
  'on-ink': '#EEF1F6',
  /**
   * The lightbox. Every 9:16 frame sits on this, in both themes, so a cut
   * looks the same to the person approving it whichever theme they chose.
   * #07090D is deeper and cooler than `ink` (#11151B light, #1C2430 dark) on
   * purpose: `ink` is an emphasis panel that still belongs to the page, while
   * `viewer` is meant to disappear and leave only the video.
   */
  viewer: '#07090D',
  'on-viewer': '#E9ECF2',
  success: '#128A5E',
  'success-soft': '#DEF2E8',
  'on-success-soft': '#0E5940',
  warning: '#B7790A',
  'warning-soft': '#FAEFD6',
  'on-warning-soft': '#6B4606',
  danger: '#C9343C',
  'danger-soft': '#FBE2E3',
  'on-danger-soft': '#8C2126',
  info: '#2563D9',
  'info-soft': '#E2EAFA',
  'on-info-soft': '#1C4AA3',
  'neutral-soft': '#E9ECF1',
  'on-neutral-soft': '#3A4250',
} as const

/**
 * Dark theme.
 *
 * The same cool axis, read from the other end: page #0F141B, cards #19202A,
 * inset wells #222A36. Each step is a real step, so an agent log well is
 * visibly inside its card instead of merging with it.
 *
 * Two deliberate asymmetries:
 *
 *  - `ink` goes UP, not down (#11151B light → #1C2430 dark). In light mode the
 *    emphasis panel is the darkest thing on the page. In dark mode there is no
 *    room below the page, so emphasis has to step above the card instead.
 *  - `viewer` does not move at all. A lightbox that changed with the theme
 *    would change how the client's footage looks, which is the one thing the
 *    studio must not do.
 *
 * `primary` and its hover also stay put. The instinct in dark mode is to
 * lighten the hover, but #D9491F drops white to 4.27:1 and fails AA; #B33716
 * holds 6.04:1, so the primary darkens on hover in both themes.
 */
export const DARK_COLORS = {
  primary: '#C8401C',
  'primary-hover': '#B33716',
  'on-primary': '#FFFFFF',
  accent: '#FF7A5C',
  'accent-soft': '#3A1E17',
  'on-accent-soft': '#FFC2B1',
  background: '#0F141B',
  surface: '#19202A',
  'surface-subtle': '#222A36',
  border: '#2D3542',
  'border-strong': '#404A59',
  text: '#EEF1F6',
  'text-muted': '#9BA4B2',
  ink: '#1C2430',
  'on-ink': '#EEF1F6',
  viewer: '#07090D',
  'on-viewer': '#E9ECF2',
  success: '#35C68C',
  'success-soft': '#0C2620',
  'on-success-soft': '#79E2B8',
  warning: '#E5AE38',
  'warning-soft': '#2A2210',
  'on-warning-soft': '#F2CC79',
  danger: '#F0686B',
  'danger-soft': '#2D1618',
  'on-danger-soft': '#FFA7AA',
  info: '#6B9BF2',
  'info-soft': '#121E31',
  'on-info-soft': '#A9C5FA',
  'neutral-soft': '#262E3A',
  'on-neutral-soft': '#C5CBD5',
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

/**
 * Shape. The chrome scale tightened by ~2px (sm 6→4, md 10→8, lg 12→10,
 * xl 16→14). Softer corners read as consumer-friendly; an instrument reads as
 * machined. Nothing goes below 4px, because a 2px corner on a 1px border
 * renders as a notch rather than a radius.
 *
 * `thumb` is the deliberate exception and runs the other way — see its note.
 */
export const RADIUS = {
  sm: '4px',
  /**
   * DESIGN.md "Shapes": video thumbnails, 20px. The one place that reads as
   * consumer software on purpose — a 9:16 frame is a phone screen, and at the
   * old 6px it read as a table cell. Vizard ships 24px on the same shape
   * (docs/design/COMPETITOR_REFERENCES.md); 20px keeps the frame from fighting
   * the 10px card it sits inside. Out of numeric order in this object because
   * it is a role, not a step on the scale.
   */
  thumb: '20px',
  md: '8px',
  lg: '10px',
  xl: '14px',
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

/** The two font stacks. `sans` is the studio's voice, `mono` is the machine's. */
export const FONTS = {
  sans: 'Geist',
  mono: 'Geist Mono',
} as const

/**
 * Type scale, retuned for Geist.
 *
 * Geist sets a little tighter and a little wider-apertured than Inter, so the
 * old scale needed three corrections: display sizes take real negative
 * tracking (-0.025em at 46px, where Inter Tight wanted -0.01em), mid sizes
 * take a token amount, and small sizes go back to zero or slightly positive
 * because Geist is already generously spaced down there.
 *
 * `metric` and `mono` are Geist Mono: a number the agents produced is the
 * machine talking, and tabular figures make columns of costs and timings line
 * up. `overlay-caption` stays Geist Sans — a burned-in caption is the client
 * speaking to their audience, not the machine reporting.
 */
export const TYPOGRAPHY = {
  display: { family: 'Geist', size: '46px', weight: 700, leading: '1.05', tracking: '-0.025em' },
  headline: { family: 'Geist', size: '32px', weight: 700, leading: '1.12', tracking: '-0.02em' },
  title: { family: 'Geist', size: '20px', weight: 600, leading: '1.28', tracking: '-0.012em' },
  subtitle: { family: 'Geist', size: '17px', weight: 600, leading: '1.35', tracking: '-0.008em' },
  body: { family: 'Geist', size: '15px', weight: 400, leading: '1.6', tracking: '-0.002em' },
  'body-strong': {
    family: 'Geist',
    size: '15px',
    weight: 600,
    leading: '1.6',
    tracking: '-0.002em',
  },
  label: { family: 'Geist', size: '14px', weight: 600, leading: '1.4', tracking: '-0.004em' },
  meta: { family: 'Geist', size: '13px', weight: 400, leading: '1.45', tracking: '0em' },
  caption: { family: 'Geist', size: '12px', weight: 600, leading: '1.3', tracking: '0.004em' },
  /** Costs, timings, counts. Geist Mono, tabular. */
  metric: { family: 'Geist Mono', size: '30px', weight: 600, leading: '1.05', tracking: '-0.02em' },
  /** Agent log lines, spend caps, similarity percentages. The machine voice. */
  mono: { family: 'Geist Mono', size: '13px', weight: 500, leading: '1.5', tracking: '0em' },
  'overlay-caption': {
    family: 'Geist',
    size: '17px',
    weight: 700,
    leading: '1.22',
    tracking: '-0.01em',
  },
} as const

/**
 * Motion.
 *
 * There was almost none before. These follow Emil Kowalski's rules, and the
 * rules are the point:
 *
 *  - The CSS defaults (`ease`, `ease-out`) are too weak to read as intent, so
 *    every curve here is explicit.
 *  - `out` is the default for anything entering. `in-out` is for something
 *    already on screen moving somewhere else. `drawer` is for drawers and
 *    sheets, which need a long slow tail to feel attached to the finger.
 *  - Never `ease-in` on UI. It starts slow, which reads as lag.
 *  - Nothing over 300ms. An interface that takes longer than that to answer
 *    stops feeling like an instrument.
 *  - Exits run at ~65% of their enter duration: you have already decided to
 *    leave, so waiting for the animation is friction.
 */
export const EASING = {
  /** Entering. The default for UI. */
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  /** Movement between two on-screen positions. */
  'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
  /** Drawers and sheets. */
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
} as const

export const DURATION = {
  press: '140ms',
  tooltip: '160ms',
  dropdown: '200ms',
  modal: '280ms',
  /** Exits are ~65% of the enter they mirror. */
  'press-exit': '90ms',
  'tooltip-exit': '110ms',
  'dropdown-exit': '130ms',
  'modal-exit': '180ms',
} as const

/** The delay step for a staggered list. `animation-delay: calc(var(--index) * 60ms)`. */
export const STAGGER_STEP = '60ms'

export type ColorToken = keyof typeof LIGHT_COLORS
export type RadiusToken = keyof typeof RADIUS
export type SpacingToken = keyof typeof SPACING
export type TypographyToken = keyof typeof TYPOGRAPHY
export type FontToken = keyof typeof FONTS
export type EasingToken = keyof typeof EASING
export type DurationToken = keyof typeof DURATION
