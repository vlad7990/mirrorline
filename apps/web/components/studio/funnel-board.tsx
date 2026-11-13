/**
 * The goal funnel and the format leaderboard — 15 §5 tabs 2 and 3.
 *
 * **The funnel ends at leads and bookings, not at views.** That is P1 in one
 * picture: a tool that reports views tells an account that is losing money it
 * is winning. The five stages are 15 §5's, and `FunnelBar` draws them on one
 * shared scale so the drop between stages is the real drop.
 *
 * **The leaderboard ranks by sends per 1,000 reach, not by views.** 15 §5 tab
 * 3 is explicit: "top posts by the user's goal, not by views". The ordering is
 * held by a test, because this is the one place where sorting by the obvious
 * column would quietly undo the argument.
 */

import { Card, FunnelBar, cn } from '@mirrorline/ui'

import { SAMPLE_FUNNEL } from '@/components/kpi/sample-dashboard'
import { SAMPLE_FORMAT_RANKING, type FormatRank } from '@/lib/studio/insights'

/** A step rate needs the stage above it; the first row has none. */
function stepRate(count: number, previous: number | undefined): string | null {
  if (previous === undefined || previous <= 0) return null
  return `${((count / previous) * 100).toFixed(1)}%`
}

export function FunnelBoard() {
  return (
    <Card as="section" aria-labelledby="funnel-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="funnel-heading" className="m-0 font-heading text-title text-text">
          Views to bookings
        </h2>
        <p className="m-0 text-meta text-text-muted">
          Across every connected account, last 7 days. One shared scale, so the drop between stages
          is the real drop.
        </p>
      </div>

      <FunnelBar steps={[...SAMPLE_FUNNEL]} />

      <ul className="m-0 flex list-none flex-col gap-2 border-t border-border p-0 pt-3">
        {SAMPLE_FUNNEL.map((stage, index) => {
          const previous = index > 0 ? SAMPLE_FUNNEL[index - 1] : undefined
          const rate = stepRate(stage.count, previous?.count)

          return (
            <li key={stage.label} className="flex flex-wrap items-baseline gap-x-3 text-meta">
              <span className="min-w-[120px] text-text">{stage.label}</span>
              <span className="machine text-mono text-text">
                {stage.count.toLocaleString('en-US')}
              </span>
              <span className="text-text-muted">
                {rate ? (
                  <>
                    <span className="machine">{rate}</span> of{' '}
                    {previous?.label.toLowerCase() ?? 'the stage above'}
                  </>
                ) : (
                  'all views'
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="m-0 text-caption text-text-muted">
        Clicks are counted through your tracked link, and leads through that link or a DM keyword.
        Bookings come from a connected booking tool; without one we cannot see them, and we do not
        guess.
      </p>
    </Card>
  )
}

/** 15 §5 tab 3's format leaderboard. */
export function FormatLeaderboard({
  formats = SAMPLE_FORMAT_RANKING,
}: {
  readonly formats?: readonly FormatRank[]
}) {
  const scale = Math.max(...formats.map((format) => format.sendsPer1k), 1)

  return (
    <Card as="section" aria-labelledby="formats-heading" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="formats-heading" className="m-0 font-heading text-title text-text">
          Formats, ranked by your goal
        </h2>
        <p className="m-0 text-meta text-text-muted">
          Sends per 1,000 reach — not views. A format can win on views and send nobody anywhere.
        </p>
      </div>

      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {formats.map((format, index) => {
          const isWinner = index === 0
          return (
            <li key={format.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-label">
                <span className={cn('text-text', isWinner && 'font-bold')}>{format.label}</span>
                <span className="machine text-text">{format.sendsPer1k}</span>
              </div>
              <span
                aria-hidden="true"
                className="block h-2 w-full overflow-hidden rounded-full bg-surface-subtle"
              >
                <span
                  className={cn(
                    'block h-2 rounded-full',
                    isWinner ? 'bg-accent' : 'bg-border-strong',
                  )}
                  style={{ width: `${(format.sendsPer1k / scale) * 100}%` }}
                />
              </span>
              <span className="machine text-caption text-text-muted">
                {format.posts} posts · {format.leads} leads
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
