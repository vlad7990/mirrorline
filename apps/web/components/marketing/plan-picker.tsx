'use client'

/**
 * The plans, and what a month on one of them actually looks like.
 *
 * 19 v2 ★2 and ★3: cards that rise in a stagger, a gold sweep on the chosen
 * one, and a mini-calendar showing the post volume that plan delivers.
 *
 * **The cards are not the selection control, and that is an accessibility
 * decision rather than a layout one.** Each card contains a real button — the
 * one that opens the lead form — so making the card itself a radio would nest
 * an interactive element inside an interactive element, which is ambiguous to
 * a screen reader and unreachable in a sensible tab order. The selection
 * therefore lives in its own radio group under the grid, labelled with what it
 * does, and the matching card answers by taking the gold. One state, two
 * places showing it, no nesting.
 *
 * **The sweep never carries the state.** It is `aria-hidden` and it happens
 * once; the card keeps a gold border for as long as it is the selection. That
 * is the rule the choice pill on /faq is built under, for the same reason: a
 * reader with reduced motion on, or anyone who looked away for a second, must
 * still be able to see which plan is chosen.
 */

import { Card, cn } from '@mirrorline/ui'
import { Check } from 'lucide-react'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import { busiestDay, distributePosts } from './month-preview-content'
import { perDayUsd, type PricingTier } from './pricing-tiers'
import { ComingSoonLabel } from './primitives'

export interface PlanAction {
  readonly label: string
  readonly note: string
}

export interface PlanPickerProps {
  readonly tiers: readonly PricingTier[]
  /**
   * The button label and note per tier id, resolved on the server.
   *
   * Passed in rather than computed here because `checkoutMode()` reads the
   * environment, and the environment is not a thing a client component may
   * look at — the answer has to be decided where the secret lives.
   */
  readonly actions: Readonly<Record<string, PlanAction>>
}

