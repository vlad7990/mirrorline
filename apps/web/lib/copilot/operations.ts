/**
 * The co-pilot's line in the Agent operations KPIs (spec 18 §6).
 *
 * §6 is specific about where this goes and what it may not become: "Reported
 * in the Agent operations KPIs beside the seven agents, in the words the
 * Agents screen already uses ('spend this month $43 of $180 in caps'). **The
 * co-pilot is an eighth line there, not a separate dashboard.**"
 *
 * So this is four short strings and a count, assembled from the functions that
 * already own each one, and nothing else. It is a module rather than code
 * inside the component for one reason: the component is a server component in
 * `.tsx`, and `vitest.config.ts` collects no `.tsx` under `apps/web`. Logic
 * that cannot be tested where it lives belongs somewhere it can be.
 *
 * **`cacheReadTokens` of zero is the number §6 asks us to watch**, and it is
 * carried here rather than summarised away, because the symptom of a prefix
 * being invalidated is a correct-looking answer and a bill several times its
 * proper size. The live run on 15 November read 97% out of the cache; a
 * figure near zero on this line is the thing to act on.
 */

import { copilotMode } from './adapter'
import {
  cacheHealth,
  cacheReadShare,
  monthlyCapUsd,
  readLedger,
  spendSummary,
  type EnvLike,
} from './spend'

export interface CopilotOperations {
  /** `live` or `sample`, so the line never implies a spend that cannot happen. */
  readonly mode: 'live' | 'sample'
  /** What the mode means for the figures beside it. */
  readonly modeNote: string
  /** The Agents screen's own sentence, from `spendSummary`. */
  readonly spend: string
  readonly calls: number
  /** `null` until there is something to divide — never a misleading zero. */
  readonly cacheReadShare: number | null
  readonly cacheNote: string
}

const SAMPLE_NOTE = 'Sample mode: answers are scripted, nothing is called and nothing is spent.'

const LIVE_NOTE = 'Live: every question asked of the co-pilot is a real call.'

/**
 * The co-pilot's own operations line, for one workspace.
 *
 * One workspace, deliberately. The public site's bot spends into
 * `public-site` and a signed-in client has no business seeing it — the same
 * reason `spend.ts` keys the ledger per workspace in the first place.
 */
export function copilotOperations(
  workspaceId: string,
  now: Date = new Date(),
  env: EnvLike = process.env,
): CopilotOperations {
  const mode = copilotMode(env)
  const ledger = readLedger(workspaceId, now)

  return {
    mode,
    modeNote: mode === 'live' ? LIVE_NOTE : SAMPLE_NOTE,
    spend: spendSummary(ledger, env),
    calls: ledger.calls,
    cacheReadShare: cacheReadShare(ledger),
    cacheNote: cacheHealth(ledger),
  }
}

/** The cap, for the screen that shows what it is a share of. */
export function copilotCapUsd(env: EnvLike = process.env): number {
  return monthlyCapUsd(env)
}
