/**
 * "Your first 3 videos" — the script and hook agent (V2).
 *
 * The Niche Scan ends in research, and research is not a thing anybody can
 * shoot. This turns the top formats plus the client's own profile into three
 * concrete ideas: a hook line, four beats, and the footage to film. It is the
 * first visible output of `BACKEND_PHASE §V2`, and it runs inside the scan
 * job, immediately after the report is written.
 *
 * ## Why it is part of the scan rather than its own job
 *
 * It needs the report and nothing else, it costs one short call with no
 * searches, and the client asked one question — "what should I make?" A second
 * queued job would mean a second button, a second progress state, and a report
 * that is complete for ten minutes before it is useful. When scripts become
 * things we schedule and publish, they earn a job of their own; three ideas at
 * the end of a document do not.
 *
 * ## The two rules, and where they live
 *
 * `§V2`'s "Done when" is a script that shares the recipe's beat structure and
 * **no sentence** with the source, carrying **at least one real business
 * fact**. The model is told both. The *gate* is `screenIdeas` in
 * `video-idea.ts`, because a prompt is a request and a check is a rule — and
 * `§V3` forbids warn-and-continue: an idea failing either test never reaches
 * the report, and the reason is logged.
 *
 * ## No profile, no videos
 *
 * With an empty profile every draft would fail the fact check, so the agent is
 * not called at all. A run that spends money to produce nothing is worse than
 * one that explains itself; the screen asks for the profile instead.
 */

import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { APIConnectionError, APIError, RateLimitError } from '../agents/anthropic-client'
import { checkAgentSpend, recordRun } from '../agents/ledger'
import { NO_USAGE, type EnvLike, type Usage } from '../copilot/spend'
import type { FormatFinding, TrendExample } from '../niche-scan/report'
import type { ComparisonCorpus } from '../originality/gate'
import { profileBrief, profileFacts, type ClientProfile } from '../workspace/client-profile'
import { parseVideoIdeas, screenIdeas, type VideoIdea } from './video-idea'

/** `18 §0`: the studio tier. The scan's model, a fraction of the work. */
export const SCRIPT_MODEL = 'claude-sonnet-5'

/** Three ideas with four beats each is a short answer; this is room to think. */
export const SCRIPT_MAX_TOKENS = 6_000

export const SCRIPT_EFFORT = 'medium' as const

/**
 * Its own ceiling, well under the scan's $2.
 *
 * One call, no searches, a short structured answer. A projection higher than
 * this means something is wrong with the request rather than with the cap —
 * which is exactly when a run should be refused rather than made.
 */
export const SCRIPT_MAX_REQUEST_USD = 0.5

/**
 * This call's share of the job's wall clock.
 *
 * It had **no timeout at all**, which made it a second unbounded leg inside
 * the same 900-second lease the scan had already spent 829 seconds of. One
 * call, no searches, 6k of output: two minutes is generous, and the point is
 * that the number exists and is added up in `budget.test.ts`.
 *
 * Unlike the scan's budget this one can be a plain request timeout, because
 * the call is **not** streaming — the SDK's timeout bounds a whole
 * non-streaming request, which is exactly what it does not do for a stream
 * (see `SCAN_REQUEST_TIMEOUT_MS`).
 */
export const SCRIPT_TIME_BUDGET_MS = 2 * 60 * 1000

/** How many formats to write from. Three ideas, three formats, no repeats. */
const FORMATS_USED = 3

/**
 * How many of the client's own posts the gate compares against (V3, D126).
 *
 * **90, and the spec disagreed with itself.** `04 §Originality Gate` and
 * `BACKEND_PHASE §V3` both say the client's "own last 90 posts"; `12 §5` says
 * "the client's last 60 posts". `04` wins — CLAUDE.md keeps specs 01–08
 * authoritative on "the agents' mechanics", and the plan agrees with it — so
 * 90 it is, and the three places on the marketing site that said 60 are
 * corrected in this change.
 *
 * It is a label rather than a limit today, because the corpus is empty: see
 * `comparisonCorpora`. It is a named constant so that the day the posts exist,
 * the number the gate uses and the number the client is shown cannot drift
 * apart.
 */
const OWN_POSTS_COMPARED = 90

/** More than three are asked for, because the gate rejects some. */
const IDEAS_REQUESTED = 4

const IDEAS_KEPT = 3

const IDEA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ideas'],
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'formatName', 'hook', 'beats', 'footage', 'fact'],
        properties: {
          title: { type: 'string' },
          formatName: { type: 'string' },
          hook: { type: 'string' },
          beats: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'text'],
              properties: { label: { type: 'string' }, text: { type: 'string' } },
            },
          },
          footage: { type: 'array', items: { type: 'string' } },
          fact: { type: 'string' },
        },
      },
    },
  },
} as const

