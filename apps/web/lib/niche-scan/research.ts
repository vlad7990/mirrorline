/**
 * Leg one — research the niche and write down what was seen (D132).
 *
 * Web search, a hard clock, and structured notes out. It does **not** write the
 * report: that is leg two's job, with its own budget, and the whole reason this
 * file exists is that one leg doing both produced two placeholder reports out of
 * three live production scans.
 *
 * ## The hard stop is the feature
 *
 * `RESEARCH_TIME_BUDGET_MS` is less than the scan's total on purpose. Job
 * `5c20fa06` spent 329 of its 360 seconds researching and had 31 left to write a
 * report in; it wrote seven placeholder fields instead. Reserving leg two's
 * slice *before* leg one starts is the fix, and the orchestrator enforces it by
 * handing this leg an absolute deadline it cannot borrow against.
 */

import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { profileBrief, type ClientProfile } from '../workspace/client-profile'

import { NOTES_SCHEMA, notesAreUsable, parseNotes, type ResearchNotes } from './notes'
import { addUsage, jsonFrom, streamLeg, type LegOutcome } from './stream-leg'

/** `18 §0`: the studio tier, and the only one `MODEL_RATES` prices. */
export const RESEARCH_MODEL = 'claude-sonnet-5'

/**
 * Notes are compact, so this is far below the old 28k.
 *
 * The 28k ceiling was sized for thinking *plus* a full report. Leg one no longer
 * writes the report, so the output here is observations and urls — and adaptive
 * thinking still shares the budget, which is why it is 16k rather than 8k.
 */
export const RESEARCH_MAX_TOKENS = 16_000

/** A research run, not a question. `low` under-reads the niche. */
export const RESEARCH_EFFORT = 'high' as const

/** What the model is *asked* for. The ceiling below is what it is *held* to. */
export const RESEARCH_MAX_SEARCHES = 12

/**
 * What the spend cap is projected against, and it is not the same number.
 *
 * A live run declared `max_uses: 12` and made **24** searches, counted off its
 * own `server_tool_use` blocks. The projection doubles the declared ceiling: the
 * cap refuses sooner than it needs to rather than later than it should.
 */
export const RESEARCH_SEARCH_PROJECTION = RESEARCH_MAX_SEARCHES * 2

/**
 * The ceiling the code enforces, because `max_uses` does not.
 *
 * Equal to the projection deliberately — the projection is what the spend cap
 * already charges for, so enforcing it makes the projection *true* rather than
 * hopeful. `budget.test.ts` asserts they stay equal.
 */
export const RESEARCH_SEARCH_CEILING = RESEARCH_SEARCH_PROJECTION

/**
 * Leg one's slice of the clock — four and a half minutes.
 *
 * Down from the six minutes the whole scan used to get, because leg two now
 * needs its own and the total still has to clear the lease with a third to
 * spare. Measured against the run this is a fix for: 329 seconds of research
 * produced 22 searches and enough material for a report, so research was never
 * the part that was short of time.
 */
export const RESEARCH_TIME_BUDGET_MS = 4.5 * 60 * 1000

/** A connection guard, not a deadline — see `stream-leg.ts`. */
export const RESEARCH_REQUEST_TIMEOUT_MS = 5 * 60 * 1000

/**
 * How many times a paused turn may be resumed.
 *
 * `web_search` runs in a server-side loop that stops at ten iterations and
 * returns `stop_reason: 'pause_turn'` — a real outcome for a run allowed twelve
 * searches, not an error. Bounded, because the failure mode of an unbounded
 * resume loop is a bill.
 */
export const RESEARCH_MAX_CONTINUATIONS = 2

/**
 * No retries. **About money, not latency.**
 *
 * The SDK retries twice by default and counts a timeout as retryable, so each
 * attempt would be a *fresh research run* — the searches again, the tokens
 * again, one request as far as the caller can see. That is non-negotiable 11's
 * failure mode: money going out without anybody choosing to spend it.
 */
