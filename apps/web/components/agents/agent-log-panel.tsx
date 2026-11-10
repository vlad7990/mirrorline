'use client'

import type { Agent, AgentLogEntry } from '@mirrorline/mock'
import { Card, Divider } from '@mirrorline/ui'

/**
 * The log for the selected agent.
 *
 * 04_AGENTS_SPEC.md "Shared rules for every agent": "Every action is written
 * to the agent log with time, input, output, cost and reason." The reason on
 * each line is the agent's standing job, which is the `role` field in
 * @mirrorline/mock — the fixtures carry no per-entry reason, and writing one
 * per line here would be inventing demo data.
 */

export interface AgentLogPanelProps {
  /** Whose log this is. */
  agent: Agent
  /** Already filtered to this agent. */
  entries: readonly AgentLogEntry[]
  /** Matches the aria-controls on every "View log" button. */
  id: string
}

function costLabel(costUsd: number | null): string {
  return costUsd === null ? 'No cost recorded' : `$${costUsd.toFixed(2)}`
}

export function AgentLogPanel({ agent, entries, id }: AgentLogPanelProps) {
  return (
    <Card as="aside" id={id} aria-live="polite" className="flex min-w-0 flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">{agent.name} log</h2>
      <p className="m-0 text-meta text-text-muted">
        Every action is logged with its reason and cost.
      </p>

      {entries.length === 0 ? (
        <p className="m-0 text-body text-text-muted">
          Nothing logged for {agent.name} today. Its next action will appear here.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 py-2.5">
              <Divider className="mb-2" />
              <span className="tabular text-caption font-normal text-text-muted">
                {entry.timeLabel} · {costLabel(entry.costUsd)}
              </span>
              <span className="text-label text-text">{entry.message}</span>
              <span className="text-meta text-text-muted">Why: {agent.role}.</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
