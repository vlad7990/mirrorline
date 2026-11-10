'use client'

/**
 * Step 3 — "Your niche and goal".
 *
 * Niche, the nearby niches the Trend Scout watches, the goal every post points
 * at, the link that carries the traffic, and the starting cadence.
 *
 * Each removable chip keeps a 44px hit area: the small round button grows its
 * target with an ::after overlay rather than growing the chip.
 */

import { Input, Label, Select, cn } from '@mirrorline/ui'
import * as React from 'react'

import {
  GOAL_OPTIONS,
  NEARBY_NICHE_SUGGESTIONS,
  NICHE_OPTIONS,
  POSTS_PER_DAY_OPTIONS,
} from './onboarding-data'

export interface NicheStepProps {
  niche: string
  onNicheChange: (niche: string) => void
  nearbyNiches: readonly string[]
  onNearbyNichesChange: (nearbyNiches: readonly string[]) => void
  goal: string
  onGoalChange: (goal: string) => void
  goalLink: string
  onGoalLinkChange: (goalLink: string) => void
  postsPerDay: string
  onPostsPerDayChange: (postsPerDay: string) => void
}

export function NicheStep({
  niche,
  onNicheChange,
  nearbyNiches,
  onNearbyNichesChange,
  goal,
  onGoalChange,
  goalLink,
  onGoalLinkChange,
  postsPerDay,
  onPostsPerDayChange,
}: NicheStepProps) {
  const nicheId = React.useId()
  const goalId = React.useId()
  const linkId = React.useId()
  const cadenceId = React.useId()
  const cadenceHintId = `${cadenceId}-hint`
  const nearbyLabelId = `${nicheId}-nearby`

  const nextSuggestion = NEARBY_NICHE_SUGGESTIONS.find(
    (suggestion) => !nearbyNiches.includes(suggestion),
  )

  function removeNiche(name: string) {
    onNearbyNichesChange(nearbyNiches.filter((item) => item !== name))
  }

  function addNextNiche() {
    if (nextSuggestion === undefined) return
    onNearbyNichesChange([...nearbyNiches, nextSuggestion])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Your niche and goal</h1>
        <p className="m-0 text-body text-text-muted">
          The Trend Scout watches your niche and nearby ones, and every post points to your goal.
        </p>
      </div>

      {/* Niche ------------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nicheId}>Niche</Label>
        <Select
          id={nicheId}
          options={NICHE_OPTIONS.map((option) => ({ ...option }))}
          value={niche}
          onValueChange={onNicheChange}
          className="max-w-[320px]"
        />
      </div>

      {/* Nearby niches ---------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <span id={nearbyLabelId} className="text-label font-semibold text-text">
          Nearby niches to watch
        </span>
        <ul
          aria-labelledby={nearbyLabelId}
          aria-live="polite"
          className="flex list-none flex-wrap items-center gap-2 p-0"
        >
          {nearbyNiches.map((name) => (
            <li key={name}>
              <span className="inline-flex min-h-touch items-center gap-1 rounded-full bg-accent-soft py-1.5 pr-1.5 pl-4 font-body text-meta font-semibold text-on-accent-soft">
                {name}
                <button
                  type="button"
                  onClick={() => removeNiche(name)}
                  aria-label={`Remove ${name}`}
                  className="relative grid size-8 place-items-center rounded-full text-on-accent-soft transition-colors duration-150 after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface/60"
                >
                  <CloseIcon />
                </button>
              </span>
            </li>
          ))}

          {nearbyNiches.length === 0 ? (
            <li className="text-meta text-text-muted">
              No nearby niches yet. We will watch your own niche only.
            </li>
          ) : null}

          <li>
            <button
              type="button"
              onClick={addNextNiche}
              disabled={nextSuggestion === undefined}
              aria-label={
                nextSuggestion === undefined
                  ? 'No more nearby niches to add'
                  : `Add ${nextSuggestion}`
              }
              className={cn(
                'inline-flex min-h-touch items-center rounded-full border border-dashed border-border-strong px-4',
                'font-body text-meta font-semibold text-text-muted transition-colors duration-150',
                'hover:border-text-muted hover:text-text',
                'disabled:pointer-events-none disabled:opacity-55',
              )}
            >
              + Add
            </button>
          </li>
        </ul>
      </div>

      {/* Goal and link ---------------------------------------------------- */}
      <div className="flex flex-wrap gap-5">
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <Label htmlFor={goalId}>Main goal</Label>
          <Select
            id={goalId}
            options={GOAL_OPTIONS.map((option) => ({ ...option }))}
            value={goal}
            onValueChange={onGoalChange}
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <Label htmlFor={linkId}>Send traffic to</Label>
          <Input
            id={linkId}
            type="text"
            inputMode="url"
            value={goalLink}
            onChange={(event) => onGoalLinkChange(event.target.value)}
          />
        </div>
      </div>

      {/* Cadence ---------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={cadenceId}>Posts per day, per platform</Label>
        <Select
          id={cadenceId}
          options={POSTS_PER_DAY_OPTIONS.map((option) => ({ ...option }))}
          value={postsPerDay}
          onValueChange={onPostsPerDayChange}
          aria-describedby={cadenceHintId}
          className="max-w-[200px]"
        />
        <p id={cadenceHintId} className="m-0 text-meta text-text-muted">
          We start here and raise it only while reach per post holds up.
        </p>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
