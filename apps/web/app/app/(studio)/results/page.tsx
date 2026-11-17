import { PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { GoalProgress } from '@/components/kpi/goal-progress'
import { SAMPLE_GOAL, SAMPLE_KPIS } from '@/components/kpi/sample-dashboard'
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
import { type ResultsTabSlug, parseResultsTab, resultsTab } from '@/lib/studio/results-tabs'

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

  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow="Performance Analyst agent · last 7 days"
        title={tab.label}
        description={tab.description}
      />

      <ResultsNav current={slug} />

      <Panel slug={slug} />
    </div>
  )
}

function Panel({ slug }: { slug: ResultsTabSlug }) {
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
      return <GoalsBoard />

    case 'ledger':
      return <LedgerBoard />

    case 'insights':
      return <InsightBoard />

    case 'overview':
    default:
      return <Overview />
  }
}

/**
 * 15 §5 tab 1: the goal bar, the KPI cards with target, trend and sparkline,
 * and anything off track.
 *
 * Alerts come first. They are the only thing on this screen that is asking
 * the reader to do something, and a dashboard that buries its one action
 * under four rows of green numbers has chosen to look good over to be useful.
 */
function Overview() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AlertsBoard />
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
