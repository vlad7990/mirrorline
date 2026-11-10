'use client'

import type { Agent, AgentLogEntry } from '@mirrorline/mock'
import { Card, Divider } from '@mirrorline/ui'
import type * as React from 'react'

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

/**
 * DESIGN.md "Motion — Stagger": "up to about six items. Past that it stops
 * feeling like one gesture." Longer logs land with the sixth line.
 */
const STAGGER_CEILING = 5

function costLabel(costUsd: number | null): string {
  return costUsd === null ? 'No cost recorded' : `$${costUsd.toFixed(2)}`
}

export function AgentLogPanel({ agent, entries, id }: AgentLogPanelProps) {
  return (
    <Card as="aside" id={id} className="flex min-w-0 flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">{agent.name} log</h2>
      <p className="m-0 text-meta text-text-muted">
        Every action is logged with its reason and cost.
      </p>

      {/* The live region is the entries, not the whole card. With it on the
          <Card>, picking an agent re-read the heading and this intro line
          before every entry — 4.1.3 asks for the change, not the furniture. */}
      <div aria-live="polite" className="flex min-w-0 flex-col">
        {entries.length === 0 ? (
          <p className="m-0 text-body text-text-muted">
            Nothing logged for {agent.name} today. Its next action will appear here.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                // DESIGN.md "Agent log line": "Lines may arrive staggered at
                // 60ms a step." The list is keyed on the agent upstream, so
                // picking an agent remounts it and the arrival replays — which
                // is the point: this is where you watch the machine report.
                // Capped at the sixth step, because past ~360ms the arrival
                // stops reading as one gesture.
                className="log-in stagger flex flex-col gap-1 py-2"
                style={{ '--index': Math.min(index, STAGGER_CEILING) } as React.CSSProperties}
              >
                <Divider className="mb-2" />
                {/* The machine's voice: when the step ran and what it cost.
                    DESIGN.md "Typography": "A number in mono means 'a machine
                    measured this and you can audit it'." */}
                <span className="machine text-caption font-normal text-text-muted">
                  {entry.timeLabel} · {costLabel(entry.costUsd)}
                </span>
                {/* What it did, and why, are sentences the studio writes, so
                    they stay in Geist however technical they read. */}
                <span className="text-label text-text">{entry.message}</span>
                <span className="text-meta text-text-muted">Why: {agent.role}.</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}
