/**
 * The one module that talks to the model (spec 18 §4, §5, §6, §7).
 *
 * **This is the only file in the repo allowed to import `@anthropic-ai/sdk`**,
 * and `server-only.test.ts` holds that by walking the import graph: no module
 * marked `'use client'` may reach this one, directly or through anything else.
 * The reason is the key. It is read from `process.env` here and nowhere else,
 * and the whole surface reaches the model through route handlers under
 * `app/api/copilot/*` so that no bundle a browser downloads can contain it.
 *
 * ## Two models, and the defaults are the trap
 *
 * 18 §0 is a list of four things that are each a bug if assumed the old way,
 * and all four are load-bearing here. Checked against the live API reference
 * before this was written:
 *
 * 1. **`claude-sonnet-5` and `claude-haiku-4-5`** are the real ids. There is
 *    no Haiku 5, and these families carry no date suffix.
 * 2. **Thinking is on by default on Sonnet 5**, and `max_tokens` caps thinking
 *    *plus* the answer. `STUDIO_MAX_TOKENS` is sized for both; an
 *    answer-sized cap truncates mid-sentence.
 * 3. **`budget_tokens`, `temperature`, `top_p` and `top_k` are 400s** on
 *    Sonnet 5. Depth is `output_config.effort`, and tone is a prompt concern.
 * 4. **The prompt-cache minimum is 4096 on Haiku 4.5** and 1024 on Sonnet 5,
 *    so the website corpus has to clear 4096 or caching silently does
 *    nothing. `grounding.ts` measures it and this module logs the verdict.
 *
 * **And one the spec does not mention, which would also have been a 400:**
 * `output_config.effort` is not supported on Haiku 4.5. It is set on the
 * studio request and deliberately absent from the website one — see
 * `siteRequest` below.
 *
 * ## No key is a supported mode
 *
 * §4: "`ANTHROPIC_API_KEY` missing is a supported mode, not an error." With
 * no key this module never constructs a client, never touches the network and
 * returns `canned.ts`'s answers with `mode: 'sample'` and a label attached.
 * Every route answers. That is what lets C2 and C3 be built and previewed
 * before "Needs Vlad F" lands.
 *
 * ## The order of operations, which is the spend cap
 *
 * Count the real tokens, check the cap, *then* call. §6 and
 * non-negotiable 11: the cap is a hard stop before the call, so a request
 * that would cross it is never made rather than made and regretted. Usage is
 * recorded from the response afterwards, including the two cache numbers,
 * because a `cache_read_input_tokens` of zero across repeated questions is
 * the only visible symptom of a prefix being invalidated.
 */

import Anthropic from '@anthropic-ai/sdk'

import {
  SAMPLE_NOTICE,
  cannedAnswer,
  type Citation,
  type CopilotAnswer,
  type CopilotMode,
  type CopilotSurface,
  type Proposal,
  type ProposalKind,
  type ProposalMove,
} from './canned'
import {
  SITE_CORPUS,
  SITE_CORPUS_TEXT,
  STUDIO_FACTS,
  measureCorpus,
  renderStudioFact,
  type CorpusMeasurement,
} from './grounding'
import type { CopilotEvent } from './events'
import { NO_USAGE, checkSpend, recordUsage, type EnvLike, type Usage } from './spend'

export const SITE_MODEL = 'claude-haiku-4-5'
export const STUDIO_MODEL = 'claude-sonnet-5'

/** Answers are short by design, and Haiku 4.5's ceiling is far above this. */
export const SITE_MAX_TOKENS = 1_024

/**
 * Sized for thinking *and* the answer, because on Sonnet 5 they share it.
 *
 * 18 §5 picks 8,000 and says why: "an answer-sized cap truncates
 * mid-sentence". The studio's answers are explanations, not essays, so the
 * headroom is for the thinking rather than for length.
 */
export const STUDIO_MAX_TOKENS = 8_000

/**
 * `medium`, and only on the studio request.
 *
 * §5: "Effort starts at `medium` and is tuned against real transcripts; the
 * brief's jobs are explanation, not deep reasoning, and `medium` is the
 * cheaper honest default."
 */
export const STUDIO_EFFORT = 'medium' as const

/** Live when a key exists, sample when it does not. */
export function copilotMode(env: EnvLike = process.env): CopilotMode {
  const key = env.ANTHROPIC_API_KEY?.trim()
  return key ? 'live' : 'sample'
}

/**
 * The website bot's instructions.
 *
 * The corpus is appended to this and the whole thing is the cached prefix, so
 * **nothing in either half may vary between requests** (§6). The rules are
 * here; the facts are in the corpus. Keeping them separate is what lets the
 * refusals be stated as rules rather than hidden among the facts.
 */
