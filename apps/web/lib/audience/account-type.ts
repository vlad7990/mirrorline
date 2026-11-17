/**
 * Who the visitor is, and what state their account is in.
 *
 * This is the **only** segmentation the public site has (16 §1, 13 §1). There
 * is deliberately no industry here and there never will be: the agents
 * research the niche per account, so an industry on the website would be a
 * constraint the product does not need. `10_SALES_FOCUS.md` §1 is the rule and
 * a CI test enforces the wording.
 *
 * No React in this module. It is imported by a client provider, by server
 * components reading `searchParams`, and by unit tests, and a `'use client'`
 * directive here would make the constants come back as throwing stubs in the
 * server tree — the trap written up in `site-chrome.ts`.
 */

/** A business, or a person. */
export type Audience = 'business' | 'individual'

/** Starting from nothing, or growing something that exists. */
export type AccountStage = 'new' | 'existing'

/**
 * The seven goals from 15 §2. The goal — never the industry — decides the KPI
 * set, the targets and the dashboard.
 */
export type GoalKey =
  | 'leads'
  | 'bookings'
  | 'sales'
  | 'audience'
  | 'awareness'
  | 'community'
  | 'launch'

export interface AccountChoice {
  readonly audience: Audience
  readonly stage: AccountStage
}

/**
 * What a visitor who has chosen nothing sees.
 *
 * A real default rather than `null`, so no section has to render an "unknown"
 * branch and nothing on the page is empty before a click. Business + existing
 * is the broadest case and the one the plans are built around (13 §1).
 */
export const DEFAULT_CHOICE: AccountChoice = { audience: 'business', stage: 'existing' }

export const AUDIENCE_VALUES: readonly Audience[] = ['business', 'individual']
export const ACCOUNT_STAGE_VALUES: readonly AccountStage[] = ['new', 'existing']

/** URL parameter names. Short, because they end up in shared links. */
export const AUDIENCE_PARAM = 'who'
export const STAGE_PARAM = 'account'

/** One key, so a stale half-choice cannot survive a format change. */
export const STORAGE_KEY = 'mirrorline.account-choice'

export function isAudience(value: unknown): value is Audience {
  return value === 'business' || value === 'individual'
}

export function isAccountStage(value: unknown): value is AccountStage {
  return value === 'new' || value === 'existing'
}

/**
 * Read a choice from URL parameters.
 *
 * Returns `null` for anything incomplete or unrecognised rather than guessing,
 * so a hand-edited link falls back to storage instead of half-applying.
 */
export function parseChoiceFromParams(
  params: Readonly<Record<string, string | string[] | undefined>>,
): AccountChoice | null {
  const audience = firstValue(params[AUDIENCE_PARAM])
  const stage = firstValue(params[STAGE_PARAM])

  if (!isAudience(audience) || !isAccountStage(stage)) return null
  return { audience, stage }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Read the stored choice.
 *
 * Every access is wrapped: `localStorage` throws outright in Safari's private
 * mode and whenever a browser blocks storage, and a marketing page must not
 * white-screen because somebody tightened their privacy settings.
 */
export function readStoredChoice(): AccountChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { audience, stage } = parsed as Record<string, unknown>
    if (!isAudience(audience) || !isAccountStage(stage)) return null

    return { audience, stage }
  } catch {
    // Unavailable, or holding something we did not write. Either way the
    // visitor gets the default, which is a complete page.
    return null
  }
}

/** Persist a choice. Failure is silent and harmless: the page still works. */
export function writeStoredChoice(choice: AccountChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Storage unavailable. The choice still lives in the URL and in React
    // state for this visit.
  }
}

/** Add the choice to a path, so a shared link opens on the same reading. */
export function withChoiceParams(path: string, choice: AccountChoice): string {
  // `split` always yields at least one element, but `noUncheckedIndexedAccess`
  // cannot know that, so the empty-string default is for the compiler.
  const [base = '', hash] = path.split('#')
  const separator = base.includes('?') ? '&' : '?'
  const query = `${AUDIENCE_PARAM}=${choice.audience}&${STAGE_PARAM}=${choice.stage}`
  return `${base}${separator}${query}${hash ? `#${hash}` : ''}`
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export const AUDIENCE_LABELS: Readonly<Record<Audience, string>> = {
  business: 'A business',
  individual: 'An individual',
}

export const STAGE_LABELS: Readonly<Record<AccountStage, string>> = {
  new: 'Starting a new account',
  existing: 'Growing an account I have',
}

export interface GoalOption {
  readonly key: GoalKey
  readonly label: string
  /** The headline KPI from 15 §2. One per goal, and it is a target, never a promise. */
  readonly headlineKpi: string
}

/** 15 §2, in order. Every account picks one and may add a second. */
export const GOALS: readonly GoalOption[] = [
  { key: 'leads', label: 'Leads and enquiries', headlineKpi: 'Leads per week' },
  { key: 'bookings', label: 'Bookings and appointments', headlineKpi: 'Bookings per week' },
  { key: 'sales', label: 'Sales', headlineKpi: 'Revenue from tracked links' },
  { key: 'audience', label: 'Audience growth', headlineKpi: 'Net new followers per week' },
  { key: 'awareness', label: 'Awareness and reach', headlineKpi: 'Unique reach per week' },
  {
    key: 'community',
    label: 'Community and engagement',
    headlineKpi: 'Sends, saves and comments per 1,000 reach',
  },
  { key: 'launch', label: 'Launching a new account', headlineKpi: 'Days to first 1,000 followers' },
]

/**
 * The plan we pre-select for a choice, from 13 §1.
 *
 * Pre-selected, never forced: `/pricing` shows every plan and this only
 * decides which one opens highlighted.
 */
export function suggestedPlanId(choice: AccountChoice): string {
  if (choice.audience === 'business') return 'pilot'
  return choice.stage === 'existing' ? 'creator' : 'studio'
}
