import { metrics } from '@mirrorline/mock'
import { PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { FunnelCard } from '@/components/results/funnel-card'
import { BestTimesCard, HookRankingCard } from '@/components/results/insights-cards'
import { ReportButton } from '@/components/results/report-button'
import { TopPostsCard } from '@/components/results/top-posts-card'

export const metadata: Metadata = {
  title: 'Results',
  description: 'Views, clicks and calls booked, and the hooks your audience answered.',
}

/** "6 calls booked", "1 call booked" — the headline reads either way. */
function plural(count: number, singular: string, pluralWord: string): string {
  return `${count} ${count === 1 ? singular : pluralWord}`
}

export default function ResultsPage() {
  const headline = `${plural(metrics.posts, 'post', 'posts')}, ${plural(
    metrics.callsBooked,
    'call booked',
    'calls booked',
  )}`

  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow="Performance Analyst agent · last 7 days"
        title={headline}
        action={<ReportButton />}
      />

      <FunnelCard />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <TopPostsCard />
        <div className="flex min-w-0 flex-col gap-5">
          <HookRankingCard />
          <BestTimesCard />
        </div>
      </div>

      <Link
        href="/app/agents"
        className="self-start text-label text-primary underline-offset-4 hover:underline dark:text-accent"
      >
        See how the agents used these results
      </Link>
    </div>
  )
}
