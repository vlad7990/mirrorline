/**
 * Leg two — turn the notes into the report, with no tools and its own clock
 * (D132).
 *
 * ============================================================================
 * Why this is a separate call
 * ============================================================================
 *
 * Job `5c20fa06`: 329 seconds of research, 22 searches, `end_turn` — and a
 * report rejected for `placeholder-text` with **7 placeholder fields**. Two of
 * three live production scans looked like that. The model was asked to research
 * a niche *and* emit a complete, placeholder-free structured report in one turn,
 * under one clock, and it spent the clock on the half that had tools.
 *
 * So the shaping work gets its own call, and three things change with it:
 *
 * 1. **No tools at all.** `tools` is omitted rather than passed empty — there is
 *    nothing to graze on, so the leg cannot spend its budget searching. It is
 *    also why this leg needs no search ceiling and no `pause_turn` handling.
 * 2. **Its own time and token budget**, which cannot be borrowed against by the
 *    research it follows.
 * 3. **A retry that costs almost nothing.** The expensive half is already done
 *    and in hand, so a rejected report is re-written *from the same notes*, with
 *    the rejection quoted back. No new searches, by construction.
 *
 * ============================================================================
 * The retry quotes the rejection back
 * ============================================================================
 *
 * Vlad asked for "retry (2) once from the same notes (no new searches)". A blind
 * retry is a re-roll of the same dice; naming the matched placeholder patterns
 * turns it into a correction. The notes are unchanged either way, so this is
 * still the same leg over the same research — which is the property that keeps
 * the cost bounded and the searches at zero.
 */

import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { NO_USAGE, type Usage } from '../copilot/spend'
import { profileBrief, type ClientProfile } from '../workspace/client-profile'

import { notesBrief, type ResearchNotes } from './notes'
import { reviewReport, type ReportReview } from './report'
import { addUsage, jsonFrom, streamLeg, type BudgetStop, type LegOutcome } from './stream-leg'

export const WRITE_MODEL = 'claude-sonnet-5'

/**
 * Enough for the report and the thinking that shapes it, and no more.
 *
 * The old single leg asked for 28k because it carried research *and* the report.
 * This leg writes at most six formats, nine examples and four claim lists, from
 * notes already in front of it.
 */
export const WRITE_MAX_TOKENS = 20_000

/**
 * `medium`, not `high`.
 *
 * `high` is for reading a niche nobody has described yet. This leg is handed the
 * facts and asked to shape them, which is the kind of work where more thinking
 * buys very little and costs a clock the research leg is waiting on.
 */
export const WRITE_EFFORT = 'medium' as const

/** Leg two's slice per attempt. Short, because it has nothing to look up. */
export const WRITE_TIME_BUDGET_MS = 75 * 1000

/**
 * One write, and one retry. **Two is the number, and it is a ceiling.**
 *
 * `04 §3`'s shape, applied here: a second failure means the notes cannot be
 * written up, not that a third attempt would succeed. `budget.test.ts`
 * multiplies this by `WRITE_TIME_BUDGET_MS` when it checks the lease, so raising
 * it shows up as a failing test rather than as a drift.
 */
export const WRITE_MAX_ATTEMPTS = 2

export const WRITE_REQUEST_TIMEOUT_MS = 2 * 60 * 1000

/** No tools, so a turn cannot pause. Zero rather than inherited. */
const WRITE_MAX_CONTINUATIONS = 0

/** The same reasoning as the research leg: a retry is a decision, not a default. */
const WRITE_MAX_RETRIES = 0

/**
 * A hook, a topic or a posting pattern, with where it came from.
 *
 * Inlined by value in three places rather than `$ref`-ed: the schema is sent to
 * the API, and an inlined object is the shape every provider accepts without
 * question.
 */
const CLAIM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'basis'],
  properties: {
    text: { type: 'string' },
    basis: { type: 'string', enum: ['posts', 'guidance'] },
    brandRisk: { type: 'string' },
  },
} as const

/**
 * The shape the report must take.
 *
 * Moved here from `scan.ts` unchanged, because this is now the only leg that
 * produces it. `parseReport` still validates every field — the schema constrains
 * the shape, not the truthfulness.
 */
