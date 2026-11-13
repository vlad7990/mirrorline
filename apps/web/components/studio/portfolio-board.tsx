/**
 * The portfolio — 15 §4: "Scale-plan users with several brands get a portfolio
 * view across workspaces."
 *
 * One card per brand, each showing its own goal, because that is the point:
 * two brands on one plan can be chasing different outcomes. There is no single
 * "portfolio health" score and there will not be one — averaging a leads goal
 * against an awareness goal produces a number that is not about anything.
 *
 * **A brand inside its 14-day baseline gets no progress bar.** It has not been
 * given a target yet, and a bar drawn against a target nobody agreed is a bar
 * drawn against nothing. It gets the week's activity and a line saying when
 * its targets arrive.
 */

import { Card } from '@mirrorline/ui'

import { GOALS } from '@/lib/audience/account-type'
import {
  PORTFOLIO_PLAN_NAME,
  PORTFOLIO_TOTALS,
  type PortfolioBrand,
  SAMPLE_PORTFOLIO,
  hasAgreedTarget,
} from '@/lib/studio/portfolio'

import { GoalProgress } from '../kpi/goal-progress'

function goalLabel(brand: PortfolioBrand): string {
  return GOALS.find((goal) => goal.key === brand.goalKey)?.label ?? 'Goal'
}

export function PortfolioBoard({
  brands = SAMPLE_PORTFOLIO,
}: {
  readonly brands?: readonly PortfolioBrand[]
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card as="section" aria-labelledby="portfolio-totals" className="flex flex-col gap-3">
        <h2 id="portfolio-totals" className="m-0 font-heading text-title text-text">
          Across every brand
        </h2>
        <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Total label="Brands" value={PORTFOLIO_TOTALS.brands} />
          <Total label="Connected accounts" value={PORTFOLIO_TOTALS.accounts} />
          <Total label="Posts this week" value={PORTFOLIO_TOTALS.postsThisWeek} />
        </dl>
        <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
          These are sums, not averages. There is no single portfolio score, because these brands are
          chasing different outcomes and a number averaging them would not be about anything.
        </p>
      </Card>

      <ul className="m-0 flex list-none flex-col gap-5 p-0">
        {brands.map((brand) => (
          <li key={brand.id} className="min-w-0">
            <BrandCard brand={brand} />
          </li>
        ))}
      </ul>

      <p className="m-0 text-caption text-text-muted">
        The portfolio is part of the {PORTFOLIO_PLAN_NAME} plan. This workspace is on Growth, so
        what you are looking at is sample data showing what {PORTFOLIO_PLAN_NAME} adds.
      </p>
    </div>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="m-0 text-meta text-text-muted">{label}</dt>
      <dd className="machine m-0 text-metric text-text">{value.toLocaleString('en-US')}</dd>
    </div>
  )
}

function BrandCard({ brand }: { brand: PortfolioBrand }) {
  const headingId = `brand-${brand.id}`

  return (
    <Card as="section" aria-labelledby={headingId} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h3 id={headingId} className="m-0 font-heading text-title text-text">
          {brand.name}
        </h3>
        {/* Not gold. `--color-gold-text` is a public-site token fixed for a
            light band, and the studio has a dark theme — axe caught it here
            first. The studio's own accent pair is theme-aware. */}
        <span className="text-meta text-on-accent-soft">{goalLabel(brand)}</span>
      </div>

      {hasAgreedTarget(brand) && brand.periodElapsed !== null ? (
        <GoalProgress
          outcome={brand.outcome}
          current={brand.current}
          target={brand.target}
          unitLabel={brand.unitLabel}
          periodElapsed={brand.periodElapsed}
          periodLabel="this quarter"
        />
      ) : (
        <Baselining brand={brand} />
      )}

      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        <span className="machine">{brand.accountCount}</span>{' '}
        {brand.accountCount === 1 ? 'connected account' : 'connected accounts'} ·{' '}
        <span className="machine">{brand.postsThisWeek}</span> posts this week ·{' '}
        {brand.headlineKpiName}
      </p>
    </Card>
  )
}

/** A brand that has not finished its 14-day baseline. No target, no bar. */
function Baselining({ brand }: { brand: PortfolioBrand }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-heading text-subtitle text-text">{brand.outcome}</p>
      <p className="machine m-0 text-mono text-text-muted">
        <span className="text-text">{brand.current.toLocaleString('en-US')}</span> {brand.unitLabel}{' '}
        so far
      </p>
      <p className="m-0 text-caption text-text-muted">
        Still inside its 14-day baseline, so it has no target yet and no pace to report. The
        Performance Analyst proposes targets once the baseline closes and the Niche Scan benchmarks
        are in.
      </p>
    </div>
  )
}