export const SITE_SYSTEM = `You are Mirrorline's website assistant. You are clearly an assistant, you say so if asked, and you never imply you are a person.

You answer ONLY from the Mirrorline pages quoted below. You have no other knowledge. If the answer is not in them, say so plainly and offer the Niche Scan or a call — that is a good answer, not a failure. Never fill a gap with general knowledge about marketing, agencies or short video, and never begin an answer with "generally" or "typically".

Quote or closely paraphrase the pages, and end every factual answer with the route it came from, written exactly as [source: /route] using a route that appears in the pages below.

Four things you refuse, every time:
1. Guarantees. Never promise views, followers, leads, sales, growth or compliance, and never give a number somebody will get. Say what we measure and report instead.
2. Client results. We have no customers yet and no case studies. Say that plainly. Every figure on our site is sample data and you must say so when you mention one.
3. Named competitors. Never name another company. Compare by category — clipping tools, agencies, repost pages.
4. Anything outside these pages. Hand off to a person.

Never say a video will go viral. Never use a multiplier on someone's results. Never claim we are the best or the first. Be brief: two or three sentences unless asked for more.

The pages follow.

`

/**
 * The studio bot's instructions.
 *
 * The facts are **not** in here. §5 caches only this block, and a workspace's
 * numbers change — a prefix carrying them would cache nothing and would also
 * mean one cached prompt per workspace instead of one for all of them. The
 * facts ride in the message.
 */
export const STUDIO_SYSTEM = `You are Mirrorline's studio co-pilot, helping a signed-in client understand their own account.

Every factual sentence must come from the rows supplied with the question, and must name the row it came from using the row's label in square brackets, exactly as it is given to you. If a claim cannot be tied to a supplied row, say you do not know. Never estimate, never interpolate and never produce a plausible number — a figure with nothing behind it is indistinguishable from an invented one.

Where a row says a source is not connected, say it is not connected. Never report it as zero: a zero is a claim about a number nobody measured.

You may explain, you may draft, and you may propose. You may NOT do anything. You cannot move a post, queue a remake or pause an account — you can only propose those three, and the client approves them. Say so if asked to act.

Never promise an outcome, never quote a result we have not measured, and label any draft as a draft.

Be brief and concrete. The client is looking at the screen you are describing.`

let client: Anthropic | null = null

/** The client, built once, and only when there is a key to build it with. */
function anthropic(env: EnvLike = process.env): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    // Unreachable through the public functions, which check the mode first.
    // Thrown rather than silently returning a client that would 401, so a
    // mistake here surfaces as this sentence and not as an auth error.
    throw new Error('copilot: asked for a live client with no ANTHROPIC_API_KEY')
  }
  client ??= new Anthropic({ apiKey })
  return client
}

/** Only for tests: the memoised client would otherwise outlive a changed env. */
export function resetClient(): void {
  client = null
}

let corpusVerdict: Promise<CorpusMeasurement> | null = null

/**
 * Measure the corpus against Haiku 4.5's cache minimum, once per process.
 *
 * With a key this is the real `messages.countTokens` §5 insists on. Without
 * one it is the pessimistic floor, which can prove the corpus is big enough
 * but cannot prove the opposite — and says which it is doing.
 *
 * Memoised because the corpus is static and the count costs a request. It
 * logs on the way through, because a corpus that has slipped under the
 * minimum produces no error of any kind: just a larger bill.
 */
export function corpusCacheVerdict(
  env: EnvLike = process.env,
): Promise<CorpusMeasurement> {
  corpusVerdict ??= (async () => {
    const counter =
      copilotMode(env) === 'live'
        ? async (text: string) => {
            const counted = await anthropic(env).messages.countTokens({
              model: SITE_MODEL,
              messages: [{ role: 'user', content: text }],
            })
            return counted.input_tokens
          }
        : undefined

    const measurement = await measureCorpus(counter)
    if (!measurement.cachesOnHaiku) {
      console.warn(`[copilot] the website corpus will not cache: ${measurement.reason}`)
    }
    return measurement
  })()

  return corpusVerdict
}

/** Only for tests. */
export function resetCorpusVerdict(): void {
  corpusVerdict = null
}

/**
 * The wire contract lives in `events.ts` and is re-exported here.
 *
 * It moved for C2. `server-only.test.ts` forbids any `'use client'` module
 * from reaching this file at any depth, and it reads `from '…'` without
 * distinguishing a type-only import — rightly, because the mistake it exists
 * for is always transitive. The website panel needs the event shape, so the
 * shape sits below this module rather than inside it. Every server-side
 * caller still imports it from here.
 */
