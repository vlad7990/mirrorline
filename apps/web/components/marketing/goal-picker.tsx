'use client'

/**
 * Pick a goal; the KPI cards, the targets and the funnel follow it.
 *
 * 19 v2 ★2 for /metrics, replacing seven static cards that said what each
 * goal was and showed nothing happening. The seven goals are 13 §1's, the
 * only segmentation this site uses.
 *
 * The honesty argument — one account, different KPIs leading — lives in
 * `goal-picker-content.ts` and is asserted there. What this file adds is the
 * line that says it on screen, because a reader watching four cards swap
 * could reasonably assume the numbers were being re-rolled per goal.
 *
 * **State is local and never touches the URL.** 19 v2 names the trap
 * explicitly for this component: `useSearchParams` needs a Suspense boundary
 * immediately above it, and D46 is the record of that boundary landing in the
 * layout instead and turning the whole marketing tree into a fallback that
 * shipped no HTML. `plan-picker.tsx` on /pricing is built the same way.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { KpiCard } from '@/components/kpi/kpi-card'
import {
  LOWER_IS_BETTER,
  SAMPLE_FUNNEL,
  SAMPLE_KPIS,
  SAMPLE_NOW,
} from '@/components/kpi/sample-dashboard'
import { GOALS } from '@/lib/audience/account-type'

import { GOAL_VIEWS } from './goal-picker-content'
import { SampleDataLabel } from './primitives'

export function GoalPicker() {
  const [goalKey, setGoalKey] = React.useState(GOALS[0]?.key ?? 'leads')

  const goal = GOALS.find((candidate) => candidate.key === goalKey)
  const view = GOAL_VIEWS[goalKey]
  const kpis = (view?.kpiKeys ?? [])
    .map((key) => SAMPLE_KPIS.find((kpi) => kpi.definition.key === key))
    .filter((kpi) => kpi !== undefined)

  return (
    <div className="flex flex-col gap-8">
      {/* The seven goals ------------------------------------------------- */}
      <div
        role="radiogroup"
        aria-label="Choose the goal this account is judged on"
        className="flex flex-wrap gap-2"
      >
        {GOALS.map((candidate) => {
          const isChosen = candidate.key === goalKey
          return (
            <button
              key={candidate.key}
              type="button"
              role="radio"
              aria-checked={isChosen}
              onClick={() => setGoalKey(candidate.key)}
              className={cn(
                'min-h-touch rounded-full border px-4 py-2 text-label font-medium',
                'transition-colors duration-[var(--duration-dropdown)] ease-out',
                isChosen
                  ? 'border-gold bg-gold-soft text-on-gold-soft'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text',
              )}
            >
              {candidate.label}
            </button>
          )
        })}
      </div>

      {/* What that goal is measured by ------------------------------------ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="m-0 text-subtitle text-text">
            Headline KPI: <span className="font-semibold">{goal?.headlineKpi}</span>
          </p>
          <SampleDataLabel />
        </div>

        {/* `key` on the list, not on each card: changing the goal replaces
            the set, and re-keying the container is what lets the reveal run
            again rather than the cards silently swapping their contents. */}
        <ul
          key={goalKey}
          className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
        >
          {kpis.map((kpi, position) => (
            <li
              key={kpi.definition.key}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <KpiCard
                kpi={kpi}
                now={SAMPLE_NOW}
                goodDirection={LOWER_IS_BETTER.has(kpi.definition.key) ? 'down' : 'up'}
                /* The page puts this picker on a snow band, and a band pins
                   the palette (D40). The card has to be told which palette it
                   was pinned to or its target line — small gold text — picks
                   the theme-following value and fails contrast. */
                surface="snow"
              />
            </li>
          ))}
        </ul>

        <p className="m-0 max-w-[80ch] text-meta text-text-muted">
          <span className="font-semibold text-text">Targets for this goal come from</span>{' '}
          {view?.targetBasis}. They are proposals: you approve or change every one, and the word on
          screen is always “target”.
        </p>
      </div>

      {/* The funnel ------------------------------------------------------- */}
      <Funnel judgedAt={view?.funnelStep ?? 'Leads'} />

      {/* The sentence that stops the section implying more than it does. */}
      <p className="m-0 max-w-[80ch] border-t border-border pt-4 text-caption text-text-muted">
        One fictional account throughout. Changing the goal changes which of its measurements lead
        and where it is judged in the funnel — it does not change the measurements. A preview that
        produced a fresh set of healthy figures per goal would be seven accounts pretending to be
        one.
      </p>
    </div>
  )
}

interface FunnelProps {
  /** The step this goal is judged at. */
  readonly judgedAt: string
}

/**
 * The same five steps every time, with the line drawn in a different place.
 *
 * The bars are scaled by share of the top step, so the shape is the real
 * shape of the sample data rather than five bars chosen to look like a
 * funnel. Below the judged step the bars stay drawn but go quiet: those
 * numbers are still measured, they are just not what this goal is about.
 */
function Funnel({ judgedAt }: FunnelProps) {
  const top = SAMPLE_FUNNEL[0]?.count ?? 1
  const judgedIndex = SAMPLE_FUNNEL.findIndex((step) => step.label === judgedAt)

  return (
    <div className="flex flex-col gap-3">
      {/* Not `gold-phrase`. That utility is a gradient cut for the display
          headline scale; at `text-subtitle` axe failed it for contrast in
          both themes. The emphasis a small heading needs is weight, which
          costs no colour. */}
      <h3 className="m-0 font-heading text-subtitle text-text">
        Judged at <span className="font-semibold">{judgedAt}</span>
      </h3>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {SAMPLE_FUNNEL.map((step, position) => {
          const share = Math.max(2, Math.round((step.count / top) * 100))
          const isJudged = position === judgedIndex
          const isBeyond = judgedIndex !== -1 && position > judgedIndex

          return (
            <li key={step.label} className="flex items-center gap-4">
              <span className="w-28 shrink-0 text-meta text-text-muted">{step.label}</span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-sm bg-surface-subtle">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-sm transition-[width,background-color]',
                    'duration-[var(--duration-modal)] ease-out',
                    isJudged ? 'bg-gold-deep' : isBeyond ? 'bg-border-strong' : 'bg-gold-deep/45',
                  )}
                  style={{ width: `${share}%` }}
                />
              </span>
              <span
                className={cn(
                  'machine w-20 shrink-0 text-right text-mono',
                  isJudged ? 'text-text' : 'text-text-muted',
                )}
              >
                {step.count.toLocaleString('en-GB')}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
