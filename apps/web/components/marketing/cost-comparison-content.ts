/**
 * What the other routes to the same job cost, and what ours works out at.
 *
 * 11 §2a is the source: market ranges, each traceable to a page that
 * publishes the figure, all re-read on 15 November 2026. This module is the
 * transcription — **no figure here may be typed anywhere else**, and our own
 * column is not typed at all: it is `price ÷ posts` off `pricing-tiers.ts`,
 * the same arrangement the month calendar has with `postsInPeriod` (D24).
 *
 * ## Three rules this content follows, and the reason for each
 *
 * **Categories, never brands.** 11 §2's standing rule for the public site,
 * and the banned-phrase sweep enforces it. "A per-clip agency" is a route
 * somebody can recognise; naming one is a comparison we would have to keep
 * accurate for ever.
 *
 * **The whole band, not the flattering end.** Every range is shown as
 * published. A freelance editor at $20 a clip is cheaper than we are per post
 * and the page says so — the argument here is about what the price includes,
 * not about being the smallest number on the screen.
 *
 * **What each route leaves undone, not what is wrong with it.** Each row
 * carries the part of the job it does not cover, tied to the complaint in
 * 11 §2 it comes from. That is the honest comparison: these are all real ways
 * to get short video made, and they stop at different places.
 */

import { PRICING_TIERS, type PricingTier } from './pricing-tiers'

/** When the ranges in 11 §2a were last read. Shown on the page. */
export const BENCHMARKS_READ_ON = 'November 2026'

export interface CostRoute {
  readonly id: string
  /** A category from 11 §2. Never a company. */
  readonly label: string
  /** Exactly as published, including the whole band. */
  readonly range: string
  /** What the money buys. */
  readonly buys: string
  /** The part of the job it does not cover, and the complaint it comes from. */
  readonly leavesUndone: string
}

export const COST_ROUTES: readonly CostRoute[] = [
  {
    id: 'freelancer',
    label: 'A freelance editor',
    range: '$20–$75 a clip',
    buys: 'Cuts, captions and music, with the quality varying editor to editor.',
    leavesUndone:
      'Nobody posts it, nobody measures it, and the footage still has to come from somewhere. For a few posts a week this is the cheapest honest answer, and our own decision helper says so.',
  },
  {
    id: 'per-clip-agency',
    label: 'A per-clip agency',
    range: '$80–$94 a vertical video',
    buys: 'A managed team and about a day of turnaround per clip.',
    leavesUndone:
      'Still a clip, bought one at a time. Volume is the thing that moves an account, and at this rate a month of daily posting costs more than any plan on this page.',
  },
  {
    id: 'clip-subscription',
    label: 'A clip subscription',
    range: 'about $31 a clip',
    buys: 'A queue with a monthly clip count, usually a day or two of turnaround.',
    leavesUndone:
      'The gap P1 names: the clips arrive, and growing the account is still your job. Credits and per-minute charges are also where the billing complaints in P3 come from.',
  },
  {
    id: 'full-agency',
    label: 'A full-service agency',
    range: '$2,000–$5,000 a month',
    buys: 'A retainer, a strategy deck and a reporting pack, usually on a 6–12 month contract with a setup fee.',
    leavesUndone:
      'P7: the reporting is usually views and followers, with nothing tying a post to an enquiry. The contract is the other half of that complaint.',
  },
  {
    id: 'in-house',
    label: 'Hiring for it',
    range: '$50,000–$75,000 a year',
    buys: 'A full-time editor producing 15–20 shorts a month, plus the software and the hardware.',
    leavesUndone:
      'One person covering three platforms is the burnout pattern in P8. It is also the only route here that leaves you owning the skill at the end of it.',
  },
]

/**
 * What a plan works out at per post, to the nearest dollar.
 *
 * Derived, never written down. `null` where there is no price or no volume to
 * divide — Studio is a waitlist, and a per-post figure for a plan nobody can
 * buy is a number about nothing.
 */
export function perPostUsd(tier: PricingTier): number | null {
  if (tier.priceUsd === null || tier.postsInPeriod === null || tier.postsInPeriod === 0) {
    return null
  }
  return Math.round(tier.priceUsd / tier.postsInPeriod)
}

export interface PerPostEntry {
  readonly name: string
  readonly usd: number
}

/** The plans with a per-post figure, cheapest first. */
export function perPostLadder(): readonly PerPostEntry[] {
  return PRICING_TIERS.map((tier) => ({ name: tier.name, usd: perPostUsd(tier) }))
    .filter((entry): entry is PerPostEntry => entry.usd !== null)
    .sort((a, b) => a.usd - b.usd)
}

/** "$12 to $63 a post", drawn from the ladder rather than written out. */
export function ourRangeLabel(): string {
  const ladder = perPostLadder()
  const cheapest = ladder[0]
  const dearest = ladder[ladder.length - 1]
  if (!cheapest || !dearest) return ''
  if (cheapest.usd === dearest.usd) return `$${cheapest.usd} a post`
  return `$${cheapest.usd} to $${dearest.usd} a post`
}

/**
 * The line under our row.
 *
 * It names the plan the figure comes from, because an average across five
 * plans is a number nobody can buy. Growth is the suggested plan and the one
 * most of this page is about.
 */
export function ourRowNote(): string {
  const suggested = PRICING_TIERS.find((tier) => tier.isSuggested)
  const perPost = suggested ? perPostUsd(suggested) : null
  if (!suggested || perPost === null) {
    return 'Every post is written, checked, scheduled, posted to your own accounts and reported on.'
  }
  return `${suggested.name} works out at $${perPost} a post — written, checked, posted to accounts you own and reported on. The two-week pilot costs more per post, because twelve videos is a small number to divide by.`
}
