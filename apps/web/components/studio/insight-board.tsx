/**
 * The Performance Analyst's weekly note — 15 §5 tab 7: "what worked, what
 * we'll change, and what we need from you."
 *
 * Three columns in that order, and the order is the argument. A report that
 * opens with what it needs from the client reads as an excuse; one that never
 * gets there is a newsletter. 15 §6 puts the asks on the Client Concierge,
 * which is why the third column is written as requests rather than as
 * blockers.
 *
 * **"What we change" is where we say what did not work.** A weekly note made
 * only of wins is marketing, and the client is paying for an analyst.
 */

import { Card } from '@mirrorline/ui'
import { CircleAlert, RefreshCw, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { type AgentInsight, SAMPLE_INSIGHT } from '@/lib/studio/insights'

export function InsightBoard({ insight = SAMPLE_INSIGHT }: { readonly insight?: AgentInsight }) {
  return (
    <div className="flex flex-col gap-5">
      <Card as="section" aria-labelledby="insight-heading" className="flex flex-col gap-2">
        <span className="text-caption text-text-muted">
          Performance Analyst · <span className="machine">{insight.weekLabel}</span>
        </span>
        <h2 id="insight-heading" className="m-0 font-heading text-title text-text">
          What we learned and what we are doing about it
        </h2>
        <p className="m-0 text-meta text-text-muted">
          Written after every week of posting, from the measurements on this dashboard. It names
          what did not work as well as what did.
        </p>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        <NoteColumn
          id="what-worked"
          icon={TrendingUp}
          title="What worked"
          items={insight.whatWorked}
        />
        <NoteColumn
          id="what-we-change"
          icon={RefreshCw}
          title="What we change"
          items={insight.whatWeChange}
        />
        <NoteColumn
          id="what-we-need"
          icon={CircleAlert}
          title="What we need from you"
          items={insight.whatWeNeed}
        />
      </div>
    </div>
  )
}

function NoteColumn({
  id,
  icon: Icon,
  title,
  items,
}: {
  id: string
  icon: LucideIcon
  title: string
  items: readonly string[]
}) {
  return (
    <Card as="section" aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <h3 id={id} className="m-0 flex items-center gap-2 font-heading text-subtitle text-text">
        {/* Decorative: the heading beside it already carries the meaning, and
            a screen reader announcing "trending up graphic" adds nothing. */}
        <Icon aria-hidden="true" className="size-4 text-text-muted" strokeWidth={1.8} />
        {title}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-meta text-text">
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong"
            />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
