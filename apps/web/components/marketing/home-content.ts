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

/** A 9:16 still with the hook that is burned onto it. */
export interface LoopReel {
  readonly src: string
  /** The hook's opening, in plain weight. */
  readonly lead: string
  /** The phrase that takes the sand highlight. */
  readonly highlight: string
  readonly lengthLabel: string
}

/**
 * What each tab shows beside its copy, and why the four differ.
 *
 * All four used to render the same six `cuts` from `@mirrorline/mock`: the
 * same hooks, in the same order, on four tabs whose whole purpose is to say
 * that these are four different jobs. It made the section an illustration of
 * nothing — and the hooks themselves ("The meeting that cost me my best
 * engineer") were management-coaching copy, which is the audience-naming D38
 * retired everywhere else on the page.
 *
 * So each tab now gets the shape of its own job. Multiply is one recording
 * and the cuts taken out of it; Remake is one format rebuilt by three
 * unrelated trades; Publish is posts landing on the three platforms; Learn is
 * the same posts ranked by what they earned. Someone who only looks at the
 * pictures should still be able to tell the four apart.
 */
export type FeatureStage =
  | {
      /** One long recording, and three of the cuts taken out of it. */
      readonly kind: 'multiply'
      readonly sourceSrc: string
      /** What the recording was: "A dog-training class, filmed on a phone". */
      readonly sourceLabel: string
      readonly sourceLength: string
      /** How many cuts came out of it in total, of which we show three. */
      readonly cutTotal: number
      /** Where in the recording each cut came from: "06:12". */
      readonly cuts: readonly (LoopReel & { readonly fromTimecode: string })[]
    }
  | {
      /** One rising format, rebuilt by three unrelated accounts. */
      readonly kind: 'remake'
      readonly formatName: string
      readonly formatNote: string
      /**
       * `madeFor` names a kind of work, and it is the one place on this page
       * that does. It is not a vertical we sell to — it is the evidence for
       * the sentence beside it, that the same structure carries anywhere. 16
       * §1 forbids industry pages and industry navigation; it does not forbid
       * showing range.
       */
      readonly takes: readonly (LoopReel & { readonly madeFor: string })[]
    }
  | {
      /** The same week of posts, landing on the three platforms. */
      readonly kind: 'publish'
      readonly posts: readonly (LoopReel & {
        readonly platform: string
        readonly slot: string
      })[]
    }
  | {
      /** Last week's posts, ranked by the one number that moves the plan. */
      readonly kind: 'learn'
      readonly metricLabel: string
      readonly rows: readonly (LoopReel & { readonly sendsPerThousand: number })[]
    }

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
  readonly stage: FeatureStage
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
    stat: 'A 48:12 class · 12 cuts · 3 min',
    stage: {
      kind: 'multiply',
      sourceSrc: '/loop/talk-wide.webp',
      // Deliberately not a podcast. The /reels/ set is twelve near-identical
      // frames of one person at one microphone, and leaning on it again here
      // would say the input has to be a studio recording. It does not: this
      // is a phone on a tripod at the back of a hall.
      sourceLabel: 'A dog-training class, filmed on a phone at the back of the hall',
      sourceLength: '48:12',
      cutTotal: 12,
      cuts: [
        {
          src: '/loop/talk-cut-01.webp',
          lead: 'The recall mistake',
          highlight: 'almost everyone makes',
          lengthLabel: '0:31',
          fromTimecode: '06:12',
        },
        {
          src: '/loop/talk-cut-02.webp',
          lead: 'Loose lead,',
          highlight: 'in three steps',
          lengthLabel: '0:44',
          fromTimecode: '21:40',
        },
        {
          src: '/loop/talk-cut-03.webp',
          lead: 'Why your dog ignores you',
          highlight: 'in the park',
          lengthLabel: '0:28',
          fromTimecode: '39:05',
        },
      ],
    },
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
    stage: {
      kind: 'remake',
      formatName: '“3 things I’d never do”',
      formatNote: 'One rising structure, rebuilt three times. No shared footage, no shared script.',
      takes: [
        {
          src: '/samples/sample-01.webp',
          madeFor: 'A bakery',
          lead: '3 things I’d never do',
          highlight: 'to a sourdough starter',
          lengthLabel: '0:27',
        },
        {
          src: '/samples/sample-11.webp',
          madeFor: 'A bike shop',
          lead: '3 things I’d never do',
          highlight: 'to a carbon frame',
          lengthLabel: '0:33',
        },
        {
          src: '/samples/sample-06.webp',
          madeFor: 'A flower studio',
          lead: '3 things I’d never put',
          highlight: 'in a bridal bouquet',
          lengthLabel: '0:29',
        },
      ],
    },
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
    stage: {
      kind: 'publish',
      // Platform names only. A logo would be someone else's mark on our page
      // implying a partnership we do not have, and non-negotiable 3 is the
      // reason the names are here at all: these are the three we post to
      // through official APIs.
      posts: [
        {
          src: '/samples/sample-09.webp',
          platform: 'Instagram',
          slot: 'Tue 08:10',
          lead: 'The one step',
          highlight: 'people skip at home',
          lengthLabel: '0:22',
        },
        {
          src: '/samples/sample-10.webp',
          platform: 'TikTok',
          slot: 'Tue 12:30',
          lead: 'Sand to 180,',
          highlight: 'then stop',
          lengthLabel: '0:19',
        },
        {
          src: '/samples/sample-12.webp',
          platform: 'YouTube Shorts',
          slot: 'Tue 17:45',
          lead: 'What to buy',
          highlight: 'in the wrong season',
          lengthLabel: '0:35',
        },
      ],
    },
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
    stage: {
      kind: 'learn',
      // Sends per 1,000 reach rather than views: a view is what the platform
      // showed, a send is what a person chose to pass on. It is the signal
      // that survives a feed change, and it is the one the next week's plan
      // is actually built from.
      metricLabel: 'Sends per 1,000 reach',
      rows: [
        {
          src: '/samples/sample-03.webp',
          lead: 'The stretch',
          highlight: 'that is doing nothing',
          lengthLabel: '0:26',
          sendsPerThousand: 18.4,
        },
        {
          src: '/samples/sample-08.webp',
          lead: 'Ask this',
          highlight: 'before you buy the tool',
          lengthLabel: '0:21',
          sendsPerThousand: 12.1,
        },
        {
          src: '/samples/sample-05.webp',
          lead: 'What goes in',
          highlight: 'before the lid',
          lengthLabel: '0:18',
          sendsPerThousand: 7.9,
        },
        {
          src: '/samples/sample-02.webp',
          lead: 'The noise',
          highlight: 'worth stopping for',
          lengthLabel: '0:24',
          sendsPerThousand: 4.2,
        },
      ],
    },
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
  /**
   * The generated 9:16 still this hook is burned onto, under `public/samples/`.
   *
   * Required, not optional: a hook with no frame would render as a flat colour
   * beside eleven photographs, which reads as a broken image rather than as a
   * deliberate choice. A test pins every one of these to a file on disk and to
   * no other card, so a rename cannot leave a hole in the rail and two cards
   * cannot quietly share a frame.
   *
   * Every file is AI-generated, so every surface that renders one carries the
   * label — non-negotiable 4.
   */
  readonly frameSrc: string
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
 *
 * **Twelve frames, twelve unlike accounts** (D45). The set used to be eight
 * hooks on four rotating brand colours, which made the heading — "Different
 * trades, the same week of work" — a sentence the section did not illustrate:
 * a coloured rectangle has no trade. Each card now carries a generated 9:16
 * still of a different fictional account, and the twelve deliberately span
 * faces, hands and places, and a range of ages, genders and ethnicities. None
 * is a likeness of a real person and none is a health claim or a before-and-
 * after. The *frames* vary by trade; the *labels* stay goals, which is the
 * distinction 16 §1 turns on — we show that the work fits anyone without
 * sorting anyone into a vertical.
 *
 * Two hooks changed with them. "You're not tired / You're over-responsible"
 * and "Burnout isn't / a workload problem" both read as coaching copy, which
 * is the audience-naming D38 retired everywhere else on the page; over a
 * baker and a hardware-shop owner they would have read as a mismatch rather
 * than as range.
 */
