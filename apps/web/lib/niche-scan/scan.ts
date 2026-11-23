/**
 * The Niche Scan agent (V1, §2.5, D113).
 *
 * Research a niche, return the five findings and the examples they were read
 * from, write them down, and record what it cost.
 *
 * ## The order is the cap, and it is not negotiable
 *
 * Count the real tokens → check the month's spend → **refuse before calling**
 * → call → parse → write → record. `18 §6` and non-negotiable 11: the ceiling
 * has to actually hold, so a run that would cross it is never made rather
 * than made and regretted. A refused run still writes an `agent_runs` row, at
 * $0, because a cap that works must not look like a feature nobody used.
 *
 * ## Why Sonnet rather than Opus
 *
 * `18 §0` records Vlad's tier decision — "Sonnet for the studio, Haiku for
 * the public site" — and the scan is a studio agent. It is also the only
 * tier `MODEL_RATES` prices: an unpriced model falls through to `usageUsd`'s
 * dearest-rate branch, which would make every projection wrong in the
 * direction that still *allows* the call. A cap built on a guess is not a cap.
 *
 * ## Sources, and the conflict recorded in D113
 *
 * `04` and `12 §1` give the scan a closed allow-list and say "Allowed, and
 * nothing else". Web search is not on it. Vlad chose web search twice; the
 * widening is D113. What does **not** move is what carries the legal weight,
 * and the prompt says so explicitly: links and descriptions only, never
 * media; a `source_note` per row; no scraping and no bulk collection. The
 * parser enforces it again on the way in, because a prompt is a request and a
 * parser is a rule.
 */

import 'server-only'

// Types only — erased at compile time. Every runtime value comes from the
// chokepoint, which is the one module that imports the SDK and reads the key.
import type Anthropic from '@anthropic-ai/sdk'

import {
  APIConnectionError,
  APIError,
  RateLimitError,
  anthropicClient,
  hasAnthropicKey,
} from '../agents/anthropic-client'
import { checkAgentSpend, recordRun } from '../agents/ledger'
import { createAgentServiceClient } from '../agents/service-client'
import { NO_USAGE, type EnvLike, type Usage } from '../copilot/spend'
import { SAMPLE_REPORT } from './canned'
import { parseReport, rankExamples, type NicheReportFindings } from './report'

/** `18 §0`: the real id. No second version digit, no date suffix. */
export const SCAN_MODEL = 'claude-sonnet-5'

/**
 * Sized for thinking *and* the report.
 *
 * Adaptive thinking is on by default on Sonnet 5 and shares this budget with
 * the answer, so a cap sized for the JSON alone truncates mid-object — and a
 * truncated report parses to `null`, which reads as "the scan found nothing".
 */
export const SCAN_MAX_TOKENS = 16_000

/** A research run, not a question. `low` under-reads the niche. */
export const SCAN_EFFORT = 'high' as const

/**
 * The most searches one scan may run.
 *
 * Projected at this ceiling rather than an expected count — it is what the
 * model is *allowed* to reach, and a cap built on the optimistic number only
 * holds for the runs that happened to search less.
 */
export const SCAN_MAX_SEARCHES = 12

/**
 * This agent's own per-request ceiling.
 *
 * The co-pilot's $0.50 is sized for a question. A scan is a research run with
 * searches and a long structured answer, so it legitimately costs more —
 * named here rather than by raising `MAX_REQUEST_USD`, which would raise it
 * for the co-pilot too.
 */
export const SCAN_MAX_REQUEST_USD = 2

/**
 * The HTTP timeout for one leg — and it is **not** a bound on generation time.
 *
 * Measured, after getting this wrong once. The first live scan was
 * non-streaming and simply never came back: the SDK's default timeout is ten
 * minutes but it scales *up*, as far as an hour, for a large `max_tokens`, and
 * then retries. No error, no response, nothing written, and no way to tell a
 * slow research run from a wedged socket.
 *
 * Streaming fixed that, and the reason is the thing to understand here: on a
 * stream this timeout governs the **connection**, not the whole generation. A
 * real scan then ran for **362 seconds** against this five-minute value and was
 * never cut off, because bytes kept arriving. That is the intended behaviour —
 * a six-minute research run should finish — so the number is a guard against a
 * silent socket, not a deadline for the model.
 *
 * Which means the real ceiling lives elsewhere: a synchronous server action on
 * Vercel is capped at 300 seconds, and a 362-second scan does not fit inside
 * it. Noted in the handoff; the fix is a background job, not a bigger number.
 */
