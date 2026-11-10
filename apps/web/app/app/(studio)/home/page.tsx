import { Button, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { HOME_HEADER } from '@/components/home/home-data'
import {
  AgentActivityCard,
  HomeMetrics,
  LearningLoopCard,
  TodayCard,
} from '@/components/home/home-panels'
import { NeedsYouCard } from '@/components/home/needs-you-card'

/**
 * S2 · Home, the command centre.
 *
 * 03_SCREENS_SPEC: "the client sees in 5 seconds what happened today and what
 * needs them." So the order is: what the week looks like, what is waiting on
 * her, what goes out today, and what the agents did while she was away.
 *
 * DESIGN.md "Layout": a wide main column with a ~320px rail beside it on a
 * desktop. Below `lg` the grid collapses and the rail follows the content,
 * which is also its order in the markup.
 */

export const metadata: Metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow={HOME_HEADER.eyebrow}
        title={HOME_HEADER.title}
        description={HOME_HEADER.subline}
        action={
          <Button asChild variant="primary">
            <Link href="/app/upload">New upload</Link>
          </Button>
        }
      />

      <HomeMetrics />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <NeedsYouCard />
          <TodayCard />
        </div>

        <aside aria-label="Agents and results" className="flex min-w-0 flex-col gap-6">
          <AgentActivityCard />
          <LearningLoopCard />
        </aside>
      </div>
    </div>
  )
}
