/**
 * The spend ledger that survives a second server instance (D115).
 *
 * `lib/copilot/spend.ts` does the arithmetic and keeps the month's total in a
 * process-local `Map`. Its own header says what is wrong with that: *"on
 * Vercel each function instance would keep its own ledger, so N instances
 * could each spend up to the cap"*, and it named "a row in Supabase" as the
 * fix. `agent_runs` is that row; this module is the read and the write.
 *
 * **The arithmetic is not duplicated.** Prices, the cache multipliers, the
 * per-search rate and the projection all stay in `spend.ts` and are imported.
 * Two implementations of "what does this cost" is how a cap and an invoice
 * start disagreeing.
 *
 * ## The order is the cap
 *
 * Read the month, project the request, refuse *before* calling. `18 §6` and
 * non-negotiable 11: the ceiling has to actually hold, so a request that would
 * cross it is never made rather than made and regretted.
 *
 * ## A read that fails is not a month at zero
 *
 * `readMonthUsd` returns `null` when it could not read, never `0`. They are
 * opposite facts and conflating them fails open: a database hiccup would
 * reset every workspace's cap to "plenty of room left", which is the one
 * direction a spend guard must never fail in. `checkAgentSpend` treats `null`
 * as a refusal.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  MAX_REQUEST_USD,
  monthlyCapUsd,
  projectRequestUsd,
  usageUsd,
  type EnvLike,
  type SpendDecision,
  type Usage,
} from '../copilot/spend'

/** The agent names written to `agent_runs.agent`. Text in the schema, fixed here. */
/**
 * Who spent it. One of `04`'s seven, or the co-pilot.
 *
 * `remake_producer` joins on the day V2 ships: the script and hook agent is
 * the Remake Producer by `04 §Agents`, and its runs have to appear beside the
 * scan's on the Agents screen — or the month's spend stops being the sum of
 * its own log.
 */
export type AgentName = 'trend_scout' | 'remake_producer' | 'copilot'

export interface AgentRunRecord {
  readonly workspaceId: string
  readonly agent: AgentName
  readonly model: string
  readonly status: 'ok' | 'failed' | 'refused'
  readonly usage: Usage
  readonly searches: number
  /** Words for a person. **Never a prompt and never a question** (18 §3.3). */
  readonly reason: string | null
}

/** First instant of the current UTC month, as an ISO timestamp. */
export function monthStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * This workspace's spend so far this month, or `null` if it could not be read.
 *
 * Summed in the application rather than by a Postgres aggregate so that the
 * row count stays visible: a workspace with thousands of runs in a month is
 * itself a thing worth noticing, and `numeric` arriving as a string is why
 * each row is passed through `Number` explicitly rather than trusted.
 */
export async function readMonthUsd(
  client: SupabaseClient,
  workspaceId: string,
  now: Date,
): Promise<number | null> {
  const result = await client
    .from('agent_runs')
    .select('usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', monthStartIso(now))

  if (result.error) {
    console.error('[agents] could not read the month ledger', result.error.message)
    return null
  }

  return (result.data ?? []).reduce((total, row) => {
    const value = Number((row as { usd: unknown }).usd)
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

export interface AgentSpendLimits {
  readonly maxSearches?: number
  readonly maxRequestUsd?: number
  readonly monthlyCapUsd?: number
}

/**
 * May this agent make this call. Read the table, project, decide.
 *
 * Mirrors `checkSpend`'s shape and refusal strings so the two read the same in
 * a log, and deliberately does not call it — `checkSpend` consults the
 * in-memory `Map`, which is the thing this replaces.
 */
export async function checkAgentSpend(
  client: SupabaseClient,
  workspaceId: string,
  model: string,
  promptTokens: number,
  maxOutputTokens: number,
  now: Date,
  env: EnvLike = process.env,
  limits: AgentSpendLimits = {},
): Promise<SpendDecision> {
  const maxSearches = limits.maxSearches ?? 0
  const projectedUsd = projectRequestUsd(model, promptTokens, maxOutputTokens, maxSearches)
  const perRequestCeiling = limits.maxRequestUsd ?? MAX_REQUEST_USD
  const cap = limits.monthlyCapUsd ?? monthlyCapUsd(env)

  if (projectedUsd > perRequestCeiling) {
    return {
      allowed: false,
      reason: `one request projected at $${projectedUsd.toFixed(4)}, over the $${perRequestCeiling} per-request ceiling`,
      message: 'That run is too large to do in one go.',
    }
  }

  const spent = await readMonthUsd(client, workspaceId, now)
  if (spent === null) {
    // Fail closed. A read that failed is not a month at zero, and guessing
    // "zero" here would turn one database hiccup into an uncapped month.
    return {
      allowed: false,
      reason: 'could not read the month ledger, so the cap cannot be checked',
      message: 'We could not check this workspace’s usage just now. Try again shortly.',
    }
  }

  if (spent + projectedUsd > cap) {
    return {
      allowed: false,
      reason: `month at $${spent.toFixed(4)} of $${cap}, and this run projects $${projectedUsd.toFixed(4)}`,
      message: 'This workspace has reached its cap for the month.',
    }
  }

  return { allowed: true, projectedUsd, remainingUsd: cap - spent }
}

/**
 * Write what a run really cost, including a refusal.
 *
 * **A refused run is recorded too**, at zero. `04 §Shared rules` wants every
 * action logged, and a cap that works must not look like a feature nobody
 * used — which is exactly what it looks like if refusals leave no row.
 *
 * Failures to log are reported and swallowed: losing a log line must not turn
 * a successful scan into a failed one, and the alternative — throwing after
 * the money is already spent — loses the work *and* the record.
 */
export async function recordRun(client: SupabaseClient, run: AgentRunRecord): Promise<void> {
  const usd = run.status === 'refused' ? 0 : usageUsd(run.model, run.usage, run.searches)

  const result = await client.from('agent_runs').insert({
    workspace_id: run.workspaceId,
    agent: run.agent,
    model: run.model,
    status: run.status,
    input_tokens: run.usage.inputTokens,
    output_tokens: run.usage.outputTokens,
    cache_read_tokens: run.usage.cacheReadTokens,
    cache_creation_tokens: run.usage.cacheCreationTokens,
    web_searches: run.searches,
    usd,
    reason: run.reason,
  })

  if (result.error) {
    console.error('[agents] could not write the run log', result.error.message)
  }
}
