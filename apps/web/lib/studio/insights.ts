/**
 * Alerts and the Performance Analyst's weekly note — 15 §5 ("Alerts appear
 * when a KPI is off track for two weeks in a row") and tab 7 ("what worked,
 * what we'll change, and what we need from you").
 *
 * **Two weeks is the rule, not a suggestion.** One bad week is weather. An
 * alert on every dip would train the user to dismiss alerts, which costs us
 * the one week it matters. `weeksOffTrack` is on the record so the UI can say
 * which it is, and a test can hold the threshold.
 *
 * **The note names what we got wrong.** A weekly report that only lists wins
 * is marketing, and the client is paying for an analyst.
 */

/**
 * A KPI that has missed its target two periods running.
 *
 * `attention` rather than `danger` for the KPI cases on purpose: a KPI behind
 * its target six weeks into a quarter is information, not an incident, and red
 * is reserved for things that are actually broken — a disconnected account, a
 * blocked post.
 */
export type AlertTone = 'attention' | 'danger'

export interface KpiAlert {
  readonly id: string
  /** Matches a `KpiDefinition.key`, so the alert can link to its card. */
  readonly kpiKey: string
  readonly title: string
  readonly message: string
  /** 15 §5: an alert needs two in a row. Below that there is no alert. */
  readonly weeksOffTrack: number
  readonly tone: AlertTone
}

/** 15 §5. Below this a KPI is having a week, not a problem. */
export const ALERT_WEEKS_THRESHOLD = 2

export const SAMPLE_ALERTS: readonly KpiAlert[] = [
  {
    id: 'alert-reconnect-instagram',
    kpiKey: 'posts_published',
    title: 'Instagram needs reconnecting',
    message:
      'Instagram disconnected us on 11 November. Nothing has gone out there since, and we will not post anywhere on your behalf until you reconnect it.',
    weeksOffTrack: 2,
    tone: 'danger',
  },
  {
    id: 'alert-leads-behind',
    kpiKey: 'leads',
    title: 'Leads behind pace for two weeks',
    message:
      'Nine leads this week against a target of ten, after eight against ten last week. The Analyst is moving two posts a week to the format with the highest sends, and will report next Monday.',
    weeksOffTrack: 2,
    tone: 'attention',
  },
]

/**
 * True when a KPI has been off track long enough to be worth saying.
 *
 * A function rather than a pre-filtered constant, so Home, the Overview tab
 * and the test all apply the same rule to whatever list they hold.
 */
export function isAlertWorthRaising(alert: KpiAlert): boolean {
  return alert.weeksOffTrack >= ALERT_WEEKS_THRESHOLD
}

export const RAISED_ALERTS: readonly KpiAlert[] = SAMPLE_ALERTS.filter(isAlertWorthRaising)

/* -------------------------------------------------------------------------- */
/* The weekly note (15 §5 tab 7, 15 §6)                                        */
/* -------------------------------------------------------------------------- */

export interface AgentInsight {
  /** "Week of 10 November". */
  readonly weekLabel: string
  readonly whatWorked: readonly string[]
  readonly whatWeChange: readonly string[]
  /** The asks. 15 §6: the Concierge collects manual outcomes. */
  readonly whatWeNeed: readonly string[]
}

export const SAMPLE_INSIGHT: AgentInsight = {
  weekLabel: 'Week of 10 November',
  whatWorked: [
    'The “myth vs fact” opening held 51% of viewers to three seconds, against 44% for everything else. It is now four of the twenty-one posts.',
    'Moving the evening slot to 7pm on TikTok lifted sends per 1,000 reach from 20 to 22.',
    'Sixty-one per cent of reach came from people who do not follow you, up from 56%.',
  ],
  whatWeChange: [
    'Two of next week’s posts move from the question opening to “myth vs fact”. The question opening stays — we are testing it, not dropping it.',
    'We stopped the Tuesday morning slot. Four weeks of data and it has never beaten the evening one.',
    'Three scripts were rewritten after the Originality Gate matched them too closely to the source format. That is the gate working, and it cost us half a day.',
  ],
  whatWeNeed: [
    'Reconnect Instagram. Nothing has published there since 11 November.',
    'Tell us whether the two enquiries from 6 November turned into clients — we cannot see past the link, and cost per lead is guesswork until you tell us.',
    'Approve the four scripts waiting in the queue, or send them back with a note.',
  ],
}

/* -------------------------------------------------------------------------- */
/* Content leaderboards (15 §5 tab 3)                                          */
/* -------------------------------------------------------------------------- */

/**
 * 15 §5 tab 3: "top posts **by the user's goal**, not by views".
 *
 * That distinction is the whole tab. Ranking by views is what every clipping
 * tool already does and the reason P1 exists — the account that wins on views
 * and loses on enquiries looks healthy in every tool but ours.
 */
export interface FormatRank {
  readonly id: string
  readonly label: string
  /** Sends per 1,000 reach — the goal-side measure, not a view count. */
  readonly sendsPer1k: number
  readonly posts: number
  /** Leads attributed to posts in this format, this period. */
  readonly leads: number
}

export const SAMPLE_FORMAT_RANKING: readonly FormatRank[] = [
  { id: 'format-myth', label: 'Myth vs fact', sendsPer1k: 34, posts: 4, leads: 4 },
  { id: 'format-story', label: 'One client story', sendsPer1k: 27, posts: 5, leads: 3 },
  { id: 'format-tip', label: 'Three-step tip', sendsPer1k: 21, posts: 7, leads: 2 },
  { id: 'format-question', label: 'Question opening', sendsPer1k: 16, posts: 5, leads: 0 },
]