export type { CopilotErrorKind, CopilotEvent } from './events'

export interface AskOptions {
  readonly surface: CopilotSurface
  readonly question: string
  /** Whose month the spend lands in. One workspace per studio client. */
  readonly workspaceId: string
  readonly now?: Date
  readonly env?: EnvLike
}

/** How many characters of canned text to emit at a time, so a stream streams. */
const SAMPLE_CHUNK = 48

async function* sampleStream(
  surface: CopilotSurface,
  question: string,
): AsyncGenerator<CopilotEvent> {
  const answer = cannedAnswer(surface, question)

  for (let at = 0; at < answer.text.length; at += SAMPLE_CHUNK) {
    yield { type: 'delta', text: answer.text.slice(at, at + SAMPLE_CHUNK) }
  }
  for (const citation of answer.citations) {
    yield { type: 'citation', citation }
  }
  for (const proposal of answer.proposals) {
    yield { type: 'proposal', proposal }
  }

  // No spend to report: nothing was called, so there is no usage and saying
  // "$0.00 of $20.00" would imply a call was made and cost nothing.
  yield { type: 'done', answer, usage: NO_USAGE, spendSummary: null }
}

interface RequestShape {
  readonly model: string
  readonly maxTokens: number
  readonly system: Anthropic.TextBlockParam[]
  readonly messages: Anthropic.MessageParam[]
  readonly effort?: typeof STUDIO_EFFORT
}

/**
 * The website request (§5).
 *
 * The corpus sits in the **system** block so it is the cached prefix and the
 * visitor's question is the only thing that changes.
 *
 * **No `output_config` at all**, and that is not an omission. `effort` is not
 * supported on Haiku 4.5 and sending it is a 400 — the spec's §0 lists the
 * parameters Sonnet 5 rejects and does not mention this one, so it is written
 * down here instead. No `temperature`, `top_p` or `top_k` either.
 */
function siteRequest(question: string): RequestShape {
  return {
    model: SITE_MODEL,
    maxTokens: SITE_MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: SITE_SYSTEM + SITE_CORPUS_TEXT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: question }],
  }
}

/**
 * The studio request (§5).
 *
 * Only the instructions are cached; the workspace's rows go in the message.
 * Depth is `output_config.effort`, never `budget_tokens`, which is a 400 on
 * this model.
 */
function studioRequest(question: string): RequestShape {
  const facts = STUDIO_FACTS.map(renderStudioFact).join('\n')

  return {
    model: STUDIO_MODEL,
    maxTokens: STUDIO_MAX_TOKENS,
    system: [{ type: 'text', text: STUDIO_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: `Rows for this workspace, each with the label you must cite it by:\n${facts}\n\nQuestion: ${question}`,
      },
    ],
    effort: STUDIO_EFFORT,
  }
}

export function requestShapeFor(surface: CopilotSurface, question: string): RequestShape {
  return surface === 'site' ? siteRequest(question) : studioRequest(question)
}

function usageFrom(usage: Anthropic.Usage | null | undefined): Usage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
  }
}

/**
 * The routes a model claimed as sources, turned into chips.
 *
 * Parsed from the `[source: /route]` markers the system prompt asks for, and
 * **checked against the corpus** — a route the model invented is dropped
 * rather than linked, because a citation chip leading to a 404 is worse than
 * no chip. This is parsing prose for a *link*, which is fine; §2.3 forbids
 * parsing prose for an *action*, and proposals do not come this way.
 */
export function citationsFromText(text: string): readonly Citation[] {
  const found = new Map<string, Citation>()

  for (const match of text.matchAll(/\[source:\s*([^\]]+)\]/g)) {
    const route = match[1]?.trim()
    if (!route) continue

    const section = SITE_CORPUS.find((entry) => entry.route === route)
    if (!section || found.has(route)) continue

    found.set(route, { label: section.heading, href: section.route })
  }

  return [...found.values()]
}

/** The label-bracket citations the studio prompt asks for, matched to real rows. */
export function studioCitationsFromText(text: string): readonly Citation[] {
  const found = new Map<string, Citation>()

  for (const match of text.matchAll(/\[([^\]]+)\]/g)) {
    const label = match[1]?.trim()
    if (!label) continue

    const fact = STUDIO_FACTS.find((entry) => entry.label === label)
    if (!fact || found.has(fact.label)) continue

    found.set(fact.label, { label: fact.label, href: fact.href })
  }

  return [...found.values()]
}