export const SCAN_REQUEST_TIMEOUT_MS = 5 * 60 * 1000

/**
 * How many times a paused turn may be resumed.
 *
 * `web_search` runs inside a server-side loop that stops at ten iterations and
 * returns `stop_reason: 'pause_turn'` — a real outcome for a run allowed twelve
 * searches, not an error. Resuming is the documented continuation: re-send the
 * conversation with the assistant turn appended and the server picks up where
 * it stopped, with **no extra user message** (one would read as a new
 * instruction rather than a resumption).
 *
 * Bounded, because the failure mode of an unbounded resume loop is a bill.
 */
export const SCAN_MAX_CONTINUATIONS = 2

/**
 * No retries on a scan. **This one is about money, not latency.**
 *
 * The SDK retries twice by default, and it counts a timeout as retryable — so
 * the five-minute bound above was quietly a fifteen-minute one, and each of
 * those attempts is a *fresh research run*: the searches run again, the tokens
 * are spent again, and the caller sees one request. That is the shape of
 * non-negotiable 11's failure mode, where money goes out without anybody
 * choosing to spend it.
 *
 * A cheap question is worth retrying automatically. A multi-search research run
 * that costs real money is worth reporting instead, so somebody decides whether
 * to pay for a second one. The co-pilot keeps the SDK default; this does not.
 */
export const SCAN_MAX_RETRIES = 0

/**
 * The shape the model must return.
 *
 * Structured output rather than "please reply with JSON": a regex over model
 * prose deciding what goes in the database is the version of this that must
 * never ship. `parseReport` still validates every field — the schema
 * constrains the shape, not the truthfulness.
 */
const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topFormats', 'topHooks', 'topics', 'lengths', 'postingPatterns', 'examples'],
  properties: {
    topFormats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'whyItWorks', 'beats', 'fit'],
        properties: {
          name: { type: 'string' },
          whyItWorks: { type: 'string' },
          beats: { type: 'array', items: { type: 'string' } },
          /*
           * 0–10, bounded here rather than only asked for in words.
           *
           * The first live scan answered 9, 8 and 7 against a field documented
           * as 0–100 and a bar drawn against 100 — three strong fits rendered
           * as three near-empty bars. The scale a model reaches for unprompted
           * is the one to standardise on, so the schema states it.
           */
          fit: { type: 'integer', minimum: 0, maximum: 10 },
        },
      },
    },
    topHooks: { type: 'array', items: { type: 'string' } },
    topics: { type: 'array', items: { type: 'string' } },
    lengths: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['seconds', 'note'],
        properties: { seconds: { type: 'integer' }, note: { type: 'string' } },
      },
    },
    postingPatterns: { type: 'array', items: { type: 'string' } },
    /*
     * A source is a page, so it is described as one: what it was called, where
     * it lives, and whether it is a post we read a format off or a guide
     * somebody wrote about the niche. A list of bare urls printed as a
     * semicolon-joined wall is not an audit record, which is what `12 §1`
     * asks this field to be.
     */
    sourcesUsed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url', 'kind'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          kind: { type: 'string', enum: ['post', 'guide'] },
        },
      },
    },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'platform', 'formatName', 'whyItWorks', 'sourceNote'],
        properties: {
          url: { type: 'string' },
          platform: { type: 'string', enum: ['instagram', 'tiktok', 'youtube', 'linkedin'] },
          formatName: { type: 'string' },
          hookType: { type: 'string' },
          lengthSeconds: { type: 'integer' },
          views: { type: 'integer' },
          viewsPerFollower: { type: 'number' },
          accountSizeBucket: {
            type: 'string',
            enum: ['under_1k', '1k_10k', '10k_100k', '100k_1m', 'over_1m'],
          },
          postedAt: { type: 'string' },
          whyItWorks: { type: 'string' },
          sourceNote: { type: 'string' },
        },
      },
    },
  },
} as const

