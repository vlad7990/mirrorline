/**
 * The cap, and what it counts (spec 18 §6).
 *
 * **It is a hard stop, not a warning.** §6 says so twice and
 * non-negotiable 11 is the reason: "no paid API calls beyond test mode" only
 * means something if the ceiling actually holds. So the shape is: project the
 * cost of a request *before* making it, refuse if the projection crosses the
 * cap, and record the real usage afterwards. A surface that warned and then
 * called anyway would satisfy the sentence and not the rule.
 *
 * ## What is counted, and why all four numbers
 *
 * §6 asks for `input_tokens`, `output_tokens`, `cache_read_input_tokens` and
 * `cache_creation_input_tokens`. The first two are the bill. The other two are
 * the diagnosis: **if `cache_read_input_tokens` is zero across repeated
 * questions, the corpus prefix is being invalidated** and the website bot is
 * paying full price for the whole corpus on every question. That failure has
 * no error attached to it — the answers are fine and the bill is several times
 * what it should be — so the only way to see it is to record the number and
 * look. `cacheReadShare` below is what looking at it comes to.
 *
 * ## Where the ledger lives, and the part that is honestly a stub
 *
 * In this process, in a `Map`. **That is not a cap across instances**, and
 * saying so plainly is better than implying otherwise: on Vercel each
 * function instance would keep its own ledger, so N instances could each
 * spend up to the cap. The real fix is a row in Supabase, which is "Needs
 * Vlad F" territory along with the key itself.
 *
 * What makes that acceptable today rather than a hole: **there is no key, so
 * there is no spend.** The adapter refuses to call anything without one, and
 * the per-request ceiling below is enforced from a projection rather than
 * from the ledger, so it holds on a cold instance too. The ledger is the
 * month's total; the per-request ceiling is the thing that cannot be walked
 * around by starting a new process.
 *
 * Deliberately **no question text and no identifier is stored** — 18 §3.3:
 * "questions are not logged with identifiers". A workspace id and four
 * integers is the whole record.
 */

/**
 * The environment, as much of it as any of this reads.
 *
 * Deliberately not `NodeJS.ProcessEnv`. That type requires `NODE_ENV`, so a
 * test wanting to say "there is no key" would have to write
 * `{ NODE_ENV: 'test' }` and every reader would be able to reach every
 * variable there is. Two keys are read across the whole co-pilot; this says
 * so, and `process.env` satisfies it.
 */
export type EnvLike = Readonly<Record<string, string | undefined>>

/** Prices per million tokens, from the published rates for these two models. */
interface ModelRate {
  readonly inputPerMillion: number
  readonly outputPerMillion: number
}

/**
 * What each tier costs.
 *
 * Cache reads are a tenth of input and cache writes a quarter more, which is
 * why they are tracked separately rather than folded into `input`: the whole
 * point of the cached prefix is that the corpus costs a tenth of its size on
 * every question after the first.
 */
export const MODEL_RATES: Readonly<Record<string, ModelRate>> = {
  'claude-sonnet-5': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5': { inputPerMillion: 1, outputPerMillion: 5 },
}

const CACHE_READ_MULTIPLIER = 0.1
const CACHE_WRITE_MULTIPLIER = 1.25

/**
 * The cap, per workspace, per calendar month, in US dollars.
 *
 * Deliberately small. The Agents screen's own wording is "spend this month $43
 * of $180 in caps" and that figure is for the seven agents doing the actual
 * work; an eighth line that answers questions should not be able to outspend
 * them. Overridable with `COPILOT_MONTHLY_CAP_USD` for a test, and a bad
 * value is ignored rather than trusted.
 */
export const DEFAULT_MONTHLY_CAP_USD = 20

export function monthlyCapUsd(env: EnvLike = process.env): number {
  const raw = env.COPILOT_MONTHLY_CAP_USD
  if (!raw) return DEFAULT_MONTHLY_CAP_USD

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MONTHLY_CAP_USD
  return parsed
}

