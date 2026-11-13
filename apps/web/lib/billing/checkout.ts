/**
 * What each plan's button does (14 §3's "Convert" row).
 *
 * **Stripe is behind an adapter and is not configured here.** CLAUDE.md
 * non-negotiable 11 allows test mode only, and no key exists in this repo, so
 * `checkoutMode` resolves to `unavailable` and the button says what it is
 * rather than pretending to take money. The shape is what a real integration
 * drops into: swap `unavailable` for a session URL and nothing else changes.
 *
 * Three actions, from 09 §11 and 14 §3:
 * - **checkout** — Pilot and Creator, the two a person can buy outright.
 * - **book** — Growth and Scale. These are sold on a call, so a booking
 *   placeholder is honest where a checkout button would not be.
 * - **waitlist** — Studio, which is not open. Nothing may imply otherwise.
 */

export type PlanAction = 'checkout' | 'book' | 'waitlist'

/** 09 §11. Pilot and Creator are the self-serve pair. */
const CHECKOUT_PLANS = new Set(['pilot', 'creator'])
const WAITLIST_PLANS = new Set(['studio'])

export function planAction(planId: string): PlanAction {
  if (WAITLIST_PLANS.has(planId)) return 'waitlist'
  if (CHECKOUT_PLANS.has(planId)) return 'checkout'
  return 'book'
}

export type CheckoutMode = 'test' | 'unavailable'

/**
 * Whether a checkout could actually start.
 *
 * Only ever `test`: a live key would breach non-negotiable 11, so the only
 * key this reads is the test one, and its absence is the normal case. The
 * prefix check guards the rule in code rather than in a comment — a live key
 * here would be a configuration mistake, and silently using it would be the
 * worst possible outcome.
 */
export function checkoutMode(): CheckoutMode {
  const key = process.env.STRIPE_TEST_SECRET_KEY
  if (!key) return 'unavailable'
  return key.startsWith('sk_test_') ? 'test' : 'unavailable'
}

export interface ActionCopy {
  readonly label: string
  /** The line under the button. Says plainly what will happen. */
  readonly note: string
}

export function actionCopy(planId: string, mode: CheckoutMode): ActionCopy {
  switch (planAction(planId)) {
    case 'waitlist':
      return {
        label: 'Join the waitlist',
        note: 'Studio is not open yet. Joining the waitlist costs nothing and takes no card.',
      }
    case 'book':
      return {
        label: 'Book a call',
        note: 'These plans are set up on a call, so we can agree the cadence and the rule packs first.',
      }
    case 'checkout':
    default:
      return mode === 'test'
        ? {
            label: 'Start checkout',
            note: 'Stripe test mode. No real card is charged and no money moves.',
          }
        : {
            label: 'Start checkout',
            note: 'Checkout is not connected in this preview. Nothing will be charged — we will set it up with you.',
          }
  }
}
