/**
 * A row of KPI cards.
 *
 * Extracted from `metrics-preview.tsx`, which composes the same grid but drags
 * the funnel, the ledger and the seven-goal block along with it — right for a
 * marketing section, wrong for the four places in the studio that want the
 * cards alone.
 *
 * A list rather than a bare grid of divs: these are a set of related figures,
 * and a screen reader should be able to say how many there are.
 */

import { cn } from '@mirrorline/ui'

import { KpiCard } from '@/components/kpi/kpi-card'
import { type Kpi } from '@/components/kpi/kpi-types'
import { LOWER_IS_BETTER, SAMPLE_NOW } from '@/components/kpi/sample-dashboard'

export interface KpiGridProps {
  readonly kpis: readonly Kpi[]
  /** Columns at `lg`. Three for a headline strip, four for a full set. */
  readonly columns?: 2 | 3 | 4
  /**
   * The instant freshness is measured against. Defaults to the sample's frozen
   * clock so a server render and a client render cannot disagree — the trap
   * written up in `sample-dashboard.ts`.
   */
  readonly now?: Date
  /**
   * Tick the figures up on arrival (17 §2).
   *
   * Passed by the Results page and by nothing else. The reasoning — why a
   * navigation earns a tick and `/app/home` does not — is on
   * `KpiCardProps.animateValue`, which is where anyone switching it on for a
   * new screen will be reading.
   */
  readonly animateValues?: boolean
  readonly className?: string
}

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

export function KpiGrid({
  kpis,
  columns = 3,
  now = SAMPLE_NOW,
  animateValues = false,
  className,
}: KpiGridProps) {
  if (kpis.length === 0) return null

  return (
    <ul className={cn('m-0 grid list-none grid-cols-1 gap-4 p-0', COLUMN_CLASS[columns], className)}>
      {kpis.map((kpi) => (
        <li key={kpi.definition.key} className="min-w-0">
          <KpiCard
            kpi={kpi}
            now={now}
            // Cost per lead and upload-to-first-post improve by falling.
            // Colouring their drop red would tell the user they are losing
            // while they are winning.
            goodDirection={LOWER_IS_BETTER.has(kpi.definition.key) ? 'down' : 'up'}
            animateValue={animateValues}
          />
        </li>
      ))}
    </ul>
  )
}
