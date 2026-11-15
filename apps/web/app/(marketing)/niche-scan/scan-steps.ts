/**
 * The four steps, and what makes each one wrong.
 *
 * **In a `.ts` module because this is the part worth asserting.** D52 left
 * the stepper unbuilt precisely because replacing a working form's validation
 * is the risky half of the job — so the replacement rules live where a Vitest
 * spec can reach them. `tsconfig.base.json` sets `jsx: "preserve"` and the
 * runner includes only `*.test.ts` under `apps/web`, so rules kept inside
 * `scan-form.tsx` would be rules no test could see. F1 moved `PAGE_CTAS` out
 * of a component for the same reason.
 *
 * The email rule is not written here. `isValidEmail` is the route handler's
 * own check, exported from `lib/leads/niche-scan-lead.ts`, because a form
 * that disagrees with its server either rejects addresses the server would
 * take or accepts ones it will not — and the second surfaces as an error
 * about a field the user has already left behind.
 */

import type { GoalKey } from '@/lib/audience/account-type'
import { MAX_NICHE, isValidEmail } from '@/lib/leads/niche-scan-lead'

export interface ScanStep {
  readonly key: string
  /** Two or three words. It is a rail, not a second set of questions. */
  readonly label: string
}

/**
 * One question a step, in the order the spec asks for.
 *
 * The order is not arbitrary and is worth not reshuffling: the niche is first
 * because it is the question somebody came here to answer, and the email is
 * last because asking for an address before anything has been given is what
 * makes a lead form feel like a toll gate.
 */
export const STEPS: readonly ScanStep[] = [
  { key: 'niche', label: 'What you do' },
  { key: 'goal', label: 'The aim' },
  { key: 'handles', label: 'Accounts' },
  { key: 'email', label: 'Where it goes' },
]

export const LAST_STEP = STEPS.length - 1

export interface Answers {
  readonly niche: string
  readonly goal: GoalKey
  readonly handles: readonly string[]
  readonly email: string
}

export const EMPTY_ANSWERS: Answers = {
  niche: '',
  goal: 'leads',
  handles: ['', '', ''],
  email: '',
}

/**
 * What is wrong with a step, or `null`.
 *
 * Steps two and three can never fail — the goal has a default and the handles
 * are optional — and returning `null` for them explicitly rather than leaving
 * them out is deliberate: a step with no rule is a decision, not an
 * oversight, and the next person to read this should not have to work out
 * which it was.
 */
export function problemWith(step: number, answers: Answers): string | null {
  switch (step) {
    case 0:
      if (answers.niche.trim().length === 0) {
        return 'Tell us what you do, in your own words. A sentence is plenty.'
      }
      if (answers.niche.trim().length > MAX_NICHE) {
        return `That is longer than we can take. Please keep it under ${MAX_NICHE} characters.`
      }
      return null
    case 1:
      // Always valid: `goal` starts at 'leads' and the chips only ever set
      // another of the seven.
      return null
    case 2:
      // Always valid: the handles are optional, and anything unusable is
      // dropped by `normaliseHandles` rather than failing the submission.
      return null
    case 3:
      if (answers.email.trim().length === 0) {
        return 'We need an address to send the scan to.'
      }
      if (!isValidEmail(answers.email)) {
        return 'That does not look like an email address we could reach you at.'
      }
      return null
    default:
      return null
  }
}

/**
 * The first step with a problem, or `-1`.
 *
 * Used on the final submit rather than checking step four alone. The old form
 * read every field off the DOM at once, so "all the answers are valid" was
 * implicit in the browser having let the submit through; with one step
 * mounted at a time it has to be asked for. The *first* bad step, not any bad
 * step, because that is the one to send somebody back to.
 */
export function firstProblemStep(answers: Answers): number {
  return STEPS.findIndex((_, index) => problemWith(index, answers) !== null)
}