export function PlanPicker({ tiers, actions }: PlanPickerProps) {
  /**
   * Opens on the suggested plan, or the first one in the list.
   *
   * Deliberately not read from or written to the URL. /metrics has the same
   * shape of control and 19 v2 names the trap: state from `useSearchParams`
   * needs a Suspense boundary immediately above it, and D46 is the record of
   * what happens when that boundary lands in the layout instead — the whole
   * marketing tree became the fallback and every page shipped empty HTML.
   * Nothing here needs to be linkable, so nothing here touches the URL.
   */
  const initial = tiers.find((tier) => tier.isSuggested) ?? tiers[0]
  const [selectedId, setSelectedId] = React.useState(initial?.id ?? '')

  const selected = tiers.find((tier) => tier.id === selectedId)
  const selectable = tiers.filter((tier) => tier.postsInPeriod !== null)

  return (
    <div className="flex flex-col gap-10">
      {/* The cards ---------------------------------------------------- */}
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier, position) => {
          const isSelected = tier.id === selectedId
          const perDay = perDayUsd(tier)
          const action = actions[tier.id]

          return (
            <li
              key={tier.id}
              className="reveal-item"
              style={{ '--index': position % 3 } as React.CSSProperties}
            >
              <Card
                className={cn(
                  'relative flex h-full flex-col gap-4 overflow-hidden',
                  'transition-colors duration-[var(--duration-dropdown)] ease-out',
                  isSelected ? 'border-gold bg-gold/5' : null,
                )}
              >
                {/* One sweep per selection. The key is what restarts it: a
                    CSS animation only replays when the element is new, so
                    keying on the selected id gives each choice its own. */}
                {isSelected ? (
                  <span
                    key={selectedId}
                    aria-hidden="true"
                    className="plan-sweep absolute inset-0"
                  />
                ) : null}

                <div className="relative flex flex-wrap items-center gap-2">
                  <h3 className="m-0 font-heading text-title text-text">{tier.name}</h3>
                  {tier.isSuggested ? (
                    <span className="rounded-full bg-gold-gradient px-3 py-1 text-caption font-semibold text-ink-900">
                      Suggested
                    </span>
                  ) : null}
                  {tier.comingLaterLabel !== null ? (
                    <ComingSoonLabel>{tier.comingLaterLabel}</ComingSoonLabel>
                  ) : null}
                </div>

                {/* repurpose.io's framing, kept from the previous page: the
                    per-day figure leads and the billed amount sits under it,
                    because $50 a day compares with the hour of editing it
                    replaces. Derived, never typed (D24). */}
                <p className="relative m-0 flex flex-col gap-0.5">
                  {perDay === null ? (
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="machine text-metric font-semibold text-text">
                        {tier.price}
                      </span>
                      <span className="text-meta text-text-muted">{tier.period}</span>
                    </span>
                  ) : (
                    <>
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="machine text-metric font-semibold text-text">
                          ${perDay}
                        </span>
                        <span className="text-meta text-text-muted">a day</span>
                      </span>
                      <span className="text-meta text-text-muted">
                        <span className="machine">{tier.price}</span> {tier.period}
                      </span>
                    </>
                  )}
                </p>

                <p className="relative m-0 text-meta text-text-muted">{tier.summary}</p>
                <p className="relative m-0 text-meta text-gold-text">Best for: {tier.bestFor}</p>

                <ul className="relative m-0 flex list-none flex-col gap-2 p-0">
                  {tier.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-meta text-text">
                      <span className="mt-0.5 text-on-success-soft">
                        <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                <div className="relative mt-auto flex flex-col gap-2 pt-2">
                  <LeadDialogButton
                    intent={tier.id === 'pilot' || tier.id === 'creator' ? 'pilot' : 'demo'}
                    variant={tier.isSuggested ? 'gold' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {action?.label}
                  </LeadDialogButton>
                  <p className="m-0 text-caption text-text-muted">{action?.note}</p>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {/* The month ---------------------------------------------------- */}
      <div className="flex flex-col gap-5">
        <div
          role="radiogroup"
          aria-label="Show what a month looks like on a plan"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="mr-1 text-meta text-text-muted">What a month looks like on</span>
          {selectable.map((tier) => {
            const isSelected = tier.id === selectedId
            return (
              <button
                key={tier.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedId(tier.id)}
                className={cn(
                  'min-h-touch rounded-full border px-4 py-2 text-label font-medium',
                  'transition-colors duration-[var(--duration-dropdown)] ease-out',
                  isSelected
                    ? 'border-gold bg-gold-soft text-on-gold-soft'
                    : 'border-border text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                {tier.name}
              </button>
            )
          })}
        </div>

        {selected ? <MonthPreview tier={selected} /> : null}
      </div>
    </div>
  )
}

interface MonthPreviewProps {
  readonly tier: PricingTier
}

/**
 * One cell per day, one dot per post.
 *
 * Dots rather than a bar chart: the question this answers is "how often does
 * something go out", and a dot per post is the only drawing where counting is
 * the obvious thing to do. The figures beside it come from the same numbers,
 * so the picture and the sentence cannot disagree.
 */
function MonthPreview({ tier }: MonthPreviewProps) {
  if (tier.postsInPeriod === null) return null

  const distribution = distributePosts(tier.postsInPeriod, tier.days)
  const tallest = busiestDay(distribution)

  return (
    <figure className="m-0 flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-subtitle font-semibold text-text">{tier.name}</span>
        <span className="text-meta text-text-muted">
          <span className="machine">{tier.postsInPeriod}</span> posts across{' '}
          <span className="machine">{tier.days}</span> days
        </span>
      </figcaption>

      {/* A real list of days, so a screen reader hears the shape rather than
          meeting a wall of empty decorative spans. Each day announces its own
          count; the dots inside it are the decoration. */}
      <ol className="m-0 grid list-none grid-cols-7 gap-1.5 p-0 sm:grid-cols-10 lg:grid-cols-15">
        {distribution.map((count, index) => (
          <li
            key={index}
            className={cn(
              'flex flex-col items-center justify-end gap-0.5 rounded-sm px-1 py-1.5',
              count === 0 ? 'bg-surface-subtle' : 'bg-gold/10',
            )}
            style={{ minHeight: `${1.25 + tallest * 0.4}rem` }}
          >
            <span className="sr-only">
              Day {index + 1}: {count} {count === 1 ? 'post' : 'posts'}
            </span>
            {Array.from({ length: count }, (_, dot) => (
              <span key={dot} aria-hidden="true" className="size-1.5 rounded-full bg-gold-deep" />
            ))}
          </li>
        ))}
      </ol>

      <p className="m-0 text-caption text-text-muted">
        Sample schedule. The real one follows the times that work for your account, and you approve
        every post or let the week go after 24 hours.
      </p>
    </figure>
  )
}
