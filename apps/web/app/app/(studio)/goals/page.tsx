import { Button, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Card } from '@mirrorline/ui'

import { GoalsBoard } from '@/components/studio/goals-board'
import { ONBOARDING } from '@/lib/routes'
import { resultsTabHref } from '@/lib/studio/results-tabs'
import { readGoalCascade } from '@/lib/workspace/read-goal-cascade'

/**
 * Goals and KPIs — 16 §5, "New (also reachable from Results)".
 *
 * Its own screen as well as a Results tab, because it is the one place a user
 * comes to *change* something rather than to read. The board is the same
 * component in both, so the two cannot drift.
 *
 * ============================================================================
 * The first screen off sample data (B2)
 * ============================================================================
 *
 * The cascade is read from the workspace. **There is no fallback to
 * `SAMPLE_CASCADE` here, and that is the point**: a studio screen quietly
 * rendering the demo workspace's goal would be the dishonest failure mode —
 * the user would see somebody else's numbers with nothing saying so, which is
 * exactly what non-negotiable 7's "Sample data" label exists to prevent. The
 * samples stay where they are honest: the marketing site, and the onboarding
 * wizard that labels them.
 *
 * No goal means onboarding has not finished, and the empty state says that and
 * links back to it.
 */

export const metadata: Metadata = {
  title: 'Goals and KPIs',
  description: 'Your outcome, the objectives under it, and the targets we track against.',
}

export default async function GoalsPage() {
  const cascade = await readGoalCascade()

  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow="Performance Analyst agent"
        title="Goals and KPIs"
        description="Your outcome, the objectives beneath it, and the key results we measure. Targets are proposals from your baseline — you can change any of them."
        action={
          <Button asChild variant="secondary">
            <Link href={resultsTabHref('overview')}>See the dashboard</Link>
          </Button>
        }
      />

      {cascade === null ? <NoGoalYet /> : <GoalsBoard cascade={cascade} />}
    </div>
  )
}

/**
 * What this screen shows before onboarding has written a goal.
 *
 * It names the one thing that would fill it rather than apologising. An empty
 * card reading "no data" would be true and useless.
 */
function NoGoalYet() {
  return (
    <Card as="section" aria-labelledby="no-goal-heading" className="flex flex-col gap-3">
      <h2 id="no-goal-heading" className="m-0 font-heading text-title text-text">
        Your goal is not set yet
      </h2>
      <p className="m-0 text-body text-text-muted">
        Onboarding asks what you do and what success would look like, in your own words. Once it
        has, the Performance Analyst proposes the objectives and key results that go here — and
        this screen is where you change any of them.
      </p>
      <div>
        <Button asChild variant="primary">
          <Link href={ONBOARDING}>Finish setting up</Link>
        </Button>
      </div>
    </Card>
  )
}