export const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topFormats', 'topHooks', 'topics', 'lengths', 'postingPatterns', 'examples'],
  properties: {
    topFormats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'whyItWorks', 'beats', 'fit', 'fitReason'],
        properties: {
          /*
           * The sentence behind the number (P1.7). Required, not optional, and
           * that is the point: a model asked for a score alone produces one for
           * anything, and a model asked to say why — naming something from this
           * client's profile — cannot score a format it has no argument for.
           */
          fitReason: { type: 'string' },
          name: { type: 'string' },
          whyItWorks: { type: 'string' },
          beats: { type: 'array', items: { type: 'string' } },
          /*
           * 0–10. Asked for in the prompt and enforced by `normaliseFit`, **not**
           * bounded here — structured output refuses `minimum`/`maximum` on an
           * integer:
           *
           *     400 invalid_request_error — output_config.format.schema:
           *     For 'integer' type, properties maximum, minimum are not supported
           *
           * Found by a live run, which is the only place it can be found.
           */
          fit: { type: 'integer' },
        },
      },
    },
    topHooks: { type: 'array', items: CLAIM_SCHEMA },
    topics: { type: 'array', items: CLAIM_SCHEMA },
    lengths: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['secondsMin', 'secondsMax', 'note', 'basis'],
        properties: {
          // A range, because nobody measured "21 seconds" (P1.9).
          secondsMin: { type: 'integer' },
          secondsMax: { type: 'integer' },
          note: { type: 'string' },
          basis: { type: 'string', enum: ['posts', 'guidance'] },
        },
      },
    },
    postingPatterns: { type: 'array', items: CLAIM_SCHEMA },
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

/**
 * The writing rules.
 *
 * The shaping half of the old `SCAN_SYSTEM` — beats, fit and its argument,
 * ranges, basis, brand risk — plus the one rule the old prompt could not state:
 * **you have no tools, so anything not in the notes does not exist.** That
 * sentence is the difference between a thin honest report and seven placeholder
 * fields.
 */
export const WRITE_SYSTEM = `You write a niche research report from notes somebody else gathered. You have NO tools and no way to look anything up: the notes in front of you are the only facts that exist.

Hard rules. These are not style preferences:
1. NEVER invent a fact, a url, a number, a format or an example. If the notes do not contain it, it does not go in the report. You cannot check anything, so anything you add is fabricated by definition.
2. NEVER write placeholder text. No "TBD", no "example", no "[insert]", no "N/A", no format called "Format 1", no made-up url. A short report built only from the notes is ACCEPTED. A padded one is REJECTED outright and the run is wasted.
3. Turn each observed format into a recipe: its name, one sentence on why it works, and the beats in order (hook, setup, payoff, call to action). The beats come from the "how it goes" prose in the notes — you are naming the structure that was observed, not inventing one.
4. Score fit from 0 to 10, where 10 is "this client could shoot this tomorrow". Never a 0-100 scale. Every score needs a fitReason: one line naming something from THIS client's profile — their service, their method, their area — that makes the format fit or not. If you cannot name one, the fit is not high.
5. The client's METHOD is a boundary, not a preference. Never recommend a format, technique or topic that contradicts it, and never anything on their "never recommend" list. If a format in this niche only works with a method they do not use, say so in its fitReason and score it low.
6. Every hook, topic and posting pattern carries the basis the notes gave it: "posts" if it was read off real posts, "guidance" if it came from an article about the niche. Never promote "guidance" to "posts". A note with no basis is "guidance".
7. Lengths are ranges, never single numbers: "about 20 to 35 seconds", not "21 seconds". If the notes give only one number, build the range around it honestly and say in the note that it is a single observation.
8. Examples are copied from the notes and never embellished. Keep the url, the platform, the format name, what happens, and the source note. Carry a view count, a length or a follower ratio ONLY where the notes recorded one — if the notes left it out, you leave it out. Never add a url that is not in the notes.
9. Topics that divide this niche — where practitioners publicly disagree — get a brandRisk line saying what taking a side would cost. Raise them; never slip them in as neutral.
10. sourcesUsed is the pages the notes say were read, with their titles and kinds, and nothing else. A "post" is a public post a format was read off; a "guide" is an article about the niche. The two are never presented as the same thing.
11. If the notes say the niche has little or no public short video, that is a FINDING. Write the report from the guidance notes, mark every basis "guidance", return an empty examples list, and say plainly in each format's whyItWorks that this comes from guidance rather than from posts.
12. Keep every description to one sentence.`

function writePrompt(niche: string, profile: ClientProfile, notes: ResearchNotes): string {
  const brief = profileBrief(profile)

  const about = brief
    ? `The client this report is for:\n${brief}`
    : 'You have no profile for this client beyond the niche. Score every fit cautiously and say in each fitReason what you would need to know.'

  return `Write the niche report for: ${niche}

${about}

These are the research notes. They are the only facts you have.

${notesBrief(notes)}

Write the report from those notes and nothing else.`
}

/**
 * What to say on a retry.
 *
 * The matched pattern names are **our matcher's**, not the model's text, so this
 * is safe to put in a prompt and safe to log: no answer, no client detail.
 */
