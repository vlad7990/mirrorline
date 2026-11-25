/**
 * The media spend ledger: one read, one write, no arithmetic.
 *
 * `agent_runs` already holds everything a generation run needs — `agent` and
 * `model` are free text, `usd` is a `numeric` — which is why **slice 1 needs
 * no migration at all**. That is not a lucky accident; it is the reason the
 * first slice was scoped this way. A new `jobs.kind` would need the
 * `migrate-production` label, and the label is Vlad's.
 *
 * ============================================================================
 * Why this is not `lib/agents/ledger.ts`
 * ============================================================================
 *
 * That module's `recordRun` computes the dollar figure itself:
 *
 * ```ts
 * const usd = run.status === 'refused' ? 0 : usageUsd(run.model, run.usage, run.searches)
 * ```
 *
 * `usageUsd` prices **tokens and web searches**. A clip has neither, so every
 * generation routed through it would be logged at $0.00 — a media cap reading
 * an empty ledger, which is the exact failure `copilot/spend.ts` warns about
 * for searches: *"the scan works, the cap says there is room, and the bill is
 * larger than the ceiling. That failure has no error attached to it."*
 *
 * So the `usd` here is **passed in**, priced by `spend.ts` from seconds and
 * resolution. What is *not* duplicated is the surrounding judgement:
 * `monthStartIso` is imported rather than rewritten, the null-is-not-zero rule
 * is the same rule, and the refusal strings have the same shape. Two
 * implementations of "when does a month start" is how two caps start
 * disagreeing about the first of the month.
 *
 * ============================================================================
 * Why the agent has its own name
 * ============================================================================
 *
 * `MEDIA_AGENT` is `'media_generator'` rather than `'remake_producer'`, and
 * that needs saying because spec `04` has seven agents and this is not an
 * eighth. Generating a B-roll scene *is* the Remake Producer's work.
 *
 * But the media cap is a **separate** budget from the co-pilot's and from the
 * script agent's, and a separate budget needs a separate sum. The script agent
 * already logs as `remake_producer`; if media logged there too, the only way
 * to total media alone would be to filter on a hardcoded list of model ids and
 * hope nobody adds one. An exact match on `agent` cannot rot that way.
 *
 * The Agents screen should fold this line under the Remake Producer when it
 * displays — it is that agent's spend, recorded under its own name so the
 * ceiling can be counted. Flagged in the handoff in case Vlad would rather
 * name it something else; it is one string and no migration either way.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { monthStartIso } from '../agents/ledger'
import type { EnvLike, SpendDecision, SpendLimits } from '../copilot/spend'
import { decideGenerationSpend, projectGenerationUsd } from './spend'
import type { GenerationOutcome, GenerationRequest } from './types'

/** The value written to `agent_runs.agent`. See the header for why it is its own. */
export const MEDIA_AGENT = 'media_generator'

export interface MediaRunRecord {
  readonly workspaceId: string
  /** The real model id, or `'none'` when nothing was called. */
  readonly model: string
  readonly status: 'ok' | 'failed' | 'refused'
  /** What was billed. Zero for anything that never reached a provider. */
  readonly usd: number
  /** Words for a person reading the log. **Never a prompt** (18 §3.3). */
  readonly reason: string | null
}

/**
 * This workspace's media spend so far this month, or `null` if it could not be
 * read.
 *
 * **`null`, never `0`.** They are opposite facts and conflating them fails
 * open — one database hiccup would reset every workspace's ceiling to "plenty
 * of room left". `decideGenerationSpend` treats `null` as a refusal, and
 * `spend.test.ts` asserts it.
 *
 * Filtered on `agent` so this is the *media* month rather than the whole
 * workspace's. Summed in the application rather than by a Postgres aggregate,
 * for the reason `readMonthUsd` gives: the row count stays visible, and
 * `numeric` arriving over REST as a string is why each value is passed through
 * `Number` explicitly rather than trusted.
 */