export const SCAN_SYSTEM = `You research what is working in a niche on short vertical video, so a team can make the client their OWN original videos.

You record the SHAPE of a format and a LINK to where you saw it. You never reproduce anyone's work.

Hard rules. These are not style preferences:
1. Every example must have a url that is a link to a public POST or video page. Never a link to a media file — no .mp4, .mov, .m4a, .jpg, .png. If you only have a media file link, omit that example.
2. Never quote more than a few words of anyone's script, caption or voiceover. Describe the structure instead: the beats, the hook type, the length.
3. Every example must carry a source_note naming where you looked, so an audit can check it later.
4. Rank by views per follower over roughly the last 30 days, never by raw views. A 4,000-follower account getting 40,000 views is a better model than a two-million-follower account coasting — ranking by raw views recommends the coaster.
5. If you are unsure of a number, omit the field. Do not estimate. A missing value is honest; an invented one is not.
6. Score fit from 0 to 10, where 10 is "this client could shoot this tomorrow". Never use a 0-100 scale.
7. Sources are pages, not bare links. Give each one its page title, its url, and whether it is a "post" (a public post or video you read a format off) or a "guide" (an article or agency write-up ABOUT the niche). A guide is industry guidance, not evidence that a format is working, and the two must never be presented as the same thing.

Return formats as recipes: a name, why it works in one sentence, and the beats in order (hook, setup, payoff, call to action). Those beats are what gets remade with a new script and the client's own footage.`

export interface ScanRequest {
  readonly workspaceId: string
  readonly niche: string
  readonly env?: EnvLike
  readonly now?: Date
}

export type ScanOutcome =
  | { readonly status: 'complete'; readonly reportId: string; readonly isSample: boolean }
  | { readonly status: 'refused'; readonly message: string }
  | { readonly status: 'failed'; readonly message: string }

function usageFrom(usage: Anthropic.Usage | null | undefined): Usage {
  if (!usage) return NO_USAGE
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  }
}

/**
 * How many searches actually ran.
 *
 * Counted from the response rather than assumed, because the projection used
 * the ceiling and the ledger must record the truth. A run that searched twice
 * should not be billed as twelve.
 */
function searchesFrom(content: readonly Anthropic.ContentBlock[]): number {
  return content.filter((block) => block.type === 'server_tool_use').length
}

/**
 * Summed across continuation legs, so the ledger records the whole run.
 *
 * A paused-and-resumed scan is two or three HTTP responses and one piece of
 * work. Recording only the last leg's usage would under-report every resumed
 * run — and under-reporting is the direction that quietly raises the cap.
 */
function addUsage(first: Usage, second: Usage): Usage {
  return {
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
    cacheReadTokens: first.cacheReadTokens + second.cacheReadTokens,
    cacheCreationTokens: first.cacheCreationTokens + second.cacheCreationTokens,
  }
}

/**
 * The tools the scan may use, in one place.
 *
 * Built by a function rather than written twice because `countTokens` has to be
 * given the *same* list the call uses — a projection made against a different
 * tool list is a projection of a different request, and the cap would be
 * guarding something we never sent.
 */
function scanTools() {
  return [
    {
      type: 'web_search_20260209' as const,
      name: 'web_search' as const,
      max_uses: SCAN_MAX_SEARCHES,
    },
  ]
}

interface CompletedCall {
  readonly response: Anthropic.Message
  readonly usage: Usage
  readonly searches: number
}