/**
 * The most one question may project to cost.
 *
 * Enforced from the projection, not from the ledger, so it survives a cold
 * instance that has no history. This is the number that makes a runaway
 * single request impossible: a prompt that somehow assembled a megabyte of
 * context is refused before the call rather than after the invoice.
 */
export const MAX_REQUEST_USD = 0.5

export interface Usage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheCreationTokens: number
}

export const NO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
}

function priceWith(rate: ModelRate, usage: Usage): number {
  const input = (usage.inputTokens / 1_000_000) * rate.inputPerMillion
  const output = (usage.outputTokens / 1_000_000) * rate.outputPerMillion
  const cacheRead =
    (usage.cacheReadTokens / 1_000_000) * rate.inputPerMillion * CACHE_READ_MULTIPLIER
  const cacheWrite =
    (usage.cacheCreationTokens / 1_000_000) * rate.inputPerMillion * CACHE_WRITE_MULTIPLIER

  return input + output + cacheRead + cacheWrite
}

/** What a usage reading costs, in dollars. */
export function usageUsd(model: string, usage: Usage): number {
  const rate = MODEL_RATES[model]
  if (!rate) {
    // An unknown model is priced at the most expensive tier we have rather
    // than at zero. Costing an unrecognised model nothing is how a cap stops
    // being a cap the next time a model id changes.
    const worst = Object.values(MODEL_RATES).reduce((a, b) =>
      a.inputPerMillion > b.inputPerMillion ? a : b,
    )
    return priceWith(worst, usage)
  }
  return priceWith(rate, usage)
}

/**
 * What a request will cost at worst, from a real token count of the prompt.
 *
 * `max_tokens` is used for the output side rather than a guess, because that
 * is the ceiling the model is actually allowed to reach. On Sonnet 5 thinking
 * shares that budget with the answer (18 §0), so the projection covers both
 * without having to know how the model will split them — which is exactly why
 * projecting from `max_tokens` is the right pessimism here rather than a
 * lazy one.
 */
export function projectRequestUsd(
  model: string,
  promptTokens: number,
  maxOutputTokens: number,
): number {
  return usageUsd(model, {
    inputTokens: promptTokens,
    outputTokens: maxOutputTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  })
}

export interface MonthLedger {
  readonly workspaceId: string
  /** `YYYY-MM`, UTC. A month boundary should not depend on who is asking. */
  readonly month: string
  readonly usage: Usage
  readonly usd: number
  /** How many calls went out. Needed to read `cacheReadShare` honestly. */
  readonly calls: number
}

function emptyLedger(workspaceId: string, month: string): MonthLedger {
  return { workspaceId, month, usage: NO_USAGE, usd: 0, calls: 0 }
}

/** `YYYY-MM` in UTC. */
export function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7)
}

/**
 * The ledger, in this process.
 *
 * Keyed by workspace *and* month, so a new month starts at zero without
 * anything having to sweep it.
 */
const ledgers = new Map<string, MonthLedger>()

function key(workspaceId: string, month: string): string {
  return `${workspaceId}:${month}`
}

export function readLedger(workspaceId: string, now: Date): MonthLedger {
  const month = monthKey(now)
  return ledgers.get(key(workspaceId, month)) ?? emptyLedger(workspaceId, month)
}

/** Only for tests: the ledger is process-local and has no other way back. */
export function resetLedgers(): void {
  ledgers.clear()
}

/**
 * Record what a call really cost.
 *
 * Immutable update, as the house style requires: the stored ledger is
 * replaced rather than mutated, so nothing holding a previous reading sees it
 * change underneath them.
 */
