import { Button, Card, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { HOME_HEADER } from '@/components/home/home-data'
import { AgentActivityCard, LearningLoopCard, TodayCard } from '@/components/home/home-panels'
import { NeedsYouCard } from '@/components/home/needs-you-card'
import { GoalProgress } from '@/components/kpi/goal-progress'
import { SAMPLE_GOAL, SAMPLE_HEADLINE_KPIS } from '@/components/kpi/sample-dashboard'
import { AlertsBoard } from '@/components/studio/alerts-board'
import { KpiGrid } from '@/components/studio/kpi-grid'

/**
 * S2 · Home, the command centre.
 *
 * 03_SCREENS_SPEC: "the client sees in 5 seconds what happened today and what
 * needs them." So the order is: anything off track, where the goal stands,
 * what is waiting on her, what goes out today, and what the agents did while
 * she was away.
 *
 * **16 §5 replaces the four metric tiles with the goal bar and three KPI
 * cards.** The tiles reported views, clicks and calls booked — activity, in
 * the shape every clipping tool reports it. The cards report leads, sends and
 * followers against targets this account agreed to, which is the difference
 * the product is selling. Keeping both would have been four tiles arguing
 * with three cards about which number matters.
 *
 * Alerts come first, above the goal, because they are the only thing on the
 * screen asking her to do something today.
 *
 * DESIGN.md "Layout": a wide main column with a ~320px rail beside it on a
 * desktop. Below `lg` the grid collapses and the rail follows the content,
 * which is also its order in the markup.
 */

export const metadata: Metadata = { title: 'Home' }

export default function HomePage() {
  return (
    // DESIGN.md: studio surfaces tighten up relative to marketing. 24px rather
    // than 28px between the big blocks, still on the 8px grid.
    <div className="flex flex-col gap-6">
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

      <AlertsBoard />

      <Card as="section" aria-labelledby="home-goal" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="home-goal" className="m-0 font-heading text-title text-text">
            Your goal
          </h2>
          <Link
            href="/app/goals"
            className="text-label text-primary underline underline-offset-4 dark:text-accent"
          >
            Goals and KPIs
          </Link>
        </div>

        <GoalProgress {...SAMPLE_GOAL} />
        {/* The three 15 §5 calls "the three most important", for this goal. */}
        <KpiGrid kpis={SAMPLE_HEADLINE_KPIS} columns={3} />
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <NeedsYouCard />
          <TodayCard />
        </div>

        {/* A labelled `section` — a `region` — rather than an `aside`. These
            cards are part of the screen's own content rather than something
            tangential to it, and an `aside` inside `main` is a complementary
            landmark nested in another landmark (axe `moderate`, blocking since
            D75). `section` keeps the name, which is what made the grouping
            worth having. */}
        <section aria-label="Agents and results" className="flex min-w-0 flex-col gap-5">
          <AgentActivityCard />
          <LearningLoopCard />
        </section>
      </div>
    </div>
  )
}
