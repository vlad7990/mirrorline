/**
 * The Home page's copy, transcribed from docs/design/handoff-v4 §Home.
 *
 * One module so the sections below the hero stay single-sourced and a
 * component file is markup rather than markup plus a wall of strings. The
 * same reason `pricing-tiers.ts` and `agents.ts` exist.
 *
 * Everything here describes a **fictional demo client** — Maya Torres
 * Coaching, from docs/specs/08_MOCK_DATA.md. CLAUDE.md non-negotiable 7
 * requires that to be visible on the page, not merely true in the source, so
 * every section rendering this carries a label saying so.
 */

/* -------------------------------------------------------------------------- */
/* Feature tabs                                                                */
/* -------------------------------------------------------------------------- */

export interface FeatureTab {
  readonly id: string
  /** "01"–"04". The handoff numbers them. */
  readonly number: string
  readonly title: string
  readonly description: string
  /** The stage panel's headline, with the accent phrase split out. */
  readonly headline: string
  readonly headlineAccent: string
  readonly body: string
  /** One figure, in the machine's voice, under the body. */
  readonly stat: string
}

export const FEATURE_TABS: readonly FeatureTab[] = [
  {
    id: 'multiply',
    number: '01',
    title: 'Multiply',
    description: 'One long video becomes 8–15 short cuts.',
    headline: 'One recording,',
    headlineAccent: 'a week of posts.',
    body: 'The Multiplier finds the moments that stand on their own, cuts them to 9:16, writes the hook and burns in captions in your brand style.',
    stat: 'A 52:14 episode · 12 cuts · 3 min',
  },
  {
    id: 'remake',
    number: '02',
    title: 'Remake',
    description: 'Rising formats, rebuilt as your originals.',
    headline: 'The format,',
    headlineAccent: 'never the footage.',
    body: 'Trend Scout finds what is rising in your niche. The Remake Producer rebuilds its structure as a new script, shot with your material and your voice.',
    stat: '2 remakes a week · within 48 hours',
  },
  {
    id: 'publish',
    number: '03',
    title: 'Publish',
    description: 'Several posts a day, to accounts you own.',
    headline: 'To your accounts,',
    headlineAccent: 'through the front door.',
    body: 'Several posts a day on Instagram, TikTok and YouTube Shorts, through the official APIs, to accounts you connect and can disconnect without asking us. Approve each post, or let them go after 24 hours.',
    stat: 'Growth plan · 21 posts a week',
  },
  {
    id: 'learn',
    number: '04',
    title: 'Learn',
    description: 'Every result shapes next week.',
    headline: 'What worked',
    headlineAccent: 'decides what is next.',
    body: 'The Performance Analyst reads what happened — views, profile visits, link clicks — and the loop makes more of what worked, on the platform it worked on.',
    stat: 'Reported weekly, through to booked calls',
  },
]

/* -------------------------------------------------------------------------- */
/* Showcase marquee                                                            */
/* -------------------------------------------------------------------------- */

export interface ShowcaseCard {
  readonly niche: string
  /** The hook's opening, in plain weight. */
  readonly lead: string
  /** The phrase that takes the sand highlight. */
  readonly highlight: string
  readonly lengthLabel: string
}

/**
 * Sample hooks for fictional businesses, straight from the handoff.
 *
 * Not customer work and not customer results — the section rendering them
 * says so. They show the *shape* of what comes out, which is the only claim
 * available to us before there is a first client.
 */
export const SHOWCASE_CARDS: readonly ShowcaseCard[] = [
  {
    niche: 'Coach',
    lead: 'You’re not tired.',
    highlight: 'You’re over-responsible.',
    lengthLabel: '0:24',
  },
  {
    niche: 'Clinic',
    lead: '3 signs your back pain',
    highlight: 'isn’t about posture',
    lengthLabel: '0:31',
  },
  {
    niche: 'Consultant',
    lead: 'The pricing mistake',
    highlight: 'that costs you clients',
    lengthLabel: '0:42',
  },
  {
    niche: 'Fitness studio',
    lead: 'Do this before',
    highlight: 'every workout',
    lengthLabel: '0:19',
  },
  { niche: 'Podcast', lead: 'Why your best people', highlight: 'go quiet', lengthLabel: '0:36' },
  { niche: 'Real estate', lead: 'What to ask', highlight: 'before you list', lengthLabel: '0:28' },
  {
    niche: 'Therapist',
    lead: 'Burnout isn’t',
    highlight: 'a workload problem',
    lengthLabel: '0:22',
  },
  { niche: 'Salon', lead: 'Ask for this', highlight: 'at your next cut', lengthLabel: '0:21' },
]

/* -------------------------------------------------------------------------- */
/* Who it is for                                                               */
/* -------------------------------------------------------------------------- */

export interface Audience {
  readonly number: string
  readonly title: string
  readonly body: string
  /** What they are actually buying. Phrased as a goal, never as a promise. */
  readonly goal: string
}

export const AUDIENCES: readonly Audience[] = [
  {
    number: '01',
    title: 'Coaches and consultants',
    body: 'Turn webinars, podcasts and client Q&As into a steady stream of authority.',
    goal: 'discovery calls',
  },
  {
    number: '02',
    title: 'Clinics and wellness',
    body: 'Answer the questions patients ask every day, once, on camera.',
    goal: 'booked appointments',
  },
  {
    number: '03',
    title: 'Studios and gyms',
    body: 'Show the class, the coach and the result, every single day.',
    goal: 'intro offers sold',
  },
  {
    number: '04',
    title: 'Local services',
    body: 'Stay the name people remember when they need you.',
    goal: 'local bookings',
  },
]

/* -------------------------------------------------------------------------- */
/* Proof                                                                       */
/* -------------------------------------------------------------------------- */

export interface ProofCard {
  /** Counted up to on reveal. */
  readonly value: number
  /** Decimal places, because 2.1 must not render as 2. */
  readonly decimals: number
  readonly suffix: string
  readonly label: string
  readonly story: string
  /** Which agents did it. The method is the proof, not the number. */
  readonly agents: string
}

/**
 * One demo week, in numbers.
 *
 * **These are a fictional client's figures**, and the section renders that
 * sentence beside them. They are not an average, not a case study and not a
 * customer result — non-negotiable 7 forbids all three, and there are no
 * customers to draw real ones from in any case.
 *
 * Every card names the agents responsible, which is the part that is
 * genuinely ours to claim: the method is real even where the numbers are
 * illustrative.
 */
export const PROOF_CARDS: readonly ProofCard[] = [
  {
    value: 6,
    decimals: 0,
    suffix: '',
    label: 'discovery calls booked',
    story: 'in one week, from 21 posts cut out of a single podcast episode.',
    agents: 'Publisher · Performance Analyst',
  },
  {
    value: 2.1,
    decimals: 1,
    suffix: '×',
    label: 'views on question hooks',
    story: 'so next week the loop makes more of them, and tries them on TikTok first.',
    agents: 'Performance Analyst',
  },
  {
    value: 3,
    decimals: 0,
    suffix: ' min',
    label: 'to cut twelve posts',
    story: 'from a 52-minute episode, captioned in brand style and compliance-checked.',
    agents: 'Multiplier · Compliance',
  },
]
