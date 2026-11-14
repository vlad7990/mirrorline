/**
 * What we copy, what we write, and the number that separates them.
 *
 * This is the one claim on the whole site that has to survive a sceptic, and
 * it is the claim the predecessor project makes it hardest to believe:
 * "remakes copy the format only" (non-negotiable 2). Saying it in a sentence
 * is free. Putting the borrowed thing beside the written thing, and the
 * measurement under both, is the version somebody can check.
 *
 * **It is not the studio's gate panel.** `components/remake/script-evidence.tsx`
 * renders the same result inside the app, with the compliance list, the cited
 * business fact and the rewrite history. That is the right amount of detail
 * for a screen you are working in and far too much for a marketing band — and
 * it carries studio chrome that would look borrowed on an ink section. Same
 * data, both of them, so the two cannot drift: the figure here is the figure
 * the product shows.
 *
 * A server component. The meter fills on a scroll-driven CSS animation and
 * the figure counts up in its own small client component.
 */

import { trends } from '@mirrorline/mock'
import { Card, StatusChip } from '@mirrorline/ui'
import * as React from 'react'

import { ORIGINALITY_RESULT, remakePlanFor } from '../remake/remake-plans'
import { CountUp } from './count-up'

/** The demo client's first trend, which is the one the studio screenshots show. */
const DEMO_TREND_ID = 'trend-01'

export function OriginalityDemo() {
  const trend = trends.find((candidate) => candidate.id === DEMO_TREND_ID)
  const plan = remakePlanFor(DEMO_TREND_ID)

  // Both come from the same fixtures the studio renders, so this is a guard
  // against a fixture being renamed rather than a case that happens. Returning
  // nothing is right if it ever does: a gate demo with half its evidence
  // missing would be worse than no gate demo.
  if (trend === undefined || plan === undefined) return null

  const { similarity, limit, comparedAgainst, rewriteNote } = ORIGINALITY_RESULT
  // The bar is read against the limit, not against 100: a 12 that renders as a
  // twelfth of the bar says "almost nothing", when what it means is "well
  // under the line". The line is the scale.
  const fillPercent = Math.min(100, Math.round((similarity / limit) * 100))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* What we took ------------------------------------------------- */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 font-heading text-subtitle text-text">The format we studied</h3>
            <span className="machine text-mono text-text-muted">{trend.growthLabel}</span>
          </div>
          <p className="m-0 text-meta text-text-muted">
            “{trend.format}” — a structure that is growing in this account’s niche. These beats are
            all we take.
          </p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {trend.beats.map((beat) => (
              <li
                key={beat.order}
                className="flex items-baseline gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <span className="machine shrink-0 text-mono text-text-muted">
                  {String(beat.order).padStart(2, '0')}
                </span>
                <span className="text-meta text-text">{beat.label}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-auto border-t border-border pt-3 text-caption text-text-muted">
            No footage, no audio and no wording comes across. A beat is a shape, not a file.
          </p>
        </Card>

        {/* What we wrote ------------------------------------------------- */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 font-heading text-subtitle text-text">What we wrote</h3>
            <StatusChip status="passed">Rewritten, then passed</StatusChip>
          </div>
          <p className="m-0 text-meta text-text-muted">
            A new script in the client’s voice, shot with the client’s own footage.
          </p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {plan.script.slice(0, trend.beats.length).map((line) => (
              <li
                key={line.beat}
                className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-caption font-semibold text-text-muted">{line.beat}</span>
                <span className="text-meta text-text">{line.text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* The measurement ------------------------------------------------- */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h3 className="m-0 font-heading text-subtitle text-text">
            Measured against {comparedAgainst}
          </h3>
          <p className="m-0 text-meta text-text-muted">
            <span className="machine text-metric text-text">
              <CountUp value={similarity} suffix="%" />
            </span>{' '}
            similar · limit <span className="machine">{limit}%</span>
          </p>
        </div>

        {/* The track is the limit, so the bar is read against the line it
            must stay under. A bar scaled to 100 would make 12% look like
            almost nothing, which is a different and more flattering claim
            than the true one. */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
          <div
            className="meter-fill h-full rounded-full bg-success"
            style={{ '--fill': `${fillPercent}%` } as React.CSSProperties}
          />
        </div>
        <div className="flex items-center justify-between text-caption text-text-muted">
          <span>0%</span>
          <span className="machine">the gate blocks at {limit}%</span>
        </div>

        <p className="m-0 max-w-[80ch] border-t border-border pt-3 text-meta text-text-muted">
          {rewriteNote}
        </p>
        <p className="m-0 text-caption text-text-muted">
          Sample data from a fictional demo account. The gate blocks and sends back — it does not
          flag and carry on, and it is not a slider anybody here can move.
        </p>
      </Card>
    </div>
  )
}