export const SCRIPT_SYSTEM = `You write short vertical video ideas for ONE specific business, from research somebody else did.

You are given formats that are working in the niche, and a profile of the client. You return ideas the client could film this week.

Hard rules. These are not style preferences:
1. Use the format's BEAT STRUCTURE and nothing else from it. Never reuse a sentence, a caption or a phrase from the research — not from the example descriptions and not from the beats. If a line you wrote also appears in the research, rewrite it.
2. Every idea must carry at least one REAL fact from the client profile — their area, their method, a service they sell, or its price — and that fact goes in the "fact" field, in the words the profile uses. Never invent a fact. Never write a number about the client that is not in the profile.
3. Never suggest anything the client's "never recommend" list rules out, and never suggest a technique that contradicts their stated method. If a format only works with a method they do not use, build it a different way or skip it.
4. Four beats, labelled Hook, Setup, Payoff and Call to action, in that order.
5. The footage list is what the client has to point a camera at. Plain instructions, in their world, not film-school jargon.
6. Write in their voice: a person who works this way, talking to the people they serve. No hype, no guarantees, no "secrets nobody tells you".`

export interface FirstVideosRequest {
  readonly workspaceId: string
  readonly niche: string
  readonly profile: ClientProfile
  readonly formats: readonly FormatFinding[]
  readonly examples: readonly TrendExample[]
  readonly client: Anthropic
  readonly supabase: Parameters<typeof recordRun>[0]
  readonly env: EnvLike
  readonly now: Date
}

export interface FirstVideosOutcome {
  readonly ideas: readonly VideoIdea[]
  /** Why there are fewer than three, in words, for the log and the report. */
  readonly note: string | null
}

const NOTHING: FirstVideosOutcome = { ideas: [], note: null }

function usageFrom(usage: Anthropic.Usage | null | undefined): Usage {
  if (!usage) return NO_USAGE
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  }
}

function jsonFrom(content: readonly Anthropic.ContentBlock[]): unknown {
  for (const block of content) {
    if (block.type !== 'text') continue
    try {
      return JSON.parse(block.text)
    } catch {
      // Not this block.
    }
  }
  return null
}

/** `18 §7`: typed classes, most specific first, never a match on message text. */
function describe(error: unknown): string {
  if (error instanceof RateLimitError) return 'the model is busy'
  if (error instanceof APIConnectionError) return 'the model could not be reached'
  if (error instanceof APIError) return `api error ${error.status}`
  return 'unexpected failure'
}

/**
 * Everything we hold from the sources, as the text the gate compares against.
 *
 * The example descriptions and the format beats — which is all we have, since
 * we never store anybody's script. That is the point rather than a limitation:
 * the gate can only check what we kept, and what we kept is deliberately a
 * description rather than a copy (D115, non-negotiable 1).
 */
function sourceTexts(
  formats: readonly FormatFinding[],
  examples: readonly TrendExample[],
): readonly string[] {
  return [
    ...formats.flatMap((format) => [format.whyItWorks, ...format.beats]),
    ...examples.flatMap((example) => [example.whyItWorks, example.hookType]),
  ]
}

/**
 * The two things `04 §Originality Gate` says a draft is compared against, and
 * an honest account of which of them we can actually do (V3, D126).
 *
 * > "The draft is compared against the beat structure of the source format and
 * > against the client's own last 90 posts. The second comparison matters as
 * > much as the first: a client repeating themselves is a client whose reach
 * > falls, and the platforms treat it the same way."
 *
 * The first is real: the research we kept. **The second is empty, and the
 * verdict says so out loud rather than leaving it out.** There is no table, no
 * column and no ingestion holding the client's own posts — `metric_snapshots`
 * stores numbers and has no text column at all, and nothing writes to it yet
 * (B6).  So the corpus is declared, found empty, and reported in the verdict's
 * `notComparedAgainst`, which the studio prints.
 *
 * That is deliberately uncomfortable. The alternative — quietly passing one
 * corpus while the screen says "compared against your own last 90 posts" — is
 * a claim about a check we did not run, which is what non-negotiable 7 is for.
 * It becomes real when B6 ingests captions, and this function is the only
 * place that then changes.
 */
function comparisonCorpora(
  formats: readonly FormatFinding[],
  examples: readonly TrendExample[],
): readonly ComparisonCorpus[] {
  return [
    {
      label: 'the research in your niche report',
      texts: sourceTexts(formats, examples),
    },
    {
      label: `your own last ${OWN_POSTS_COMPARED} posts`,
      texts: [],
    },
  ]
}

