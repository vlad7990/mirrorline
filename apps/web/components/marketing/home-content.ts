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
  /**
   * What the post is *for*, as a goal from 15 §2 — not what trade made it.
   *
   * This field held an industry ("Coach", "Clinic", "Real estate") until v4.
   * Labelling a sample by its industry quietly turns the site into a list of
   * the industries we serve, which is the thing 16 §1 and 10 §1 forbid. A
   * goal label says the same useful thing — here is the shape of a post aimed
   * at bookings — without implying we are built for anyone in particular.
   */
  readonly context: string
  /** The hook's opening, in plain weight. */
  readonly lead: string
  /** The phrase that takes the sand highlight. */
  readonly highlight: string
  readonly lengthLabel: string
}

/**
 * Sample hooks from fictional accounts.
 *
 * Not customer work and not customer results — the section rendering them
 * says so. They show the *shape* of what comes out, which is the only claim
 * available to us before there is a first client.
 *
 * The hooks deliberately span different kinds of work without naming any
 * trade, per 13's "examples rotate through different kinds of business and
 * individual" and the rule that none is featured above another.
 */
export const SHOWCASE_CARDS: readonly ShowcaseCard[] = [
  {
    context: 'Leads',
    lead: 'You’re not tired.',
    highlight: 'You’re over-responsible.',
    lengthLabel: '0:24',
  },
  {
    context: 'Bookings',
    lead: '3 signs the thing you booked',
    highlight: 'isn’t the thing you needed',
    lengthLabel: '0:31',
  },
  {
    context: 'Sales',
    lead: 'The pricing mistake',
    highlight: 'that costs you customers',
    lengthLabel: '0:42',
  },
  {
    context: 'Community',
    lead: 'Do this before',
    highlight: 'you start, every time',
    lengthLabel: '0:19',
  },
  {
    context: 'Audience growth',
    lead: 'Why your best people',
    highlight: 'go quiet',
    lengthLabel: '0:36',
  },
  {
    context: 'Awareness',
    lead: 'What to ask',
    highlight: 'before you commit',
    lengthLabel: '0:28',
  },
  {
    context: 'Launching an account',
    lead: 'Burnout isn’t',
    highlight: 'a workload problem',
    lengthLabel: '0:22',
  },
  {
    context: 'Returning customers',
    lead: 'Ask for this',
    highlight: 'on your next visit',
    lengthLabel: '0:21',
  },
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
  /** The plan 13 §1 pre-selects for this account type. */
  readonly plan: string
  /** Posts a week, from 13 §1. In the machine's voice where it renders. */
  readonly cadence: string
  /**
   * The `SHOWCASE_CARDS` context whose sample hook this card is shown with.
   *
   * A name rather than an index, so reordering either list cannot silently
   * pair one card with another's hook. A test pins every one of these to a
   * card that exists.
   *
   * These are hooks from **fictional accounts**, which is why the section
   * rendering them carries the sample-data label — non-negotiable 7.
   */
  readonly sampleContext: string
}

/**
 * The four account types from 13 §1 — the **only** segmentation we use.
 *
 * These were four industries until v4 ("Coaches and consultants", "Clinics and
 * wellness", "Studios and gyms", "Local services"). That card set was the
 * clearest contradiction of 16 §1 anywhere on the site: a visitor who was none
 * of those four read it as "not for me", and a visitor who was one of them
 * read it as a vertical product. Account type and account stage are what
 * actually change what we do — the plan, the input mix and the cadence all
 * follow from them, and none of them follows from a trade.
 */
export const AUDIENCES: readonly Audience[] = [
  {
    number: '01',
    title: 'A business, growing an account it has',
    body: 'There is a page, it posts rarely, and there are recordings nobody has cut up. That back catalogue is already a month of posts.',
    goal: 'leads and booked work',
    plan: 'Pilot, then Growth or Scale',
    cadence: '7–21 posts a week',
    sampleContext: 'Leads',
  },
  {
    number: '02',
    title: 'A business, starting a new account',
    body: 'Nothing on one platform or on any of them. We start it properly, with originals, rather than with three posts and silence.',
    goal: 'a presence that compounds',
    plan: 'Pilot, then Growth',
    cadence: '7–14 posts a week',
    sampleContext: 'Awareness',
  },
  {
    number: '03',
    title: 'An individual with an audience',
    body: 'A creator, expert or personal brand already making long-form and posting a fraction of it. The raw material exists; the cutting does not.',
    goal: 'reach that turns into work',
    plan: 'Creator',
    cadence: '14–28 posts a week',
    sampleContext: 'Audience growth',
  },
  {
    number: '04',
    title: 'An individual starting from zero',
    body: 'No audience yet, and no library to draw on. Three repeatable series beat sporadic effort, so that is where we start.',
    goal: 'the first thousand followers',
    plan: 'Studio, on the waitlist',
    cadence: '7–14 posts a week',
    sampleContext: 'Launching an account',
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