/**
 * Make the call, streaming, resuming a paused turn up to the cap.
 *
 * ## Streaming, and why it is not a preference
 *
 * The first live scan never came back. A research run at `high` effort with up
 * to twelve searches and 16k of output takes minutes, and a *non-streaming*
 * request of that size does not get the SDK's ten-minute default timeout — the
 * client scales it up to as much as an hour for a large `max_tokens`, then
 * retries twice. So the failure mode is not an error: it is a request that sits
 * open long past any point the answer was still wanted, with nothing written
 * and no way to distinguish a slow run from a dead socket.
 *
 * Streaming is the documented fix for exactly this, because bytes arrive
 * throughout rather than all at the end. `finalMessage()` then assembles the
 * same `Message` the non-streaming call would have returned, so nothing
 * downstream changes — `stop_reason`, `content` and `usage` are all read the
 * same way.
 *
 * The explicit per-leg timeout is the second half: streaming stops the request
 * from *looking* idle, and the timeout stops it from running forever anyway.
 *
 * ## Resuming a paused turn
 *
 * `pause_turn` means the server-side search loop hit its iteration limit, not
 * that anything failed. The continuation is to re-send the conversation with
 * the assistant turn appended — and deliberately **no new user message**, which
 * the API would read as a fresh instruction instead of "carry on".
 */
async function callTheModel(
  client: Anthropic,
  firstTurn: Anthropic.MessageParam,
): Promise<CompletedCall> {
  const conversation: Anthropic.MessageParam[] = [firstTurn]
  let usage = NO_USAGE
  let searches = 0

  for (let leg = 0; ; leg += 1) {
    const stream = client.messages.stream(
      {
        model: SCAN_MODEL,
        max_tokens: SCAN_MAX_TOKENS,
        // Depth lives here. `budget_tokens` is a 400 on this model, and
        // temperature/top_p/top_k are rejected too — tone is a prompt concern.
        output_config: {
          effort: SCAN_EFFORT,
          format: { type: 'json_schema', schema: REPORT_SCHEMA },
        },
        // The rules are fixed and the niche varies, so the system block is the
        // cacheable prefix.
        system: [{ type: 'text', text: SCAN_SYSTEM, cache_control: { type: 'ephemeral' } }],
        // `web_search_20260209` filters results dynamically on its own. The
        // code-execution tool is deliberately NOT declared alongside it: a
        // second execution environment confuses the model.
        tools: scanTools(),
        messages: conversation,
      },
      { timeout: SCAN_REQUEST_TIMEOUT_MS, maxRetries: SCAN_MAX_RETRIES },
    )

    const startedAt = Date.now()
    const response = await stream.finalMessage()
    const legSeconds = Math.round((Date.now() - startedAt) / 1000)

    usage = addUsage(usage, usageFrom(response.usage))
    searches += searchesFrom(response.content)

    // Logged, not merely measured. How long a scan took is the operational
    // question this agent raises — the request is minutes long, which is the
    // fact that decides whether it can stay a synchronous action at all — and
    // nothing in `agent_runs` records duration.
    console.info(
      `[niche-scan] leg ${leg + 1}: ${legSeconds}s · ${searchesFrom(response.content)} search(es) · ` +
        `stop_reason ${response.stop_reason ?? 'none'}`,
    )

    const canResume = response.stop_reason === 'pause_turn' && leg < SCAN_MAX_CONTINUATIONS
    if (!canResume) return { response, usage, searches }

    // No new user turn: the assistant's own content is the resumption.
    conversation.push({ role: 'assistant', content: response.content })
  }
}

/** The JSON the model returned, from whichever block carries it. */
function jsonFrom(content: readonly Anthropic.ContentBlock[]): unknown {
  for (const block of content) {
    if (block.type !== 'text') continue
    try {
      return JSON.parse(block.text)
    } catch {
      // Not this block. Structured output puts the object in one of them;
      // web search can add commentary blocks around it.
    }
  }
  return null
}

function userPrompt(niche: string): string {
  return `Research what is working right now on short vertical video in this niche: ${niche}

Find 3 to 6 formats that are growing, the hooks and topics behind them, the lengths that hold attention, and how often the accounts doing well post.

Then give me up to 12 examples you actually found, each with a link to the post, what format it is, why it works, and where you looked. Rank them by views per follower.`
}

