/**
 * @mirrorline/ui — the shared component library.
 *
 * One entry point: `import { Button, StatusChip } from '@mirrorline/ui'`.
 * The tokens stay available on their own at '@mirrorline/ui/tokens', for
 * anything that must not pull React in.
 */

export { cn } from './cn'

export {
  LIGHT_COLORS,
  DARK_COLORS,
  // The public site's palette. Separate from the themes above on purpose —
  // the site is art-directed per band, not light/dark switchable (D25).
  SITE_COLORS,
  GOLD_GRADIENT,
  DEMO_COLORS,
  THUMBNAIL_COLORS,
  RADIUS,
  SPACING,
  FONTS,
  TYPOGRAPHY,
  EASING,
  DURATION,
  STAGGER_STEP,
} from './tokens'
export type {
  SiteColorToken,
  ColorToken,
  RadiusToken,
  SpacingToken,
  FontToken,
  TypographyToken,
  EasingToken,
  DurationToken,
} from './tokens'

export { ThemeProvider, useTheme, THEME_SCRIPT } from './theme-provider'
export type { ThemePreference, ResolvedTheme } from './theme-provider'

export * from './components/primitives'
export * from './components/form'
export * from './components/status'
export * from './components/data'
export * from './components/video'
// Named separately from './components/video' on purpose: this one is a client
// component, so a page that only renders static frames never pulls it in.
export { ReelMedia } from './components/reel-media'
export type { ReelMediaProps } from './components/reel-media'
export * from './components/overlay'
export * from './components/logo'
