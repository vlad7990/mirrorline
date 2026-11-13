/**
 * Column 2 of S5: what the Remake Producer wrote for this brand.
 *
 * Every line here is new wording for the demo client, written against the
 * beats of a format. CLAUDE.md non-negotiable 2: "Remakes copy the format
 * only: new script, new footage, new voice." Nothing in this file quotes or
 * describes anyone else's video.
 *
 * The shot list is built from the plan plus the fixtures, so the client's own
 * footage is named once, in @mirrorline/mock.
 */

import { sourceVideo } from '@mirrorline/mock'

import { OWNER_FIRST_NAME } from '@/components/trends/trend-beats'

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export interface ScriptLine {
  /** "Hook", "Belief", "Reframe", "Example", "Call to action". */
  readonly beat: string
  readonly text: string
}

export type ShotSource = 'client-footage' | 'ai-scene' | 'graphic'

export const SHOT_SOURCE_LABELS: Record<ShotSource, string> = {
  'client-footage': 'Client footage',
  'ai-scene': 'AI scene',
  graphic: 'Graphic',
}

export interface RemakeShot {
  readonly description: string
  readonly source: ShotSource
}

export interface RemakePlan {
  /** The new script, one line per beat. */
  readonly script: readonly ScriptLine[]
  /** The one labelled AI shot in the cut. */
  readonly aiScene: string
  /** The quotable line that goes on screen in big type. */
  readonly keyLine: string
  /** Three hooks to A/B test. The first is the one in the preview. */
  readonly hooks: readonly [string, string, string]
}

/* -------------------------------------------------------------------------- */
/* Plans, one per trend                                                        */
/* -------------------------------------------------------------------------- */

