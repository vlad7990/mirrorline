/**
 * Copy for the three sections that make the argument: the problem, what
 * changed, and what we built instead. From 11 §2–§4 and 14 §1.
 *
 * **Two rules bind everything in this file.**
 *
 * 1. *Categories, never brands.* 14 §1 and 10 §4: we name "clipping tools",
 *    "agencies", "repost pages". Naming a product would be a claim about that
 *    product that we would have to stand behind, and it is not the argument
 *    anyway — the argument is what a method costs you, whoever sells it.
 * 2. *The visitor's words first.* These are paraphrased complaints, not
 *    quotations from reviewers, and not a single invented statistic. The
 *    evidence lives in 11 and stays in docs.
 */

import type { GoalKey } from '@/lib/audience/account-type'

/* -------------------------------------------------------------------------- */
/* 2. Sound familiar?                                                          */
/* -------------------------------------------------------------------------- */

export interface ProblemCard {
  readonly id: string
  /** The P-number from 11 §2. Every PR description names the ones it serves. */
  readonly problem: string
  /** In the visitor's words, first person, no jargon. */
  readonly title: string
  readonly body: string
  /** Our answer, one sentence. Shown when the card is picked. */
  readonly answer: string
}

/** Six of the ten, chosen as the ones a visitor recognises fastest. */
export const PROBLEM_CARDS: readonly ProblemCard[] = [
  {
    id: 'missed-the-point',
    problem: 'P2',
    title: '“The clips come back wrong.”',
    body: 'Something cut the moment but missed the point, and you threw most of them away.',
    answer:
      'Every cut is reviewed before it reaches your calendar, and the scoring learns from your results rather than from a generic virality number.',
  },
  {
    id: 'not-my-voice',
    problem: 'P6',
    title: '“It didn’t sound like me.”',
    body: 'The posts were fine, and they were nobody’s. Generic content does not build trust.',
    answer:
      'A voice and facts profile holds your tone, the words you use and avoid, and your real offers. Every script has to cite at least one true fact about you.',
  },
  {
    id: 'billing',
    problem: 'P3',
    title: '“I was still being charged after I cancelled.”',
    body: 'Credits that expire, pricing by the source minute, and files that left with the account.',
    answer:
      'One flat price, cancel in one click, no credits anywhere, and you can export every file — including after you leave.',
  },
  {
    id: 'treadmill',
    problem: 'P8',
    title: '“I can’t keep posting every day.”',
    body: 'The cadence is the job, and the job never stops. Miss a week and it shows.',
    answer:
      'We post several times a day to your accounts. You spend about fifteen minutes a week approving, and one upload becomes a month of posts.',
  },
  {
    id: 'no-growth',
    problem: 'P1',
    title: '“I paid for clips, not for growth.”',
    body: 'You got files. Nothing published them, and nothing told you whether they worked.',
    answer:
      'We publish daily to your own accounts and report what it produced — leads, bookings and sales, not only views.',
  },
  {
    id: 'reach-fell',
    problem: 'P9',
    title: '“My reach fell off a cliff.”',
    body: 'The same posting that used to work stopped reaching anyone new.',
    answer:
      'Platforms stopped recommending accounts that mostly post unoriginal material. Everything we make is original, and the Originality Gate checks it before it posts.',
  },
]

/* -------------------------------------------------------------------------- */
/* 3. What changed in 2026                                                     */
/* -------------------------------------------------------------------------- */

export interface ChangeFact {
  readonly id: string
  readonly headline: string
  readonly body: string
}

/**
 * Three sentences, from 11 §3 and P9.
 *
 * **No figures.** 11 says its own numbers are directional and must be
 * re-checked before any is quoted publicly, and a benchmark that moves every
 * quarter does not belong in a headline. The *rule* is what changed, and the
 * rule is what these state.
 */
export const CHANGE_FACTS: readonly ChangeFact[] = [
  {
    id: 'originality',
    headline: 'Originality became a ranking signal.',
    body: 'Accounts that mostly post other people’s material stopped being recommended to people who do not already follow them. It covers photos and carousels now, not only video.',
  },
  {
    id: 'sends',
    headline: 'Sends and saves outrank likes.',
    body: 'What counts as a strong signal now is someone sending a video to a friend, saving it, or watching it to the end — not tapping a heart on the way past.',
  },
  {
    id: 'material-edits',
    headline: 'A crop is not a remake.',
    body: 'Watermarks, small trims and re-uploads do not make something yours. The edit has to be material, which in practice means a new script, new footage and a new voice.',
  },
]

/* -------------------------------------------------------------------------- */
/* 4. We built the opposite                                                    */
/* -------------------------------------------------------------------------- */

export interface ContrastRow {
  /** The approach, as a category. Never a brand. */
  readonly category: string
  readonly before: string
  readonly mirrorline: string
  /** The P-numbers this row answers. */
  readonly problems: readonly string[]
}

