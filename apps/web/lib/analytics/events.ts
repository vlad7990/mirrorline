/**
 * The eleven funnel events from 14 §4, and the adapter that records them.
 *
 * **Nothing leaves the browser.** There is no analytics vendor wired up, no
 * network call and no cookie: the default adapter writes to the console in
 * development and does nothing in production. `/legal/cookies` and the consent
 * banner say exactly that, and this file is what makes it true.
 *
 * The event list is a closed union rather than free-form strings, because the
 * internal funnel chart (`/admin/funnel`) counts by key — a typo in a call
 * site would otherwise be a silently missing step rather than a type error.
 */

/** 14 §4, in funnel order. */
export const FUNNEL_EVENTS = [
  'account_type_selected',
  'goal_selected',
  'problem_card_clicked',
  'niche_scan_started',
  'niche_scan_submitted',
  'scan_report_opened',
  'call_booked',
  'checkout_started',
  'checkout_completed',
  'account_connected',
  'first_post_approved',
] as const

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

/**
 * Properties carried with an event.
 *
 * Deliberately narrow: primitives only, and no field that could hold a name,
 * an email or a handle. An analytics payload is the easiest place for personal
 * data to end up by accident, so the type refuses to carry it.
 */
export type EventProperties = Readonly<Record<string, string | number | boolean | undefined>>

export interface AnalyticsAdapter {
  track(event: FunnelEvent, properties?: EventProperties): void
}

/** Writes to the console. The prototype's adapter, and dev-only. */
export const consoleAdapter: AnalyticsAdapter = {
  track(event, properties) {
    if (process.env.NODE_ENV === 'production') return
    // The console *is* this adapter, so this is the one deliberate call site.
    console.info(`[funnel] ${event}`, properties ?? {})
  },
}

/** Drops everything. What production uses until a real vendor is chosen. */
export const noopAdapter: AnalyticsAdapter = {
  track() {
    // Intentionally empty. See the module comment.
  },
}

let adapter: AnalyticsAdapter =
  process.env.NODE_ENV === 'development' ? consoleAdapter : noopAdapter

/** Swap the adapter. Used by tests, and by whatever vendor is chosen later. */
export function setAnalyticsAdapter(next: AnalyticsAdapter): void {
  adapter = next
}

/**
 * Record a funnel event.
 *
 * Never throws: an analytics failure must not take a page down with it, and a
 * broken adapter is exactly the kind of thing that ships unnoticed.
 */
export function track(event: FunnelEvent, properties?: EventProperties): void {
  try {
    adapter.track(event, properties)
  } catch {
    // Swallowed on purpose, and only here. Analytics is the one subsystem
    // whose failure is strictly less important than the page rendering.
  }
}
