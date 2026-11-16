/**
 * The long-form YouTube add-on, transcribed from `docs/specs/09_SERVICES.md`
 * §11 "Add-ons", which is the one place a price is written down (D38).
 *
 * ## Why this is not a sixth `PricingTier`
 *
 * It would have been the short way and it would have been wrong in three
 * places at once: `PlanPicker` would offer it as a plan, the pricing hero's
 * numbered index would count it as one, and `perDayUsd` would divide a price
 * that is only ever paid *on top of* another. An add-on is a different kind
 * of thing from a plan, so it gets a different type rather than a flag on the
 * plan type that every consumer then has to remember to check.
 *
 * ## Why it ships as a waitlist rather than a buy
 *
 * 19 v2 left this card out of F3 on a good argument: "a card for an add-on
 * whose API audit has not started would be an invented product." The audit
 * still has not started — it is "Needs Vlad G" — so that objection would
 * stand if the card carried a buy button.
 *
 * What answers it is the caveat, not the card. Google's audit gates an app's
 * ability to make uploads **public**, so until it passes, YouTube posts stay
 * private. Saying that on screen turns the card from a product we are
 * pretending to sell into one we are honestly describing and not yet selling
 * — which is the treatment Studio already has at 09 §11, so the site has the
 * vocabulary for it.
 *
 * ## The caveat is generated, not quoted
 *
 * `PRIVATE_UNTIL_APPROVED` is re-exported from `lib/copy/platform-limits.ts`,
 * which builds the calendar legend's sentence and this one from a single
 * template. Typing the words again would have been "the same words" on the
 * day it was typed and nothing afterwards. Two screens describing the same
 * platform limit in two voices is how a caveat quietly turns into small
 * print.
 */

import { YOUTUBE_PRIVATE_UNTIL_APPROVED } from '@/lib/copy/platform-limits'

/** The price, exactly as 09 §11 writes it. */
export const ADDON_PRICE = '$600'

/** The same figure as a number, so a test can hold the two together. */
export const ADDON_PRICE_USD = 600

/** What the price buys. Never "per video": 09 §10 rules out per-unit charges. */
export const ADDON_PERIOD = 'a month, on top of any monthly plan'

/** How many episodes a month. 09 §11. */
export const ADDON_EPISODES_PER_MONTH = 2

export const ADDON_NAME = 'Long-form YouTube'

export const ADDON_SUMMARY =
  'We publish the long recording too — the same one the shorts are cut from — to the channel those shorts point at.'

/**
 * The platform limit, in the calendar legend's words.
 *
 * The legend shows a client looking at their own week "TikTok posts stay
 * private until our app is approved." A visitor reading the pricing page
 * meets the same kind of limit on a different platform, and
 * 02_BRAND_AND_VOICE's rule is to say it plainly — so it is said the same
 * way rather than re-softened for an audience that has not paid yet. One
 * template builds both; see `lib/copy/platform-limits.ts`.
 */
export const PRIVATE_UNTIL_APPROVED = YOUTUBE_PRIVATE_UNTIL_APPROVED

/** Why it is not open, said once and in full. */
export const WHY_NOT_OPEN =
  'Google audits an app before it may make uploads public, and ours has not been through that yet. We would rather show you the add-on and its limit together than take a waitlist place and explain the limit afterwards.'

export const WAITLIST_LABEL = 'Waitlist'

export interface AddonFact {
  readonly label: string
  readonly detail: string
}

/**
 * What the add-on includes, and the one thing it cannot do.
 *
 * The limit sits in the same list as the features rather than in a footnote.
 * 09 §11: an account on "we create" alone has nothing for this to publish,
 * and somebody should meet that before the price rather than after it.
 */
export const ADDON_FACTS: readonly AddonFact[] = [
  {
    label: 'Two episodes a month',
    detail:
      'Cut from the recordings you already send us, then titled, chaptered and given a thumbnail.',
  },
  {
    label: 'One of them is already in Scale',
    detail:
      'Scale includes an episode a month, so there the add-on takes you from one to two rather than from none to two. On every other plan it is both of them.',
  },
  {
    label: 'The shorts get somewhere to point',
    detail:
      'The cuts already go out daily. This is the full episode they came from, on the channel they send people to.',
  },
  {
    label: 'Only on the “you send” path',
    detail:
      'It needs your own long recording. A remake copies a format’s structure and is short by design, so an account we only create for has nothing here to publish.',
  },
  {
    label: 'Billed like everything else',
    detail: 'Flat monthly, no credits, no per-minute charge, and cancel in one click.',
  },
]