const REMAKE_PLANS: Record<string, RemakePlan> = {
  'trend-01': {
    script: [
      { beat: 'Hook', text: 'Do you feel like you have to fix everything for your team?' },
      {
        beat: 'Belief',
        text: 'Most new managers think being needed means being good at the job.',
      },
      { beat: 'Reframe', text: "Three words: coach, don't carry." },
      {
        beat: 'Example',
        text: 'Next time someone brings you a problem, ask "What have you tried?" before you answer.',
      },
      { beat: 'Call to action', text: 'Want more? Book a free call. The link is in my bio.' },
    ],
    aiScene: 'Overhead desk, notifications piling up',
    keyLine: "Coach, don't carry.",
    hooks: [
      'Do you feel like you have to fix everything for your team?',
      "Your team doesn't need a hero. Three words instead:",
      "The 3 words I wish I'd heard as a new manager",
    ],
  },

  'trend-02': {
    script: [
      {
        beat: 'Claim',
        text: 'I stopped doing three things in my first year of managing, and the work got better.',
      },
      {
        beat: 'Quick cuts',
        text: "One: answering every message within the hour. Two: joining every call. Three: rewriting my team's work.",
      },
      {
        beat: 'Payoff',
        text: 'I got two hours back a day, and my team started deciding without me.',
      },
      { beat: 'Call to action', text: 'Pick one to stop this week. The list is in my bio.' },
    ],
    aiScene: 'Calendar blocks clearing, one by one',
    keyLine: 'Three things I stopped doing.',
    hooks: [
      'Three things I stopped doing in my first year of managing',
      'The habits that were quietly costing me two hours a day',
      'I stopped doing these three things, and my team stopped waiting on me',
    ],
  },

  'trend-03': {
    script: [
      { beat: 'Myth', text: '"Good managers are always available."' },
      {
        beat: "What's true",
        text: 'Always available means always interrupted, and that is where burnout starts.',
      },
      {
        beat: 'Proof',
        text: 'The managers I coach who set office hours got through more work, not less.',
      },
      { beat: 'Call to action', text: 'Try two office-hour blocks this week. Link in my bio.' },
    ],
    aiScene: 'Plain backdrop with the myth set in large type',
    keyLine: 'Always available is not a strategy.',
    hooks: [
      '"Good managers are always available." Let\'s look at that.',
      "The most repeated advice for new managers is the one I'd drop",
      "Always available sounds like care. Here's what it costs.",
    ],
  },

  'trend-04': {
    script: [
      { beat: 'POV', text: "POV: it's your first day managing the team you were on last week." },
      {
        beat: 'Scenes',
        text: "You move your chair. You open a 1:1 you've never run. You read one message twice before sending it.",
      },
      {
        beat: 'Twist',
        text: 'Nobody expects you to have the answers. They are watching how you ask.',
      },
      {
        beat: 'Lesson',
        text: 'Start every 1:1 with one question: what would make this week easier?',
      },
    ],
    aiScene: 'Empty meeting room, chairs and a window, no people',
    keyLine: "They're watching how you ask.",
    hooks: [
      "POV: it's your first day managing the team you were on last week",
      'Your first day as a manager rarely looks like the job description',
      'What nobody tells you about week one as a manager',
    ],
  },

  'trend-05': {
    script: [
      { beat: 'Time-lapse', text: 'A Tuesday, from the first 1:1 to the last note of the day.' },
      {
        beat: 'Captions',
        text: "Three 1:1s before lunch. One decision I didn't make for them. Twenty minutes to write it all down.",
      },
      {
        beat: 'Reflection',
        text: 'The quiet part of this job is the part that keeps the rest from turning into burnout.',
      },
    ],
    aiScene: 'Time-lapse of a desk through a working day, no faces',
    keyLine: 'The quiet part is the job.',
    hooks: [
      'A Tuesday, from the first 1:1 to the last note',
      'What a coaching day actually looks like, sped up',
      "Three 1:1s before lunch. Here's the rest.",
    ],
  },

  'trend-06': {
    script: [
      { beat: 'Question', text: 'What would make this week easier?' },
      {
        beat: 'Why it works',
        text: 'It asks for one thing, this week, that the two of you can act on.',
      },
      {
        beat: 'How to ask it',
        text: 'Ask it first, then stay quiet for five seconds. The answer comes in the silence.',
      },
      { beat: 'Call to action', text: 'Use it in your next 1:1 and tell me what you heard.' },
    ],
    aiScene: 'Two cups on a table, soft daylight',
    keyLine: 'What would make this week easier?',
    hooks: [
      'One question that changes a 1:1',
      'The question I ask first in every 1:1',
      'Ask this, then stay quiet for five seconds',
    ],
  },

  'trend-07': {
    script: [
      { beat: 'Question', text: '"How do I give feedback to someone who used to be my peer?"' },
      {
        beat: 'Answer',
        text: 'Name the change out loud, then keep the feedback about the work, not the friendship.',
      },
      {
        beat: 'Example',
        text: 'One manager I coach opens with: "I\'m going to say this as your manager, and we\'re still fine."',
      },
      {
        beat: 'Call to action',
        text: "If you're in that week right now, the link in my bio books a call.",
      },
    ],
    aiScene: 'Two desks side by side, one chair turned away',
    keyLine: 'Say it as the manager. Stay the friend.',
    hooks: [
      '"How do I give feedback to someone who used to be my peer?"',
      'The hardest conversation of a first promotion',
      "You got promoted. They didn't. Here's how to start.",
    ],
  },

  'trend-08': {
    script: [
      { beat: 'Before', text: '"I don\'t have time to coach my team."' },
      { beat: 'Reframe', text: "Coaching isn't extra time. It's the same time, spent once." },
      { beat: 'After', text: '"I coach so I only solve it once."' },
      { beat: 'Invite', text: 'Which line sounds like your week? Tell me below.' },
    ],
    aiScene: 'Split screen, two blocks of colour, no footage',
    keyLine: 'Same time, spent once.',
    hooks: [
      '"I don\'t have time to coach my team." Let\'s rewrite that.',
      'Same sentence, two weeks apart',
      'The reframe that gave a manager back her Thursday',
    ],
  },
}

/** The plan for a trend, or undefined when there is no copy for it. */
export function remakePlanFor(trendId: string): RemakePlan | undefined {
  return REMAKE_PLANS[trendId]
}

/* -------------------------------------------------------------------------- */
/* Shot list                                                                   */
/* -------------------------------------------------------------------------- */