export async function readMediaMonthUsd(
  client: SupabaseClient,
  workspaceId: string,
  now: Date,
): Promise<number | null> {
  const result = await client
    .from('agent_runs')
    .select('usd')
    .eq('workspace_id', workspaceId)
    .eq('agent', MEDIA_AGENT)
    .gte('created_at', monthStartIso(now))

  if (result.error) {
    console.error('[generation] could not read the month’s media ledger', result.error.message)
    return null
  }

  return (result.data ?? []).reduce((total, row) => {
    const value = Number((row as { usd: unknown }).usd)
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

/**
 * May this generation be made: read the month, project, decide.
 *
 * The order is the cap. `18 §6` and non-negotiable 11 — the ceiling has to
 * actually hold, so a request that would cross it is never made rather than
 * made and regretted.
 */
export async function checkGenerationSpend(
  client: SupabaseClient,
  request: GenerationRequest,
  now: Date,
  env: EnvLike = process.env,
  limits: SpendLimits = {},
): Promise<SpendDecision> {
  const projectedUsd = projectGenerationUsd(request)
  const spentUsd = await readMediaMonthUsd(client, request.workspaceId, now)

  return decideGenerationSpend(spentUsd, projectedUsd, limits, env)
}

/**
 * Write what a run really cost, including the ones that cost nothing.
 *
 * Failures to log are reported and swallowed, which is `recordRun`'s choice
 * and the right one: losing a log line must not turn a finished clip into a
 * failed one, and throwing after the money is already spent loses the work
 * *and* the record.
 */
export async function recordMediaRun(client: SupabaseClient, run: MediaRunRecord): Promise<void> {
  const result = await client.from('agent_runs').insert({
    workspace_id: run.workspaceId,
    agent: MEDIA_AGENT,
    model: run.model,
    status: run.status,
    // All four are zero and all four are written explicitly. A clip has no
    // tokens, and the columns are `not null` with a default — but spelling the
    // zeroes out is what makes a reader of this insert certain the media row
    // is not a token row with its numbers missing.
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
    web_searches: 0,
    usd: run.usd,
    reason: run.reason,
  })

  if (result.error) {
    console.error('[generation] could not write the media run log', result.error.message)
  }
}

/**
 * Log an outcome, whatever kind it was.
 *
 * ============================================================================
 * Four outcomes, three statuses, and one that must not be lost
 * ============================================================================
 *
 * `agent_runs.status` allows `ok`, `failed` and `refused`, and
 * `GenerationOutcome` has four cases, so something has to fold. `refused` and
 * `capped` both become **`refused` at $0.00** — which is right, because the
 * column's own comment says what that state is for:
 *
 * > `refused` is the state that matters most here: a call the cap stopped
 * > before it was made. It costs nothing and must still be visible, or a cap
 * > that is working looks identical to a feature nobody used.
 *
 * The distinction between "a rule said no" and "the ceiling said no" is not
 * lost, because it is in `reason` — and `reason` is where a person reads it.
 * Inventing a fourth status would need a migration to say something the text
 * column already says.
 *
 * A safety refusal is logged too, and that is the part worth being deliberate
 * about: our own filter refusing a prompt costs nothing, calls nothing, and is
 * **exactly** the kind of event that leaves no trace unless somebody decides
 * it should. D129 is the precedent — a gate whose failures never reach the
 * database can be rendered perfectly and never be given anything to render.
 */
export async function recordGenerationOutcome(
  client: SupabaseClient,
  workspaceId: string,
  outcome: GenerationOutcome,
  fallbackModel: string,
): Promise<void> {
  if (outcome.status === 'ok') {
    await recordMediaRun(client, {
      workspaceId,
      model: outcome.asset.provenance.model,
      status: 'ok',
      usd: outcome.asset.provenance.usd,
      reason: null,
    })
    return
  }

  if (outcome.status === 'failed') {
    await recordMediaRun(client, {
      workspaceId,
      model: outcome.provenance?.model ?? fallbackModel,
      status: 'failed',
      // A provider that charged for a failed render is a dispute, not a ledger
      // entry we can compute — so zero, and `reason` says what happened.
      usd: 0,
      reason: outcome.reason,
    })
    return
  }

  const model = outcome.status === 'refused' ? (outcome.provenance?.model ?? fallbackModel) : 'none'

  await recordMediaRun(client, {
    workspaceId,
    model,
    status: 'refused',
    usd: 0,
    reason: outcome.reason,
  })
}
