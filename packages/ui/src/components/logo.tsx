/**
 * The Mirrorline loop: an open circle with an arrow.
 *
 * DESIGN.md "Shapes": "Logo: an open circle with an arrow (a loop) in accent
 * coral. The loop motif repeats in empty states and the learning-loop card."
 * and "Icons: simple 1.6–2px stroke icons. No emoji, no 3D, no robots or
 * sparkles."
 *
 * The mark draws in `currentColor` so a caller can recolour it (on an ink
 * panel, inside a button) without a second asset. The default colour class is
 * `text-accent`, the one place DESIGN.md names the bright coral.
 */

import * as React from 'react'

import { cn } from '../cn'

export interface LogoMarkProps extends React.SVGAttributes<SVGSVGElement> {
  /** Width and height in px. The viewBox is square. */
  size?: number
  /** Stroke width. DESIGN.md allows 1.6–2px. */
  strokeWidth?: number
}

const DEFAULT_SIZE = 28
const DEFAULT_STROKE = 2

/** The loop mark on its own. Decorative — always pair it with a word. */
export function LogoMark({
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  className,
  ...props
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('text-accent', className)}
      {...props}
    >
      {/* The open circle: a near-full arc, left open at the top right. */}
      <path
        d="M26 16a10 10 0 1 1-4.2-8.1"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* The arrow head that turns the arc back into a loop. */}
      <path
        d="M22.5 3.5l-0.6 4.6 4.6 0.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface LogoWordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Mark size in px. The word scales with it. */
  size?: number
  /** Hide the word visually and keep the mark, for a collapsed sidebar. */
  markOnly?: boolean
  /**
   * Recolours the loop mark. `className` sets the word's colour; the mark
   * defaults to the brand coral and needs its own override.
   *
   * The public site passes `text-gold-bright` (D25) — the site and the studio
   * are two registers, and the mark follows whichever it is standing in.
   */
  markClassName?: string
}

const WORD_TO_MARK_RATIO = 0.68

/**
 * Mark plus the word "Mirrorline". The word carries the accessible name, so
 * the mark stays aria-hidden and a screen reader hears the brand once.
 */
export function LogoWordmark({
  size = DEFAULT_SIZE,
  markOnly = false,
  className,
  markClassName,
  ...props
}: LogoWordmarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-text', className)} {...props}>
      <LogoMark size={size} className={markClassName} />
      <span
        className={cn('font-heading font-bold', markOnly && 'sr-only')}
        style={{ fontSize: Math.round(size * WORD_TO_MARK_RATIO) }}
      >
        Mirrorline
      </span>
    </span>
  )
}
