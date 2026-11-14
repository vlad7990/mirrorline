/**
 * One KPI, carrying everything 15 §3 and §8 require: the figure, its target,
 * its trend, its definition, its source, and how fresh it is.
 *
 * **Composed, not a new design.** DESIGN.md and the v4 design lock are closed
 * to new components, so this is `Card`, `Sparkline` and the existing type and
 * colour tokens arranged differently. `MetricTile` was the obvious base and is
 * deliberately not extended: it has no slot for a target, a source, a
 * freshness line or a not-connected state, and widening it would mean editing
 * a locked `@mirrorline/ui` component.
 *
 * The three states are the honesty rules made visible:
 * - **measured** — a real number, with when it was taken.
 * - **not connected** — the words "Not connected" and a button, never a zero.
 * - **projected** — dashed, and labelled as a projection.
 */

import { Button, Card, Sparkline, cn } from '@mirrorline/ui'
import { Info, Plug } from 'lucide-react'
import * as React from 'react'

import {
  type GoodDirection,
  type Kpi,
  changeTone,
  formatChange,
  formatFreshness,
  formatKpiValue,
} from './kpi-types'

/**
 * The same three tokens `MetricTile` uses, and for the same reason.
 *
 * `--color-success` (#128A5E) is the **fill** colour — status dots, bar
 * fills — and it scores 4.38:1 on white, which is under AA for text. The
 * `on-*-soft` pair is the text colour that clears it. Reaching for
 * `text-success` here was the obvious mistake and axe caught it; this comment
 * exists so the next person does not repeat it.
 */
const TONE_CLASS: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-on-success-soft',
  down: 'text-on-danger-soft',
  flat: 'text-text-muted',
}

export interface KpiCardProps {
  readonly kpi: Kpi
  /** Which way is an improvement. Defaults to up. */
  readonly goodDirection?: GoodDirection
  /**
   * The moment "updated 2h ago" is measured against.
   *
   * Passed in rather than read from the clock so a server render and a client
   * render agree. A `new Date()` here would differ between the two and patch
   * silently on hydration.
   */
  readonly now: Date
  /**
   * Draw the trend line as the card scrolls into view (17 §1 M9).
   *
   * Opt-in and default off, for the same reason `GoalProgress.animateFill` is:
   * the studio's KPI grid renders this component too, and PR4 is the marketing
   * preview. Whether a dashboard someone works in all day should redraw its
   * sparklines is PR5's question, not something to answer by accident.
   *
   * Only the measured series takes it. The dashed projection line below does
   * not: drawing a forecast on arrival gives it the same confident arrival as
   * a measurement, and the dashes exist precisely to say it is not one.
   */
  readonly animateSeries?: boolean
  /**
   * What the card is sitting on, which decides the gold.
   *
   * Three cases, not two, and the third is the one that caused a bug. The
   * public site's bands are fixed whatever the theme — `ink` is always dark,
   * `snow` always light — so each takes the gold tuned for it. The studio's
   * surface follows the theme, so it needs both and a `dark:` variant to
   * switch between them. Collapsing `theme` into `snow` leaves gold-on-dark
   * failing AA in the studio; collapsing it the other way puts a `dark:`
   * variant on the marketing pages, where `.dark` is on <html> but the snow
   * band underneath has not changed colour. axe caught the first on
   * /app/home, and then the second on / and /metrics.
   */
  readonly surface?: 'ink' | 'snow' | 'theme'
  readonly className?: string
}

const TARGET_CLASS: Record<'ink' | 'snow' | 'theme', string> = {
  ink: 'text-gold-bright',
  snow: 'text-gold-text',
  theme: 'text-gold-text dark:text-gold-bright',
}

export function KpiCard({
  kpi,
  goodDirection = 'up',
  now,
  surface = 'theme',
  animateSeries = false,
  className,
}: KpiCardProps) {
  const { definition, value, target } = kpi
  const tooltipId = React.useId()

  return (
    <Card className={cn('flex h-full flex-col gap-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-meta text-text-muted">{definition.name}</span>
        {/* The definition, as a native tooltip plus a described-by, so it
            reaches a pointer, a keyboard and a screen reader without a popover
            library. 15 §3 requires definition, formula and source on every
            KPI. */}
        <span
          tabIndex={0}
          role="note"
          aria-describedby={tooltipId}
          title={`${definition.formula}. Source: ${definition.source}.`}
          className="shrink-0 rounded-sm text-text-muted"
        >
          <Info aria-hidden="true" className="size-4" strokeWidth={1.8} />
          <span className="sr-only">What this measures</span>
        </span>
        <span id={tooltipId} className="sr-only">
          {definition.formula}. Source: {definition.source}.
        </span>
      </div>

      {value.state === 'not-connected' ? <NotConnected source={value.missingSource} /> : null}

      {value.state === 'measured' ? (
        <>
          <span className="machine text-metric text-text">
            {formatKpiValue(value.value, definition.unit)}
          </span>
          {value.series && value.series.length > 1 ? (
            <Sparkline values={value.series} className={animateSeries ? 'draw-line' : undefined} />
          ) : null}
          {value.change === undefined ? null : (
            <span
              className={cn(
                'machine text-meta font-semibold',
                TONE_CLASS[changeTone(value.change, goodDirection)],
              )}
            >
              {formatChange(value.change)} vs last week
            </span>
          )}
          <span className="machine text-caption text-text-muted">
            {formatFreshness(value.capturedAt, now)}
          </span>
        </>
      ) : null}

      {value.state === 'projected' ? (
        <Projection
          text={formatKpiValue(value.value, definition.unit)}
          basis={value.basis}
          series={value.series}
        />
      ) : null}

      {target ? (
        <p
          className={cn(
            'm-0 mt-auto border-t border-border pt-2 text-caption',
            TARGET_CLASS[surface],
          )}
        >
          {/* "Target", never "guaranteed" — 15 §1. The basis is shown because
              a number with no stated origin reads as a promise. */}
          Target {formatKpiValue(target.value, definition.unit)} · {target.basis}
        </p>
      ) : null}
    </Card>
  )
}

/**
 * 15 §8: never a zero for a source nobody connected.
 *
 * A zero is a measurement. Printing one for an unconnected account is the
 * same class of untruth as an unlabelled AI scene — the interface stating
 * something it does not know.
 */
function NotConnected({ source }: { source: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-subtitle font-semibold text-text-muted">Not connected</span>
      <p className="m-0 text-caption text-text-muted">
        We cannot measure this until {source} is connected. We will not show a zero in the meantime.
      </p>
      <Button size="md" variant="secondary">
        <Plug aria-hidden="true" className="size-4" strokeWidth={1.8} />
        Connect {source}
      </Button>
    </div>
  )
}

/** 15 §8: dashed and labelled, never presented as an actual. */
function Projection({
  text,
  basis,
  series,
}: {
  text: string
  basis: string
  series?: readonly number[]
}) {
  return (
    <>
      <span className="machine text-metric text-text-muted">{text}</span>
      {series && series.length > 1 ? (
        // The dashes are what make a projection legible as one at a glance;
        // the word "Projection" below is what makes it legible when the
        // dashes are not perceivable — to a screen reader, or in print.
        <Sparkline values={series} className="text-text-muted" strokeDasharray="4 3" />
      ) : null}
      <span className="inline-flex w-fit items-center rounded-full border border-dashed border-border-strong px-2 py-0.5 text-caption text-text-muted">
        Projection · {basis}
      </span>
    </>
  )
}
