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
  DEMO_COLORS,
  THUMBNAIL_COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from './tokens'
export type { ColorToken, RadiusToken, SpacingToken, TypographyToken } from './tokens'

export { ThemeProvider, useTheme, THEME_SCRIPT } from './theme-provider'
export type { ThemePreference, ResolvedTheme } from './theme-provider'

export * from './components/primitives'
export * from './components/form'
export * from './components/status'
export * from './components/data'
export * from './components/video'
export * from './components/overlay'
export * from './components/logo'