export const RESEARCH_MAX_RETRIES = 0

/**
 * The research rules.
 *
 * Deliberately shorter than the old `SCAN_SYSTEM`. Everything about *shaping* a
 * report moved to leg two — the named beats, the fit score and its argument,
 * lengths as ranges, the brand-risk line. What is left is what a researcher must
 * obey while looking: link to pages, never quote, say where you looked, rank by
 * the right number, omit what you did not see, and stop when the budget says so.
 *
 * Rule 2 carries the legal weight and it has not moved: links and descriptions
 * only, never media. `notes.ts` enforces it again on the way in, because a
 * prompt is a request and a parser is a rule.
 */
export const RESEARCH_SYSTEM = `You research what is working in a niche on short vertical video, and you write down what you SAW. Somebody else turns your notes into the report, so your job is facts, not polish.

Hard rules. These are not style preferences:
1. Record each format as you actually observed it. "How it goes" is plain prose describing the structure in order — what is on screen, what is said, what happens next. Do NOT invent named beats, scores or ratings: that is the writer's job, not yours.
2. Every url must be a link to a public POST or video page, or to an article. NEVER a link to a media file — no .mp4, .mov, .m4a, .jpg, .png. If you only have a media file link, leave that example out.
3. Never quote more than a few words of anyone's script, caption or voiceover. Describe the structure instead.
4. Every post you record must carry a sourceNote naming where you looked, so an audit can check it later.
5. Rank what you find by views per follower over roughly the last 30 days, never by raw views. A 4,000-follower account getting 40,000 views is a better model than a two-million-follower account coasting.
6. If you are unsure of a number, LEAVE THE FIELD OUT. Do not estimate. Give a view count, a length or a follower ratio ONLY when the page you read actually showed it. A missing value is honest; an invented one is not.
7. Every note carries a basis: "posts" if you read it off real posts, "guidance" if it comes from an article about the niche. Mark it honestly. Most published advice is "guidance".
8. The "coverage" field is required and it matters more than you would think. Say what you searched, what you found, and what you could NOT find. The writer cannot tell "this niche has no public short video" from "I ran out of time" unless you say which — and a writer who cannot tell them apart invents the difference.
9. Some real niches have very little public short video you can link to. That is a finding, not a failure. Record the formats from published guidance, mark their basis "guidance", return an empty examples list, and say so plainly in coverage. NEVER pad your notes with placeholder text, "TBD", "example", or a format you cannot describe. Empty notes are better than invented ones — a thin honest report is accepted downstream, and a padded one is rejected outright.
10. **Your search budget is ${RESEARCH_MAX_SEARCHES} searches, and the run is CUT OFF at ${RESEARCH_SEARCH_CEILING}.** After about ${RESEARCH_MAX_SEARCHES} searches, stop searching and write your notes immediately. Anything you have not written down when the cut-off arrives is LOST — not summarised, not saved, lost. A short set of notes from ten searches is worth far more than nothing from twenty-five.`

function researchPrompt(niche: string, profile: ClientProfile): string {
  const brief = profileBrief(profile)

  // The profile is here so the research *looks* in the right places — local
  // examples, their method's own corner of the niche. The fit scoring it feeds
  // happens in leg two, which gets the same profile.
  const about = brief
    ? `\nThe client this research is for:\n${brief}\n`
    : '\nYou have no profile for this client beyond the niche. Note what you would need to know about them to judge whether a format fits.\n'

  return `Research what is working right now on short vertical video in this niche: ${niche}
${about}
Find 3 to 6 formats that are growing, and note the hooks, topics, lengths and posting rhythms behind them.

Record up to 9 real posts you actually opened, each with its link, which format it is, what happens in it, and where you looked. Prefer posts whose page showed you a view or follower count, and leave the numbers out where it did not.

Write notes, not prose. Short and factual, one line each. Then fill in coverage: what you searched, what you found, and what you could not find.`
}

