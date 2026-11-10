/**
 * The small icon set the public pages need.
 *
 * `lucide-react` is a dependency of @mirrorline/ui, not of this app, so it is
 * unreachable from apps/web without changing a package manifest another agent
 * owns. These are drawn in the same lucide idiom DESIGN.md asks for — "simple
 * 1.6–2px stroke icons. No emoji, no 3D, no robots or sparkles" — on the same
 * 24px grid, with round caps and joins.
 *
 * Every icon is decorative: it sits beside a word that carries the meaning, so
 * all of them are aria-hidden.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number
  strokeWidth?: number
}

const DEFAULT_SIZE = 20
const DEFAULT_STROKE = 1.8

function Icon({
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  className,
  children,
  ...props
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

/** Close. */
export function IconX(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}

/** Open the navigation drawer. */
export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  )
}

/** Your own footage: a film strip. */
export function IconFilm(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 12h18M3 8h4M3 16h4M17 8h4M17 16h4" />
    </Icon>
  )
}

/** The format comes back around; the footage does not. */
export function IconRepeat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 3l3 3-3 3" />
      <path d="M20 6H8a4 4 0 0 0-4 4v1" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M4 18h12a4 4 0 0 0 4-4v-1" />
    </Icon>
  )
}

/** The AI-scene label. */
export function IconTag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.6 3H20a1 1 0 0 1 1 1v7.4a2 2 0 0 1-.6 1.4l-7.6 7.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8l7.6-7.6a2 2 0 0 1 1.4-.6Z" />
      <path d="M16.5 7.5h.01" />
    </Icon>
  )
}

/** Official APIs: a plug into the platform. */
export function IconPlug(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 3v6M15 3v6" />
      <path d="M6 9h12v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9Z" />
      <path d="M12 17v4" />
    </Icon>
  )
}

/** The compliance gate. */
export function IconShieldCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  )
}

export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Icon>
  )
}

export function IconScissors(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.1 7.5 20 18M20 6 8.1 16.5" />
    </Icon>
  )
}

export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  )
}

export function IconChart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  )
}

/** Used on the draft-document notice. */
export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  )
}
