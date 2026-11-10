import Link from 'next/link'
import type { Metadata } from 'next'
import { agents } from '@mirrorline/mock'
import { Button, PageHeader } from '@mirrorline/ui'

import { AgentLoop } from '@/components/agents/agent-loop'
import { AgentsBoard } from '@/components/agents/agents-board'

/**
 * S8 · Agents — "make the AI team visible and trustworthy"
 * (03_SCREENS_SPEC.md).
 *
 * The two figures in the eyebrow are summed from the fixtures rather than
 * written out, so they can never drift from the seven cards below.
 */

export const metadata: Metadata = { title: 'Agents' }

export default function AgentsPage() {
  const spend = agents.reduce((total, agent) => total + agent.spendUsd, 0)
  const caps = agents.reduce((total, agent) => total + agent.capUsd, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Your AI team · spend this month $${spend} of $${caps} in caps`}
        title="Seven agents, one loop"
      />

      <AgentLoop />
      <AgentsBoard />

      <Button asChild variant="tertiary" className="self-start px-0">
        <Link href="/app/home">Back to the start of the demo</Link>
      </Button>
    </div>
  )
}
