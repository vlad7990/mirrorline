/**
 * The S4 filters: which niches, which platform, which window.
 *
 * The state lives in the query string, so a filtered board can be linked,
 * reloaded and screenshotted. The page reads it on the server and renders the
 * matching cards; the control bar only writes it back.
 */

import { accounts, workspace, type Platform, type Trend } from '@mirrorline/mock'

/* -------------------------------------------------------------------------- */
/* Niche                                                                       */
/* -------------------------------------------------------------------------- */

export type NicheFilter = 'my-niche' | 'nearby' | 'all'

export const NICHE_PARAM = 'filter'
export const DEFAULT_NICHE_FILTER: NicheFilter = 'all'

export interface FilterOption<Value extends string> {
  readonly value: Value
  readonly label: string
}

export const NICHE_OPTIONS: readonly FilterOption<NicheFilter>[] = [
  { value: 'my-niche', label: 'My niche' },
  { value: 'nearby', label: 'Nearby niches' },
  { value: 'all', label: 'All' },
]

export function parseNicheFilter(raw: string | undefined): NicheFilter {
  const match = NICHE_OPTIONS.find((option) => option.value === raw)
  return match?.value ?? DEFAULT_NICHE_FILTER
}

/* -------------------------------------------------------------------------- */
/* Platform                                                                    */
/* -------------------------------------------------------------------------- */

export const ALL_PLATFORMS = 'all'
export type PlatformFilter = Platform | typeof ALL_PLATFORMS

export const PLATFORM_PARAM = 'platform'
export const DEFAULT_PLATFORM_FILTER: PlatformFilter = ALL_PLATFORMS

/**
 * The platform names come from the connected accounts rather than a second
 * list, so "YouTube Shorts" is spelled the same way on every screen.
 */
export const PLATFORM_OPTIONS: readonly FilterOption<PlatformFilter>[] = [
  { value: ALL_PLATFORMS, label: 'All platforms' },
  ...accounts.map((account) => ({ value: account.platform, label: account.platformLabel })),
]

export function parsePlatformFilter(raw: string | undefined): PlatformFilter {
  const match = PLATFORM_OPTIONS.find((option) => option.value === raw)
  return match?.value ?? DEFAULT_PLATFORM_FILTER
}

/* -------------------------------------------------------------------------- */
/* Window                                                                      */
/* -------------------------------------------------------------------------- */

export type TimeWindow = '7d' | '24h'

export const WINDOW_PARAM = 'window'
export const DEFAULT_TIME_WINDOW: TimeWindow = '7d'

export const WINDOW_OPTIONS: readonly FilterOption<TimeWindow>[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '24h', label: 'Last 24 hours' },
]

/**
 * The window says when the Trend Scout last scored these formats. The growth
 * figure beside each card is always a 7-day figure, and says so, so the two
 * numbers can never be read as one measurement.
 */
export const WINDOW_SENTENCES: Record<TimeWindow, string> = {
  '7d': 'Formats the Trend Scout scored in the last 7 days. Growth is measured over 7 days.',
  '24h': 'Formats the Trend Scout scored in the last 24 hours. Growth is measured over 7 days.',
}

export function parseTimeWindow(raw: string | undefined): TimeWindow {
  const match = WINDOW_OPTIONS.find((option) => option.value === raw)
  return match?.value ?? DEFAULT_TIME_WINDOW
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                   */
/* -------------------------------------------------------------------------- */

export interface TrendFilterState {
  readonly niche: NicheFilter
  readonly platform: PlatformFilter
  readonly window: TimeWindow
}

export const DEFAULT_FILTER_STATE: TrendFilterState = {
  niche: DEFAULT_NICHE_FILTER,
  platform: DEFAULT_PLATFORM_FILTER,
  window: DEFAULT_TIME_WINDOW,
}

function matchesNiche(trend: Trend, niche: NicheFilter): boolean {
  if (niche === 'all') return true
  if (niche === 'my-niche') return trend.isFromMyNiche
  return workspace.nearbyNiches.includes(trend.fromNiche)
}

/** Pure and immutable: it returns a new list and never touches the fixtures. */
export function filterTrends(
  all: readonly Trend[],
  state: Pick<TrendFilterState, 'niche' | 'platform'>,
): readonly Trend[] {
  return all.filter(
    (trend) =>
      matchesNiche(trend, state.niche) &&
      (state.platform === ALL_PLATFORMS || trend.platform === state.platform),
  )
}

/** The query string for a filter state, with defaults left out of the URL. */
export function filtersToQuery(state: TrendFilterState): string {
  const params = new URLSearchParams()
  if (state.niche !== DEFAULT_NICHE_FILTER) params.set(NICHE_PARAM, state.niche)
  if (state.platform !== DEFAULT_PLATFORM_FILTER) params.set(PLATFORM_PARAM, state.platform)
  if (state.window !== DEFAULT_TIME_WINDOW) params.set(WINDOW_PARAM, state.window)

  const query = params.toString()
  return query ? `?${query}` : ''
}

/** First value of a Next.js search param, which may arrive as an array. */
export function firstParam(value: string | readonly string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}