function retryTurn(review: ReportReview): string {
  const patterns =
    review.status === 'rejected' && review.rejection.rule === 'placeholder-text'
      ? review.rejection.patterns.join(', ')
      : ''

  const because =
    patterns === ''
      ? 'it contained nothing substantive.'
      : `it contained placeholder text matching: ${patterns}.`

  return `That report was rejected because ${because}

Write it again from the SAME notes. Nothing new has been looked up and nothing will be — those notes are still the only facts that exist.

Remove every placeholder. Where the notes do not support a field, LEAVE IT OUT or return a shorter report. A short report built only from the notes is accepted; a padded one is rejected and this run is wasted.`
}

export interface WriteRequest {
  readonly client: Anthropic
  readonly niche: string
  readonly profile: ClientProfile
  readonly notes: ResearchNotes
  /** Absolute deadline for the whole write leg, retries included. */
  readonly deadlineAt: number
}

export interface WriteOutcome {
  /** The last review, accepted or rejected. `null` when no attempt could run. */
  readonly review: ReportReview | null
  readonly usage: Usage
  readonly attempts: number
  readonly seconds: number
  readonly stoppedBy: BudgetStop | null
  readonly stopReason: string | null
}

/**
 * Write the report, retrying once from the same notes if it is rejected.
 *
 * Each attempt gets its own slice of the clock so one slow attempt cannot eat
 * the retry's, and the whole leg still stops at `deadlineAt` — `Math.min` of the
 * two, which is what makes the arithmetic in `budget.test.ts` true rather than
 * aspirational.
 */
export async function runWriteLeg(request: WriteRequest): Promise<WriteOutcome> {
  const beganAt = Date.now()
  const elapsed = () => Math.round((Date.now() - beganAt) / 1000)

  const conversation: Anthropic.MessageParam[] = [
    { role: 'user', content: writePrompt(request.niche, request.profile, request.notes) },
  ]

  let usage = NO_USAGE
  let review: ReportReview | null = null
  let attempts = 0

  for (let attempt = 0; attempt < WRITE_MAX_ATTEMPTS; attempt += 1) {
    if (Date.now() >= request.deadlineAt) {
      console.warn(`[niche-scan write] no time left for attempt ${attempt + 1} after ${elapsed()}s`)
      return { review, usage, attempts, seconds: elapsed(), stoppedBy: 'time', stopReason: null }
    }

    const outcome: LegOutcome = await streamLeg({
      client: request.client,
      label: `niche-scan write ${attempt + 1}/${WRITE_MAX_ATTEMPTS}`,
      model: WRITE_MODEL,
      maxTokens: WRITE_MAX_TOKENS,
      effort: WRITE_EFFORT,
      system: WRITE_SYSTEM,
      schema: REPORT_SCHEMA,
      messages: conversation,
      // No `tools` key at all, so there is nothing to graze on and no search
      // ceiling to enforce. This is what makes "no new searches" structural.
      deadlineAt: Math.min(request.deadlineAt, Date.now() + WRITE_TIME_BUDGET_MS),
      requestTimeoutMs: WRITE_REQUEST_TIMEOUT_MS,
      maxContinuations: WRITE_MAX_CONTINUATIONS,
      maxRetries: WRITE_MAX_RETRIES,
    })

    attempts = attempt + 1
    usage = addUsage(usage, outcome.usage)

    if (outcome.response === null) {
      return {
        review,
        usage,
        attempts,
        seconds: elapsed(),
        stoppedBy: outcome.stoppedBy,
        stopReason: null,
      }
    }

    const stopReason = outcome.response.stop_reason ?? null

    // A refusal is an HTTP 200 with nothing to read (18 §7), so it is checked
    // before the content is touched.
    if (stopReason === 'refusal') {
      return { review, usage, attempts, seconds: elapsed(), stoppedBy: null, stopReason }
    }

    review = reviewReport(jsonFrom(outcome.response.content))

    if (review.status === 'ok') {
      return { review, usage, attempts, seconds: elapsed(), stoppedBy: null, stopReason }
    }

    const isLast = attempt + 1 >= WRITE_MAX_ATTEMPTS
    console.warn(
      `[niche-scan write] attempt ${attempts} rejected: rule=${review.rejection.rule}` +
        (review.rejection.rule === 'placeholder-text'
          ? ` patterns=[${review.rejection.patterns.join(',')}]`
          : '') +
        ` · ${isLast ? 'no attempts left' : 'retrying from the same notes'}`,
    )

    if (isLast) {
      return { review, usage, attempts, seconds: elapsed(), stoppedBy: null, stopReason }
    }

    // The model's own rejected turn, then the correction. Appending the
    // assistant turn keeps the notes in the cached prefix rather than re-sending
    // them, so the retry is genuinely cheap.
    conversation.push(
      { role: 'assistant', content: outcome.response.content },
      { role: 'user', content: retryTurn(review) },
    )
  }

  return { review, usage, attempts, seconds: elapsed(), stoppedBy: null, stopReason: null }
}
