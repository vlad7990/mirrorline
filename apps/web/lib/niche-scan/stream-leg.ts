/**
 * One streamed model leg, with its budgets enforced on the stream (D132).
 *
 * Lifted out of `scan.ts`'s private `callTheModel` when the scan became two
 * legs, because both of them need the same three things and neither gets any of
 * them for free:
 *
 * 1. **Streaming.** The first live scan was non-streaming and never came back:
 *    the SDK scales its own timeout *up*, as far as an hour, for a large
 *    `max_tokens`, and then retries. The failure mode is not an error — it is a
 *    request sitting open long past the point the answer was wanted. Streaming
 *    makes bytes arrive throughout, and `finalMessage()` assembles the same
 *    `Message` the non-streaming call would have returned.
 *
 * 2. **A wall-clock deadline that actually stops things.** The request timeout
 *    is a *connection* guard: a steadily-streaming response never trips it, so
 *    leg one of the first production scan ran 829 seconds against a five-minute
 *    value. The deadline here aborts the stream.
 *
 * 3. **A search ceiling the code enforces.** `max_uses: 12` produced 24
 *    searches on one run and **41 in a single leg** on another. Whatever it
 *    means to the server-side search loop, it is not a stop.
 *
 * The caller passes an absolute `deadlineAt` rather than a duration, and that is
 * what makes "leg one must leave time for leg two" expressible: the orchestrator
 * owns the clock, and each leg is handed its slice of it.
 */

import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { NO_USAGE, type Usage } from '../copilot/spend'

/** Which budget stopped the run, when one did. */
export type BudgetStop = 'searches' | 'time'

export interface LegOutcome {
  /** `null` when a budget aborted the stream: there is no final message. */
  readonly response: Anthropic.Message | null
  readonly usage: Usage
  readonly searches: number
  readonly stoppedBy: BudgetStop | null
  /** Wall clock for this leg, across its continuations. */
  readonly seconds: number
  /** How many HTTP legs it took. More than one means a turn was resumed. */
  readonly legs: number
}

export interface StreamLegRequest {
  readonly client: Anthropic
  /** Prefixes every log line, so the two legs are distinguishable in Railway. */
  readonly label: string
  readonly model: string
  readonly maxTokens: number
  readonly effort: 'low' | 'medium' | 'high'
  readonly system: string
  readonly schema: unknown
  readonly messages: readonly Anthropic.MessageParam[]
  /** Omitted entirely for a leg with no tools — see `write-leg.ts`. */
  readonly tools?: readonly unknown[]
  /** Ignored when there are no tools. */
  readonly searchCeiling?: number
  /** Absolute wall-clock deadline for this leg, in epoch milliseconds. */
  readonly deadlineAt: number
  readonly requestTimeoutMs: number
  readonly maxContinuations: number
  readonly maxRetries: number
}

export function usageFrom(usage: Anthropic.Usage | null | undefined): Usage {
  if (!usage) return NO_USAGE
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  }
}

export function addUsage(first: Usage, second: Usage): Usage {
  return {
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    cacheReadTokens: first.cacheReadTokens + second.cacheReadTokens,
    cacheCreationTokens: first.cacheCreationTokens + second.cacheCreationTokens,
  }
}

/**
 * How many searches actually ran.
 *
 * Counted from the response rather than assumed, because the projection uses
 * the ceiling and the ledger must record the truth.
 */
export function searchesFrom(content: readonly Anthropic.ContentBlock[]): number {
  return content.filter((block) => block.type === 'server_tool_use').length
}

/** The JSON the model returned, from whichever block carries it. */
export function jsonFrom(content: readonly Anthropic.ContentBlock[]): unknown {
  for (const block of content) {
    if (block.type !== 'text') continue
    try {
      return JSON.parse(block.text)
    } catch {
      // Not this block. Structured output puts the object in one of them; web
      // search can add commentary blocks around it.
    }
  }
  return null
}

