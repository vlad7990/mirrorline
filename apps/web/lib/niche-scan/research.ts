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

import { NOTES_SCHEMA, parseNotes, notesAreUsable, type ResearchNotes } from './notes'
import { parsePartialJson } from './partial-json'
import { jsonFrom, streamLeg, type LegOutcome } from './stream-leg'

/** `18 §0`: the studio tier, and the only one `MODEL_RATES` prices. */
export const RESEARCH_MODEL = 'claude-sonnet-5'

/**
 * The per-request output ceiling — **24k, raised from 16k (D137)**.
 *
 * Three measured dog-trainer runs put the research leg's whole output at 20,695,
 * 20,783 and 14,956 tokens. The middle one **stopped on `max_tokens`** and its
 * notes were discarded; the first finished 88 tokens under where it stopped.
 * That is not a budget with margin, it is a coin flip — and unlike the search
 * ceiling, hitting this one looks like success: a final message arrives, with
 * half an object in it.
 *
 * So both ends move. The ask below is capped section by section so a normal run
 * lands **well under 12k** of notes, and the ceiling goes to 24k so thinking
 * plus notes has somewhere to go when a niche is unusually rich. The cost of the
 * raise is projected, not hoped for — see `RESEARCH_OUTPUT_PROJECTION` — and
 * `partial-json.ts` reads whatever a truncation did finish, so a third crossing
 * of this line costs some notes instead of all of them.
 */
export const RESEARCH_MAX_TOKENS = 24_000

/**
 * What the spend cap charges for the research leg's output.
 *
 * Not `RESEARCH_MAX_TOKENS`, and the difference is deliberate in both
 * directions. `max_tokens` is a **per-request** ceiling and a paused turn is
 * resumed up to `RESEARCH_MAX_CONTINUATIONS` times, so the theoretical worst
 * case is three full legs — 72k, which projects past the $2 per-request cap and
 * would refuse every scan we have ever run. Projecting one leg, as this did
 * before, is the opposite error: it charges for less output than a resumed turn
 * can produce.
 *
 * 36k is sized on measurement with margin: the worst *total* across six runs was
 * 20.8k, so this is about 1.7x the observed worst case and 1.5x one full leg.
 * `budget.test.ts` asserts it covers a whole leg and that the whole projected
 * request still clears `SCAN_MAX_REQUEST_USD`.
 */
export const RESEARCH_OUTPUT_PROJECTION = 36_000

/**
 * The volume of notes asked for, section by section (D137).
 *
 * One object rather than numbers inlined in the prompt, because `notes.ts` has
 * to cap the same sections at the same numbers — the prompt is the request and
 * the parser is the rule, and the two drifting apart is how a "compact by
 * design" ask quietly stops being one. `notes.test.ts` asserts they agree.
 *
 * The numbers are not a quality judgement. Both passing runs recorded six
 * formats where four were asked for and three videos came out of it; what cost
 * a run was length, not breadth.
 */
export const RESEARCH_NOTE_CAPS = {
  formats: 4,
  examples: 5,
  hookNotes: 4,
  topicNotes: 5,
  lengthNotes: 3,
  patternNotes: 4,
  pages: 8,
  /** Words, not tokens: a limit a writer can actually keep to. */
  noteWords: 20,
  howItGoesWords: 40,
  whatHappensWords: 25,
  coverageWords: 60,
} as const

/** A research run, not a question. `low` under-reads the niche. */
export const RESEARCH_EFFORT = 'high' as const

/** What the model is *asked* for. The ceiling below is what it is *held* to. */
export const RESEARCH_MAX_SEARCHES = 12

/**
 * What the spend cap is projected against, and it is not the same number.
 *
 * A live run declared `max_uses: 12` and made **24** searches, counted off its
 * own `server_tool_use` blocks, so the projection has never been the declared
 * number.
 *
 * **32, raised from 24 by six measured runs (D136).** The ceiling used to be
 * exactly double the ask, and across six dog-trainer runs the successes landed
 * at **16 and 19** searches while *three* failures were the ceiling itself
 * firing at 24 — killing the leg with nothing written, because an abort cannot
 * be recovered from (see `ResearchOutcome.notes`). A ceiling the normal path
 * reaches is not a backstop, it is the failure mode.
 *
 * 32 costs $0.32 of the $2 per-request cap at $0.01 a search, and the whole
 * projection is about $1.21. The safe direction is unchanged: the cap still
 * refuses sooner than it needs to, and `recordRun` still writes the count that
 * actually happened.
 */
