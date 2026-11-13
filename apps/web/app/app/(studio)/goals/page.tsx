import { Button, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { GoalsBoard } from '@/components/studio/goals-board'
import { resultsTabHref } from '@/lib/studio/results-tabs'

/**
 * Goals and KPIs — 16 §5, "New (also reachable from Results)".
 *
 * Its own screen as well as a Results tab, because it is the one place a user
 * comes to *change* something rather than to read. The board is the same
 * component in both, so the two cannot drift.
 */

export const metadata: Metadata = {
  title: 'Goals and KPIs',
  description: 'Your outcome, the objectives under it, and the targets we track against.',
}

export default function GoalsPage() {
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

      <GoalsBoard />
    </div>
  )
}
