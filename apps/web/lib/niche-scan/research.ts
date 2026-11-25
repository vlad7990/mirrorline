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

import { NOTES_SCHEMA, parseNotes, type ResearchNotes } from './notes'
import { jsonFrom, streamLeg, type LegOutcome } from './stream-leg'

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
10. You have a hard research budget: about ${RESEARCH_MAX_SEARCHES} searches and four and a half minutes. Search broadly first, then stop and write your notes. The run is cut off at the limit whether or not you have written anything, so leave yourself room to record what you found.`

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
  /** Empty when a budget stopped the leg or the reply did not parse. */
  readonly notes: ResearchNotes
  readonly stopReason: string | null
}

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

  return {
    ...outcome,
    stopReason: response?.stop_reason ?? null,
    notes: response === null ? parseNotes(null) : parseNotes(jsonFrom(response.content)),
  }
}
