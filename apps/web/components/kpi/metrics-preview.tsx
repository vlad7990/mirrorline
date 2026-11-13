/**
 * The dashboard preview from 16 §3 row 11: goal bar, KPI cards, funnel and
 * ledger, all with sample data, plus the seven goals from 15 §2.
 *
 * This is the section carrying v4's main claim — that **every** account gets
 * goals, KPIs and a real dashboard, whatever industry it is in. So it shows
 * the thing rather than describing it.
 *
 * It shows a **not-connected** card and a **projection** on purpose. A
 * preview made only of healthy green numbers would misrepresent the product
 * in the direction that flatters us, which is the one direction
 * non-negotiable 7 exists to rule out.
 */

import { Card, FunnelBar, cn } from '@mirrorline/ui'
import * as React from 'react'

import { GOALS } from '@/lib/audience/account-type'

import { SampleDataLabel } from '../marketing/primitives'

import { GoalProgress } from './goal-progress'
import { KpiCard } from './kpi-card'
import {
  LOWER_IS_BETTER,
  SAMPLE_FUNNEL,
  SAMPLE_GOAL,
  SAMPLE_HEADLINE_KPIS,
  SAMPLE_KPIS,
  SAMPLE_LEDGER,
  SAMPLE_NOW,
} from './sample-dashboard'

export interface MetricsPreviewProps {
  /** Dark band: picks the gold that passes contrast there. */
  readonly onInk?: boolean
  /** The fuller card set, for /metrics. The home page shows the top three. */
  readonly full?: boolean
  readonly className?: string
}

export function MetricsPreview({ onInk, full, className }: MetricsPreviewProps) {
  const kpis = full ? SAMPLE_KPIS : SAMPLE_HEADLINE_KPIS

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card className="flex flex-col gap-6">
        <GoalProgress {...SAMPLE_GOAL} onInk={onInk} />

        <ul
          className={cn(
            'm-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2',
            full ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          {kpis.map((kpi) => (
            <li key={kpi.definition.key}>
              <KpiCard
                kpi={kpi}
                now={SAMPLE_NOW}
                // A marketing band is fixed whatever the theme, so the card is
                // told which one it is on rather than left to follow `.dark`.
                surface={onInk ? 'ink' : 'snow'}
                goodDirection={LOWER_IS_BETTER.has(kpi.definition.key) ? 'down' : 'up'}
              />
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h3 className="m-0 font-heading text-subtitle text-text">Views to bookings</h3>
          <FunnelBar steps={[...SAMPLE_FUNNEL]} />
          <p className="m-0 text-caption text-text-muted">
            One shared scale across every row, so the drop between stages is the real drop.
          </p>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="m-0 font-heading text-subtitle text-text">The weekly ledger</h3>
          <LedgerTable />
          <p className="m-0 text-caption text-text-muted">
            Sent every week, exportable as CSV and PDF. It ends at leads and bookings rather than at
            views.
          </p>
        </Card>
      </div>

      <GoalGrid onInk={onInk} />
    </div>
  )
}

/** 15 §5 tab 6. Scrolls inside its card rather than widening the page. */
function LedgerTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Sample weekly results ledger for a fictional demo account
        </caption>
        <thead>
          <tr className="border-b border-border">
            {['Week', 'Posts', 'Views', 'Sends', 'Follows', 'Leads'].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="whitespace-nowrap py-2 pr-4 text-caption font-semibold text-text-muted"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_LEDGER.map((row) => (
            <tr key={row.week} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="whitespace-nowrap py-2 pr-4 text-meta font-normal text-text"
              >
                {row.week}
              </th>
              {/* Every figure is a measurement, so every figure is mono with
                  tabular digits — that is what makes the columns line up. */}
              <td className="machine py-2 pr-4 text-mono text-text-muted">{row.posts}</td>
              <td className="machine py-2 pr-4 text-mono text-text-muted">
                {row.views.toLocaleString('en-US')}
              </td>
              <td className="machine py-2 pr-4 text-mono text-text-muted">{row.sends}</td>
              <td className="machine py-2 pr-4 text-mono text-text-muted">{row.follows}</td>
              <td className="machine py-2 text-mono text-text">{row.leads}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The seven goals from 15 §2, each with its headline KPI.
 *
 * This is the industry-agnostic argument in one block: what decides the
 * measurements is the goal you pick, and there is no row here for a trade.
 */
function GoalGrid({ onInk }: { onInk?: boolean }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="m-0 font-heading text-subtitle text-text">
          Seven goals. Your KPIs follow the one you pick.
        </h3>
        <SampleDataLabel />
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border p-0 sm:grid-cols-2 lg:grid-cols-3">
        {GOALS.map((goal) => (
          <li key={goal.key} className="flex flex-col gap-1 bg-surface p-4">
            <span className="text-meta font-semibold text-text">{goal.label}</span>
            <span className={cn('machine text-mono', onInk ? 'text-gold-bright' : 'text-gold-text')}>
              {goal.headlineKpi}
            </span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-caption text-text-muted">
        Not one of these is an industry. The goal decides the KPI set, the targets and the
        dashboard — your trade only decides what the agents research.
      </p>
    </Card>
  )
}
