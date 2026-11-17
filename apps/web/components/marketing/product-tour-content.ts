/**
 * The six stops on /product's feature tour, in the order the work happens.
 *
 * 19 v2 fixes the order — Upload → Niche Scan → Remake → Calendar → Results →
 * Agents — and it is deliberately not the home page's four jobs. `FEATURE_TABS`
 * describes what the *system* does in four movements; this describes what *you
 * see* in six screens, which is a different question and the one somebody on
 * the product page is asking. Reusing the four would have meant either a tour
 * with two screens missing or four captions quietly rewritten to cover six.
 *
 * Every `shot` is a real screenshot of the current studio, taken at 1440x900
 * in both themes. Two of them — `trends-16x10` and `remake-16x10` — were
 * captured for this tour; the other four already existed. Nothing here is a
 * mock-up of a screen we have not built, which is the rule that keeps a
 * feature tour from becoming a roadmap.
 *
 * The `path` is shown in the browser chrome and carries no host, for the
 * reason `frames.tsx` gives: "Mirrorline" is a placeholder name and a URL bar
 * naming a domain would be a claim this site does not make.
 */

export interface ProductTourStop {
  readonly id: string
  /** Shown on the tab, in the machine's voice. */
  readonly number: string
  readonly title: string
  /** Basename under `/shots`, without the theme suffix. */
  readonly shot: string
  /** The in-app path, shown in the browser chrome. */
  readonly path: string
  /** What the screen shows, for someone who cannot see it. */
  readonly alt: string
  /** Three lines at most. A tour is read standing up. */
  readonly body: string
}

export const PRODUCT_TOUR: readonly ProductTourStop[] = [
  {
    id: 'upload',
    number: '01',
    title: 'Upload',
    shot: 'studio-cuts-16x10',
    path: '/app/upload',
    alt: 'The upload screen after a run: one long video cut into twelve vertical shorts, each with its hook, length and compliance verdict.',
    body: 'Send a talk, a podcast, a webinar or phone footage. The Multiplier finds the moments that stand on their own, cuts them to 9:16, writes a hook for each and burns in captions in your brand style.',
  },
  {
    id: 'niche-scan',
    number: '02',
    title: 'Niche Scan',
    shot: 'trends-16x10',
    path: '/app/trends',
    alt: 'The Niche Scan: formats rising in the account’s niche, each scored by views per follower, with a fit score and a button to remake it.',
    body: 'Trend Scout reads what is growing where you are and scores it by views per follower rather than by follower count. Each card is a recipe of beats — a structure, never somebody else’s video.',
  },
  {
    id: 'remake',
    number: '03',
    title: 'Remake',
    shot: 'remake-16x10',
    path: '/app/remake/trend-01',
    alt: 'The remake studio: the format’s beats on the left, a new script written from the client’s own material in the middle, and a preview frame on the right.',
    body: 'The Remake Producer rebuilds a format you approved: its structure only, with a new script in your voice, your footage and at least one true fact about your business with its source attached.',
  },
  {
    id: 'calendar',
    number: '04',
    title: 'Calendar',
    shot: 'calendar-16x10',
    path: '/app/calendar',
    alt: 'The posting week: three platform rows of scheduled posts, each awaiting approval, with the posts that need a look marked.',
    body: 'Everything lands here before it goes anywhere. Approve each post, drag one to another day, or let the week go after 24 hours and object to anything you do not want.',
  },
  {
    id: 'results',
    number: '05',
    title: 'Results',
    shot: 'results-16x10',
    path: '/app/results',
    alt: 'The results dashboard: the KPI tiers for the account’s goal, a funnel, and the ledger of what each week produced.',
    body: 'Views, sends, saves, follows, profile visits, link clicks and whatever your goal ends at. A KPI with no connected account says so rather than showing a zero.',
  },
  {
    id: 'agents',
    number: '06',
    title: 'Agents',
    shot: 'agents-16x10',
    path: '/app/agents',
    alt: 'The agents screen: seven agents, each with its job, what it last did, what it cost and how much of its monthly cap it has spent.',
    body: 'Seven agents, each with one job, a spend cap and a log line for everything it did. The gate the Compliance agent runs is the one thing no post can go round.',
  },
]
