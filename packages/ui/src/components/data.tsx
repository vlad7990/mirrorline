/**
 * Honest numbers: metric tiles, sparklines, the funnel, tables and the
 * best-times heatmap.
 *
 * DESIGN.md "Metric tile": "label, big number, coral sparkline, and a green
 * delta line ('+18% vs last week')."
 * DESIGN.md "Funnel": "horizontal bars on one shared scale, with counts and
 * step rates, so the real drop-off shows."
 * DESIGN.md "Typography": metrics use tabular figures "so columns of numbers
 * line up" — the `.tabular` utility.
 *
 * Every chart here is decoration over text. The numbers are always present as
 * real characters, so nothing depends on seeing a shape or a colour.
 */

import * as React from 'react'

import { cn } from '../cn'
import { Card } from './primitives'

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                   */
/* -------------------------------------------------------------------------- */

const SPARK_WIDTH = 200
const SPARK_HEIGHT = 40
/** Keeps the stroke from clipping at the top and bottom edges. */
const SPARK_PADDING = 3

// `values` is omitted from the SVG attributes because SMIL already claims it
// as a string; ours is the data series.
export interface SparklineProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'values'> {
  /** Two or more values, oldest first. */
  values: readonly number[]
  strokeWidth?: number
}

function toPoints(values: readonly number[]): string {
  if (values.length < 2) return ''

  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  // A flat series would divide by zero; draw it through the middle instead.
  const span = max - min || 1
  const usable = SPARK_HEIGHT - SPARK_PADDING * 2

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * SPARK_WIDTH
      const y = SPARK_PADDING + (1 - (value - min) / span) * usable
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/**
 * An inline polyline in accent coral. No axes, no grid, no fill.
 * aria-hidden on purpose: the number it summarises sits next to it in text.
 */
export function Sparkline({ values, strokeWidth = 2.5, className, ...props }: SparklineProps) {
  const points = toPoints(values)
  if (!points) return null

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('h-10 w-full text-accent', className)}
      {...props}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        // The viewBox is stretched to fit; this keeps the line an even weight.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* MetricTile                                                                  */
/* -------------------------------------------------------------------------- */

export type DeltaDirection = 'up' | 'down' | 'flat'

/** Each tone is a token that clears 4.5:1 on surface in both themes. */
const DELTA_TONES: Record<DeltaDirection, string> = {
  up: 'text-on-success-soft',
  down: 'text-on-danger-soft',
  flat: 'text-text-muted',
}

export interface MetricTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "Views this week". */
  label: string
  /** Pre-formatted, e.g. "48.3K" — the locale call belongs to the caller. */
  value: string
  /** The trend series behind the number. */
  series?: readonly number[]
  /** "+18% vs last week". Always a sentence, never a bare arrow. */
  delta?: string
  deltaDirection?: DeltaDirection
}

