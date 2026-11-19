'use client'

/**
 * Step 3 — "Your niche and goal".
 *
 * Who you are, what state the account is in, what you do in your own words,
 * the nearby niches Trend Scout watches, the goal every post points at, the
 * link that carries the traffic, and the starting cadence.
 *
 * **The industry is a text box, not a dropdown** (16 §1, 13 §1). It is asked
 * once, and only so Trend Scout knows what to research. A list of industries
 * would be a claim that we know which businesses we serve, and the whole of
 * v4 rests on not needing to know.
 *
 * The step ends with the 14-day baseline notice, because that is the honest
 * answer to the question this step raises — "so what will my numbers be?" —
 * and holding it back until week three would make the first targets look like
 * something we had decided in advance.
 *
 * Each removable chip keeps a 44px hit area: the small round button grows its
 * target with an ::after overlay rather than growing the chip.
 */

import { Input, Label, SegmentedControl, Select, Textarea, cn } from '@mirrorline/ui'
import * as React from 'react'

import { OUTCOME_MAX_LENGTH } from '@/lib/workspace/onboarding-input'

import {
  AUDIENCE_OPTIONS,
  GOAL_OPTIONS,
  NEARBY_NICHE_SUGGESTIONS,
  POSTS_PER_DAY_OPTIONS,
  STAGE_OPTIONS,
} from './onboarding-data'

export interface NicheStepProps {
  audience: string
  onAudienceChange: (audience: string) => void
  stage: string
  onStageChange: (stage: string) => void
  niche: string
  onNicheChange: (niche: string) => void
  nearbyNiches: readonly string[]
  onNearbyNichesChange: (nearbyNiches: readonly string[]) => void
  goal: string
  onGoalChange: (goal: string) => void
  /**
   * The outcome in the client's own words — `goals.outcome_text`, which is
   * `not null`. The goal `Select` above says which of the seven KPI sets
   * applies; this says what the person actually wants, and nothing else in
   * onboarding asks for it.
   */
  outcomeText: string
  onOutcomeTextChange: (outcomeText: string) => void
  goalLink: string
  onGoalLinkChange: (goalLink: string) => void
  postsPerDay: string
  onPostsPerDayChange: (postsPerDay: string) => void
}

export function NicheStep({
  audience,
  onAudienceChange,
  stage,
  onStageChange,
  niche,
  onNicheChange,
  nearbyNiches,
  onNearbyNichesChange,
  goal,
  onGoalChange,
  outcomeText,
  onOutcomeTextChange,
  goalLink,
  onGoalLinkChange,
  postsPerDay,
  onPostsPerDayChange,
}: NicheStepProps) {
  const nicheId = React.useId()
  const nicheHintId = `${nicheId}-hint`
  const goalId = React.useId()
  const outcomeId = React.useId()
  const outcomeHintId = `${outcomeId}-hint`
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

      {/* Who, and what state the account is in — 16 §1's 2×2 -------------- */}
      <div className="flex flex-wrap gap-5">
        <SegmentedControl
          label="You are"
          items={AUDIENCE_OPTIONS.map((option) => ({ ...option }))}
          value={audience}
          onValueChange={onAudienceChange}
        />
        <SegmentedControl
          label="This account is"
          items={STAGE_OPTIONS.map((option) => ({ ...option }))}
          value={stage}
          onValueChange={onStageChange}
        />
      </div>

      {/* Niche, in the client's own words ---------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nicheId}>What do you do?</Label>
        <Input
          id={nicheId}
          type="text"
          value={niche}
          onChange={(event) => onNicheChange(event.target.value)}
          aria-describedby={nicheHintId}
          placeholder="Leadership coaching for first-time managers"
          className="max-w-[420px]"
        />
        <p id={nicheHintId} className="m-0 text-meta text-text-muted">
          In your own words — there is no list to pick from. We ask once, and only so Trend Scout
          knows what to research. It never changes what you are shown or what you pay.
        </p>
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

      {/* The outcome, in the client's own words ---------------------------- */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={outcomeId}>What would success look like?</Label>
        <Textarea
          id={outcomeId}
          name="outcomeText"
          value={outcomeText}
          onChange={(event) => onOutcomeTextChange(event.target.value)}
          aria-describedby={outcomeHintId}
          maxLength={OUTCOME_MAX_LENGTH}
          placeholder="Ten qualified enquiries a month from people who already trust me"
          className="max-w-[520px]"
        />
        <p id={outcomeHintId} className="m-0 text-meta text-text-muted">
          In your own words, and in your own numbers. The goal above decides which KPIs your
          dashboard shows; this is what we are aiming at, quoted back to you on the Results Ledger.
        </p>
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

      <BaselineNotice />
    </div>
  )
}

/**
 * 15 §1: key results are "proposed after a 14-day baseline + Niche Scan
 * benchmarks".
 *
 * It sits at the end of the step that asks for the goal, because this is the
 * moment someone is forming an expectation about what their numbers will be.
 * The honest answer is that we do not know yet, and that saying so now costs
 * less than a target invented on day one and missed on day thirty.
 */
function BaselineNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-subtle p-4">
      <h2 className="m-0 font-heading text-subtitle text-text">
        Your first two weeks are a baseline
      </h2>
      <p className="m-0 text-meta text-text-muted">
        We post, measure, and set no targets. After 14 days the Performance Analyst proposes key
        results from what your account actually did, plus the benchmarks from your Niche Scan — and
        you approve or change them.
      </p>
      <p className="m-0 text-caption text-text-muted">
        Nobody can tell you on day one what your account will do. A number we made up today would be
        a guess wearing a target&rsquo;s clothes.
      </p>
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
