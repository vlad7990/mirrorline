/**
 * The seven Results tabs from 15 §5.
 *
 * **They are links, not a client-side tab widget.** Three reasons, and the
 * third is the one that decided it:
 *
 * 1. Every tab gets a URL, so a Concierge can send a client straight to their
 *    ledger instead of "click Results, then the sixth tab".
 * 2. The active panel is server-rendered, so there is no JavaScript between
 *    arriving and reading your numbers.
 * 3. An axe audit only sees the state a test opened. With a widget, six of the
 *    seven panels would never be audited; with URLs, the a11y sweep walks
 *    every one of them for free.
 *
 * `aria-current="page"` rather than `aria-selected`: these are navigation, and
 * saying "tab" to a screen reader while behaving like links is worse than
 * being plainly what we are.
 */

/** The slug that appears in `?tab=`. Stable: it ends up in shared links. */
export type ResultsTabSlug =
  | 'overview'
  | 'funnel'
  | 'content'
  | 'accounts'
  | 'goals'
  | 'ledger'
  | 'insights'

export interface ResultsTab {
  readonly slug: ResultsTabSlug
  readonly label: string
  /** One line, used as the panel's lead and in the e2e route table. */
  readonly description: string
}

/** 15 §5, in its order. The order is the argument: outcome before activity. */
export const RESULTS_TABS: readonly ResultsTab[] = [
  {
    slug: 'overview',
    label: 'Overview',
    description: 'Where this account stands against the goal it picked, this week against last.',
  },
  {
    slug: 'funnel',
    label: 'Funnel',
    description: 'Views to profile visits to clicks to leads to bookings, with the drop at each step.',
  },
  {
    slug: 'content',
    label: 'Content',
    description: 'What is working, ranked by your goal rather than by views.',
  },
  {
    slug: 'accounts',
    label: 'Accounts',
    description: 'One card per connected account, with its own KPIs.',
  },
  {
    slug: 'goals',
    label: 'Goals and KPIs',
    description: 'The cascade from your outcome down to the KPIs we track, and the targets.',
  },
  {
    slug: 'ledger',
    label: 'Ledger',
    description: 'The weekly Results Ledger, exportable as CSV.',
  },
  {
    slug: 'insights',
    label: 'Agent insights',
    description: 'The Performance Analyst’s weekly note: what worked, what we change, what we need.',
  },
]

/** The tab a bare `/app/results` opens on. */
export const DEFAULT_RESULTS_TAB: ResultsTabSlug = 'overview'

/**
 * Read `?tab=` into a slug.
 *
 * Falls back to Overview for anything unrecognised rather than throwing: a
 * hand-edited or stale link should land the user on their dashboard, not on an
 * error page.
 */
export function parseResultsTab(value: string | string[] | undefined): ResultsTabSlug {
  const first = Array.isArray(value) ? value[0] : value
  const found = RESULTS_TABS.find((tab) => tab.slug === first)
  return found ? found.slug : DEFAULT_RESULTS_TAB
}

export function resultsTabHref(slug: ResultsTabSlug): string {
  // Overview is the default, so it gets the bare path. One canonical URL per
  // screen keeps the e2e route table and the nav's active state honest.
  return slug === DEFAULT_RESULTS_TAB ? '/app/results' : `/app/results?tab=${slug}`
}

export function resultsTab(slug: ResultsTabSlug): ResultsTab {
  const found = RESULTS_TABS.find((tab) => tab.slug === slug)
  // Unreachable for a parsed slug; a programming error if it happens.
  if (!found) throw new Error(`Unknown Results tab: ${slug}`)
  return found
}