/** Label, big tabular number, coral sparkline, green delta line. */
export function MetricTile({
  label,
  value,
  series,
  delta,
  deltaDirection = 'up',
  className,
  ...props
}: MetricTileProps) {
  return (
    <Card padding="sm" className={cn('flex flex-col gap-1.5 px-5 py-[18px]', className)} {...props}>
      {/* The studio's voice: a label is the product naming the thing. Sans. */}
      <span className="text-meta text-text-muted">{label}</span>
      {/* The machine's voice. `metric` is a Geist Mono token, so the family has
          to come from `.machine` — `font-body` was quietly overriding it with
          Geist Sans and losing the whole distinction. `.machine` also carries
          the tabular figures that the column alignment depends on. */}
      <span className="machine text-metric text-text">{value}</span>
      {series && series.length > 1 ? <Sparkline values={series} /> : null}
      {delta ? (
        // A delta is a measurement, so it is mono even though it reads as a
        // short phrase: "+18% vs last week" is the machine reporting a
        // comparison it made, and it sits directly under a mono figure.
        <span className={cn('machine text-meta font-semibold', DELTA_TONES[deltaDirection])}>
          {delta}
        </span>
      ) : null}
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* FunnelBar                                                                   */
/* -------------------------------------------------------------------------- */

export interface FunnelStep {
  label: string
  count: number
}

export interface FunnelBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ordered, widest first. The first step sets the shared scale. */
  steps: readonly FunnelStep[]
  /** What the first row says instead of a step rate. */
  baselineRate?: string
  /** How the counts are written out. Defaults to en-US grouping. */
  formatCount?: (count: number) => string
}

/** Below this the bar would vanish and read as "zero". */
const MIN_BAR_PERCENT = 0.6

function defaultFormatCount(count: number): string {
  return count.toLocaleString('en-US')
}

/**
 * One shared scale across every row, so the drop between stages is the real
 * drop and not a per-row rescale. DESIGN.md requires exactly this.
 */
export function FunnelBar({
  steps,
  baselineRate = 'all views',
  formatCount = defaultFormatCount,
  className,
  ...props
}: FunnelBarProps) {
  const first = steps[0]
  if (!first) return null
  // Guard against an all-zero funnel.
  const scale = first.count > 0 ? first.count : 1

  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {steps.map((step, index) => {
        const previous = index > 0 ? steps[index - 1] : undefined
        const percent = Math.max((step.count / scale) * 100, MIN_BAR_PERCENT)
        const rate =
          previous && previous.count > 0
            ? `${((step.count / previous.count) * 100).toFixed(1)}% of ${previous.label.toLowerCase()}`
            : baselineRate
        const isLast = index === steps.length - 1

        return (
          <div key={step.label} className="flex flex-wrap items-center gap-3.5">
            {/* The stage name is prose the studio wrote. Sans. */}
            <span className="w-[120px] shrink-0 text-label text-text">{step.label}</span>
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
            {/* Count and step rate are both the machine's. DESIGN.md "Funnel":
                "counts and step rates in mono, so the real drop-off shows". */}
            <span className="machine w-20 shrink-0 text-right text-label text-text">
              {formatCount(step.count)}
            </span>
            <span className="machine w-[140px] shrink-0 text-meta text-text-muted">{rate}</span>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* StatTable                                                                   */
/* -------------------------------------------------------------------------- */

export interface StatColumn<Row> {
  /** Stable key, for React and for nothing else. */
  key: string
  header: React.ReactNode
  /** Right-align numbers so the columns line up. */
  align?: 'left' | 'right'
  /** Render tabular figures in this column. */
  numeric?: boolean
  /** Make this column the row header. At most one per table. */
  rowHeader?: boolean
  cell: (row: Row) => React.ReactNode
}

export interface StatTableProps<Row> {
  /** Describes the table. Required — a table with no caption is a maze. */
  caption: React.ReactNode
  /** Hide the caption visually while keeping it for screen readers. */
  captionHidden?: boolean
  columns: readonly StatColumn<Row>[]
  rows: readonly Row[]
  rowKey: (row: Row, index: number) => string
  className?: string
  /** Minimum width before the wrapper scrolls horizontally. */
  minWidth?: number
}

/**
 * A plain semantic table with real <th scope> headers. DESIGN.md "Layout":
 * "Wide content (the calendar week grid, tables) scrolls horizontally inside
 * its card instead of breaking the page" — hence the `.scroll-x` wrapper.
 */
export function StatTable<Row>({
  caption,
  captionHidden = false,
  columns,
  rows,
  rowKey,
  className,
  minWidth = 520,
}: StatTableProps<Row>) {
  return (
    <div className={cn('scroll-x', className)}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption
          className={cn(
            'text-left',
            captionHidden ? 'sr-only' : 'pb-2 font-heading text-title text-text',
          )}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-3 py-2.5 text-caption text-text-muted',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => {
                const classes = cn(
                  'border-t border-border px-3 py-2.5 text-body text-text',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  // `numeric` is what marks a column as the machine's output,
                  // so it now switches the family as well as the figures. The
                  // text columns stay sans: a post title or a format name is
                  // the studio talking. The <th> headers stay sans too — a
                  // column heading is a word, not a measurement.
                  column.numeric && 'machine',
                )
                return column.rowHeader ? (
                  <th key={column.key} scope="row" className={cn(classes, 'font-normal')}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.key} className={classes}>
                    {column.cell(row)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Heatmap                                                                     */
/* -------------------------------------------------------------------------- */

export interface HeatmapCell {
  /** Intensity from 0 to 1. Clamped. */
  value: number
  /** The whole sentence for this cell: "Monday 7:30 am · 1,240 views". */
  label: string
}

export interface HeatmapRow {
  /** Row header, e.g. "7:30 am". */
  label: string
  cells: readonly HeatmapCell[]
}

export interface HeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  caption: React.ReactNode
  captionHidden?: boolean
  /** One per column, e.g. ["Mon", "Tue", …]. */
  columnLabels: readonly string[]
  rows: readonly HeatmapRow[]
  /** The line that explains what darker means. */
  legend?: React.ReactNode
}

const MIN_ALPHA = 12
const MAX_ALPHA = 92

/** Accent at a varying alpha. No new hues — one token, many weights. */
function cellBackground(value: number): string {
  const clamped = Math.min(Math.max(value, 0), 1)
  const alpha = MIN_ALPHA + clamped * (MAX_ALPHA - MIN_ALPHA)
  return `color-mix(in srgb, var(--color-accent) ${alpha.toFixed(0)}%, transparent)`
}

/**
 * The best-posting-times grid. It is a real table: every cell is a <td> that
 * carries a sentence, so the pattern reads without seeing the shading at all.
 */
export function Heatmap({
  caption,
  captionHidden = false,
  columnLabels,
  rows,
  legend,
  className,
  ...props
}: HeatmapProps) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} {...props}>
      <table className="w-full border-separate border-spacing-1">
        <caption
          className={cn(
            'text-left',
            captionHidden ? 'sr-only' : 'pb-2 font-heading text-title text-text',
          )}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {/* The corner cell names the row-header column. */}
            <th scope="col" className="w-16 text-left text-caption text-text-muted">
              Time
            </th>
            {columnLabels.map((label, index) => (
              <th
                key={`${label}-${index}`}
                scope="col"
                className="text-center text-caption text-text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              {/* A posting time is a clock reading, which DESIGN.md lists
                  under the machine voice along with costs and timings. */}
              <th scope="row" className="machine text-left text-meta font-normal text-text">
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.label}-${index}`}
                  title={cell.label}
                  // The cell's value is the sentence it carries — "Monday 7:30
                  // am · 1,240 views" — which the shading only decorates. Mono
                  // on the cell keeps that figure in the machine's voice
                  // wherever it is read from: the `title`, the screen-reader
                  // text, or any count a caller renders inside it.
                  className="machine h-[22px] rounded-sm"
                  style={{ backgroundColor: cellBackground(cell.value) }}
                >
                  <span className="sr-only">{cell.label}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {legend ? <p className="m-0 text-meta text-text-muted">{legend}</p> : null}
    </div>
  )
}
