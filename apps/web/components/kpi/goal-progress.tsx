/**
 * The goal progress bar from 15 §5: where this account is against the key
 * result it agreed to, for the period it agreed to.
 *
 * Composed from tokens — the `progress-bar` component in DESIGN.md is a 6px
 * accent fill on a full radius, which is exactly this.
 *
 * **It is a target, not a forecast.** The bar shows what has happened. The
 * pace line underneath says whether that is ahead of or behind schedule, in
 * words, and never extrapolates to a finishing figure: 15 §8 forbids showing
 * a projection as an actual, and a progress bar that quietly runs past the
 * measured value is exactly that.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

export interface GoalProgressProps {
  /** The outcome in the user's own words, from onboarding (15 §1). */
  readonly outcome: string
  readonly current: number
  readonly target: number
  /** "leads", "bookings", "new followers". Lower case, plural. */
  readonly unitLabel: string
  /** How far through the period we are, 0–1. Drives the pace note. */
  readonly periodElapsed: number
  /** "this quarter", "by 31 December". */
  readonly periodLabel: string
  readonly onInk?: boolean
  /**
   * Where this sits in the page's heading outline.
   *
   * Defaults to 3, which is right when the bar follows a card heading. The
   * Results Overview puts it directly under the page's h1, and an h3 there
   * invents a level nobody wrote — axe's `heading-order` rule caught it.
   */
  readonly headingLevel?: 2 | 3
  readonly className?: string
}

export function GoalProgress({
  outcome,
  current,
  target,
  unitLabel,
  periodElapsed,
  periodLabel,
  onInk,
  headingLevel = 3,
  className,
}: GoalProgressProps) {
  const safeTarget = target > 0 ? target : 1
  const fraction = Math.max(0, Math.min(1, current / safeTarget))
  const percent = Math.round(fraction * 100)
  const headingId = React.useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={headingId} className="m-0 font-heading text-subtitle text-text">
          {outcome}
        </Heading>
        <p className="machine m-0 text-mono text-text-muted">
          <span className="text-text">{current.toLocaleString('en-US')}</span> of{' '}
          {target.toLocaleString('en-US')} {unitLabel} · {periodLabel}
        </p>
      </div>

      {/* `role="img"` with a label rather than a progressbar role: this
          reports on a goal, it is not the state of a running operation, and a
          screen reader announcing "progressbar 43%" would suggest something
          is loading. */}
      <div
        role="img"
        aria-label={`${percent}% of the ${target.toLocaleString('en-US')} ${unitLabel} target, ${periodLabel}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"
      >
        <div
          className={cn('h-full rounded-full', onInk ? 'bg-gold-bright' : 'bg-accent')}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className={cn('m-0 text-caption', onInk ? 'text-on-ink-muted' : 'text-text-muted')}>
        {paceNote(fraction, periodElapsed)} Targets are proposals from your baseline, not promises.
      </p>
    </section>
  )
}

/**
 * Ahead, behind or on pace — in words, with no finishing figure attached.
 *
 * The threshold is five percentage points rather than zero, so a goal that is
 * fractionally off does not flip between "ahead" and "behind" week to week,
 * which would read as noise rather than as information.
 */
function paceNote(fraction: number, periodElapsed: number): string {
  const elapsed = Math.max(0, Math.min(1, periodElapsed))
  const difference = fraction - elapsed

  if (difference > 0.05) return 'Ahead of pace for this period.'
  if (difference < -0.05) return 'Behind pace for this period.'
  return 'On pace for this period.'
}
