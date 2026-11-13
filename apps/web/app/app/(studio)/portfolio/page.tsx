import { PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'

import { ComingSoonLabel, SampleDataLabel } from '@/components/marketing/primitives'
import { PortfolioBoard } from '@/components/studio/portfolio-board'
import { PORTFOLIO_PLAN_NAME } from '@/lib/studio/portfolio'

/**
 * Portfolio — 16 §5: "New (Scale plan, several brands)."
 *
 * The demo workspace is on Growth, not Scale, so the screen is reachable but
 * labelled twice: sample data, and a plan this account does not have. Showing
 * a feature someone has not bought, unlabelled, is the same class of untruth
 * as an unlabelled AI scene — the interface implying something that is not so.
 */

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Every brand in one view, each against its own goal.',
}

export default function PortfolioPage() {
  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow={`${PORTFOLIO_PLAN_NAME} plan`}
        title="Portfolio"
        description="Every brand you run, each measured against the goal it picked. Nothing here is averaged across brands."
        action={
          <span className="flex flex-wrap items-center gap-2">
            <SampleDataLabel />
            <ComingSoonLabel>{PORTFOLIO_PLAN_NAME} plan</ComingSoonLabel>
          </span>
        }
      />

      <PortfolioBoard />
    </div>
  )
}
