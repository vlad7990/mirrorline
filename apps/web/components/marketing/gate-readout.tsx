/**
 * The gate, with its workings open.
 *
 * CLAUDE.md non-negotiable 6: "every video passes the Compliance agent before
 * it can be scheduled." DESIGN.md "Components": the agent log line is the
 * glass box, one line per step in an inset well, in Geist Mono, with a
 * timestamp, the agent, what it did and what it cost; the spend cap is a mono
 * pill reading spent against limit, and it shows wherever an agent can spend
 * money.
 *
 * Counts, costs and caps all come from `@mirrorline/mock`.
 */

import { agentFeed, agents, cutSummary } from '@mirrorline/mock'
import { cn } from '@mirrorline/ui'
import * as React from 'react'

/** DESIGN.md "Motion": six items is the practical ceiling for one stagger. */
const LOG_LINE_COUNT = 6

const COMPLIANCE_AGENT_ID = 'compliance'

interface Tally {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly tone: 'text' | 'success' | 'warning'
}

const TALLIES: readonly Tally[] = [
  { id: 'checked', label: 'cuts checked', value: cutSummary.total, tone: 'text' },
  { id: 'passed', label: 'passed the gate', value: cutSummary.passed, tone: 'success' },
  { id: 'held', label: 'held for your eye', value: cutSummary.needsYourEye, tone: 'warning' },
]

const TALLY_TONE: Record<Tally['tone'], string> = {
  text: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
}

function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(2)}`
}

interface SpendCapProps {
  readonly spentUsd: number
  readonly capUsd: number
}

/** A mono pill reading spent against limit, with its own thin bar. */
function SpendCap({ spentUsd, capUsd }: SpendCapProps) {
  const percent = capUsd === 0 ? 0 : Math.min(100, Math.round((spentUsd / capUsd) * 100))

  return (
    <div className="flex flex-col gap-1.5">
      <span className="machine inline-flex h-6 w-fit items-center rounded-full bg-surface-subtle px-3 text-mono text-text">
        ${spentUsd} / ${capUsd}
      </span>
      <div
        aria-hidden="true"
        className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-surface-subtle"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-meta text-text-muted">
        What the gate spent this week against the cap you set
      </span>
    </div>
  )
}

/** The gate: what it counted, what it cost, and the lines it wrote doing it. */
export function GateReadout() {
  const complianceAgent = agents.find((agent) => agent.id === COMPLIANCE_AGENT_ID)
  const logLines = agentFeed.slice(0, LOG_LINE_COUNT)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-8">
      <div className="flex flex-col gap-5">
        <dl className="m-0 flex flex-col gap-3">
          {TALLIES.map((tally) => (
            <div key={tally.id} className="flex items-baseline gap-3">
              <dd
                className={cn(
                  'machine m-0 min-w-[2.5rem] text-metric font-semibold',
                  TALLY_TONE[tally.tone],
                )}
              >
                {tally.value}
              </dd>
              <dt className="text-body text-text-muted">{tally.label}</dt>
            </div>
          ))}
        </dl>
        {complianceAgent ? (
          <SpendCap capUsd={complianceAgent.capUsd} spentUsd={complianceAgent.spendUsd} />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="m-0 font-heading text-subtitle text-text">What the agents wrote down</h3>
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {logLines.map((line, index) => (
            <li
              key={line.id}
              className="log-in stagger machine flex flex-wrap items-baseline gap-x-2 rounded-sm bg-surface-subtle px-2.5 py-1.5 text-mono text-text-muted"
              style={{ '--index': index } as React.CSSProperties}
            >
              <span className="shrink-0">{line.timeLabel}</span>
              <span className="shrink-0 text-text">{line.agentName}</span>
              <span className="min-w-0 flex-1 font-sans">{line.message}</span>
              {line.costUsd === null ? null : (
                <span className="shrink-0">{formatCost(line.costUsd)}</span>
              )}
            </li>
          ))}
        </ol>
        <p className="m-0 max-w-[68ch] text-meta text-text-muted">
          The studio shows you this same log. It is our own check, not legal clearance, and we
          cannot promise a platform or a rights holder will always agree with it.
        </p>
      </div>
    </div>
  )
}
