import { Button, Card } from '@mirrorline/ui'
import Link from 'next/link'

import { CUSTOM_KPI_ENTRY_LABELS, SAMPLE_CUSTOM_KPIS } from '@/lib/studio/cascade'

/**
 * Custom KPIs in Settings — 15 §4, 16 §5.
 *
 * A summary and a way in, not a second editor. The editing happens on Goals
 * and KPIs, where a custom KPI sits beside the ones we measure for you, which
 * is the only place the comparison makes sense. Two editors would eventually
 * be two lists.
 */

export function CustomKpisCard() {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">Your own KPIs</h2>
      <p className="m-0 text-meta text-text-muted">
        Things no platform can tell us — phone calls, walk-ins, reviews. Enter them by hand or
        import a CSV, and they sit beside everything else we measure.
      </p>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SAMPLE_CUSTOM_KPIS.map((kpi) => (
          <li
            key={kpi.key}
            className="mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2"
          >
            <span className="text-body text-text">{kpi.name}</span>
            <span className="text-meta text-text-muted">
              {CUSTOM_KPI_ENTRY_LABELS[kpi.entry]}
              {kpi.lastEntry ? (
                <>
                  {' · '}
                  <span className="machine">{kpi.lastEntry}</span>
                </>
              ) : (
                // 15 §8: nothing entered is not zero.
                ' · nothing entered yet'
              )}
            </span>
          </li>
        ))}
      </ul>

      <Button asChild variant="secondary" className="self-start">
        <Link href="/app/goals">Add or edit KPIs</Link>
      </Button>
    </Card>
  )
}
