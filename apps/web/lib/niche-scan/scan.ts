/**
 * The Niche Scan agent — two legs, one lease (V1, §2.5, D113, D132).
 *
 * Research a niche, write the report from what the research found, turn it into
 * three videos to film, store all of it, and record what it cost.
 *
 * ## Why it is two legs now
 *
 * **Of three live production scans, one produced a report.** Job `5c20fa06` is
 * the shape of the other two: leg one ran 329 seconds, made 22 searches, came
 * back `end_turn` — it *finished* — and the report was rejected for
 * `placeholder-text` with seven placeholder fields. The model did not fail. It
 * was asked to research a niche *and* emit a complete, placeholder-free
 * structured report in one turn under one clock, and it spent the clock on the
 * half that had tools.
 *
 * So the work is split and each half gets its own budget:
 *
 * - **`research.ts`** — web search, a hard deadline that *reserves* leg two's
 *   slice, and structured notes out. It never writes the report.
 * - **`write-leg.ts`** — no tools at all, its own time and token budget, and one
 *   job: the notes into the report schema. A rejected report is re-written from
 *   the same notes, which costs one short call and zero searches because the
 *   expensive half is already in hand.
 *
 * `notes.ts` is the seam, and `stream-leg.ts` is the streaming-with-budgets
 * machinery both legs share.
 *
 * ## The order is the cap, and it is not negotiable
 *
 * Count the real tokens → check the month's spend → **refuse before calling** →
 * call → parse → write → record. `18 §6` and non-negotiable 11: the ceiling has
 * to actually hold, so a run that would cross it is never made rather than made
 * and regretted. A refused run still writes an `agent_runs` row, at $0, because
 * a cap that works must not look like a feature nobody used.
 *
 * **The projection now covers both legs**, including the retry — see
 * `WRITE_PROMPT_PROJECTION_TOKENS`. One decision, before anything is spent.
 *
 * ## Sources, and the conflict recorded in D113
 *
 * `04` and `12 §1` give the scan a closed allow-list and say "Allowed, and
 * nothing else". Web search is not on it. Vlad chose web search twice; the
 * widening is D113. What does **not** move is what carries the legal weight:
 * links and descriptions only, never media; a `source_note` per row; no scraping
 * and no bulk collection. `notes.ts` enforces it on the way in and `report.ts`
 * again after, because a prompt is a request and a parser is a rule.
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
import { readClientProfileForAgent } from '../agents/read-client-profile'
import { createAgentServiceClient } from '../agents/service-client'
import { NO_USAGE, type EnvLike, type Usage } from '../copilot/spend'
import { writeDrafts } from '../drafts/write-drafts'
import { writeFirstVideos } from '../scripts/first-videos'
import type { RejectedIdea, VideoIdea } from '../scripts/video-idea'
import type { ClientProfile } from '../workspace/client-profile'

import { SAMPLE_REPORT } from './canned'
import { notesAreUsable, notesCountLine } from './notes'
import { rankExamples, type NicheReportFindings } from './report'
import {
  RESEARCH_MAX_TOKENS,
  RESEARCH_MODEL,
  RESEARCH_SEARCH_CEILING,
  RESEARCH_SEARCH_PROJECTION,
  RESEARCH_SYSTEM,
  RESEARCH_TIME_BUDGET_MS,
  researchTools,
  researchTurn,
  runResearchLeg,
} from './research'
import { addUsage } from './stream-leg'
import {
  runWriteLeg,
  WRITE_MAX_ATTEMPTS,
  WRITE_MAX_TOKENS,
  WRITE_TIME_BUDGET_MS,
} from './write-leg'

/** `18 §0`: the real id. No second version digit, no date suffix. */
export const SCAN_MODEL = RESEARCH_MODEL

/**
 * The whole scan's wall-clock budget, across both legs and the write retry.
 *
 * Derived rather than written down, so the two legs' own numbers stay the single
 * source of truth and `budget.test.ts` checks the arithmetic that actually runs.
 * 270s of research plus two 75s write attempts is **420 seconds**, which with
 * the script agent's 120s leaves well over a third of the 900-second lease
 * unspent.
 *
 * The failure mode of overrunning a lease is not a slow job: `claim_job`
 * reclaims expired leases, so a second worker claims it and bills a second
 * Sonnet research run for a report already being written.
 */
export const SCAN_TIME_BUDGET_MS =
  RESEARCH_TIME_BUDGET_MS + WRITE_TIME_BUDGET_MS * WRITE_MAX_ATTEMPTS

/** Only leg one searches, so the scan's search numbers are leg one's. */
export const SCAN_SEARCH_PROJECTION = RESEARCH_SEARCH_PROJECTION

export const SCAN_SEARCH_CEILING = RESEARCH_SEARCH_CEILING

