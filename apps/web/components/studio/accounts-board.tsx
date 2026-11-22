/**
 * One card per connected social account, each with its own KPIs — 15 §5 tab 4
 * and 15 §4 ("every metric is stored per connected social account").
 *
 * **The not-connected card is the point of the screen, not an edge case.**
 * Three cards with numbers and a fourth with a connect button is what an
 * honest dashboard looks like when an account is not connected. Filling that
 * fourth card with zeroes would make the screen tidier and the product a liar
 * — 15 §8 forbids exactly that, and this is the easiest place to break it.
 *
 * The platform notes come straight from `@mirrorline/mock`, which already
 * carries the uncomfortable ones: TikTok posts stay private until our app is
 * audited, and Instagram has disconnected us.
 */

import { type SocialAccount } from '@mirrorline/mock'
import { Button, Card, type Status, StatusChip } from '@mirrorline/ui'
import { Plug } from 'lucide-react'
import Link from 'next/link'

import { ACCOUNT_METRICS, type AccountMetrics } from '@/lib/studio/accounts'

import { KpiGrid } from './kpi-grid'

/**
 * The two statuses that get a chip.
 *
 * `not-connected` deliberately has none. The only neutral chip in the set is
 * "published", and borrowing it here would put a word on the screen that means
 * something else; the red `blocked` chip would be worse, because an account
 * nobody has connected yet is not an error. The card says so in a sentence
 * instead, which is what it needs anyway.
 */
const STATUS_TONE: Partial<Record<SocialAccount['status'], Status>> = {
  connected: 'passed',
  'reconnect-needed': 'needs-review',
}

export function AccountsBoard({
  accounts = ACCOUNT_METRICS,
  animateValues = false,
}: {
  readonly accounts?: readonly AccountMetrics[]
  /**
   * 17 §2's tick, passed only by the Results page.
   *
   * This board is on two screens: the Results "Accounts" tab, one of seven
   * you move between, and `/app/accounts`, which is a destination you land
   * on. Only the first is an arrival worth confirming — the argument is on
   * `KpiCardProps.animateValue`.
   */
  readonly animateValues?: boolean
}) {
  // The state every workspace is created in, and the one this board had
  // nothing to say about. See `NoAccountsYet`.
  if (accounts.length === 0) return <NoAccountsYet />

  return (
    <ul className="m-0 flex list-none flex-col gap-5 p-0">
      {accounts.map((entry) => (
        <li key={entry.account.id} className="min-w-0">
          <AccountCard entry={entry} animateValues={animateValues} />
        </li>
      ))}
    </ul>
  )
}

/**
 * A workspace that has connected nothing yet.
 *
 * **Not a cosmetic gap.** Until B2.3 this board read the fixtures, so it was
 * never empty; now it reads the workspace's own rows, and a new workspace has
 * none. The screen rendered a header over nothing at all — no explanation, and
 * no way onward — which is the first thing a real client would have seen.
 *
 * **A link rather than a button**, because the destination is another screen
 * rather than an action: connecting happens in Settings, which is where the
 * consent question lives (D107/D109). Repeating the handle field here would
 * put the one write with a consent record attached in two places.
 *
 * **An empty state, not a zero.** The same rule the not-connected card follows
 * — 15 §8, non-negotiable 7 — so this says what is absent and claims nothing.
 * The sample accounts are a `useState`-free default on this component's
 * `accounts` prop, so "render nothing" and "render the demo workspace" are one
 * mistake apart; `accounts-persist.spec.ts` asserts the demo handle and the
 * three sample hold values stay off this screen.
 */
function NoAccountsYet() {
  return (
    <Card as="section" className="flex flex-col items-start gap-2">
      <p className="m-0 text-body text-text-muted">No accounts connected yet.</p>
      <Link
        href="/app/settings"
        className="text-label text-primary underline-offset-4 hover:underline dark:text-accent"
      >
        Connect one in Settings → Connected accounts
      </Link>
    </Card>
  )
}

function AccountCard({
  entry,
  animateValues,
}: {
  entry: AccountMetrics
  animateValues: boolean
}) {
  const { account, kpis, leadShare } = entry
  const headingId = `account-${account.id}`
  const tone = STATUS_TONE[account.status]

  return (
    <Card as="section" aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {/* h2, not h3: on both screens that render this board the only
              heading above a card is the page's h1, and axe's heading-order
              rule is right that jumping to h3 invents a level nobody wrote. */}
          <h2 id={headingId} className="m-0 font-heading text-title text-text">
            {account.platformLabel}
          </h2>
          <p className="m-0 text-meta text-text-muted">
            {account.handle ? (
              <span className="machine">{account.handle}</span>
            ) : (
              account.displayName
            )}
            {account.connectedOn ? (
              <>
                {' · connected '}
                <span className="machine">{account.connectedOn}</span>
              </>
            ) : null}
          </p>
        </div>
        {tone ? <StatusChip status={tone}>{account.statusLabel}</StatusChip> : null}
      </div>

      {/* The honest limit, in the platform's own terms. 15 §8 asks for
          platform limits on the screen, not in a help article. */}
      {account.note ? <p className="m-0 text-meta text-text-muted">{account.note}</p> : null}

      {kpis.length > 0 ? (
        <>
          <KpiGrid kpis={kpis} columns={4} animateValues={animateValues} />
          {leadShare === null ? null : (
            <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
              <span className="machine">{Math.round(leadShare * 100)}%</span> of this week’s leads
              came through this account.
            </p>
          )}
        </>
      ) : (
        <NotConnectedBody platformLabel={account.platformLabel} />
      )}
    </Card>
  )
}

/**
 * 15 §8 again, and the reason this is its own function: the temptation to
 * render a dimmed KPI row here is strong, and a dimmed zero is still a zero.
 */
function NotConnectedBody({ platformLabel }: { platformLabel: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="m-0 text-meta text-text-muted">
        We have no measurements for {platformLabel} because it is not connected. We will not show
        zeroes in the meantime — a zero would be a claim about a number nobody took.
      </p>
      <Button variant="secondary">
        <Plug aria-hidden="true" className="size-4" strokeWidth={1.8} />
        Connect {platformLabel}
      </Button>
    </div>
  )
}