/** `18 §7`: typed classes, most specific first, never a match on message text. */
function describe(error: unknown): string {
  if (error instanceof RateLimitError) return 'The model is busy right now. Try again in a moment.'
  if (error instanceof APIConnectionError) return 'We could not reach the model just now.'
  if (error instanceof APIError) {
    console.error('[niche-scan] API error', error.status, error.message)
    return 'Something went wrong running the scan.'
  }
  console.error('[niche-scan] unexpected failure', error)
  return 'Something went wrong running the scan.'
}

interface WriteReportInput {
  readonly workspaceId: string
  readonly niche: string
  readonly findings: NicheReportFindings
  readonly model: string | null
  readonly now: Date
}

type AgentClient = ReturnType<typeof createAgentServiceClient>

/**
 * Write the report and its examples, or `null` if it could not be saved.
 *
 * The report row lands first so the examples have a `report_id` to hang off.
 * A failure after that leaves the report standing rather than a silent gap —
 * research that vanishes on failure is research nobody can debug.
 */
async function writeReport(supabase: AgentClient, input: WriteReportInput): Promise<string | null> {
  const { workspaceId, niche, findings, model, now } = input

  const inserted = await supabase
    .from('niche_reports')
    .insert({
      workspace_id: workspaceId,
      niche,
      status: 'complete',
      model,
      top_formats: findings.topFormats,
      top_hooks: findings.topHooks,
      topics: findings.topics,
      lengths: findings.lengths,
      posting_patterns: findings.postingPatterns,
      sources_used: findings.sourcesUsed,
      completed_at: now.toISOString(),
    })
    .select('id')
    .limit(1)

  if (inserted.error || !inserted.data?.[0]) {
    console.error('[niche-scan] could not write the report', inserted.error?.message)
    return null
  }

  const reportId = (inserted.data[0] as { id: string }).id
  const examples = rankExamples(findings.examples)
  if (examples.length === 0) return reportId

  const rows = examples.map((example) => {
    const format = findings.topFormats.find((entry) => entry.name === example.formatName)
    return {
      workspace_id: workspaceId,
      report_id: reportId,
      format: example.formatName,
      from_niche: niche,
      platform: example.platform,
      url: example.url,
      posted_at: example.postedAt,
      views: example.views,
      views_per_follower: example.viewsPerFollower,
      account_size_bucket: example.accountSizeBucket,
      hook_type: example.hookType,
      length_seconds: example.lengthSeconds,
      why_it_works: example.whyItWorks,
      source_note: example.sourceNote,
      // The beats belong to the format, not the example; the cards read them
      // from whichever row carries the matching format name.
      beats: format?.beats ?? [],
      fit: format?.fit ?? null,
    }
  })

  const written = await supabase.from('trends').insert(rows)
  if (written.error) {
    // The report stands; the evidence did not land. Said out loud rather than
    // returned as success, because a report with no examples is the shape of
    // a scan that found nothing.
    console.error('[niche-scan] could not write the examples', written.error.message)
  }

  return reportId
}

/**
 * Run a scan, or say why it did not run.
 *
 * `niche` is the client's own words from onboarding. It is interpolated into
 * the user turn and never into the system prompt — the rules stay fixed, the
 * subject varies, which is also what keeps the system block cacheable.
 */
