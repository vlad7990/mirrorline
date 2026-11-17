/**
 * The seven agents, written for the public site.
 *
 * Every line is a plain-language transcription of docs/specs/04_AGENTS_SPEC.md:
 * `does` from the "Job" column, `limit` from the "Limits" column, `inLoop`
 * from the spec's opening line ("Seven agents work as one loop"). Nothing here
 * describes a capability the spec does not list.
 *
 * Shared by the landing-page loop strip and /how-it-works, so the two pages
 * cannot drift apart.
 */

export interface PublicAgent {
  readonly id: string
  /** 1-based position in the loop. */
  readonly step: number
  readonly name: string
  /** One short line for the loop diagram. */
  readonly short: string
  /** What it does, in full. */
  readonly does: string
  /** What it will not do — the spec's "Limits" column. */
  readonly limit: string
  /** Where it sits in the loop: who hands to it, who it hands to. */
  readonly inLoop: string
  /**
   * The metric this agent owns, from `docs/specs/15_METRICS_AND_KPIS.md` §6.
   *
   * Required rather than optional, and that is most of the point of making it
   * a field: an optional one would let an eighth agent ship with no metric
   * and no error, which is how a list quietly becomes six of seven.
   *
   * 15 §6 gives six rows for seven agents — the Remake Producer and the
   * Multiplier share one ("tag every video with format, hook type, length and
   * CTA"). They are written out separately here because the loop shows them
   * as separate steps, and a reader meeting one card at a time cannot see a
   * shared row. Neither line claims anything the shared row does not.
   */
  readonly metric: string
}

export const PUBLIC_AGENTS: readonly PublicAgent[] = [
  {
    id: 'trend-scout',
    step: 1,
    name: 'Trend Scout',
    short:
      'Finds formats rising in your niche and nearby ones, and writes each one down as a recipe.',
    does: 'Watches your niche and the niches next to it for formats that are growing, then turns each one into a recipe: the format name, its beats, its pacing, why it works, and how well it fits your brand. It reads your own analytics and the Performance Analyst rankings, so the list is about your audience, not a generic trending page.',
    limit:
      'It never downloads or stores another creator’s video. It keeps a description of the format and nothing else.',
    inLoop:
      'Starts the week. Hands its recipes to the Remake Producer, and takes its ranking of what worked from the Performance Analyst.',
    metric:
      'the Niche Scan benchmarks — views per follower, typical hold, length — that seed your targets.',
  },
  {
    id: 'remake-producer',
    step: 2,
    name: 'Remake Producer',
    short: 'Rebuilds a rising format as your own video: new script, your footage.',
    does: 'Takes a format recipe and your brand kit and makes your own version of it: a script, a shot list, a rendered 9:16 video and three alternative hooks. Generated scenes are rendered as labelled B-roll, never as a stand-in for you.',
    limit:
      'New script and new footage only. Any AI scene is labelled, in the studio and on the platform.',
    inLoop:
      'Sits between the Trend Scout and Compliance. Its drafts go to the gate like everything else.',
    metric:
      'the format, hook type, length and CTA tagged onto every video it makes, so results can be compared.',
  },
  {
    id: 'multiplier',
    step: 3,
    name: 'Multiplier',
    short: 'Turns one long video into 8 to 15 genuinely different cuts.',
    does: 'Reads the transcript of a podcast, webinar or talk, finds the moments worth posting, and builds each one into a short vertical video with its own hook, captions in your style, a format tag and a strength score.',
    limit:
      'Every cut has to differ in moment, hook, length or format. It will not ship the same clip twice with a new title.',
    inLoop: 'Runs the moment you upload. Its cuts go straight to Compliance.',
    metric:
      'the same tags on every cut, so a cut and a remake can be judged against each other.',
  },
  {
    id: 'compliance',
    step: 4,
    name: 'Compliance',
    short: 'Checks every video before it can be scheduled, and says why.',
    does: 'Compares each rendered video against its source script and frames, checks the rights and consent records, checks the licence list, and checks that AI scenes carry their label. It returns passed, needs review, or blocked, with the reason in plain words.',
    limit:
      'It blocks copied footage, copied audio, copied wording, a copied likeness, a near-duplicate of your own recent posts, and any guarantee written into a caption. It is our own check, not a legal clearance, and you can override it. The override is logged.',
    inLoop: 'The gate in the middle. Nothing reaches the calendar without passing through it.',
    metric:
      'the quality and safety tier: what passed, what was held, and why.',
  },
  {
    id: 'client-concierge',
    step: 5,
    name: 'Client Concierge',
    short: 'Brings you the approvals, answers your questions, writes the weekly report.',
    does: 'Queues the videos that need your eye, explains why each one is there, answers questions in the app or by email, and puts the week together into one report.',
    limit: 'It never posts without your approval, unless you turn auto-approve on yourself.',
    inLoop: 'Between the gate and the Publisher. This is where you sit in the loop.',
    metric:
      'the weekly ledger and insights, and the outcomes only you can tell us.',
  },
  {
    id: 'publisher',
    step: 6,
    name: 'Publisher',
    short: 'Posts to the accounts you connected, through the official APIs.',
    does: 'Puts approved posts out several times a day at the times that have worked for your audience, through the Instagram, TikTok and YouTube APIs, and records the platform ID of each post.',
    limit:
      'Accounts you own and connected, only. It starts at one to three posts a day per platform, far below what the platforms allow. TikTok posts and YouTube uploads both stay private until those platforms have approved our app.',
    inLoop:
      'The end of the outward journey. Its published posts become the Performance Analyst’s input.',
    metric:
      'the production tier, and the posting times.',
  },
  {
    id: 'performance-analyst',
    step: 7,
    name: 'Performance Analyst',
    short: 'Reads the results and hands them back to the Trend Scout.',
    does: 'Reads views, link clicks and conversions for every post, ranks the hooks, formats and times that did best, and writes next week’s plan from what actually happened.',
    limit:
      'It reports the numbers the platforms give us. No projected or inflated figure is ever shown as an actual.',
    inLoop: 'Closes the loop: its ranking is the first thing the Trend Scout reads next week.',
    metric:
      'the baseline, the targets, the KPI calculations, the alerts, and next week’s plan.',
  },
]

/**
 * The last hand-off is the one that closes the loop — and the automated version
 * of it is post-MVP, so the line itself says what happens today, in the same
 * words as the "Coming soon" caveat on /how-it-works. On the landing page it
 * also sits under a `ComingSoonLabel`, because that page has no other caveat.
 */
export const LOOP_CLOSING_LINE =
  'The Performance Analyst hands its ranking back to the Trend Scout, so next week starts from what worked this week. Today the Performance Analyst writes that plan and a person puts it into effect with you.'
