/**
 * "From views to calls".
 *
 * DESIGN.md "Funnel": "horizontal bars on one shared scale, with counts and
 * step rates, so the real drop-off shows."
 *
 * The bars are drawn here rather than by @mirrorline/ui's `FunnelBar` for one
 * reason: DESIGN.md puts "counts, step rates" in the machine's voice, and a
 * step rate is a fragment with a percentage inside it ("12.4% of views").
 * Splitting the figure from the words needs two nodes per row, which a
 * `formatCount` callback returning a string cannot give. The stage name stays
 * in Geist, because that is the studio naming a stage.
 */

import { funnel, workspace } from '@mirrorline/mock'
import { Card, cn } from '@mirrorline/ui'

/** "Maya" rather than "Maya Torres", from the workspace owner. */
const FIRST_NAME = workspace.ownerName.split(' ')[0] ?? workspace.ownerName

/** Below this the bar would vanish and read as "zero". */
const MIN_BAR_PERCENT = 0.6

/** What the first row says instead of a step rate. */
const BASELINE_RATE = 'all views'

function formatCount(count: number): string {
  return count.toLocaleString('en-US')
}

export function FunnelCard() {
  const first = funnel[0]
  // One shared scale across every row, so the drop between stages is the real
  // drop and not a per-row rescale. Guarded against an all-zero funnel.
  const scale = first && first.value > 0 ? first.value : 1

  return (
    <Card as="section" aria-labelledby="funnel-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="funnel-heading" className="m-0 font-heading text-title text-text">
        From views to calls
      </h2>

      <div className="flex flex-col gap-2.5">
        {funnel.map((stage, index) => {
          const previous = index > 0 ? funnel[index - 1] : undefined
          const percent = Math.max((stage.value / scale) * 100, MIN_BAR_PERCENT)
          const isLast = index === funnel.length - 1

          return (
            <div key={stage.label} className="flex flex-wrap items-center gap-3">
              <span className="w-[120px] shrink-0 text-label text-text">{stage.label}</span>
              <span
                aria-hidden="true"
                className="relative h-7 min-w-[120px] flex-1 overflow-hidden rounded-sm bg-surface-subtle"
              >
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-sm',
                    // The last step is the one that matters, so it takes the
                    // deeper primary rather than the bright accent.
                    isLast ? 'bg-primary' : 'bg-accent',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </span>
              {/* The count: measured, so mono. */}
              <span className="machine w-20 shrink-0 text-right text-label text-text">
                {formatCount(stage.value)}
              </span>
              {/* The step rate: the percentage is measured, the words naming
                  what it is a share of are the studio's. */}
              <span className="w-[140px] shrink-0 text-meta text-text-muted">
                {previous && previous.value > 0 ? (
                  <>
                    <span className="machine">
                      {((stage.value / previous.value) * 100).toFixed(1)}%
                    </span>{' '}
                    of {previous.label.toLowerCase()}
                  </>
                ) : (
                  BASELINE_RATE
                )}
              </span>
            </div>
          )
        })}
      </div>

      <p className="m-0 text-meta text-text-muted">
        Clicks counted through {FIRST_NAME}&rsquo;s tracked link; calls from her booking tool. Bars
        share one scale, so the drop between stages is real.
      </p>
    </Card>
  )
}
