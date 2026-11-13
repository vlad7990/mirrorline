/**
 * Off-track alerts — 15 §5: "Alerts appear when a KPI is off track for two
 * weeks in a row."
 *
 * The filtering happens in `lib/studio/insights.ts` rather than here, so Home
 * and the Overview tab cannot end up applying different rules to the same
 * list. This component only decides how an alert looks.
 *
 * **It renders nothing when there is nothing to say.** An empty "no alerts"
 * panel is a permanent fixture that trains the eye to skip the place alerts
 * appear, which is the one place it must not be skipped.
 */

import { AlertBar } from '@mirrorline/ui'

import { RAISED_ALERTS, type KpiAlert } from '@/lib/studio/insights'

export interface AlertsBoardProps {
  /** Defaults to the alerts that have cleared the two-week rule. */
  readonly alerts?: readonly KpiAlert[]
}

export function AlertsBoard({ alerts = RAISED_ALERTS }: AlertsBoardProps) {
  if (alerts.length === 0) return null

  return (
    <section aria-label="Alerts" className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <AlertBar
          key={alert.id}
          // `danger` is kept for things that are broken — a disconnected
          // account, a blocked post. A KPI behind its target six weeks into a
          // quarter is information, and painting it red would spend the colour
          // that has to still mean something when a post is blocked.
          tone={alert.tone === 'danger' ? 'danger' : 'warning'}
          title={alert.title}
          description={
            <>
              {alert.message}{' '}
              <span className="machine">
                {alert.weeksOffTrack} weeks running — we raise this after two, not after one.
              </span>
            </>
          }
        />
      ))}
    </section>
  )
}