export const SHOWCASE_CARDS: readonly ShowcaseCard[] = [
  {
    // Short on purpose. This hook and the "Launching an account" one below
    // are the two the account-type cards reuse, and those frames are 124px
    // wide — a caption that runs to four lines there covers the photograph it
    // is burned onto.
    context: 'Leads',
    lead: 'What they ask',
    highlight: 'before they buy',
    lengthLabel: '0:24',
    frameSrc: '/samples/sample-01.webp',
  },
  {
    context: 'Bookings',
    lead: '3 signs the thing you booked',
    highlight: 'isn’t the thing you needed',
    lengthLabel: '0:31',
    frameSrc: '/samples/sample-02.webp',
  },
  {
    context: 'Sales',
    lead: 'The pricing mistake',
    highlight: 'that costs you customers',
    lengthLabel: '0:42',
    frameSrc: '/samples/sample-05.webp',
  },
  {
    context: 'Community',
    lead: 'Do this before',
    highlight: 'you start, every time',
    lengthLabel: '0:19',
    frameSrc: '/samples/sample-03.webp',
  },
  {
    context: 'Audience growth',
    lead: 'Why your best people',
    highlight: 'go quiet',
    lengthLabel: '0:36',
    frameSrc: '/samples/sample-07.webp',
  },
  {
    context: 'Awareness',
    lead: 'What to ask',
    highlight: 'before you commit',
    lengthLabel: '0:28',
    frameSrc: '/samples/sample-04.webp',
  },
  {
    context: 'Launching an account',
    lead: 'Day one,',
    highlight: 'no audience yet',
    lengthLabel: '0:22',
    frameSrc: '/samples/sample-08.webp',
  },
  {
    context: 'Returning customers',
    lead: 'Ask for this',
    highlight: 'on your next visit',
    lengthLabel: '0:21',
    frameSrc: '/samples/sample-09.webp',
  },
  {
    context: 'Walk-ins',
    lead: 'Two minutes,',
    highlight: 'one thing you can copy',
    lengthLabel: '0:26',
    frameSrc: '/samples/sample-06.webp',
  },
  {
    context: 'Repeat work',
    lead: 'The five-minute check',
    highlight: 'most people skip',
    lengthLabel: '0:33',
    frameSrc: '/samples/sample-11.webp',
  },
  {
    context: 'Enquiries',
    lead: 'What it costs,',
    highlight: 'and why',
    lengthLabel: '0:29',
    frameSrc: '/samples/sample-10.webp',
  },
  {
    context: 'Waitlist sign-ups',
    lead: 'Start it now,',
    highlight: 'not in spring',
    lengthLabel: '0:18',
    frameSrc: '/samples/sample-12.webp',
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
