/**
 * What onboarding is allowed to write, checked before it reaches the database.
 *
 * ============================================================================
 * Why a parser rather than validation inside the action
 * ============================================================================
 *
 * The three vocabularies are already checked twice: `account-type.ts` declares
 * them for the UI, and `workspace_bootstrap.sql` puts a `check` constraint on
 * each column. This is the third place, and it earns its keep by being the only
 * one that can produce a **sentence for the person who typed it**. A constraint
 * violation arrives as `23514`, which is the right answer to the wrong
 * question.
 *
 * It is pure on purpose. Everything here is decidable without a session, a
 * network call or a workspace id, so it is the part worth testing exhaustively
 * — and the server action it feeds stays short enough to read.
 *
 * ============================================================================
 * Why nothing here has a default
 * ============================================================================
 *
 * `DEFAULT_CHOICE` in `account-type.ts` exists so the marketing site can render
 * a page before anybody clicks. That is a display default, and it must not leak
 * into a write: 16 §1 says the 2×2 and the goal are the user's own answer, and
 * `workspace_bootstrap.sql` keeps all three columns nullable rather than invent
 * one. A submission missing a field is refused, never defaulted.
 */

import {
  type AccountStage,
  type Audience,
  GOALS,
  type GoalKey,
  isAccountStage,
  isAudience,
} from '@/lib/audience/account-type'

/**
 * `workspaces.niche` and `goals.outcome_text` are both unbounded `text`, so
 * these are product limits rather than column limits. A niche is a phrase —
 * "Leadership coaching for first-time managers" is 43 characters — and an
 * outcome is a sentence or two. Generous enough that nobody writing in good
 * faith meets them, small enough that the field cannot be used as storage.
 */
export const NICHE_MAX_LENGTH = 160
export const OUTCOME_MAX_LENGTH = 280

export interface OnboardingSubmission {
  readonly niche: string
  readonly audience: Audience
  readonly stage: AccountStage
  readonly goalType: GoalKey
  readonly outcomeText: string
}

export interface RawOnboardingSubmission {
  readonly niche: unknown
  readonly audience: unknown
  readonly stage: unknown
  readonly goalType: unknown
  readonly outcomeText: unknown
}

export type OnboardingParseResult =
  | { readonly ok: true; readonly value: OnboardingSubmission }
  | { readonly ok: false; readonly message: string }

/** Derived from `GOALS` so a goal added to 15 §2 cannot be forgotten here. */
export function isGoalKey(value: unknown): value is GoalKey {
  return GOALS.some((goal) => goal.key === value)
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function fail(message: string): OnboardingParseResult {
  return { ok: false, message }
}

export function parseOnboardingSubmission(raw: RawOnboardingSubmission): OnboardingParseResult {
  const niche = cleanText(raw.niche)
  const outcomeText = cleanText(raw.outcomeText)

  // The messages name the field and say what to do, because they are rendered
  // next to it. "Invalid input" would make the person guess which of five.
  if (niche.length === 0) {
    return fail('Tell us what your niche is, in your own words.')
  }

  if (niche.length > NICHE_MAX_LENGTH) {
    return fail(`Please keep your niche under ${NICHE_MAX_LENGTH} characters.`)
  }

  if (outcomeText.length === 0) {
    return fail('Tell us what success would look like, in your own words.')
  }

  if (outcomeText.length > OUTCOME_MAX_LENGTH) {
    return fail(`Please keep your outcome under ${OUTCOME_MAX_LENGTH} characters.`)
  }

  // The three closed vocabularies. These come from controls the user cannot
  // type into, so a bad value means a tampered request rather than a mistake —
  // and the message stays unhelpful on purpose.
  if (!isAudience(raw.audience)) return fail('Choose whether this is a business or an individual.')
  if (!isAccountStage(raw.stage)) return fail('Choose whether the account is new or existing.')
  if (!isGoalKey(raw.goalType)) return fail('Choose a main goal.')

  return {
    ok: true,
    value: {
      niche,
      audience: raw.audience,
      stage: raw.stage,
      goalType: raw.goalType,
      outcomeText,
    },
  }
}