/**
 * This agent's own per-request ceiling.
 *
 * The co-pilot's $0.50 is sized for a question. A scan is a research run with
 * searches and a long structured answer, so it legitimately costs more — named
 * here rather than by raising `MAX_REQUEST_USD`, which would raise it for the
 * co-pilot too.
 *
 * **Unchanged by the two-leg split, and that is worth the arithmetic.** The
 * projection below is 18k input, 56k output and 24 searches: at Sonnet's $3/$15
 * per million and $0.01 a search that is about $1.13, against the same $2. The
 * split spends more tokens than the single leg did (~$0.67) and still clears the
 * cap, so no money decision was smuggled in with a reliability fix.
 */
export const SCAN_MAX_REQUEST_USD = 2

/**
 * What leg two's prompt is assumed to cost, for the projection only.
 *
 * Leg two's input is the write system block plus the notes rendered as prose,
 * and the notes are bounded by `notes.ts`'s own caps — 8 formats at 600
 * characters, 12 examples, 20 pages, a 1,000-character coverage line. 8k tokens
 * is comfortably above that plus the system block.
 *
 * It is a projection rather than a count because the notes do not exist when the
 * decision is made, and the decision has to come first: `checkAgentSpend` after
 * leg one would be a cap that approves the expensive half and then guards the
 * cheap one.
 */
export const WRITE_PROMPT_PROJECTION_TOKENS = 8_000

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
  /** Written in the same insert as the research they came from (V2). */
  readonly firstVideos?: readonly VideoIdea[]
  /**
   * The ideas screening refused (V3, D129).
   *
   * They do not go in the report — a client's "first videos" are the ones they
   * can film. They become `drafts` rows, so a block is visible with the gate's
   * number and limit rather than only in a log line.
   */
  readonly refusedVideos?: readonly RejectedIdea[]
}

type AgentClient = ReturnType<typeof createAgentServiceClient>

/**
 * Write the report and its examples, or `null` if it could not be saved.
 *
 * The report row lands first so the examples have a `report_id` to hang off. A
 * failure after that leaves the report standing rather than a silent gap —
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
      first_videos: input.firstVideos ?? [],
      completed_at: now.toISOString(),
    })
    .select('id')
    .limit(1)

  if (inserted.error || !inserted.data?.[0]) {
    console.error('[niche-scan] could not write the report', inserted.error?.message)
    return null
  }

  const reportId = (inserted.data[0] as { id: string }).id

  // One row per judged draft, kept and refused alike (V3, D129). After the
  // report, because `report_id` has to exist; before the examples, because this
  // is the half a client acts on. It swallows its own failures — see
  // `writeDrafts` — so a scan is never lost over an approve surface.
  await writeDrafts(supabase, {
    workspaceId,
    reportId,
    kept: input.firstVideos ?? [],
    refused: input.refusedVideos ?? [],
  })

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
    // returned as success, because a report with no examples is the shape of a
    // scan that found nothing.
    console.error('[niche-scan] could not write the examples', written.error.message)
  }

  return reportId
}

/** Every failure path records the run before it answers. One helper, one shape. */
async function fail(
  supabase: AgentClient,
  workspaceId: string,
  reason: string,
  usage: Usage,
  searches: number,
  message: string,
): Promise<ScanOutcome> {
  await recordRun(supabase, {
    workspaceId,
    agent: 'trend_scout',
    model: SCAN_MODEL,
    status: 'failed',
    usage,
    searches,
    reason,
  })
  return { status: 'failed', message }
}

