/**
 * The handful of icons the studio shell needs.
 *
 * These are the lucide glyphs (sun, moon, monitor, menu, x, chevron-down)
 * redrawn locally: `lucide-react` is a dependency of packages/ui, not of this
 * app, so it does not resolve from apps/web under pnpm's isolated node_modules.
 * Redrawing six paths is cheaper than reaching across the workspace boundary.
 *
 * DESIGN.md "Shapes": "Icons: simple 1.6–2px stroke icons. No emoji, no 3D, no
 * robots or sparkles."
 */

import type { SVGProps } from 'react'

const STROKE_WIDTH = 1.75
const DEFAULT_SIZE = 18

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'> & {
  /** Width and height in px. The viewBox is square. */
  size?: number
}

function Icon({ size = DEFAULT_SIZE, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Icon>
  )
}

export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}