function userPrompt(
  niche: string,
  profile: ClientProfile,
  formats: readonly FormatFinding[],
): string {
  const recipes = formats
    .map(
      (format, index) =>
        `${index + 1}. ${format.name} — ${format.whyItWorks}\n   Beats: ${format.beats.join(' → ')}`,
    )
    .join('\n')

  return `The niche: ${niche}

The client:
${profileBrief(profile)}

Formats working in this niche right now:
${recipes}

Write ${IDEAS_REQUESTED} video ideas this client could film this week, each built on one of those formats. Use a different format for each idea where you can.`
}

/**
 * Write the ideas, screen them, and record what it cost.
 *
 * Returns `NOTHING` rather than throwing on every failure path: the report has
 * already been written by the time this runs, and a scan that produced real
 * research must not be reported as failed because its last section could not
 * be written. The reason is logged, and `note` says so on the screen.
 */
export async function writeFirstVideos(request: FirstVideosRequest): Promise<FirstVideosOutcome> {
  const { workspaceId, niche, profile, formats, examples, client, supabase, env, now } = request

  const facts = profileFacts(profile, niche)
  if (facts.length === 0) {
    // No call at all. Every draft would fail the fact check, and spending
    // money to produce nothing is worse than saying why there is nothing.
    return {
      ideas: [],
      note: 'Add your business details above and the next scan will end with three videos to film.',
    }
  }

  const usable = formats.filter((format) => format.beats.length > 0).slice(0, FORMATS_USED)
  if (usable.length === 0) return NOTHING

  const firstTurn: Anthropic.MessageParam = {
    role: 'user',
    content: userPrompt(niche, profile, usable),
  }

  let promptTokens: number
  try {
    const counted = await client.messages.countTokens({
      model: SCRIPT_MODEL,
      system: SCRIPT_SYSTEM,
      messages: [firstTurn],
    })
    promptTokens = counted.input_tokens
  } catch (error) {
    console.error('[first-videos] could not count tokens:', describe(error))
    return NOTHING
  }

  const decision = await checkAgentSpend(
    supabase,
    workspaceId,
    SCRIPT_MODEL,
    promptTokens,
    SCRIPT_MAX_TOKENS,
    now,
    env,
    { maxSearches: 0, maxRequestUsd: SCRIPT_MAX_REQUEST_USD },
  )

  if (!decision.allowed) {
    await recordRun(supabase, {
      workspaceId,
      agent: 'remake_producer',
      model: SCRIPT_MODEL,
      status: 'refused',
      usage: NO_USAGE,
      searches: 0,
      reason: decision.reason,
    })
    return { ideas: [], note: decision.message }
  }

  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: SCRIPT_MODEL,
      max_tokens: SCRIPT_MAX_TOKENS,
      output_config: {
        effort: SCRIPT_EFFORT,
        format: { type: 'json_schema', schema: IDEA_SCHEMA },
      },
      system: [{ type: 'text', text: SCRIPT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [firstTurn],
    },
    // The lease's other half. Without this the SDK scales its own timeout *up*
    // with `max_tokens`, so a wedged request could sit open past the job's
    // lease and let a second worker claim the same job.
    { timeout: SCRIPT_TIME_BUDGET_MS })
  } catch (error) {
    console.error('[first-videos] the call failed:', describe(error))
    await recordRun(supabase, {
      workspaceId,
      agent: 'remake_producer',
      model: SCRIPT_MODEL,
      status: 'failed',
      usage: NO_USAGE,
      searches: 0,
      reason: 'the model call failed',
    })
    return NOTHING
  }

  const usage = usageFrom(response.usage)

  const parsed = jsonFrom(response.content)
  const drafted = parseVideoIdeas(
    typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).ideas : null,
  )

  const screened = screenIdeas({
    ideas: drafted,
    corpora: comparisonCorpora(usable, examples),
    facts,
  })

  // Logged, never silent. A gate whose refusals are invisible is the
  // predecessor project's gate (§V3).
  for (const rejection of screened.rejected) {
    console.warn(`[first-videos] rejected "${rejection.title}": ${rejection.reason}`)
  }

  const kept = screened.kept.slice(0, IDEAS_KEPT)

  await recordRun(supabase, {
    workspaceId,
    agent: 'remake_producer',
    model: SCRIPT_MODEL,
    status: kept.length > 0 ? 'ok' : 'failed',
    usage,
    searches: 0,
    reason:
      kept.length > 0
        ? screened.rejected.length > 0
          ? `${screened.rejected.length} idea(s) refused by the originality and fact checks`
          : null
        : 'every idea was refused by the originality and fact checks',
  })

  return {
    ideas: kept,
    note:
      kept.length === 0
        ? 'The script agent wrote nothing that passed the originality and fact checks, so nothing was kept.'
        : null,
  }
}