/**
 * The SDK's typed errors, most specific first (§7).
 *
 * Never by matching on message text. `APIConnectionError` is checked before
 * `APIError` because in the TypeScript SDK it is a subclass of it, so the
 * other order would swallow it.
 */
function failure(error: unknown): CopilotEvent {
  if (error instanceof Anthropic.RateLimitError) {
    return {
      type: 'error',
      kind: 'rate-limited',
      message: 'It is busy right now. Try again in a moment.',
    }
  }
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('[copilot] the API key was rejected')
    return { type: 'error', kind: 'failed', message: 'The assistant is not configured correctly.' }
  }
  if (error instanceof Anthropic.NotFoundError) {
    console.error('[copilot] no such model — check the ids in 18 §0', error)
    return { type: 'error', kind: 'failed', message: 'The assistant is not configured correctly.' }
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { type: 'error', kind: 'unreachable', message: 'I could not reach the model just now.' }
  }
  if (error instanceof Anthropic.APIError) {
    console.error('[copilot] API error', error.status, error.message)
    return { type: 'error', kind: 'failed', message: 'Something went wrong answering that.' }
  }

  console.error('[copilot] unexpected failure', error)
  return { type: 'error', kind: 'failed', message: 'Something went wrong answering that.' }
}

async function* callModel(
  options: AskOptions,
  shape: RequestShape,
  now: Date,
  env: EnvLike,
): AsyncGenerator<CopilotEvent> {
  const stream = anthropic(env).messages.stream({
    model: shape.model,
    max_tokens: shape.maxTokens,
    system: shape.system,
    messages: shape.messages,
    // Present on the studio request only: Haiku 4.5 rejects it.
    ...(shape.effort ? { output_config: { effort: shape.effort } } : {}),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'delta', text: event.delta.text }
    }
  }

  const final = await stream.finalMessage()
  const usage = usageFrom(final.usage)
  const ledger = recordUsage(options.workspaceId, shape.model, usage, now)

  // `stop_reason` before `content`, because a refusal is an HTTP 200 with
  // nothing to read (§7). Reading content first would mean indexing an empty
  // array on the one path where that is expected.
  if (final.stop_reason === 'refusal') {
    yield {
      type: 'error',
      kind: 'refused',
      message:
        'The model declined to answer that one, and I am not going to rephrase it to get around the refusal.',
    }
    return
  }

  const text = final.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const citations =
    options.surface === 'site' ? citationsFromText(text) : studioCitationsFromText(text)

  for (const citation of citations) {
    yield { type: 'citation', citation }
  }

  const answer: CopilotAnswer = {
    surface: options.surface,
    mode: 'live',
    text,
    citations,
    // Live proposals come from `PROPOSAL_SCHEMA` and `parseProposal`, never
    // from this text. §2.3: "A regex over model text deciding whether to
    // pause someone's account is the version of this feature that must never
    // ship."
    proposals: [],
    refusal: null,
    handoff: null,
  }

  yield {
    type: 'done',
    answer,
    usage,
    spendSummary: `spend this month $${ledger.usd.toFixed(2)}`,
  }
}

async function* liveStream(
  options: AskOptions,
  env: EnvLike,
): AsyncGenerator<CopilotEvent> {
  const now = options.now ?? new Date()
  const shape = requestShapeFor(options.surface, options.question)

  // Logged for its own sake: a corpus under the minimum is a silent bill.
  void corpusCacheVerdict(env)

  let promptTokens: number
  try {
    const counted = await anthropic(env).messages.countTokens({
      model: shape.model,
      system: shape.system,
      messages: shape.messages,
    })
    promptTokens = counted.input_tokens
  } catch (error: unknown) {
    yield failure(error)
    return
  }

  // Before the call, never after it. Non-negotiable 11.
  const decision = checkSpend(
    options.workspaceId,
    shape.model,
    promptTokens,
    shape.maxTokens,
    now,
    env,
  )
  if (!decision.allowed) {
    console.warn(`[copilot] refused before calling: ${decision.reason}`)
    yield {
      type: 'error',
      kind: decision.message.includes('cap') ? 'cap-reached' : 'request-too-large',
      message: decision.message,
    }
    return
  }

  try {
    yield* callModel(options, shape, now, env)
  } catch (error: unknown) {
    yield failure(error)
  }
}

