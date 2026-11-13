/**
 * The weekly Results Ledger — 15 §5 tab 6.
 *
 * Every column 15 §7's `ledger_weekly` carries, except one: this account's
 * goal is leads, it sells nothing through a tracked link, and so there is no
 * sales column. **An empty sales column would be a column of zeroes**, and
 * 15 §8 is clear that a zero for something nobody measured is a claim. The
 * note under the table names the missing column and says why, which is more
 * useful than a column of dashes.
 *
 * `StatTable` from `@mirrorline/ui` supplies the `<th scope>` headers, the
 * tabular figures and the `.scroll-x` wrapper DESIGN.md "Layout" asks for, so
 * the table scrolls inside its card rather than breaking the page at 390px.
 */

import { Card, StatTable, type StatColumn } from '@mirrorline/ui'
import * as React from 'react'

import { type LedgerWeek, SAMPLE_LEDGER } from '@/components/kpi/sample-dashboard'

import { LedgerExport } from './ledger-export'

function count(value: number): React.ReactNode {
  return <span className="machine">{value.toLocaleString('en-US')}</span>
}

const COLUMNS: readonly StatColumn<LedgerWeek>[] = [
  {
    key: 'week',
    header: 'Week',
    rowHeader: true,
    // The week label is the studio naming a period, so it stays in Geist;
    // everything to its right is a measurement and goes mono. DESIGN.md
    // "Typography — two voices".
    cell: (row) => row.week,
  },
  { key: 'posts', header: 'Posts', align: 'right', numeric: true, cell: (row) => count(row.posts) },
  { key: 'views', header: 'Views', align: 'right', numeric: true, cell: (row) => count(row.views) },
  { key: 'sends', header: 'Sends', align: 'right', numeric: true, cell: (row) => count(row.sends) },
  { key: 'saves', header: 'Saves', align: 'right', numeric: true, cell: (row) => count(row.saves) },
  {
    key: 'follows',
    header: 'Follows',
    align: 'right',
    numeric: true,
    cell: (row) => count(row.follows),
  },
  {
    key: 'leads',
    header: 'Leads',
    align: 'right',
    numeric: true,
    // The goal column. Bold, because it is the one the plan is judged on.
    cell: (row) => <span className="machine font-semibold">{row.leads}</span>,
  },
  {
    key: 'bookings',
    header: 'Bookings',
    align: 'right',
    numeric: true,
    cell: (row) => count(row.bookings),
  },
]

export function LedgerBoard({ rows = SAMPLE_LEDGER }: { readonly rows?: readonly LedgerWeek[] }) {
  return (
    <Card as="section" aria-labelledby="ledger-heading" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="ledger-heading" className="m-0 font-heading text-title text-text">
            The weekly ledger
          </h2>
          <p className="m-0 text-meta text-text-muted">
            Sent every Monday. It ends at leads and bookings rather than at views.
          </p>
        </div>
        <LedgerExport rows={[...rows]} />
      </div>

      <StatTable
        caption="Weekly results ledger: posts, views, sends, saves, follows, leads and bookings"
        captionHidden
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.week}
      />

      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        There is no sales column because nothing is sold through a tracked link on this account. We
        would rather name the missing column than fill it with zeroes. Connect a commerce tool and
        it appears.
      </p>
    </Card>
  )
}