export interface ResearchRequest {
  readonly client: Anthropic
  readonly niche: string
  readonly profile: ClientProfile
  /** Absolute deadline for this leg. The orchestrator reserves leg two's slice. */
  readonly deadlineAt: number
}

export interface ResearchOutcome extends LegOutcome {
  /** Empty when the leg was cut off before writing and could not be salvaged. */
  readonly notes: ResearchNotes
  readonly stopReason: string | null
  /**
   * Whether these notes came from the salvage call rather than the leg itself.
   *
   * Logged, because a run that needed salvaging searched past its budget and the
   * prompt is what should be fixed — not the ceiling.
   */
  readonly salvaged: boolean
}

/**
 * How long the salvage call gets, and how much it may write.
 *
 * Short: it has no tools, nothing to look up, and only has to write down what is
 * already in the conversation. Its own small slice rather than the research
 * leg's leftovers, because by definition the research leg has none left.
 */
const SALVAGE_TIME_BUDGET_MS = 60 * 1000

const SALVAGE_MAX_TOKENS = 12_000

/**
 * The aborted turn's content, trimmed to something the API will accept.
 *
 * An aborted stream can leave a **partially-built final block** — a half-written
 * text block, or a `server_tool_use` whose `web_search_tool_result` never
 * arrived. Re-sending that is a 400. So the content is cut at the last block we
 * know is complete, which is the last search result: every `server_tool_use`
 * before it has its pair, and nothing after it can be trusted.
 *
 * When there is no search result at all there is nothing worth salvaging — the
 * leg was aborted before it read anything — and the caller gets an empty list.
 */
export function salvageableContent(
  partial: Anthropic.Message | null,
): readonly Anthropic.ContentBlock[] {
  const content = partial?.content
  if (!Array.isArray(content) || content.length === 0) return []

  let lastComplete = -1
  content.forEach((block, index) => {
    if (block.type === 'web_search_tool_result') lastComplete = index
  })

  return lastComplete === -1 ? [] : content.slice(0, lastComplete + 1)
}

const SALVAGE_TURN = `You have reached your search budget and the search tool is now gone — you cannot look anything else up, and you will not be asked again.

Write your notes NOW, from the pages you have already read above. Record the formats you saw, how each one goes, the urls you actually opened, the hooks, topics, lengths and posting rhythms, and fill in coverage with what you searched and what you could not find.

Do not apologise and do not explain. Do not invent anything you did not read. Whatever you write now is the entire result of this research run.`

export function researchTurn(niche: string, profile: ClientProfile): Anthropic.MessageParam {
  return { role: 'user', content: researchPrompt(niche, profile) }
}

export function researchTools(): readonly unknown[] {
  return [
    {
      type: 'web_search_20260209' as const,
      name: 'web_search' as const,
      max_uses: RESEARCH_MAX_SEARCHES,
    },
  ]
}

/**
 * Run leg one. Throws only on a real API failure; a budget stop is an outcome.
 *
 * The notes come back parsed, so a reply that did not parse is indistinguishable
 * from empty notes — which is correct: both mean leg two has nothing to write
 * from, and `notesAreUsable` is the question the orchestrator asks.
 */