/** "Episode 47", from the client's own upload. */
const EPISODE_LABEL = sourceVideo.title.split(':')[0] ?? sourceVideo.title

/**
 * Client footage, one labelled AI scene and two graphics. 04_AGENTS_SPEC.md,
 * Remake Producer: "New script and footage only; AI scenes labelled."
 */
export function buildShotList(plan: RemakePlan): readonly RemakeShot[] {
  return [
    {
      description: `${OWNER_FIRST_NAME} to camera, office, medium close-up (her footage, ${EPISODE_LABEL})`,
      source: 'client-footage',
    },
    { description: plan.aiScene, source: 'ai-scene' },
    { description: `“${plan.keyLine}” in large type over teal`, source: 'graphic' },
    {
      description: `${OWNER_FIRST_NAME} in a 1:1, asking a question (her footage, ${EPISODE_LABEL})`,
      source: 'client-footage',
    },
    { description: 'End card with the booking link', source: 'graphic' },
  ]
}

/* -------------------------------------------------------------------------- */
/* Compliance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The five checks the Compliance agent runs before a remake can be scheduled
 * (CLAUDE.md non-negotiable 6).
 *
 * The wording is fixed. docs/design/STITCH_REVIEW.md item 4: say "limit 30%",
 * never "safe < 30%" — 30% is our internal rule, not a legal safe line.
 */
export const COMPLIANCE_CHECKS: readonly { label: string; ok: boolean }[] = [
  { label: 'No original footage used', ok: true },
  { label: 'No original audio used', ok: true },
  { label: 'New wording · 12% similar (limit 30%)', ok: true },
  { label: 'AI scene labelled on screen and on the platform', ok: true },
  { label: "No real person's likeness besides Maya (consent on file)", ok: true },
]

/* -------------------------------------------------------------------------- */
/* Originality Gate (04_AGENTS_SPEC, 16 §5)                                    */
/* -------------------------------------------------------------------------- */

/**
 * What the gate did, not just whether it passed.
 *
 * `outcome` has a `rewritten` case and that case is the point. The gate
 * **blocks and rewrites** — it does not warn and let the script through. A
 * gate that can be waved past is a formality, and a formality is exactly what
 * the predecessor project had.
 */
export type OriginalityOutcome = 'passed' | 'rewritten' | 'blocked'

export interface OriginalityResult {
  /** How close the draft came to the source format's wording, as a percent. */
  readonly similarity: number
  /** The ceiling. Above it the draft does not go forward as written. */
  readonly limit: number
  /** What it was compared against, named plainly. */
  readonly comparedAgainst: string
  readonly outcome: OriginalityOutcome
  /** What the gate did on the way here. Null when it passed first time. */
  readonly rewriteNote: string | null
}

export const ORIGINALITY_RESULT: OriginalityResult = {
  similarity: 12,
  limit: 30,
  comparedAgainst: 'the beat structure of the source format, and your own last 90 posts',
  outcome: 'rewritten',
  rewriteNote:
    'The first draft came back at 34%: two lines reused the source’s phrasing almost word for word. The gate sent it back and the Remake Producer rewrote both. This is the second draft.',
}

/* -------------------------------------------------------------------------- */
/* The cited business fact (16 §5)                                             */
/* -------------------------------------------------------------------------- */

/**
 * The one claim in the script that is about the client's business, with its
 * source attached.
 *
 * Every script makes claims. Most are general enough to read as opinion; one
 * usually is not, and that one is the sentence that could put a client in
 * front of a regulator. Non-negotiable 7 forbids claims we cannot stand
 * behind, which means the claim and the thing backing it travel together or
 * the claim does not ship.
 */
export interface BusinessFact {
  /** The line in the script that makes a claim. */
  readonly claim: string
  /** Where it came from, in the client's own material. */
  readonly source: string
  readonly suppliedBy: string
  /** Human date, as the client's upload recorded it. */
  readonly suppliedOn: string
}

export const BUSINESS_FACT: BusinessFact = {
  claim: 'Most first-time managers get no training in their first year.',
  source: 'Episode 47, 14:20 — your own line, in your own words, on your own show.',
  suppliedBy: 'Maya Torres',
  suppliedOn: '2 Nov',
}
