/**
 * One account, and several — the two shapes a dashboard takes (15 §2).
 *
 * `/metrics` explained the goals, the tiers, the dashboard and the honesty
 * rules, and never showed the thing a reader with three brands is actually
 * asking about: whether this is one dashboard per account or a place to see
 * all of them. 15's "Scale-plan users with several brands get a portfolio
 * view across workspaces" answers it, and 09 adds the part that matters
 * commercially — the portfolio view is the one plan-gated feature.
 *
 * **The data is the studio's own sample portfolio**, not a second fixture
 * written for a marketing page. Two copies of a sample is how a public page
 * ends up showing numbers the product does not produce.
 *
 * **Nothing is averaged across brands**, here or in the studio, and the
 * caption says so: a furniture brand's revenue and a clinic's bookings have
 * no mean worth printing, and a single "portfolio score" would be exactly the
 * invented figure non-negotiable 7 rules out.
 */

import { PORTFOLIO_PLAN_NAME, PORTFOLIO_TOTALS, SAMPLE_PORTFOLIO } from '@/lib/studio/portfolio'

import { ComingSoonLabel, SampleDataLabel, Section, SectionHeading } from './primitives'

/** The signed-in workspace is the first brand in the sample. */
const CURRENT = SAMPLE_PORTFOLIO[0]

function formatFigure(value: number, unitLabel: string): string {
  if (unitLabel === 'dollars') return `$${value.toLocaleString('en-US')}`
  return value.toLocaleString('en-US')
}

export function AccountViews() {
  return (
    <Section className="band-ink-alt" aria-labelledby="views-heading">
      <SectionHeading
        id="views-heading"
        eyebrow="One account, or several"
        rail
        title={
          <>
            Every account has its own goal.{' '}
            <span className="gold-phrase">So does every brand.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="A single account gets the dashboard above. Run more than one brand and the portfolio puts them side by side, each still measured against the goal it chose — because numbers under unlike goals do not add up to anything."
        aside={<SampleDataLabel />}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Per account ---------------------------------------------------- */}
        <div className="flex flex-col gap-4 rounded-lg border border-ink-line bg-ink-800/40 p-6">
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
              One account
            </p>
            <h3 className="m-0 text-label text-on-ink-900">{CURRENT?.name}</h3>
            <p className="m-0 text-meta text-on-ink-muted">{CURRENT?.outcome}</p>
          </div>

          {CURRENT ? (
            <dl className="m-0 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <dt className="m-0 text-meta text-on-ink-muted">{CURRENT.headlineKpiName}</dt>
                <dd className="machine m-0 text-mono text-on-ink-900">
                  {formatFigure(CURRENT.current, CURRENT.unitLabel)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="m-0 text-meta text-on-ink-muted">Target</dt>
                <dd className="machine m-0 text-mono text-on-ink-900">
                  {formatFigure(CURRENT.target, CURRENT.unitLabel)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="m-0 text-meta text-on-ink-muted">Accounts connected</dt>
                <dd className="machine m-0 text-mono text-on-ink-900">{CURRENT.accountCount}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="m-0 text-meta text-on-ink-muted">Posts this week</dt>
                <dd className="machine m-0 text-mono text-on-ink-900">{CURRENT.postsThisWeek}</dd>
              </div>
            </dl>
          ) : null}

          <p className="m-0 text-meta text-on-ink-muted">
            One goal, one set of KPIs, and a target proposed after fourteen days of measuring rather
            than on the day you sign.
          </p>
        </div>

        {/* Portfolio ------------------------------------------------------ */}
        <div className="flex flex-col gap-4 rounded-lg border border-ink-line bg-ink-800/40 p-6">
          <div className="flex flex-col gap-1">
            <p className="m-0 flex flex-wrap items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
              Several brands
              <ComingSoonLabel>{PORTFOLIO_PLAN_NAME} plan</ComingSoonLabel>
            </p>
            <h3 className="m-0 text-label text-on-ink-900">The portfolio view</h3>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {SAMPLE_PORTFOLIO.map((brand) => (
              <li
                key={brand.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink-line pb-3 last:border-b-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-body text-on-ink-900">{brand.name}</span>
                  <span className="text-meta text-on-ink-muted">{brand.headlineKpiName}</span>
                </span>
                <span className="machine text-mono text-on-ink-900">
                  {formatFigure(brand.current, brand.unitLabel)}
                </span>
              </li>
            ))}
          </ul>

          <p className="m-0 text-meta text-on-ink-muted">
            <span className="machine">{PORTFOLIO_TOTALS.brands}</span> brands ·{' '}
            <span className="machine">{PORTFOLIO_TOTALS.accounts}</span> accounts ·{' '}
            <span className="machine">{PORTFOLIO_TOTALS.postsThisWeek}</span> posts this week. Those
            are sums. Nothing is averaged across brands: a revenue figure and a bookings figure have
            no mean, and a single portfolio score would be a number we made up.
          </p>
        </div>
      </div>
    </Section>
  )
}
