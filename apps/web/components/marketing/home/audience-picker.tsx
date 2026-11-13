'use client'

/**
 * Business or Individual, then New or Existing. The only question the site
 * asks a visitor (16 §1).
 *
 * **It is not in the hero.** 16 §3 row 1 puts it there; D34 had already moved
 * every interactive control out of the hero and left it a single anchor, and
 * D39 keeps that. This opens the band directly below, beside the upload
 * control, so the first screenful after the hero is the two things a visitor
 * can actually do — and every section that reads the choice sits below it.
 *
 * **Two radio groups, not four buttons.** The choice is two independent
 * questions, and a radiogroup is what a screen reader needs to hear "2 of 2
 * selected" rather than four unrelated toggles. Arrow keys move within a
 * group because that is what the role promises.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { track } from '@/lib/analytics/events'
import {
  ACCOUNT_STAGE_VALUES,
  AUDIENCE_LABELS,
  AUDIENCE_VALUES,
  type AccountStage,
  type Audience,
  STAGE_LABELS,
} from '@/lib/audience/account-type'
import { useAccountChoice } from '@/lib/audience/account-type-context'

interface ChoiceGroupProps<Value extends string> {
  readonly legend: string
  readonly values: readonly Value[]
  readonly labels: Readonly<Record<Value, string>>
  readonly selected: Value
  readonly onSelect: (value: Value) => void
}

/** Which way an arrow key moves, or 0 if the key is not one we handle. */
function arrowDirection(key: string): number {
  if (key === 'ArrowRight' || key === 'ArrowDown') return 1
  if (key === 'ArrowLeft' || key === 'ArrowUp') return -1
  return 0
}

function ChoiceGroup<Value extends string>({
  legend,
  values,
  labels,
  selected,
  onSelect,
}: ChoiceGroupProps<Value>) {
  const groupId = React.useId()

  /**
   * Arrow keys move the selection, which is what `radiogroup` promises and
   * what a keyboard user will try. Without this the group is a row of tab
   * stops that merely looks like radios.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const direction = arrowDirection(event.key)
    if (direction === 0) return

    event.preventDefault()
    const index = values.indexOf(selected)
    const next = values[(index + direction + values.length) % values.length]
    if (next) onSelect(next)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span id={groupId} className="site-eyebrow">
        {legend}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-2 sm:flex-row"
      >
        {values.map((value) => {
          const isSelected = value === selected
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              // Only the selected option is in the tab order: a radiogroup is
              // one stop, and arrow keys move inside it.
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(value)}
              className={cn(
                'press min-h-11 flex-1 rounded-lg border px-4 py-3 text-left text-label font-medium transition-colors',
                isSelected
                  ? 'border-gold bg-gold-wash text-ink-900'
                  : 'border-ink-line bg-ink-800 text-on-ink-muted hover:border-ink-line-strong hover:text-on-ink-900',
              )}
            >
              {labels[value]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AudiencePicker() {
  const { choice, setAudience, setStage } = useAccountChoice()

  const onAudience = (audience: Audience) => {
    setAudience(audience)
    track('account_type_selected', { audience, stage: choice.stage })
  }

  const onStage = (stage: AccountStage) => {
    setStage(stage)
    track('account_type_selected', { audience: choice.audience, stage })
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-ink-line bg-ink-800/60 p-5 sm:p-6 md:flex-row md:gap-8">
      <ChoiceGroup
        legend="You are"
        values={AUDIENCE_VALUES}
        labels={AUDIENCE_LABELS}
        selected={choice.audience}
        onSelect={onAudience}
      />
      <ChoiceGroup
        legend="Your account"
        values={ACCOUNT_STAGE_VALUES}
        labels={STAGE_LABELS}
        selected={choice.stage}
        onSelect={onStage}
      />
    </div>
  )
}

/**
 * A live region naming what the choice changed.
 *
 * Sighted readers watch the examples below swap. Without this a screen-reader
 * user gets a selection state and no consequence, which is the accessibility
 * half of a personalisation feature and the half usually skipped.
 */
export function AudiencePickerStatus() {
  const { choice, isHydrated } = useAccountChoice()

  return (
    <p aria-live="polite" className="sr-only">
      {isHydrated
        ? `Showing examples for ${AUDIENCE_LABELS[choice.audience].toLowerCase()} ${
            choice.stage === 'new' ? 'starting a new account' : 'growing an existing account'
          }.`
        : ''}
    </p>
  )
}
