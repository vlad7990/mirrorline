import { ArrowRight } from 'lucide-react'
import { agents } from '@mirrorline/mock'
import { Card, LogoMark, cn } from '@mirrorline/ui'

/**
 * The loop diagram at the top of S8.
 *
 * 03_SCREENS_SPEC.md "S8 · Agents": "Loop diagram at the top, showing how the
 * agents hand work to each other." The order is the order of the agents in
 * @mirrorline/mock, which is the order 04_AGENTS_SPEC.md numbers them in.
 *
 * DESIGN.md "Chips, pills and progress bars: fully rounded" and "Don't use
 * more than one bright accent per area" — only the two agents the sentence
 * below calls out are tinted; the rest stay quiet.
 */

/** Compliance is the gate, so it carries the success tint; the Analyst closes
 *  the loop, so it carries the accent one. Everything else stays neutral. */
const LOOP_TINTS: Record<string, string> = {
  compliance: 'bg-success-soft text-on-success-soft',
  'performance-analyst': 'bg-accent-soft text-on-accent-soft',
}

const NEUTRAL_TINT = 'bg-surface-subtle text-text'

const LOOP_MARK_SIZE = 22

export function AgentLoop({ className }: { className?: string }) {
  const lastIndex = agents.length - 1

  return (
    <Card as="section" className={cn('flex flex-col gap-3.5', className)}>
      <h2 className="sr-only">How the seven agents hand work on</h2>

      {/* An ordered list: the sequence is the meaning, and it reads in order
          even when the arrows are not rendered. */}
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {agents.map((agent, index) => (
          <li key={agent.id} className="inline-flex items-center gap-2">
            <span
              className={cn(
                'inline-flex min-h-9 items-center rounded-full px-3',
                'font-body text-meta font-semibold',
                LOOP_TINTS[agent.id] ?? NEUTRAL_TINT,
              )}
            >
              {agent.name}
            </span>
            {index < lastIndex ? (
              <ArrowRight
                aria-hidden="true"
                className="size-[18px] shrink-0 text-text-muted"
                strokeWidth={1.6}
              />
            ) : null}
          </li>
        ))}
      </ol>

      <p className="m-0 flex items-start gap-2.5 text-meta text-text">
        <LogoMark size={LOOP_MARK_SIZE} className="mt-0.5 shrink-0" />
        <span>
          The Performance Analyst feeds results back to the Trend Scout and the Remake Producer.
          Nothing posts without passing Compliance.
        </span>
      </p>
    </Card>
  )
}
