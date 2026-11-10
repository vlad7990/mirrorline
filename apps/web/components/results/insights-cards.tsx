/**
 * "What's working" and "Best times".
 *
 * Both read off @mirrorline/mock. The hook bars share one scale, like the
 * funnel, so the gap between first and fourth is the real gap. The heatmap is
 * a real table where every cell carries its sentence, because DESIGN.md asks
 * that nothing be carried by shading alone.
 */

import { hookTypeRanking, metrics, weekDays } from '@mirrorline/mock'
import { Card, Heatmap, cn, type HeatmapRow } from '@mirrorline/ui'

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

/* -------------------------------------------------------------------------- */
/* What's working                                                              */
/* -------------------------------------------------------------------------- */

const HOOK_SCALE = Math.max(...hookTypeRanking.map((hook) => hook.averageViews), 1)

export function HookRankingCard() {
  return (
    <Card as="section" aria-labelledby="hooks-heading" className="flex min-w-0 flex-col gap-2.5">
      <h2 id="hooks-heading" className="m-0 font-heading text-title text-text">
        What&rsquo;s working
      </h2>
      <p className="m-0 text-meta text-text-muted">Average views per post, by hook type</p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {hookTypeRanking.map((hook, index) => {
          const isWinner = index === 0
          return (
            <li key={hook.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-label font-normal">
                <span className={cn('text-text', isWinner && 'font-bold')}>{hook.label}</span>
                <span className="tabular text-text">{formatCount(hook.averageViews)}</span>
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
                  style={{ width: `${(hook.averageViews / HOOK_SCALE) * 100}%` }}
                />
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Best times                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The fixtures carry views by day and a posting count for the week, not a
 * day-by-slot matrix. Dividing the day's views by the day's posts is the only
 * honest figure available, so every slot on a day shades the same — and the
 * legend says so rather than inventing a pattern.
 */
const POSTS_PER_DAY = weekDays.length > 0 ? metrics.posts / weekDays.length : 1
const VIEWS_PER_POST_BY_DAY: readonly number[] = metrics.viewsByDay.map((views) =>
  Math.round(views / (POSTS_PER_DAY || 1)),
)
const VIEWS_SCALE = Math.max(...VIEWS_PER_POST_BY_DAY, 1)

const HEATMAP_COLUMNS: readonly string[] = weekDays.map((day) => day.dayLabel.charAt(0))

const HEATMAP_ROWS: readonly HeatmapRow[] = metrics.bestTimes.map((time) => ({
  label: time.timeLabel,
  cells: weekDays.map((day, index) => {
    const viewsPerPost = VIEWS_PER_POST_BY_DAY[index] ?? 0
    return {
      value: viewsPerPost / VIEWS_SCALE,
      label: `${day.dayLabel}, ${time.timeLabel} · ${formatCount(viewsPerPost)} views per post`,
    }
  }),
}))

const BEST_TIMES_LIST = metrics.bestTimes.map((time) => time.timeLabel).join(', ')

export function BestTimesCard() {
  return (
    <Card
      as="section"
      aria-labelledby="best-times-heading"
      className="flex min-w-0 flex-col gap-2.5"
    >
      <h2 id="best-times-heading" className="m-0 font-heading text-title text-text">
        Best times
      </h2>
      <Heatmap
        caption="Views per post by posting time and day of the week"
        captionHidden
        columnLabels={HEATMAP_COLUMNS}
        rows={HEATMAP_ROWS}
        legend={`Darker means more views per post. Best: ${BEST_TIMES_LIST}. We have views by day, not by slot, so every slot on a day shades the same.`}
      />
    </Card>
  )
}