export async function runNicheScan(request: ScanRequest): Promise<ScanOutcome> {
  const { workspaceId, niche } = request
  const env = request.env ?? process.env
  const now = request.now ?? new Date()
  const supabase = createAgentServiceClient()

  const trimmedNiche = niche.trim()
  if (!trimmedNiche) {
    return { status: 'failed', message: 'A scan needs a niche to research.' }
  }

  // ======================================================================
  // No key is a supported mode, not an error (18 §4)
  // ======================================================================
  //
  // The sample is written, labelled, so the screen has a real report to show
  // and the e2e suite never spends anything. No `agent_runs` row, because no
  // call was made — a log of calls that did not happen is noise in the one
  // place that has to stay readable.
  if (!hasAnthropicKey(env)) {
    const reportId = await writeReport(supabase, {
      workspaceId,
      niche: trimmedNiche,
      findings: SAMPLE_REPORT,
      model: null,
      now,
    })
    if (!reportId) return { status: 'failed', message: 'Could not save the sample report.' }
    return { status: 'complete', reportId, isSample: true }
  }

  const client = anthropicClient(env)
  const firstTurn: Anthropic.MessageParam = {
    role: 'user',
    content: userPrompt(trimmedNiche),
  }

  // ======================================================================
  // Count, check, then call — in that order
  // ======================================================================
  let promptTokens: number
  try {
    const counted = await client.messages.countTokens({
      model: SCAN_MODEL,
      system: SCAN_SYSTEM,
      messages: [firstTurn],
      tools: scanTools(),
    })
    promptTokens = counted.input_tokens
  } catch (error) {
    const message = describe(error)
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'failed',
      usage: NO_USAGE,
      searches: 0,
      reason: 'could not count tokens before the call',
    })
    return { status: 'failed', message }
  }

  const decision = await checkAgentSpend(
    supabase,
    workspaceId,
    SCAN_MODEL,
    promptTokens,
    SCAN_MAX_TOKENS,
    now,
    env,
    { maxSearches: SCAN_MAX_SEARCHES, maxRequestUsd: SCAN_MAX_REQUEST_USD },
  )

  if (!decision.allowed) {
    // Recorded at $0. The call was never made, and that is exactly the fact
    // worth being able to see later.
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'refused',
      usage: NO_USAGE,
      searches: 0,
      reason: decision.reason,
    })
    return { status: 'refused', message: decision.message }
  }

  let call: CompletedCall
  try {
    call = await callTheModel(client, firstTurn)
  } catch (error) {
    const message = describe(error)
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'failed',
      usage: NO_USAGE,
      searches: 0,
      reason: 'the model call failed',
    })
    return { status: 'failed', message }
  }

  const { response, usage, searches } = call

  // A turn still paused after the last allowed continuation has no report in
  // it — the model was mid-research when the loop ran out. Recorded as its own
  // reason rather than folded into "nothing that parsed", because the fix is a
  // different one: raise the cap, or narrow the brief.
  if (response.stop_reason === 'pause_turn') {
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'failed',
      usage,
      searches,
      reason: `still searching after ${SCAN_MAX_CONTINUATIONS} continuation(s)`,
    })
    return { status: 'failed', message: 'The scan ran out of research time. Try a narrower niche.' }
  }

  // `stop_reason` before `content`: a refusal is an HTTP 200 with nothing to
  // read (18 §7), so indexing the content first would throw on the one path
  // that most needs a clear answer.
  if (response.stop_reason === 'refusal') {
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'failed',
      usage,
      searches,
      reason: 'the model declined this request',
    })
    return { status: 'failed', message: 'The model declined to research that niche.' }
  }

  const parsed = parseReport(jsonFrom(response.content))

  if (!parsed) {
    await recordRun(supabase, {
      workspaceId,
      agent: 'trend_scout',
      model: SCAN_MODEL,
      status: 'failed',
      usage,
      searches,
      reason:
        response.stop_reason === 'max_tokens'
          ? 'the report was cut off by max_tokens'
          : 'the model returned nothing that parsed as a report',
    })
    return { status: 'failed', message: 'The scan did not come back with a usable report.' }
  }

  if (parsed.droppedExamples.length > 0) {
    // Reported, never silent. A scan that quietly discarded half its findings
    // would look like a thin niche rather than a parser doing its job.
    console.warn(
      `[niche-scan] dropped ${parsed.droppedExamples.length} example(s): ${parsed.droppedExamples.join('; ')}`,
    )
  }

  const reportId = await writeReport(supabase, {
    workspaceId,
    niche: trimmedNiche,
    findings: parsed.findings,
    model: SCAN_MODEL,
    now,
  })

  await recordRun(supabase, {
    workspaceId,
    agent: 'trend_scout',
    model: SCAN_MODEL,
    status: reportId ? 'ok' : 'failed',
    usage,
    searches,
    reason: reportId ? null : 'the report could not be saved',
  })

  if (!reportId) return { status: 'failed', message: 'The scan ran but could not be saved.' }
  return { status: 'complete', reportId, isSample: false }
}
