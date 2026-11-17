/**
 * The four-step rail above the Niche Scan form (19 v2 ★/niche-scan item 2).
 *
 * **`/compare`'s decision helper argues against exactly this, and it is right
 * about its own page.** `decision-helper.tsx` says a stepper "would make the
 * page feel like a funnel" — its three questions are a tool somebody uses to
 * decide whether to buy anything at all, and dressing that as a sequence
 * would imply an outcome waiting at the end of it.
 *
 * This page is the opposite case. The Niche Scan *is* 14 §3's lead magnet and
 * this form *is* a funnel step; there is no pretending otherwise, and what a
 * rail usefully does here is say how much is left before anyone starts
 * typing. Showing four questions at once is what makes a short form look long.
 *
 * Rendered from the live step index rather than tracking its own: there is one
 * source of truth for which step is current, and it is the form's state.
 */

import { cn } from '@mirrorline/ui'
import { Check } from 'lucide-react'

import type { ScanStep } from './scan-steps'

export interface ScanStepperProps {
  readonly steps: readonly ScanStep[]
  /** Zero-based index of the step on screen. */
  readonly current: number
}

export function ScanStepper({ steps, current }: ScanStepperProps) {
  return (
    <ol
      aria-label="Steps in this request"
      className="m-0 flex list-none flex-wrap items-center gap-2 p-0"
    >
      {steps.map((step, index) => {
        const isDone = index < current
        const isCurrent = index === current

        return (
          <li
            key={step.key}
            // `aria-current="step"` is the whole accessibility contract of a
            // rail like this. The ring and the weight say which one is live
            // to somebody looking at it, and neither reaches a screen reader.
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-meta transition-colors',
              isCurrent && 'border-gold bg-gold-wash font-semibold text-ink-900',
              isDone && 'border-border-strong text-text-muted',
              !isCurrent && !isDone && 'border-border text-text-muted',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'machine grid size-5 shrink-0 place-items-center rounded-full text-caption',
                isCurrent ? 'bg-ink-900 text-on-primary' : 'bg-surface-subtle text-text-muted',
              )}
            >
              {isDone ? <Check className="size-3" strokeWidth={2.6} /> : index + 1}
            </span>
            {step.label}
            {/* The state again, in words, because the ring and the tick are
                both decoration. Only on the steps where it says something a
                reader cannot already get from `aria-current`. */}
            {isDone ? <span className="sr-only">, answered</span> : null}
          </li>
        )
      })}
    </ol>
  )
}
