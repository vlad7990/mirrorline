import { Card } from '@mirrorline/ui'

import { copilotOperations } from '@/lib/copilot/operations'

/**
 * The co-pilot's line beside the seven agents (spec 18 §6).
 *
 * §6: "Reported in the Agent operations KPIs beside the seven agents, in the
 * words the Agents screen already uses. **The co-pilot is an eighth line
 * there, not a separate dashboard.**" So it is one card below the grid, not a
 * section, not a tab, and not a chart.
 *
 * **A server component, deliberately.** The ledger is in the server process
 * and the mode is decided by a key that must never reach a browser bundle, so
 * the figures are read where they live and arrive as text. The launcher's
 * client-side copy of this question goes through `/api/copilot/status`
 * instead, which exists for exactly that reason.
 *
 * `'use client'` is absent and must stay absent: `server-only.test.ts` walks
 * the import graph and forbids any client module from reaching the adapter,
 * which `operations.ts` imports for `copilotMode`.
 */

/** The signed-in workspace. One client, one month, one ledger. */
const WORKSPACE_ID = 'demo'

export function CopilotOperations() {
  const line = copilotOperations(WORKSPACE_ID)

  return (
    <Card as="section" aria-labelledby="copilot-operations" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="copilot-operations" className="m-0 font-heading text-subtitle text-text">
          Ask Milo
        </h2>
        {/* The AI label is not a footnote (18 §3.3). It is beside the name
            everywhere the co-pilot appears, including here. */}
        <span className="text-meta text-text-muted">AI assistant · eighth line</span>
      </div>

      <p className="m-0 text-meta text-text-muted">{line.modeNote}</p>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
        <span className="text-text-muted">This month</span>
        {/* The screen's own sentence, from `spendSummary`, so this line cannot
            drift from the eyebrow above it one copy edit at a time. */}
        <span className="machine font-semibold text-text">{line.spend}</span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
        <span className="text-text-muted">Questions answered</span>
        <span className="machine font-semibold text-text">{line.calls}</span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-meta">
        <span className="text-text-muted">From the cached prefix</span>
        {/* `null` is shown as a dash rather than as 0%. The KPI dashboard's own
            rule: a ratio over no calls is not a zero, and a zero here would
            read as a fault that has not happened. */}
        <span className="machine font-semibold text-text">
          {line.cacheReadShare === null ? '—' : `${Math.round(line.cacheReadShare * 100)}%`}
        </span>
      </div>

      {/* The sentence that says what the number above means. §6 asks for this
          figure to be watched; a percentage nobody can interpret is not
          watched, it is decoration. */}
      <p className="m-0 text-meta text-text-muted">{line.cacheNote}</p>
    </Card>
  )
}
