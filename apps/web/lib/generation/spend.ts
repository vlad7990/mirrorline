/**
 * What a generation costs, and whether this workspace may spend it.
 *
 * The media half of `lib/copilot/spend.ts`, and a sibling rather than an
 * extension because the two bill in different units: tokens and searches
 * there, seconds and images here. What is **not** duplicated is the decision
 * shape — `SpendDecision` and `SpendLimits` are imported, so a refusal from
 * this module reads the same in a log as a refusal from that one.
 *
 * ============================================================================
 * The cap is separate, and that is a decision with a number behind it
 * ============================================================================
 *
 * `DEFAULT_MONTHLY_CAP_USD` is $20 for the co-pilot. Generation at the default
 * shape costs $0.34 a short, and three shorts a day is about $31 a month — so
 * sharing one ceiling would mean a fortnight of posting starves the co-pilot,
 * and raising the ceiling for one would raise it for both. Two budgets, two
 * variables, two sums.
 *
 * ============================================================================
 * The arithmetic is pure and the read is not
 * ============================================================================
 *
 * `decideGenerationSpend` takes the month's spend as a **number or null** and
 * returns a decision. It does not fetch anything. That is what lets the one
 * property worth guarding — *a read that failed is not a month at zero* — be a
 * unit test rather than an integration test, and it keeps the only Supabase
 * call in `ledger.ts`, where it can be read in one sitting.
 */

import {
  MAX_REQUEST_USD,
  type EnvLike,
  type SpendDecision,
  type SpendLimits,
} from '../copilot/spend'
import { DEFAULT_CLIP_SECONDS, type GenerationRequest, type Resolution } from './types'

/**
 * `grok-imagine-video-1.5-lite`, per second of output, by resolution.
 *
 * From xAI's own pricing page, read 25 November 2026.
 *
 * **1080p is absent because we do not offer it** (D140, and `Resolution`'s own
 * header). Its published rate is $0.14 a second — 4.7× the 720p rate, for a
 * render that model produces by *upscaling its own 720p output*. The number is
 * recorded here in prose rather than as an entry, so the table holds only
 * prices we can actually be charged.
 */
export const XAI_CLIP_LITE_USD_PER_SECOND: Readonly<Record<Resolution, number>> = {
  '480p': 0.02,
  '720p': 0.03,
}

/**
 * `grok-imagine-video-1.5`, the non-Lite model, for when Lite is not enough.
 *
 * Held here unused by the default path so the number is in the repository
 * rather than in a plan: the day somebody switches models, the cap should
 * already know what the new one costs. Its 1080p rate — $0.25 a second, and
 * genuinely native rather than upscaled — is the one worth revisiting if the
 * 720p trade ever stops being acceptable, because on *this* model the premium
 * buys a different render rather than a resize.
 */
export const XAI_CLIP_USD_PER_SECOND: Readonly<Record<Resolution, number>> = {
  '480p': 0.08,
  '720p': 0.14,
}

/**
 * `grok-imagine-image-2.0` at `low` quality, per output image, by size.
 *
 * A B-roll still is a background, not a hero shot, so `low` is the tier we
 * buy; `medium` is $0.06 at 1K and $0.08 at 2K and is a decision for the day
 * somebody can see a difference that matters.
 */
export const XAI_IMAGE_USD: Readonly<Record<'1K' | '2K', number>> = {
  '1K': 0.04,
  '2K': 0.06,
}

/**
 * Which image size a video-shaped resolution means.
 *
 * `GenerationRequest.resolution` is one field for both kinds, because a caller
 * asking for "a 720p beat" should not have to know that images are measured in
 * K and clips in p.
 *
 * **Both offered resolutions land on 1K**, which is what dropping 1080p (D140)
 * did to this table: 2K was only ever reachable through the resolution we no
 * longer offer. `XAI_IMAGE_USD` keeps its 2K rate anyway, because it is still
 * doing a job — it is the most expensive tier, and therefore the figure an
 * unrecognised resolution is priced at rather than at zero.
 */
const IMAGE_SIZE_FOR: Readonly<Record<Resolution, '1K' | '2K'>> = {
  '480p': '1K',
  '720p': '1K',
}

/**
 * The cap, per workspace, per calendar month, for media only.
 *
 * Fifteen dollars buys about forty-four shorts at the default shape, which is
 * a fortnight of three a day. Deliberately small, for the reason the
 * co-pilot's own cap gives: a ceiling nobody ever reaches is not a ceiling.
 * Approved by Vlad, 25 November 2026.
 */
export const DEFAULT_GENERATION_CAP_USD = 15

/**
 * Its own variable, and never the co-pilot's.
 *
 * A bad value is ignored rather than trusted — same rule, same shape, as
 * `monthlyCapUsd`. Falling back to `COPILOT_MONTHLY_CAP_USD` was considered
 * and rejected: a deploy that set one would silently move the other, which is
 * the kind of coupling nobody remembers at 2am.
 */
export function generationCapUsd(env: EnvLike = process.env): number {
  const raw = env.GENERATION_MONTHLY_CAP_USD
  if (!raw) return DEFAULT_GENERATION_CAP_USD

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_GENERATION_CAP_USD
  return parsed
}