/** 11 §2 and §6, as the two-column table 14 §2 asks for. Covers P1–P10. */
export const CONTRAST_ROWS: readonly ContrastRow[] = [
  {
    category: 'Clipping tools',
    before: 'You get files. Publishing, judging and measuring are still yours to do.',
    mirrorline: 'We cut, check, schedule, post and report. You approve.',
    problems: ['P1', 'P2'],
  },
  {
    category: 'How you are billed',
    before: 'Credits by the source minute, charges after cancelling, files tied to the account.',
    mirrorline: 'One flat price, cancel in one click, every file exportable and yours to keep.',
    problems: ['P3'],
  },
  {
    category: 'When a job fails',
    before: 'A stalled render and a support queue.',
    mirrorline: 'The queue retries and alerts us. A person fixes it, and you can see the status.',
    problems: ['P4', 'P5'],
  },
  {
    category: 'Whether it sounds like you',
    before: 'Posts that could belong to anyone doing what you do.',
    mirrorline: 'Your tone, your words, your offers, and one true fact about you in every script.',
    problems: ['P6'],
  },
  {
    category: 'Agencies',
    before: 'Long contracts, setup fees, and a report full of views.',
    mirrorline: 'Month to month, no setup fee, and a weekly ledger that ends at leads and sales.',
    problems: ['P7'],
  },
  {
    category: 'Doing it yourself',
    before: 'The cadence is the job, and the job burns people out.',
    mirrorline: 'Several posts a day from us, about fifteen minutes a week from you.',
    problems: ['P8'],
  },
  {
    category: 'Repost pages',
    before: 'Other people’s videos, re-uploaded. Penalised now, and never yours to begin with.',
    mirrorline: 'The format copied, the footage never. The Originality Gate blocks the rest.',
    problems: ['P9'],
  },
  {
    category: 'When you are the one copied',
    before: 'Protection tools reach large accounts first and leave smaller ones exposed.',
    mirrorline: 'Repost Watch makes your originals eligible, and shows you how to act.',
    problems: ['P10'],
  },
]

/* -------------------------------------------------------------------------- */
/* 5. Any niche: our agents research yours                                     */
/* -------------------------------------------------------------------------- */

export interface ScanStep {
  readonly number: string
  readonly title: string
  readonly body: string
}

/** The Niche Scan, from 12 §1, in four steps. */
export const SCAN_STEPS: readonly ScanStep[] = [
  {
    number: '01',
    title: 'You tell us your niche',
    body: 'In your own words, plus up to three accounts you admire. No dropdown, and no category list to squeeze into.',
  },
  {
    number: '02',
    title: 'Trend Scout reads what is growing',
    body: 'Public, official sources only — the platforms’ own trend tools, ad libraries and APIs, plus a strategist reviewing up to thirty examples by hand.',
  },
  {
    number: '03',
    title: 'We rank by views per follower',
    body: 'Not by follower count. A four-thousand-follower account getting forty thousand views a video is a better model than a huge one coasting.',
  },
  {
    number: '04',
    title: 'You get format recipes',
    body: 'Five to ten, each with why it is growing and how we would make it yours. You pick which ones we remake.',
  },
]

export interface SampleRecipe {
  readonly formatName: string
  readonly whyItWorks: string
  readonly beats: readonly string[]
  readonly fitScore: number
  readonly viewsPerFollower: string
  readonly lengthLabel: string
}

/**
 * One recipe card, illustrating what comes out.
 *
 * **A format, deliberately not an industry.** "Myth vs fact" works for a tax
 * adviser, a climbing gym and a dentist alike, which is the point of an
 * industry-agnostic product: the recipe travels and only the subject changes.
 * Every figure here is invented, and the section carries the sample label —
 * non-negotiable 7.
 */
export const SAMPLE_RECIPE: SampleRecipe = {
  formatName: 'Myth vs fact',
  whyItWorks:
    'It names something the audience already half-believes, then corrects it in one line. The disagreement is what gets it sent to someone else.',
  beats: [
    'The myth, on screen',
    '“Here’s what’s actually true”',
    'One piece of proof',
    'What to do instead',
  ],
  fitScore: 91,
  viewsPerFollower: '7.4×',
  lengthLabel: '0:28',
}

/* -------------------------------------------------------------------------- */
/* 6. Two ways in                                                              */
/* -------------------------------------------------------------------------- */

export interface InputRoute {
  readonly id: 'you-send' | 'we-create'
  readonly title: string
  readonly body: string
  readonly detail: readonly string[]
  /** Which account types lean on this one, from 13 §1. */
  readonly bestFor: string
}

export const INPUT_ROUTES: readonly InputRoute[] = [
  {
    id: 'you-send',
    title: 'You send',
    body: 'A talk, a podcast, a webinar, a demo, or footage off your phone. The Multiplier turns one of them into many genuinely different cuts.',
    detail: [
      'A new hook, length or format in every cut',
      'Captions burned in, in your brand style',
      'Nothing published until it has passed the gate',
    ],
    bestFor: 'Anyone with recordings already sitting unused.',
  },
  {
    id: 'we-create',
    title: 'We create',
    body: 'We remake formats that are growing in your niche. The structure only — never anyone else’s footage, audio or wording.',
    detail: [
      'A new script, written from your facts and your voice',
      'AI scenes are labelled, every time',
      // Was "and your own last 60 posts". We hold none of your post history,
      // so that half of the comparison does not run yet (D126) — and this
      // string also grounds the co-pilot (`lib/copilot/grounding`), which
      // would have repeated the claim to anyone who asked.
      'Checked against the research it was built from, line by line',
    ],
    bestFor: 'New accounts, and anyone without a back catalogue yet.',
  },
]

/* -------------------------------------------------------------------------- */
/* Goal examples                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One line per goal, for wherever a section shows what the visitor's choice
 * changes. Keyed by goal rather than by industry: 15 §2's whole claim is that
 * the goal decides the metrics and the industry does not.
 */
export const GOAL_EXAMPLES: Readonly<Record<GoalKey, string>> = {
  leads: 'A post ends on a question, the replies become enquiries, and the ledger counts them.',
  bookings:
    'A post answers the thing people ask just before they book, and links straight to the calendar.',
  sales: 'A post shows the thing working, and the tracked link says what it sold.',
  audience: 'A series gives people a reason to follow rather than to watch once.',
  awareness: 'One idea, cut six ways, so more of the right people meet it once.',
  community: 'A post worth sending to one person — the signal platforms now read hardest.',
  launch: 'Three repeatable series, posted on schedule, until the account has a shape.',
}
