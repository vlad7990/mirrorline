'use client'

import { useCallback, useId, useState } from 'react'
import { agentFeed, agents } from '@mirrorline/mock'

import { AgentCard } from './agent-card'
import { AgentLogPanel } from './agent-log-panel'

/**
 * The seven cards and the log beside them.
 *
 * CLAUDE.md non-negotiable 6: "Compliance gate: every video passes the
 * Compliance agent before it can be scheduled." That rule is visible here —
 * the Compliance switch is fixed on and the card says why in words, not only
 * by looking disabled.
 *
 * All state is client-side and immutable: toggling an agent rebuilds the list
 * of switched-off ids rather than editing the fixtures, which stay read-only.
 */

/** The reference opens on the Remake Producer. */
const DEFAULT_AGENT_ID = 'remake-producer'

/** The one agent that cannot be switched off. */
const LOCKED_AGENT_ID = 'compliance'

const LOCKED_NOTE =
  "Compliance can't be turned off. Every video passes it before it can be scheduled."

/** What stops when an agent is switched off, in one plain sentence. */
const OFF_CONSEQUENCES: Record<string, string> = {
  'trend-scout': 'Off: no new formats will be found until you turn it back on.',
  'remake-producer': 'Off: no new remakes will be drafted until you turn it back on.',
  multiplier: 'Off: new uploads will not be cut into clips until you turn it back on.',
  'client-concierge': 'Off: no approval requests or weekly reports go out until you turn it on.',
  publisher: 'Off: approved posts wait instead of going out until you turn it back on.',
  'performance-analyst': 'Off: results stop feeding next week’s plan until you turn it back on.',
}

const DEFAULT_OFF_CONSEQUENCE = 'Off: this agent does nothing until you turn it back on.'

export function AgentsBoard() {
  const logPanelId = useId()
  const gridHeadingId = useId()
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_AGENT_ID)
  const [offIds, setOffIds] = useState<readonly string[]>([])

  const handleToggle = useCallback((agentId: string, isOn: boolean) => {
    if (agentId === LOCKED_AGENT_ID) return
    setOffIds((previous) =>
      isOn ? previous.filter((id) => id !== agentId) : [...previous, agentId],
    )
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === selectedId)
  const selectedEntries = agentFeed.filter((entry) => entry.agentId === selectedId)

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <section aria-labelledby={gridHeadingId} className="min-w-0 flex-1">
        <h2 id={gridHeadingId} className="sr-only">
          Your seven agents
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {agents.map((agent) => {
            const isLocked = agent.id === LOCKED_AGENT_ID
            const isOn = isLocked || !offIds.includes(agent.id)

            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedId}
                isOn={isOn}
                isLocked={isLocked}
                note={
                  isLocked ? LOCKED_NOTE : (OFF_CONSEQUENCES[agent.id] ?? DEFAULT_OFF_CONSEQUENCE)
                }
                onSelect={setSelectedId}
                onToggle={handleToggle}
                logPanelId={logPanelId}
              />
            )
          })}
        </div>
      </section>

      {selectedAgent ? (
        <div className="w-full xl:w-[340px] xl:shrink-0">
          <AgentLogPanel id={logPanelId} agent={selectedAgent} entries={selectedEntries} />
        </div>
      ) : null}
    </div>
  )
}
