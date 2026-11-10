'use client'

import { useId } from 'react'
import type { Agent } from '@mirrorline/mock'
import { AgentStatusPill, Button, Card, ProgressBar, Switch, cn } from '@mirrorline/ui'

/**
 * One agent, as a card.
 *
 * 03_SCREENS_SPEC.md "S8 · Agents": "Each shows its status pill, last action,
 * items done this week, spend this month against its cap, and an on/off
 * toggle."
 *
 * DESIGN.md "Elevation & Depth": "Selected items: a 2px #14171C (or primary)
 * border instead of a shadow." An agent that is switched off goes to the
 * subtle surface rather than to a lower opacity, so its text keeps the 4.5:1
 * contrast DESIGN.md requires, and its pill says the word "Off".
 */

/**
 * The "locked" look the `disabled` attribute used to give us, now keyed off
 * `aria-disabled` so the control keeps its place in the tab order.
 */
const LOCKED_SWITCH_CLASSES = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-55'

export interface AgentCardProps {
  agent: Agent
  /** This agent's log is the one on show. */
  isSelected: boolean
  isOn: boolean
  /** True for Compliance: the switch is fixed on and says why. */
  isLocked?: boolean
  /** The sentence that explains the locked switch, or what stops when off. */
  note: string
  onSelect: (agentId: string) => void
  onToggle: (agentId: string, isOn: boolean) => void
  /** The id of the panel the "View log" button drives. */
  logPanelId: string
}

export function AgentCard({
  agent,
  isSelected,
  isOn,
  isLocked = false,
  note,
  onSelect,
  onToggle,
  logPanelId,
}: AgentCardProps) {
  const headingId = useId()
  const noteId = useId()
  const showNote = isLocked || !isOn

  return (
    <Card
      as="article"
      selected={isSelected}
      className={cn('flex min-w-0 flex-col gap-3', !isOn && 'bg-surface-subtle')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={headingId} className="m-0 font-heading text-subtitle text-text">
          {agent.name}
        </h3>
        <AgentStatusPill status={isOn ? agent.status : 'off'} />
      </div>

      <p className="m-0 text-meta text-text-muted">{agent.lastAction}</p>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
        <span className="text-text-muted">This week</span>
        {/* A count the agent produced, so it is the machine's voice. The label
            beside it is the studio's. */}
        <span className="machine font-semibold text-text">{agent.doneThisWeek}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
          <span className="text-text-muted">Spend / cap</span>
          {/* DESIGN.md "Spend cap": "a mono pill reading spent against limit
              ('$6 / $25')". Money an agent spent is measured, never prose. */}
          <span className="machine font-semibold text-text">
            ${agent.spendUsd} / ${agent.capUsd}
          </span>
        </div>
        <ProgressBar
          label={`${agent.name} spend against its monthly cap`}
          value={agent.spendUsd}
          max={agent.capUsd}
          valueText={`$${agent.spendUsd} of $${agent.capUsd}`}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        {/* DESIGN.md "Motion — Press": a 3% dip on :active, fine pointers
            only, dropped under prefers-reduced-motion. This is the control
            that swaps the log beside the grid, so it earns the feedback. */}
        <Button
          variant="secondary"
          className="press"
          aria-pressed={isSelected}
          aria-controls={logPanelId}
          onClick={() => onSelect(agent.id)}
        >
          View log
          <span className="sr-only"> for {agent.name}</span>
        </Button>

        <div className="flex items-center gap-2.5">
          {/* The word carries the state; the switch colour never has to. */}
          <span className="text-meta text-text-muted">{isOn ? 'On' : 'Off'}</span>
          {/* SC 3.3.2 / 4.1.2: Compliance is locked with `aria-disabled`, not
              `disabled`. A disabled switch drops out of the tab order, so a
              keyboard-only person never reached it and never heard the sentence
              below that explains why it is fixed on. This one keeps focus and
              still cannot be toggled: the handler returns early. */}
          <Switch
            checked={isOn}
            aria-disabled={isLocked || undefined}
            className={isLocked ? LOCKED_SWITCH_CLASSES : undefined}
            aria-labelledby={headingId}
            aria-describedby={showNote ? noteId : undefined}
            onCheckedChange={(next) => {
              if (isLocked) return
              onToggle(agent.id, next)
            }}
          />
        </div>
      </div>

      {/* Always rendered when it applies, so the explanation for a disabled
          control is on the page rather than only in a tooltip. */}
      {showNote ? (
        <p id={noteId} className="m-0 text-meta text-text-muted">
          {note}
        </p>
      ) : null}
    </Card>
  )
}
