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
import type * as React from 'react'

import { RAISED_ALERTS, type KpiAlert } from '@/lib/studio/insights'

/**
 * The sentence that says why the user is seeing this now.
 *
 * It has to differ by kind. The single line this replaced read "2 weeks
 * running — we raise this after two, not after one" under *every* alert,
 * including the disconnection, which was false twice over: the disconnection
 * had not been running for two weeks, and we no longer wait two weeks to
 * mention one.
 *
 * **Only the measurements are mono.** DESIGN.md "Typography — two voices"
 * gives Geist Mono to "everything the agents produced or measured" — the date
 * posting stopped, the number of weeks. The explanation around them is the
 * studio talking, and a whole sentence set in mono read as a readout of
 * something rather than as us saying it. This returns a node rather than a
 * string because that split cannot be expressed in one.
 */
function timingNote(alert: KpiAlert): React.ReactNode {
  if (alert.kind === 'connection') {
    return (
      <>
        Posting stopped on <span className="machine">{alert.since}</span>. We raise this the same
        day — there is nothing to wait and see about.
      </>
    )
  }

  return (
    <>
      <span className="machine">{alert.weeksOffTrack}</span> weeks running — we raise this after
      two, not after one.
    </>
  )
}

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
          // Derived from the kind rather than carried beside it. `danger` is
          // kept for things that are broken — a disconnected account, a
          // blocked post. A KPI behind its target six weeks into a quarter is
          // information, and painting it red would spend the colour that has
          // to still mean something when posting actually stops.
          tone={alert.kind === 'connection' ? 'danger' : 'warning'}
          title={alert.title}
          description={
            <>
              {alert.message} {timingNote(alert)}
            </>
          }
        />
      ))}
    </section>
  )
}