/**
 * Run a scan, or say why it did not run.
 *
 * `niche` is the client's own words from onboarding. It is interpolated into the
 * user turn and never into a system prompt — the rules stay fixed and the
 * subject varies, which is also what keeps the system blocks cacheable.
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
  // The sample is written, labelled, so the screen has a real report to show and
  // the e2e suite never spends anything. No `agent_runs` row, because no call
  // was made — a log of calls that did not happen is noise in the one place that
  // has to stay readable.
  if (!hasAnthropicKey(env)) {
    const reportId = await writeReport(supabase, {
      workspaceId,
      niche: trimmedNiche,
      findings: SAMPLE_REPORT,
      // The sample's own three, so a keyless run stores a *complete* report.
      firstVideos: SAMPLE_REPORT.firstVideos,
      model: null,
      now,
    })
    if (!reportId) return { status: 'failed', message: 'Could not save the sample report.' }
    return { status: 'complete', reportId, isSample: true }
  }

  const client = anthropicClient(env)

  // The client's own facts, before the research starts. Read with the service
  // key because this runs in the worker, where there is no session — the
  // workspace id came from the job row, not from a browser.
  const profile: ClientProfile = await readClientProfileForAgent(supabase, workspaceId)

  // ======================================================================
  // Count, check, then call — in that order, once, for both legs
  // ======================================================================
  const firstTurn: Anthropic.MessageParam = researchTurn(trimmedNiche, profile)

  let promptTokens: number
  try {
    const counted = await client.messages.countTokens({
      model: SCAN_MODEL,
      system: RESEARCH_SYSTEM,
      messages: [firstTurn],
      tools: researchTools() as Anthropic.MessageCountTokensParams['tools'],
    })
    promptTokens = counted.input_tokens
  } catch (error) {
    const message = describe(error)
    return fail(
      supabase,
      workspaceId,
      'could not count tokens before the call',
      NO_USAGE,
      0,
      message,
    )
  }

  const decision = await checkAgentSpend(
    supabase,
    workspaceId,
    SCAN_MODEL,
    // Leg one's real count, plus a projection for each write attempt. The write
    // prompt does not exist yet and the decision has to come first.
    promptTokens + WRITE_PROMPT_PROJECTION_TOKENS * WRITE_MAX_ATTEMPTS,
    RESEARCH_MAX_TOKENS + WRITE_MAX_TOKENS * WRITE_MAX_ATTEMPTS,
    now,
    env,
    { maxSearches: SCAN_SEARCH_PROJECTION, maxRequestUsd: SCAN_MAX_REQUEST_USD },
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

  // ======================================================================
  // The clock, split before either leg starts
  // ======================================================================
  //
  // Absolute deadlines rather than durations, so leg one *cannot* borrow leg
  // two's slice: the only thing it can do by running long is run out. That is
  // the whole fix for job `5c20fa06`, which had 31 seconds left to write a
  // report in and wrote seven placeholders instead.
  const scanBeganAt = Date.now()
  const researchDeadlineAt = scanBeganAt + RESEARCH_TIME_BUDGET_MS
  const scanDeadlineAt = scanBeganAt + SCAN_TIME_BUDGET_MS

  // ======================================================================
  // Leg one — research
  // ======================================================================
  let research: Awaited<ReturnType<typeof runResearchLeg>>
  try {
    research = await runResearchLeg({
      client,
      niche: trimmedNiche,
      profile,
      deadlineAt: researchDeadlineAt,
    })
  } catch (error) {
    const message = describe(error)
    return fail(supabase, workspaceId, 'the research leg failed', NO_USAGE, 0, message)
  }

  console.info(
    `[niche-scan] leg 1 research: ${research.seconds}s · ${research.searches} search(es) · ` +
      `stop_reason ${research.stopReason ?? 'none'} · ${notesCountLine(research.notes)}`,
  )

  if (research.stoppedBy !== null) {
    const limit =
      research.stoppedBy === 'time'
        ? `${Math.round(RESEARCH_TIME_BUDGET_MS / 1000)}s`
        : `${RESEARCH_SEARCH_CEILING} searches`

    return fail(
      supabase,
      workspaceId,
      `research stopped by the ${research.stoppedBy} budget at ${limit} ` +
        `(${research.seconds}s, ${research.searches} search(es))`,
      research.usage,
      research.searches,
      research.stoppedBy === 'searches'
        ? 'The scan hit its research limit before it finished. Try a narrower niche.'
        : 'The scan ran out of research time. Try a narrower niche.',
    )
  }

  if (research.stopReason === 'refusal') {
    return fail(
      supabase,
      workspaceId,
      'the model declined the research request',
      research.usage,
      research.searches,
      'The model declined to research that niche.',
    )
  }

  // A turn still paused after the last allowed continuation was mid-research.
  if (research.stopReason === 'pause_turn') {
    return fail(
      supabase,
      workspaceId,
      `research still searching after its continuations (${research.seconds}s)`,
      research.usage,
      research.searches,
      'The scan ran out of research time. Try a narrower niche.',
    )
  }

  /*
   * Nothing to write from.
   *
   * Its own outcome rather than a write leg that would invent one: a model asked
   * to write a report from no notes writes one anyway, and that is precisely the
   * placeholder reply this whole change exists to stop. `notesAreUsable` is
   * deliberately satisfied by a format *or* a claim and not by examples, because
   * rule 11 says a niche with no linkable public video is a finding.
   */
  if (!notesAreUsable(research.notes)) {
    return fail(
      supabase,
      workspaceId,
      `research found nothing to write from (${notesCountLine(research.notes)})`,
      research.usage,
      research.searches,
      'The scan could not find enough about that niche to report on. Try a broader niche.',
    )
  }

  // ======================================================================
  // Leg two — write
  // ======================================================================
  let written: Awaited<ReturnType<typeof runWriteLeg>>
  try {
    written = await runWriteLeg({
      client,
      niche: trimmedNiche,
      profile,
      notes: research.notes,
      deadlineAt: scanDeadlineAt,
    })
  } catch (error) {
    const message = describe(error)
    return fail(
      supabase,
      workspaceId,
      'the write leg failed',
      research.usage,
      research.searches,
      message,
    )
  }

  const usage = addUsage(research.usage, written.usage)
  const searches = research.searches
  const totalSeconds = research.seconds + written.seconds

  console.info(
    `[niche-scan] leg 2 write: ${written.seconds}s · ${written.attempts} attempt(s) · ` +
      `stop_reason ${written.stopReason ?? 'none'} · ` +
      `in ${written.usage.inputTokens} out ${written.usage.outputTokens} tok · ` +
      `0 search(es) by construction`,
  )

  if (written.review === null || written.stoppedBy !== null) {
    return fail(
      supabase,
      workspaceId,
      'the write leg produced nothing' +
        (written.stoppedBy ? ` (stopped by the ${written.stoppedBy} budget)` : '') +
        ` after ${written.attempts} attempt(s)`,
      usage,
      searches,
      'The scan researched the niche but could not write the report. Try again.',
    )
  }

  const review = written.review

  /*
   * The counts, every time, pass or fail.
   *
   * The first production failure logged one sentence — "The scan did not come
   * back with a usable report" — which is true of a placeholder reply, a thin
   * niche and a broken schema field alike. These integers tell those apart from
   * Railway alone, and they are safe to print: they are counts, and the pattern
   * names are our own matcher's rather than the model's text. No prompt, no
   * answer, no client detail.
   */
  const { counts } = review
  const countLine =
    `formats=${counts.formats} hooks=${counts.hooks} topics=${counts.topics} ` +
    `lengths=${counts.lengths} patterns=${counts.postingPatterns} ` +
    `examples=${counts.examplesKept}/${counts.examplesOffered} ` +
    `dropped=${counts.examplesDropped} sources=${counts.sources} ` +
    `placeholders=${counts.placeholderFields}`

  if (review.status === 'rejected') {
    const { rejection } = review
    const detail =
      rejection.rule === 'placeholder-text' ? ` patterns=[${rejection.patterns.join(',')}]` : ''

    console.error(
      `[niche-scan] report rejected after ${written.attempts} attempt(s): ` +
        `rule=${rejection.rule} ${countLine}${detail} · ` +
        `research ${research.seconds}s/${research.searches} search(es) · ` +
        `write ${written.seconds}s · stop_reason ${written.stopReason ?? 'none'}`,
    )

    return fail(
      supabase,
      workspaceId,
      written.stopReason === 'max_tokens'
        ? `the report was cut off by max_tokens after ${written.attempts} attempt(s) (${countLine})`
        : `rejected: ${rejection.rule} after ${written.attempts} attempt(s) (${countLine})`,
      usage,
      searches,
      rejection.rule === 'placeholder-text'
        ? 'The scan came back with placeholder text instead of research, twice. Nothing was saved.'
        : 'The scan did not come back with a usable report.',
    )
  }

  const parsed = review.report

  console.info(
    `[niche-scan] report accepted on attempt ${written.attempts}: ${countLine} · ` +
      `${review.caveat ? 'thin evidence, caveat shown' : 'evidence present'} · ` +
      `research ${research.seconds}s/${research.searches} search(es) · ` +
      `write ${written.seconds}s · total ${totalSeconds}s`,
  )

  if (parsed.droppedExamples.length > 0) {
    // Reported, never silent. A scan that quietly discarded half its findings
    // would look like a thin niche rather than a parser doing its job.
    console.warn(
      `[niche-scan] dropped ${parsed.droppedExamples.length} example(s): ${parsed.droppedExamples.join('; ')}`,
    )
  }

  /*
   * The research is done; now turn it into something to film (V2).
   *
   * **After the report is parsed and before it is written**, so the ideas land
   * in the same row as the research they came from. A second write would leave a
   * window where the report exists without its last section, and the screen
   * would poll into it.
   *
   * It cannot fail the scan. `writeFirstVideos` swallows its own errors, because
   * a scan that found real formats must not be reported as failed because its
   * closing section could not be written.
   */
  const firstVideos = await writeFirstVideos({
    workspaceId,
    niche: trimmedNiche,
    profile,
    formats: parsed.findings.topFormats,
    examples: parsed.findings.examples,
    client,
    supabase,
    env,
    now,
  })

  if (firstVideos.note) console.info(`[niche-scan] first videos: ${firstVideos.note}`)

  const reportId = await writeReport(supabase, {
    workspaceId,
    niche: trimmedNiche,
    findings: parsed.findings,
    firstVideos: firstVideos.ideas,
    refusedVideos: firstVideos.refused,
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
    reason: reportId
      ? written.attempts > 1
        ? `the report took ${written.attempts} write attempt(s)`
        : null
      : 'the report could not be saved',
  })

  if (!reportId) return { status: 'failed', message: 'The scan ran but could not be saved.' }
  return { status: 'complete', reportId, isSample: false }
}
