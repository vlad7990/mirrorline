'use client'

/**
 * The three-step progress indicator in the onboarding header.
 *
 * An ordered list, because the steps have an order and a screen reader should
 * hear "1 of 3". The current step carries aria-current="step"; a finished step
 * swaps its number for a green tick and says "done" to a screen reader, so the
 * state never rides on colour alone (DESIGN.md: "Pair every colour-coded status
 * with a word").
 */

import { cn } from '@mirrorline/ui'

import { ONBOARDING_STEPS, useOnboardingStep } from './step-context'

function TickIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  )
}

export function StepIndicator() {
  const { step, goToStep } = useOnboardingStep()

  return (
    <nav aria-label="Setup steps">
      <ol className="flex list-none flex-wrap items-center gap-2 p-0">
        {ONBOARDING_STEPS.map((item) => {
          const isCurrent = item.number === step
          const isDone = item.number < step

          return (
            <li key={item.number}>
              <button
                type="button"
                onClick={() => goToStep(item.number)}
                // You can step back to what you have filled in, never forward
                // past it.
                disabled={item.number > step}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'inline-flex min-h-touch items-center gap-2 rounded-full border bg-surface px-3.5',
                  'font-body text-label transition-colors duration-150',
                  isCurrent
                    ? 'border-ink font-semibold text-text'
                    : 'border-border font-normal text-text-muted',
                  isDone && 'hover:border-border-strong hover:text-text',
                  'disabled:cursor-default',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-grid size-6 shrink-0 place-items-center rounded-full',
                    'font-body text-caption',
                    isCurrent && 'bg-primary text-on-primary',
                    // DESIGN.md: white text only on primary or ink. The bright
                    // success green takes its soft pair, like every other
                    // success surface in the system.
                    isDone && 'bg-success-soft text-on-success-soft',
                    !isCurrent && !isDone && 'bg-neutral-soft text-on-neutral-soft',
                  )}
                >
                  {isDone ? <TickIcon /> : item.number}
                </span>
                <span>
                  <span className="sr-only">{`Step ${item.number} of ${ONBOARDING_STEPS.length}: `}</span>
                  {item.label}
                  {isDone ? <span className="sr-only">, done</span> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
