/**
 * /admin/funnel — our own funnel, for us (14 §4).
 *
 * **Internal, and outside the marketing layout on purpose**: no site header,
 * no footer, no nav entry, because it is not part of the public site and
 * should not look like it is.
 *
 * It is sample data. There is no analytics vendor wired up — `lib/analytics`
 * writes to the console in development and does nothing in production — so
 * the counts below are illustrative, and the page says so rather than
 * implying we are measuring something we are not.
 *
 * `noindex`, because a page that reads like an internal dashboard has no
 * business in a search result.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { SampleDataLabel } from '@/components/marketing/primitives'
import type { FUNNEL_EVENTS } from '@/lib/analytics/events'

export const metadata: Metadata = {
  title: 'Funnel (internal)',
  robots: { index: false, follow: false },
}

interface Step {
  readonly event: (typeof FUNNEL_EVENTS)[number]
  readonly label: string
  readonly count: number
}

/**
 * The eleven events from 14 §4, with illustrative counts.
 *
 * Kept in the spec's order rather than sorted by count: the order *is* the
 * funnel, and sorting would hide an inversion, which is the single most
 * useful thing a funnel chart can show you.
 */
const STEPS: readonly Step[] = [
  { event: 'account_type_selected', label: 'Picked business or individual', count: 1240 },
  { event: 'goal_selected', label: 'Chose a goal', count: 712 },
  { event: 'problem_card_clicked', label: 'Opened a problem card', count: 486 },
  { event: 'niche_scan_started', label: 'Started a Niche Scan', count: 268 },
  { event: 'niche_scan_submitted', label: 'Submitted the scan form', count: 141 },
  { event: 'scan_report_opened', label: 'Opened their scan report', count: 97 },
  { event: 'call_booked', label: 'Booked a call', count: 34 },
  { event: 'checkout_started', label: 'Started checkout', count: 22 },
  { event: 'checkout_completed', label: 'Completed checkout', count: 14 },
  { event: 'account_connected', label: 'Connected an account', count: 12 },
  { event: 'first_post_approved', label: 'Approved a first post', count: 11 },
]

/** Below this a bar would vanish and read as zero. */
const MIN_BAR_PERCENT = 0.6

export default function AdminFunnelPage() {
  const first = STEPS[0]?.count ?? 1

  return (
    <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-5 py-12 sm:px-8">
      <header className="flex flex-col gap-2">
        <span className="eyebrow">Internal</span>
        <h1 className="m-0 font-heading text-headline text-text">Funnel</h1>
        <p className="m-0 max-w-[68ch] text-body text-text-muted">
          The eleven events from the funnel spec, in funnel order. Not sorted by count — the order
          is the funnel, and sorting would hide an inversion, which is the most useful thing this
          chart can show.
        </p>
      </header>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-heading text-subtitle text-text">Last 30 days</h2>
          <SampleDataLabel />
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {STEPS.map((step, position) => {
            const share = first > 0 ? step.count / first : 0
            const width = Math.max(MIN_BAR_PERCENT, share * 100)
            const previous = STEPS[position - 1]
            const stepRate =
              previous && previous.count > 0
                ? `${Math.round((step.count / previous.count) * 100)}% of previous`
                : 'all sessions'

            return (
              <li key={step.event} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="text-meta text-text">{step.label}</span>
                  <span className="machine text-mono text-text-muted">
                    {step.count.toLocaleString('en-US')} · {stepRate}
                  </span>
                </div>
                {/* One shared scale across every row, so the real drop-off
                    shows rather than each row rescaling to its own width. */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
                </div>
                <span className="machine text-caption text-text-muted">{step.event}</span>
              </li>
            )
          })}
        </ol>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="m-0 font-heading text-subtitle text-text">Where these numbers come from</h2>
        <p className="m-0 max-w-[72ch] text-meta text-text-muted">
          Nowhere, yet. There is no analytics vendor connected to this site: the event adapter
          writes to the browser console in development and does nothing in production, and no
          cookie is set for any of it. The figures above are illustrative so the chart can be built
          and reviewed before a vendor is chosen. When one is, this page reads real counts and the
          sample label comes off.
        </p>
      </Card>
    </main>
  )
}