export async function runResearchLeg(request: ResearchRequest): Promise<ResearchOutcome> {
  const outcome = await streamLeg({
    client: request.client,
    label: 'niche-scan research',
    model: RESEARCH_MODEL,
    maxTokens: RESEARCH_MAX_TOKENS,
    effort: RESEARCH_EFFORT,
    system: RESEARCH_SYSTEM,
    schema: NOTES_SCHEMA,
    messages: [researchTurn(request.niche, request.profile)],
    tools: researchTools(),
    searchCeiling: RESEARCH_SEARCH_CEILING,
    deadlineAt: request.deadlineAt,
    requestTimeoutMs: RESEARCH_REQUEST_TIMEOUT_MS,
    maxContinuations: RESEARCH_MAX_CONTINUATIONS,
    maxRetries: RESEARCH_MAX_RETRIES,
  })

  const response = outcome.response

  if (response !== null) {
    return {
      ...outcome,
      stopReason: response.stop_reason ?? null,
      notes: parseNotes(jsonFrom(response.content)),
      salvaged: false,
    }
  }

  /*
   * The leg was cut off. Salvage the research rather than lose it (D136).
   *
   * The first live run of the two-leg scan hit the 24-search ceiling in 103
   * seconds **with nothing written**: `formats=0 hooks=0 topics=0 … pages=0`,
   * and the scan failed. The old single leg survived the same ceiling only
   * because it was writing the report in the same turn and had usually produced
   * something first.
   *
   * The search *results* are content blocks of the aborted message, so they are
   * still in hand — aborting threw away the notes, not the research. One short
   * call with **no tools** asks for the notes from what was already read. It
   * costs no searches by construction, and it turns a total loss into the thing
   * the leg was about to produce.
   *
   * It is a safety net, not the intended path. Rule 10 now tells the model what
   * the cut-off costs, which is the fix; this is what happens when the model
   * ignores it anyway.
   */
  const salvageable = salvageableContent(outcome.partial)

  if (salvageable.length === 0) {
    console.warn(
      `[niche-scan research] cut off by the ${outcome.stoppedBy ?? 'unknown'} budget with ` +
        'nothing to salvage — no search result had completed',
    )
    return { ...outcome, stopReason: null, notes: parseNotes(null), salvaged: false }
  }

  console.warn(
    `[niche-scan research] cut off by the ${outcome.stoppedBy ?? 'unknown'} budget · ` +
      `salvaging notes from ${salvageable.length} completed block(s), no further searches`,
  )

  let salvage: LegOutcome
  try {
    salvage = await streamLeg({
      client: request.client,
      label: 'niche-scan salvage',
      model: RESEARCH_MODEL,
      maxTokens: SALVAGE_MAX_TOKENS,
      effort: 'low',
      system: RESEARCH_SYSTEM,
      schema: NOTES_SCHEMA,
      messages: [
        researchTurn(request.niche, request.profile),
        { role: 'assistant', content: salvageable as Anthropic.ContentBlockParam[] },
        { role: 'user', content: SALVAGE_TURN },
      ],
      // No `tools` key at all: the search tool is genuinely gone, which is what
      // the turn above tells the model.
      deadlineAt: Date.now() + SALVAGE_TIME_BUDGET_MS,
      requestTimeoutMs: SALVAGE_TIME_BUDGET_MS,
      maxContinuations: 0,
      maxRetries: RESEARCH_MAX_RETRIES,
    })
  } catch (error) {
    // The research was already lost; a failed salvage loses nothing more. Said
    // out loud so a run that failed twice does not read as having failed once.
    console.error(
      `[niche-scan research] the salvage call failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    )
    return { ...outcome, stopReason: null, notes: parseNotes(null), salvaged: false }
  }

  const salvaged =
    salvage.response === null ? parseNotes(null) : parseNotes(jsonFrom(salvage.response.content))

  return {
    ...outcome,
    // Both calls' tokens, so the ledger records what the run actually cost.
    usage: addUsage(outcome.usage, salvage.usage),
    seconds: outcome.seconds + salvage.seconds,
    // **The budget stop is cleared when the salvage produced notes**, because
    // the scan can now continue: `stoppedBy` is what `scan.ts` treats as fatal,
    // and a salvaged run is not.
    stoppedBy: notesAreUsable(salvaged) ? null : outcome.stoppedBy,
    stopReason: salvage.response?.stop_reason ?? null,
    notes: salvaged,
    salvaged: notesAreUsable(salvaged),
  }
}