export const RESEARCH_SEARCH_PROJECTION = 32

/**
 * The ceiling the code enforces, because `max_uses` does not.
 *
 * Equal to the projection deliberately — the projection is what the spend cap
 * already charges for, so enforcing it makes the projection *true* rather than
 * hopeful. `budget.test.ts` asserts they stay equal.
 */
export const RESEARCH_SEARCH_CEILING = RESEARCH_SEARCH_PROJECTION

/**
 * Leg one's slice of the clock — **six minutes** (D136).
 *
 * It was four and a half, carved out of the scan's old six so leg two could have
 * its own and the total still clear a 900-second lease by a third. Six measured
 * runs said that was wrong twice over: one failure was the **time** budget
 * firing at 270 seconds with 21 searches and nothing written, and research was
 * the only leg ever short of time — the write leg finished inside its 75-second
 * attempts every time, including the run that needed the retry.
 *
 * The room comes from the **lease**, not from leg two. `JOB_LEASE_SECONDS` went
 * to 1200, which D135 made affordable: the common cause of a stranded lease was
 * a redeploy killing a worker mid-job, and that now releases the lease in
 * seconds instead of waiting it out. So research gets back the six minutes Vlad
 * specified, and the margin went *up* rather than down — 630 seconds spent of
 * 1200, 47% unspent, against the third `budget.test.ts` demands.
 */
export const RESEARCH_TIME_BUDGET_MS = 6 * 60 * 1000

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
10. **Your search budget is ${RESEARCH_MAX_SEARCHES} searches, and the run is CUT OFF at ${RESEARCH_SEARCH_CEILING}.** After about ${RESEARCH_MAX_SEARCHES} searches, stop searching and write your notes immediately. Anything you have not written down when the cut-off arrives is LOST — not summarised, not saved, lost. A short set of notes from ten searches is worth far more than nothing from twenty-five.
11. **Write SHORT, and keep to the counts you are given.** Your reply is also cut off at a length, and a reply cut off mid-sentence loses the notes after the cut. Notes are one line each, at most ${RESEARCH_NOTE_CAPS.noteWords} words. "How it goes" is at most ${RESEARCH_NOTE_CAPS.howItGoesWords} words, "what happens" at most ${RESEARCH_NOTE_CAPS.whatHappensWords}, coverage at most ${RESEARCH_NOTE_CAPS.coverageWords}. Keep to the number of items you are asked for in a section: past that, the extra ones buy nothing and cost you the length you needed for the rest. No preamble, no summary at the end, no explaining what you are about to do — the notes are the whole reply.`

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
Find up to ${RESEARCH_NOTE_CAPS.formats} formats that are growing. For each one: its name, and how it goes in at most ${RESEARCH_NOTE_CAPS.howItGoesWords} words.

Record up to ${RESEARCH_NOTE_CAPS.examples} real posts you actually opened, each with its link, which format it is, what happens in it in at most ${RESEARCH_NOTE_CAPS.whatHappensWords} words, and where you looked. Prefer posts whose page showed you a view or follower count, and leave the numbers out where it did not.

Then, at most: ${RESEARCH_NOTE_CAPS.hookNotes} hook notes, ${RESEARCH_NOTE_CAPS.topicNotes} topic notes, ${RESEARCH_NOTE_CAPS.lengthNotes} length notes, ${RESEARCH_NOTE_CAPS.patternNotes} posting-pattern notes, and ${RESEARCH_NOTE_CAPS.pages} pages you read. One line each, at most ${RESEARCH_NOTE_CAPS.noteWords} words.

Finish with coverage, at most ${RESEARCH_NOTE_CAPS.coverageWords} words: what you searched, what you found, and what you could not find. Write it even if you are running short — somebody downstream cannot tell an empty niche from an interrupted search unless you say which.`
}

export interface ResearchRequest {
  readonly client: Anthropic
  readonly niche: string
  readonly profile: ClientProfile
  /** Absolute deadline for this leg. The orchestrator reserves leg two's slice. */
  readonly deadlineAt: number
}

