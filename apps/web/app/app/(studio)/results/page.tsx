import { Button, Card, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { GoalProgress } from '@/components/kpi/goal-progress'
import { SAMPLE_GOAL, SAMPLE_KPIS, type LedgerWeek } from '@/components/kpi/sample-dashboard'
import { BestTimesCard, HookRankingCard } from '@/components/results/insights-cards'
import { ResultsNav } from '@/components/results/results-nav'
import { TopPostsCard } from '@/components/results/top-posts-card'
import { AccountsBoard } from '@/components/studio/accounts-board'
import { AlertsBoard } from '@/components/studio/alerts-board'
import { FormatLeaderboard, FunnelBoard } from '@/components/studio/funnel-board'
import { GoalsBoard } from '@/components/studio/goals-board'
import { InsightBoard } from '@/components/studio/insight-board'
import { KpiGrid } from '@/components/studio/kpi-grid'
import { LedgerBoard } from '@/components/studio/ledger-board'
import { ONBOARDING } from '@/lib/routes'
import { type KpiAlert } from '@/lib/studio/insights'
import { type ResultsTabSlug, parseResultsTab, resultsTab } from '@/lib/studio/results-tabs'
import { readLedgerWeeks, readRaisedAlerts } from '@/lib/workspace/read-results'
import { readGoalCascade } from '@/lib/workspace/read-goal-cascade'

/**
 * S7 · Results — rebuilt as 15 §5's seven tabs.
 *
 * The tabs are links, not a widget: the reasoning, and the accessibility
 * argument that settled it, is in `lib/studio/results-tabs.ts`. The practical
 * effect here is that this page is a plain server component with a switch —
 * one tab's panel is in the DOM, the other six are not, and `?tab=` is both
 * the deep link and the thing the axe sweep walks.
 *
 * The heading is the tab's own, so every one of the seven URLs has a single
 * <h1> that says where you are.
 */

export const metadata: Metadata = {
  title: 'Results',
  description: 'Where this account stands against the goal it picked, and what we changed.',
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const slug = parseResultsTab(params.tab)
  const tab = resultsTab(slug)

  /**
   * Read for the two tabs that have real rows behind them (B2.4), and only
   * those: the Ledger and the Overview's alert bar.
   *
   * Fetched here rather than inside the boards because both are client
   * components with a sample-data default — which is exactly the D110 trap,
   * one screen along. Passing a value explicitly is what stops a real client's
   * Results screen rendering the demo workspace's ledger.
   *
   * The other five tabs still render fixtures. They read `metric_snapshots`,
   * which stays empty until B6 ingests, so converting them now would mean
   * choosing between sample figures and a screen of nothing — and that choice
   * belongs with the data that makes it answerable.
   */
  const [ledger, alerts] = await Promise.all([
    slug === 'ledger' ? readLedgerWeeks() : Promise.resolve(null),
    slug === 'overview' ? readRaisedAlerts() : Promise.resolve(null),
  ])

  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow="Performance Analyst agent · last 7 days"
        title={tab.label}
        description={tab.description}
      />

      <ResultsNav current={slug} />

      <Panel slug={slug} ledger={ledger} alerts={alerts} />
    </div>
  )
}

/**
 * The goals tab, read from the workspace like the Goals screen is.
 *
 * `GoalsBoard` defaults to `SAMPLE_CASCADE` when given no cascade, which is
 * right for the marketing site and wrong here: this tab would have gone on
 * rendering the demo workspace's goal, unlabelled, to a signed-in client. Its
 * own async component so the switch below can stay synchronous.
 */
async function GoalsTab() {
  const cascade = await readGoalCascade()

  if (cascade === null) {
    return (
      <Card as="section" aria-labelledby="results-no-goal" className="flex flex-col gap-3">
        <h2 id="results-no-goal" className="m-0 font-heading text-title text-text">
          Your goal is not set yet
        </h2>
        <p className="m-0 text-body text-text-muted">
          Finish onboarding and the Performance Analyst proposes the objectives and key results
          this tab reports against.
        </p>
        <div>
          <Button asChild variant="primary">
            <Link href={ONBOARDING}>Finish setting up</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return <GoalsBoard cascade={cascade} />
}

function Panel({
  slug,
  ledger,
  alerts,
}: {
  slug: ResultsTabSlug
  /** Null when the read failed, or when this tab did not ask for it. */
  ledger: readonly LedgerWeek[] | null
  alerts: readonly KpiAlert[] | null
}) {
  switch (slug) {
    case 'funnel':
      return <FunnelBoard />

    case 'content':
      return (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <TopPostsCard />
            <FormatLeaderboard />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <HookRankingCard />
            <BestTimesCard />
          </div>
        </div>
      )

    case 'accounts':
      return <AccountsBoard animateValues />

    case 'goals':
      return <GoalsTab />

    case 'ledger':
      return ledger === null ? <CouldNotRead what="your ledger" /> : <LedgerBoard rows={ledger} />

    case 'insights':
      return <InsightBoard />

    case 'overview':
    default:
      return <Overview alerts={alerts} />
  }
}

/**
 * The read failed, which is a different thing from there being nothing.
 *
 * Says so rather than rendering an empty board: "no weeks yet" would be a
 * claim about the client's account made on the strength of our own error.
 * The same split `readSocialAccounts` draws between null and `[]`.
 */
function CouldNotRead({ what }: { what: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-subtitle font-semibold">We could not read {what}</span>
      <p className="m-0 text-caption text-text-muted">
        Nothing is lost — this is a read, and your results are unchanged. Reload the page, and tell
        us if it keeps happening.
      </p>
    </Card>
  )
}

/**
 * 15 §5 tab 1: the goal bar, the KPI cards with target, trend and sparkline,
 * and anything off track.
 *
 * Alerts come first. They are the only thing on this screen that is asking
 * the reader to do something, and a dashboard that buries its one action
 * under four rows of green numbers has chosen to look good over to be useful.
 */
function Overview({ alerts }: { alerts: readonly KpiAlert[] | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* `null` is a failed read and `[]` is a quiet week; both render no bar,
          because an alert bar is for something that needs doing and neither
          case is. The board returns null for an empty list already. */}
      <AlertsBoard alerts={alerts ?? []} />
      {/* Directly under the page's h1, so the bar's own heading is an h2. */}
      <GoalProgress {...SAMPLE_GOAL} headingLevel={2} />
      {/* 17 §2: the numbers tick on arrival. The seven tabs are seven routes,
          so "arrival" is a navigation and the tick says these figures belong
          to the tab you just opened. `/app/home` does not do this — see
          `KpiCardProps.animateValue`. */}
      <KpiGrid kpis={SAMPLE_KPIS} columns={4} animateValues />

      <Link
        href="/app/agents"
        className="self-start text-label text-primary underline underline-offset-4 dark:text-accent"
      >
        See how the agents used these results
      </Link>
    </div>
  )
}
