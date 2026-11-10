'use client'

import { accounts, invoices, workspace, type Invoice } from '@mirrorline/mock'
import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Divider,
  ProgressBar,
} from '@mirrorline/ui'

/**
 * "Growth plan" — the plan, the usage meter and the invoices.
 *
 * CLAUDE.md non-negotiable 11: "no paid API calls beyond test mode". Billing
 * is a mockup here, so "Upgrade to Scale" opens a dialog that says so rather
 * than pretending to take money.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** The pilot is sold as a fixed two weeks; every other plan bills by month. */
const TWO_WEEK_PLAN_NAME = 'Pilot'

const ISO_MONTH_START = 5
const ISO_MONTH_END = 7

/** "Growth, November" · "Pilot, 2 weeks". */
function invoicePeriodLabel(invoice: Invoice): string {
  if (invoice.planName === TWO_WEEK_PLAN_NAME) return '2 weeks'
  const monthIndex = Number(invoice.date.slice(ISO_MONTH_START, ISO_MONTH_END)) - 1
  return MONTH_NAMES[monthIndex] ?? invoice.dateLabel
}

/** The platforms the plan actually posts to. */
const connectedPlatformCount = accounts.filter(
  (account) => account.status !== 'not-connected',
).length

export function PlanCard() {
  // Split from "a month" so the amount can take the machine's voice without
  // dragging the words with it. DESIGN.md "Typography — two voices".
  const priceAmount = `$${workspace.planPriceUsdPerMonth.toLocaleString('en-US')}`
  const usageLabel = `${workspace.postsUsed} of ${workspace.postsIncluded}`

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 font-heading text-subtitle text-text">{workspace.planName} plan</h2>
          {/* The price and the two counts are figures; the nouns beside them
              are the studio's. DESIGN.md "Don't": never set a cost in Geist
              Sans because it happens to sit in a line of text. */}
          <p className="m-0 text-meta text-text-muted">
            <span className="machine">{priceAmount}</span> a month ·{' '}
            <span className="machine">{workspace.postsIncluded}</span> posts ·{' '}
            <span className="machine">{connectedPlatformCount}</span> platforms
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="primary">Upgrade to Scale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Upgrade to Scale</DialogTitle>
            <DialogDescription>Billing isn&apos;t connected yet in this preview.</DialogDescription>
            <DialogClose asChild>
              <Button variant="secondary" className="self-start">
                Close
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
          <span className="text-text-muted">Posts used this month</span>
          {/* The same "63 of 90" readout as the sidebar meter, same voice. */}
          <span className="machine font-semibold text-text">{usageLabel}</span>
        </div>
        <ProgressBar
          label="Posts used this month"
          value={workspace.postsUsed}
          max={workspace.postsIncluded}
          valueText={`${usageLabel} posts`}
        />
      </div>

      <h3 className="m-0 font-body text-label text-text">Invoices</h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="flex flex-col gap-2 pt-2">
            <Divider />
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-1 text-meta">
              {/* The date and the amount are what the billing record says, so
                  they read in the machine's voice. The plan name and its
                  period between them are the studio naming what was sold. */}
              <span className="machine text-text-muted">{invoice.dateLabel}</span>
              <span className="min-w-0 flex-1 text-text">
                {invoice.planName}, {invoicePeriodLabel(invoice)}
              </span>
              <span className="machine font-semibold text-text">{invoice.amountLabel}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