export interface ResearchOutcome extends LegOutcome {
  /**
   * Empty when a budget cut the leg off before it wrote anything.
   *
   * **There is no recovery from an abort, and D136 established it the hard
   * way.** The obvious fix is to re-send the aborted turn with no tools and ask
   * for the notes — the search results are still in its content blocks, so the
   * research itself was never lost. The API refuses:
   *
   *     400 invalid_request_error — When responding to programmatic tool
   *     calling, only tool_result blocks are allowed.
   *
   * A server-side tool conversation cannot be continued with a user turn, so for
   * the *time* and *search* budgets the only cure is prevention: finish inside
   * the budget. That is what the raised ceiling, the longer slice and rule 10's
   * stated consequence are for.
   *
   * A **`max_tokens` stop is a different animal** and D137 treats it as one:
   * there the turn *ended*, the final message is in hand, and the notes are
   * complete right up to the character the ceiling fell on. Nothing has to be
   * re-sent to read them — see `truncated`.
   */
  readonly notes: ResearchNotes
  readonly stopReason: string | null
  /**
   * Were these notes read out of a reply the output ceiling cut short? (D137)
   *
   * Recorded rather than hidden, because a thin report deserves a different
   * explanation from a thin niche, and because this is the number that says
   * whether `RESEARCH_MAX_TOKENS` is still too low.
   */
  readonly truncated: boolean
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
 * What leg two is told when the ceiling cut leg one's coverage note off.
 *
 * Appended rather than left blank, because `notesBrief` would otherwise say
 * "not stated" and rule 14's distinction — an empty niche versus an interrupted
 * search — is exactly what a writer with no coverage note invents.
 */
export const TRUNCATED_COVERAGE_NOTE =
  'These notes were cut short by the research leg’s own length limit, so they are ' +
  'incomplete rather than final. Write the report from what is here and say plainly where ' +
  'the research is thin. Do not fill the gaps.'

export interface ReadNotes {
  readonly notes: ResearchNotes
  readonly truncated: boolean
}

/**
 * The notes in a reply: strictly if it closed, and as far as it got if it did
 * not (D137).
 *
 * Exported for its own test, because the case it exists for — a reply the output
 * ceiling cut mid-object — cannot be produced on demand from a live model.
 */
export function notesFromReply(content: readonly Anthropic.ContentBlock[]): ReadNotes {
  const strict = jsonFrom(content)
  if (strict !== null) return { notes: parseNotes(strict), truncated: false }

  // Nothing closed the JSON. Either the reply was never notes, or the output
  // ceiling landed mid-object — and in the second case the complete sections are
  // sitting right there.
  for (const block of [...content].reverse()) {
    if (block.type !== 'text') continue
    const salvaged = parseNotes(parsePartialJson(block.text))
    if (!notesAreUsable(salvaged)) continue

    return {
      notes: {
        ...salvaged,
        coverage: salvaged.coverage
          ? `${salvaged.coverage}\n\n${TRUNCATED_COVERAGE_NOTE}`
          : TRUNCATED_COVERAGE_NOTE,
      },
      truncated: true,
    }
  }

  return { notes: parseNotes(null), truncated: false }
}

/**
 * Run leg one. Throws only on a real API failure; a budget stop is an outcome.
 *
 * The notes come back parsed, so a reply that did not parse at all is
 * indistinguishable from empty notes — which is correct: both mean leg two has
 * nothing to write from, and `notesAreUsable` is the question the orchestrator
 * asks. A reply that parsed *partly* is not the same thing, and is kept.
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
  const read: ReadNotes =
    response === null
      ? { notes: parseNotes(null), truncated: false }
      : notesFromReply(response.content)

  // Output against the ceiling, on **every** run (D137). The failing run looked
  // like a success in the logs — `end_turn`'s neighbour `max_tokens`, a final
  // message, and empty notes — and the one number that would have named it
  // immediately was how close the output came to its cap.
  const share = Math.round((outcome.usage.outputTokens / RESEARCH_MAX_TOKENS) * 100)
  console.info(
    `[niche-scan research] out ${outcome.usage.outputTokens} tok of ` +
      `${RESEARCH_MAX_TOKENS}/leg cap (${share}% across ${outcome.legs} leg(s)) · ` +
      `stop_reason ${response?.stop_reason ?? 'aborted'}`,
  )

  if (response?.stop_reason === 'max_tokens') {
    console.warn(
      `[niche-scan research] the ${RESEARCH_MAX_TOKENS}-token output ceiling cut the notes off; ` +
        `${read.truncated ? 'read the complete sections' : 'nothing complete to read'}`,
    )
  }

  return {
    ...outcome,
    stopReason: response?.stop_reason ?? null,
    notes: read.notes,
    truncated: read.truncated,
  }
}