/**
 * The most one generation may project to cost.
 *
 * The co-pilot's number, reused deliberately rather than coincidentally: $0.50
 * is "one unit of work" across this product, and a second figure would invite
 * the question of which one applies. Approved by Vlad, 25 November 2026, and
 * **kept** when 1080p came off the menu (D140).
 *
 * ============================================================================
 * It is now a backstop rather than a constraint, and that is the right shape
 * ============================================================================
 *
 * It used to bind: at $0.14 a second, 1080p crossed it at about three and a
 * half seconds, so the ceiling was deciding what a client could ask for. With
 * 1080p gone the most expensive thing we will ask for is
 * `MAX_CLIP_SECONDS` × $0.03 = $0.18, comfortably inside it.
 *
 * So the ceiling no longer refuses anything a correct caller requests — and it
 * is still load-bearing, because the callers it refuses are the incorrect ones:
 * a `seconds` value past `MAX_CLIP_SECONDS`, or a resolution string we do not
 * recognise, which `projectGenerationUsd` deliberately prices at the most
 * expensive tier it knows. Those are the runaway requests this number exists
 * for, and they are exactly the ones that arrive from a parsed payload rather
 * than from a person.
 *
 * `spend.test.ts` asserts both halves: that every clip we will actually ask for
 * fits, and that a malformed one does not.
 */
export const MAX_GENERATION_REQUEST_USD = MAX_REQUEST_USD

/** The priciest second on the table, for anything the table does not know. */
function worstPerSecond(rates: Readonly<Record<Resolution, number>>): number {
  return Math.max(...Object.values(rates))
}

/**
 * What this request will cost at worst, before it is made.
 *
 * An unrecognised resolution is priced at the most expensive tier rather than
 * at zero, which is the rule `usageUsd` already follows for an unknown model:
 * *"Costing an unrecognised model nothing is how a cap stops being a cap the
 * next time a model id changes."* A resolution arriving from a parsed payload
 * is the same hazard wearing different clothes.
 *
 * The seconds asked for are priced as asked, never clamped. A fifteen-second
 * request is refused by the per-request ceiling with a number attached;
 * trimming it to six would deliver a different video from the one requested
 * and conceal that a limit exists at all.
 */
export function projectGenerationUsd(request: GenerationRequest): number {
  if (request.kind === 'image') {
    const size = IMAGE_SIZE_FOR[request.resolution]
    return size ? XAI_IMAGE_USD[size] : Math.max(...Object.values(XAI_IMAGE_USD))
  }

  const perSecond =
    XAI_CLIP_LITE_USD_PER_SECOND[request.resolution] ?? worstPerSecond(XAI_CLIP_LITE_USD_PER_SECOND)

  return perSecond * (request.seconds ?? DEFAULT_CLIP_SECONDS)
}

/**
 * May this workspace spend this, given what it has spent already.
 *
 * `spentUsd` is the month's media total, **or `null` when it could not be
 * read**. The order is the cap: project, check the per-request ceiling, then
 * the month — so a single runaway request is refused on a cold instance with
 * no history, and a workspace near its ceiling is refused before the call
 * rather than after the invoice.
 *
 * `null` is a refusal. Not pessimism — the only correct reading: "we do not
 * know what this workspace has spent" cannot be answered with "then spend
 * more". `lib/agents/ledger.ts` makes the same argument at greater length;
 * this is the same guard one layer out.
 */
export function decideGenerationSpend(
  spentUsd: number | null,
  projectedUsd: number,
  limits: SpendLimits = {},
  env: EnvLike = process.env,
): SpendDecision {
  const perRequestCeiling = limits.maxRequestUsd ?? MAX_GENERATION_REQUEST_USD
  const cap = limits.monthlyCapUsd ?? generationCapUsd(env)

  if (projectedUsd > perRequestCeiling) {
    return {
      allowed: false,
      reason: `one generation projected at $${projectedUsd.toFixed(4)}, over the $${perRequestCeiling} per-request ceiling`,
      message:
        'That scene is too long or too large to generate in one go. Try a shorter clip, or 720p.',
    }
  }

  if (spentUsd === null) {
    return {
      allowed: false,
      reason: 'could not read the month’s media spend, so the cap cannot be checked',
      message: 'We could not check this workspace’s usage just now. Try again shortly.',
    }
  }

  if (spentUsd + projectedUsd > cap) {
    return {
      allowed: false,
      reason: `month at $${spentUsd.toFixed(4)} of $${cap} for media, and this run projects $${projectedUsd.toFixed(4)}`,
      message: 'This workspace has reached its monthly cap for generated scenes.',
    }
  }

  return { allowed: true, projectedUsd, remainingUsd: cap - spentUsd }
}

/**
 * What a finished generation actually cost, from what came back.
 *
 * Separate from `projectGenerationUsd` because the two answer different
 * questions and the difference is money. Per-second billing means a
 * five-second request can return 4.8 seconds, and the ledger must record the
 * billed figure rather than the guess the cap was checked against — a
 * projection in the `usd` column would drift from the invoice in the direction
 * hardest to notice, which is the failure `copilot/spend.ts` already watches
 * for with cache reads.
 */
export function billedGenerationUsd(
  kind: GenerationRequest['kind'],
  resolution: Resolution,
  seconds: number | null,
): number {
  if (kind === 'image') {
    const size = IMAGE_SIZE_FOR[resolution]
    return size ? XAI_IMAGE_USD[size] : Math.max(...Object.values(XAI_IMAGE_USD))
  }

  const perSecond =
    XAI_CLIP_LITE_USD_PER_SECOND[resolution] ?? worstPerSecond(XAI_CLIP_LITE_USD_PER_SECOND)

  return perSecond * (seconds ?? DEFAULT_CLIP_SECONDS)
}