export function recordUsage(
  workspaceId: string,
  model: string,
  usage: Usage,
  now: Date,
): MonthLedger {
  const previous = readLedger(workspaceId, now)
  const next: MonthLedger = {
    workspaceId,
    month: previous.month,
    usage: {
      inputTokens: previous.usage.inputTokens + usage.inputTokens,
      outputTokens: previous.usage.outputTokens + usage.outputTokens,
      cacheReadTokens: previous.usage.cacheReadTokens + usage.cacheReadTokens,
      cacheCreationTokens: previous.usage.cacheCreationTokens + usage.cacheCreationTokens,
    },
    usd: previous.usd + usageUsd(model, usage),
    calls: previous.calls + 1,
  }

  ledgers.set(key(workspaceId, next.month), next)
  return next
}

export type SpendDecision =
  | { readonly allowed: true; readonly projectedUsd: number; readonly remainingUsd: number }
  | { readonly allowed: false; readonly reason: string; readonly message: string }

/**
 * May this call be made.
 *
 * Checked before the request, and the refusal carries two strings on purpose:
 * `reason` for the log and `message` for the person. 18 §7 fixes the words
 * the studio shows when the cap is reached, and a surface that invented its
 * own would drift from the spec one copy edit at a time.
 */
export function checkSpend(
  workspaceId: string,
  model: string,
  promptTokens: number,
  maxOutputTokens: number,
  now: Date,
  env: EnvLike = process.env,
): SpendDecision {
  const projectedUsd = projectRequestUsd(model, promptTokens, maxOutputTokens)
  const cap = monthlyCapUsd(env)
  const ledger = readLedger(workspaceId, now)
  const remainingUsd = cap - ledger.usd

  if (projectedUsd > MAX_REQUEST_USD) {
    return {
      allowed: false,
      reason: `one request projected at $${projectedUsd.toFixed(4)}, over the $${MAX_REQUEST_USD} per-request ceiling`,
      message: 'That question is too large to answer in one go. Try asking it in smaller parts.',
    }
  }

  if (ledger.usd + projectedUsd > cap) {
    return {
      allowed: false,
      reason: `month at $${ledger.usd.toFixed(4)} of $${cap}, and this request projects $${projectedUsd.toFixed(4)}`,
      message: 'This workspace has reached its cap for the month.',
    }
  }

  return { allowed: true, projectedUsd, remainingUsd }
}

/**
 * The share of input tokens that came out of the cache.
 *
 * `null` until there is something to divide, because a ratio over no calls is
 * not a zero — the same rule the KPI dashboard follows. **Zero across
 * repeated questions is the signal 18 §6 asks us to watch for:** it means the
 * cached prefix is being rebuilt every time.
 */
export function cacheReadShare(ledger: MonthLedger): number | null {
  const { inputTokens, cacheReadTokens, cacheCreationTokens } = ledger.usage
  const total = inputTokens + cacheReadTokens + cacheCreationTokens
  if (ledger.calls === 0 || total === 0) return null
  return cacheReadTokens / total
}

/**
 * The sentence the Agents screen shows, in the words it already uses.
 *
 * 18 §6: the co-pilot is "an eighth line there, not a separate dashboard", and
 * the screen's existing phrasing is "spend this month $43 of $180 in caps".
 */
export function spendSummary(ledger: MonthLedger, env: EnvLike = process.env): string {
  const cap = monthlyCapUsd(env)
  return `spend this month $${ledger.usd.toFixed(2)} of $${cap.toFixed(2)} in caps`
}

/**
 * Whether the cache is doing its job, in words a person can act on.
 *
 * Returned rather than logged so the status route can show it and a test can
 * assert it. The threshold is deliberately low: the question is not "is the
 * cache efficient" but "is the cache working at all".
 */
export function cacheHealth(ledger: MonthLedger): string {
  const share = cacheReadShare(ledger)
  if (share === null) return 'No calls yet, so nothing to read. Not the same as a cache miss.'
  if (share === 0) {
    return 'No input tokens have come from the cache. Across repeated questions that means the corpus prefix is being invalidated, and every question is paying full price for the whole corpus.'
  }
  return `${Math.round(share * 100)}% of input tokens came from the cache.`
}