export async function streamLeg(request: StreamLegRequest): Promise<LegOutcome> {
  const { client, label, deadlineAt, searchCeiling } = request

  const conversation: Anthropic.MessageParam[] = [...request.messages]
  let usage = NO_USAGE
  let searches = 0

  const beganAt = Date.now()
  const elapsed = () => Math.round((Date.now() - beganAt) / 1000)
  const budgetSeconds = Math.max(0, Math.round((deadlineAt - beganAt) / 1000))

  for (let leg = 0; ; leg += 1) {
    // Checked before the leg as well as during it: a leg that would start with
    // no time left should not start at all.
    const remainingMs = deadlineAt - Date.now()
    if (remainingMs <= 0) {
      return { response: null, usage, searches, stoppedBy: 'time', seconds: elapsed(), legs: leg }
    }

    const stream = client.messages.stream(
      {
        model: request.model,
        max_tokens: request.maxTokens,
        // Depth lives here. `budget_tokens` is a 400 on this model, and
        // temperature/top_p/top_k are rejected too — tone is a prompt concern.
        output_config: {
          effort: request.effort,
          format: { type: 'json_schema', schema: request.schema },
        },
        // The rules are fixed and the subject varies, so the system block is
        // the cacheable prefix.
        system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
        ...(request.tools ? { tools: request.tools } : {}),
        messages: conversation,
      } as Anthropic.MessageStreamParams,
      { timeout: request.requestTimeoutMs, maxRetries: request.maxRetries },
    )

    const startedAt = Date.now()

    // A holder rather than plain `let`s: these are written inside callbacks, and
    // TypeScript's control flow cannot see a closure assignment, so locals would
    // still be narrowed to `null` at the catch below.
    const current = {
      stoppedBy: null as BudgetStop | null,
      searches: 0,
      snapshot: null as Anthropic.Message | null,
    }

    stream.on('streamEvent', (_event, latest) => {
      current.snapshot = latest
    })

    if (searchCeiling !== undefined) {
      stream.on('contentBlock', (block) => {
        if (block.type !== 'server_tool_use') return
        current.searches += 1
        if (searches + current.searches >= searchCeiling) {
          current.stoppedBy = 'searches'
          stream.abort()
        }
      })
    }

    const timer = setTimeout(() => {
      current.stoppedBy = 'time'
      stream.abort()
    }, remainingMs)

    let response: Anthropic.Message
    try {
      response = await stream.finalMessage()
    } catch (error) {
      clearTimeout(timer)
      // Our own abort is not an error: it is the budget doing its job, and it
      // carries a reason the operator can act on. Anything else is a real
      // failure and belongs to the caller's catch.
      const stoppedBy = current.stoppedBy
      if (stoppedBy === null) throw error

      searches += current.searches
      // The snapshot is kept because an aborted stream has no final message, and
      // billing it as zero tokens would under-report spend — the direction that
      // quietly raises the cap.
      usage = addUsage(usage, usageFrom(current.snapshot?.usage))
      console.warn(
        `[${label}] stopped by the ${stoppedBy} budget after ${elapsed()}s of ${budgetSeconds}s · ` +
          `${searches}${searchCeiling === undefined ? '' : ` of ${searchCeiling}`} search(es)`,
      )
      return { response: null, usage, searches, stoppedBy, seconds: elapsed(), legs: leg + 1 }
    }
    clearTimeout(timer)

    const legSeconds = Math.round((Date.now() - startedAt) / 1000)
    usage = addUsage(usage, usageFrom(response.usage))
    const legSearches = searchesFrom(response.content)
    searches += legSearches

    console.info(
      `[${label}] leg ${leg + 1}: ${legSeconds}s · ${legSearches} search(es) · ` +
        `stop_reason ${response.stop_reason ?? 'none'} · ` +
        `in ${usage.inputTokens} out ${usage.outputTokens} tok · ` +
        `totals ${elapsed()}s/${budgetSeconds}s, ${searches}` +
        `${searchCeiling === undefined ? '' : `/${searchCeiling}`} search(es)`,
    )

    const canResume = response.stop_reason === 'pause_turn' && leg < request.maxContinuations
    if (!canResume) {
      return { response, usage, searches, stoppedBy: null, seconds: elapsed(), legs: leg + 1 }
    }

    // No new user turn: the assistant's own content is the resumption. A user
    // message here would read as a fresh instruction rather than "carry on".
    conversation.push({ role: 'assistant', content: response.content })
  }
}