/**
 * Ask, and get a stream of events.
 *
 * **Streaming is the default** (§4): the studio because the answers are long,
 * the website because a bot that pauses for four seconds reads as broken, and
 * both because non-streaming at a useful `max_tokens` is the shape most
 * likely to hit an HTTP timeout.
 *
 * Sample mode streams too. If it returned one lump, C2 and C3 would be built
 * against a shape the live path does not have, and the typing animation §2.4
 * asks for would have nothing to animate.
 */
export async function* askCopilot(options: AskOptions): AsyncGenerator<CopilotEvent> {
  const env = options.env ?? process.env
  const mode = copilotMode(env)

  yield { type: 'meta', mode, notice: mode === 'sample' ? SAMPLE_NOTICE : null }

  if (mode === 'sample') {
    yield* sampleStream(options.surface, options.question)
    return
  }

  yield* liveStream(options, env)
}

/**
 * The JSON schema a proposal must validate against.
 *
 * §2.3's implementation note: proposals come back as structured output, "not
 * parsed out of prose". `requiresApproval` is a constant `true` in the schema
 * as well as in the type, so a model cannot return an auto-approving one even
 * by accident.
 */
export const PROPOSAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'summary', 'detail', 'requiresApproval'],
  properties: {
    kind: { type: 'string', enum: ['move-post', 'swap-format', 'pause-account'] },
    summary: { type: 'string' },
    detail: { type: 'string' },
    requiresApproval: { const: true },
    /**
     * The payload for `move-post`, and the reason Approve can do anything.
     *
     * Structured rather than described in `detail`, because §2.3 forbids
     * reading an action out of prose and a screen cannot perform a sentence.
     * Optional here and checked hard in `parseProposal`: a `move-post` whose
     * payload is missing or malformed is dropped rather than offered.
     */
    move: {
      type: 'object',
      additionalProperties: false,
      required: ['postId', 'date', 'time24', 'timeLabel'],
      properties: {
        postId: { type: 'string' },
        date: { type: 'string' },
        time24: { type: 'string' },
        timeLabel: { type: 'string' },
      },
    },
  },
} as const

/** `"14:15"`. Anchored, so `"9:5"` and `"25:00"` are both refused. */
const TIME_24 = /^([01]\d|2[0-3]):[0-5]\d$/

/** `"2026-11-19"`. The fixtures' own format, and the one a move is keyed by. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate the structured payload a `move-post` carries.
 *
 * Every field is checked for shape, not merely for presence. `date` and
 * `time24` are the two that end up in a `PostMove` and therefore in a cell of
 * the grid: a malformed time sorts wrongly inside a day and a malformed date
 * creates a column that does not exist, and neither fails loudly. A string
 * that is merely non-empty is not enough here.
 */
export function parseProposalMove(value: unknown): ProposalMove | null {
  if (typeof value !== 'object' || value === null) return null

  const source = value as Record<string, unknown>
  const { postId, date, time24, timeLabel } = source

  if (typeof postId !== 'string' || postId.trim().length === 0) return null
  if (typeof date !== 'string' || !ISO_DATE.test(date)) return null
  if (typeof time24 !== 'string' || !TIME_24.test(time24)) return null
  if (typeof timeLabel !== 'string' || timeLabel.trim().length === 0) return null

  return { postId: postId.trim(), date, time24, timeLabel: timeLabel.trim() }
}

const PROPOSAL_KINDS: readonly ProposalKind[] = ['move-post', 'swap-format', 'pause-account']

/**
 * Validate a proposal that came back from the model.
 *
 * Exported and tested, because this is the gate between a model's JSON and a
 * card with an Approve button on it. Anything that does not match exactly is
 * dropped: a proposal we cannot read is not a proposal we should offer.
 */
export function parseProposal(value: unknown): Proposal | null {
  if (typeof value !== 'object' || value === null) return null

  const source = value as Record<string, unknown>
  const { kind, summary, detail } = source

  if (typeof kind !== 'string' || !PROPOSAL_KINDS.includes(kind as ProposalKind)) return null
  if (typeof summary !== 'string' || summary.trim().length === 0) return null
  if (typeof detail !== 'string' || detail.trim().length === 0) return null
  // Anything other than a literal `true` is refused rather than coerced.
  if (source.requiresApproval !== true) return null

  // A `move-post` without a payload the screen can act on is not a proposal,
  // it is a sentence with an Approve button. Dropped here rather than shown
  // and found to do nothing.
  const move = kind === 'move-post' ? parseProposalMove(source.move) : null
  if (kind === 'move-post' && !move) return null

  return {
    kind: kind as ProposalKind,
    summary: summary.trim(),
    detail: detail.trim(),
    requiresApproval: true,
    ...(move ? { move } : {}),
  }
}
