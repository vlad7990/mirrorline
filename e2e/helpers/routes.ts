/**
 * The route table every end-to-end spec reads.
 *
 * Single source of truth: routes.spec.ts, responsive.spec.ts, a11y.spec.ts and
 * screenshots.spec.ts all iterate this list, so adding a screen means editing
 * one file. The slug is the screenshot file-name stem, so it must stay stable.
 */

import type { Page } from '@playwright/test'

import { readStoredCookies, supabaseConfig } from './test-accounts'

/**
 * Can this run reach the studio at all?
 *
 * `/app/*` needs a session, a session needs an account, and an account needs
 * the Supabase keys. Without them `auth.setup.ts` writes an empty storage
 * state and skips, so every studio route answers with a redirect to
 * `/sign-in` — and the shared specs below would report fifty-odd failures that
 * all say the same thing in the least useful way: the wrong `<h1>`, a sideways
 * scroll on a page that is not the one named, an axe sweep of the sign-in form
 * filed under "Settings and billing".
 *
 * So with no keys the table narrows to what a signed-out visitor can actually
 * see. **With keys it is unchanged** — every local run, and any CI run holding
 * secrets — which is what keeps the screenshot sweep complete, since that only
 * ever runs with them.
 */
export const HAS_STUDIO_SESSION = supabaseConfig() !== null

/** The areas a signed-out run can still assert against. */
const PUBLIC_AREAS: readonly RouteArea[] = ['marketing', 'auth']

export type RouteArea = 'marketing' | 'auth' | 'studio' | 'onboarding'

export interface RouteEntry {
  /** The path Playwright navigates to, query string included. */
  readonly path: string
  /** File-name stem: "index", "app-home", "app-remake-trend-01". */
  readonly slug: string
  /** Human name, used in test titles. */
  readonly name: string
  readonly area: RouteArea
  /**
   * The visible text of the page's single <h1>.
   *
   * A string where the heading is fixed copy, which is nearly everywhere. A
   * **RegExp** where the heading is data: since B2.2 the calendar's reads
   * "Week of 16 November" for whichever week the client is actually in, so an
   * exact string there would have been a test that passed until Monday.
   */
  readonly h1: string | RegExp
}

/** The remake studio is one route per trend; trend-01 is the board's first card. */
export const REMAKE_TREND_ID = 'trend-01'

/**
 * Put the browser in the right session state for a route, before navigating.
 *
 * Since B1 the suite runs signed in by default (D84) — `/app/*` needs a
 * session, and this one list holds both `/pricing` and `/app/home`, so a
 * per-project split could not express it.
 *
 * **The auth routes are the exception, and they are in this list too.** A
 * signed-in visitor is redirected away from `/sign-in` and `/sign-up` on
 * purpose, so iterating them with a session asserts against the studio
 * instead: `routes.spec.ts` found the wrong `<h1>`, `responsive.spec.ts`
 * measured the wrong page, and `screenshots.spec.ts` captured the studio under
 * a file named `sign-in`. That last one is the dangerous version, because a
 * screenshot that is merely *wrong* still looks like a result.
 *
 * Every shared spec calls this immediately before `goto`, so the rule lives
 * next to the route table that provokes it rather than in four places.
 */
export async function prepareSessionFor(page: Page, route: { area: RouteArea }): Promise<void> {
  const context = page.context()

  if (route.area === 'auth') {
    await context.clearCookies()
    return
  }

  // **Restore, not just clear.** `screenshots.spec.ts` captures every screen
  // inside one test, in order: clearing cookies for `/sign-in` there signed the
  // page out for everything captured after it, and four screenshot tests came
  // back as studio pages rendered as sign-in redirects. Putting the session
  // back makes the loop order-independent, which a sequential capture needs.
  const cookies = await context.cookies()
  const hasSession = cookies.some((cookie) => cookie.name.startsWith('sb-'))

  if (!hasSession) {
    const stored = readStoredCookies()
    if (stored.length > 0) await context.addCookies(stored)
  }
}

const ALL_ROUTES: readonly RouteEntry[] = [
  {
    path: '/',
    slug: 'index',
    name: 'Home (marketing)',
    area: 'marketing',
    /*
     * The hero's second line cycles (D25), so only the fixed part is stable
     * enough to match on. `getByRole('heading', { name })` matches on a
     * substring, which is what makes this work.
     *
     * The accessible name is this phrase plus the *first* cycling one: the
     * animated span is `aria-hidden` and a visually hidden sibling carries
     * the static text, so assistive technology never sees a half-typed
     * value. Matching the prefix asserts that arrangement is still in place.
     */
    h1: 'Original short video,',
  },
  {
    path: '/product',
    slug: 'product',
    name: 'Product',
    area: 'marketing',
    h1: 'One video.',
  },
  {
    path: '/agents',
    slug: 'agents',
    name: 'Agents',
    area: 'marketing',
    h1: 'Seven agents.',
  },
  {
    path: '/how-it-works',
    slug: 'how-it-works',
    name: 'How it works',
    area: 'marketing',
    h1: 'Scan, make,',
  },
  {
    path: '/metrics',
    slug: 'metrics',
    name: 'Metrics',
    area: 'marketing',
    h1: 'Every account gets goals,',
  },
  {
    path: '/compare',
    slug: 'compare',
    name: 'Compare',
    area: 'marketing',
    h1: 'The other ways',
  },
  {
    path: '/businesses',
    slug: 'businesses',
    name: 'For businesses',
    area: 'marketing',
    h1: 'Any business,',
  },
  {
    path: '/individuals',
    slug: 'individuals',
    name: 'For individuals',
    area: 'marketing',
    h1: 'You are already making it.',
  },
  {
    path: '/niche-scan',
    slug: 'niche-scan',
    name: 'Niche Scan',
    area: 'marketing',
    h1: 'What is working in your niche,',
  },
  {
    path: '/niche-scan/sample',
    slug: 'niche-scan-sample',
    name: 'Sample Niche Scan',
    area: 'marketing',
    h1: 'What a scan',
  },
  {
    path: '/faq',
    slug: 'faq',
    name: 'FAQ',
    area: 'marketing',
    h1: 'Short answers,',
  },
  {
    path: '/about',
    slug: 'about',
    name: 'About',
    area: 'marketing',
    h1: 'We studied what does not work,',
  },
  {
    path: '/contact',
    slug: 'contact',
    name: 'Contact',
    area: 'marketing',
    h1: 'A person answers,',
  },
  {
    path: '/resources',
    slug: 'resources',
    name: 'Resources',
    area: 'marketing',
    h1: 'Useful',
  },
  {
    path: '/changelog',
    slug: 'changelog',
    name: 'Changelog',
    area: 'marketing',
    h1: 'What we shipped,',
  },
  {
    path: '/accessibility',
    slug: 'accessibility',
    name: 'Accessibility',
    area: 'marketing',
    h1: 'What we test,',
  },
  {
    path: '/legal/ai-use',
    slug: 'legal-ai-use',
    name: 'How we use AI',
    area: 'marketing',
    h1: 'Generated material',
  },
  {
    path: '/legal/acceptable-use',
    slug: 'legal-acceptable-use',
    name: 'Acceptable use',
    area: 'marketing',
    h1: 'What we will not make,',
  },
  {
    path: '/legal/cancellation-refunds',
    slug: 'legal-cancellation-refunds',
    name: 'Cancellation and refunds',
    area: 'marketing',
    h1: 'Cancel in one click.',
  },
  {
    path: '/legal/cookies',
    slug: 'legal-cookies',
    name: 'Cookies',
    area: 'marketing',
    h1: 'Three keys,',
  },
  {
    path: '/pricing',
    slug: 'pricing',
    name: 'Pricing',
    area: 'marketing',
    // `getByRole('heading', { name })` matches on a substring, so the accent
    // phrase after the comma is not required here — but the comma is, because
    // F3 reworded the headline and this table is what noticed.
    h1: 'One flat price,',
  },
  {
    path: '/trust',
    slug: 'trust',
    name: 'Trust',
    area: 'marketing',
    h1: 'The rules we work by',
  },
  {
    path: '/legal/privacy',
    slug: 'legal-privacy',
    name: 'Privacy notice',
    area: 'marketing',
    h1: 'Privacy notice',
  },
  {
    path: '/legal/terms',
    slug: 'legal-terms',
    name: 'Terms',
    area: 'marketing',
    h1: 'Terms of service',
  },
  {
    path: '/sign-in',
    slug: 'sign-in',
    name: 'Sign in',
    area: 'auth',
    h1: 'Welcome back',
  },
  {
    path: '/sign-up',
    slug: 'sign-up',
    name: 'Sign up',
    area: 'auth',
    h1: 'Set up your studio',
  },
  {
    path: '/app/onboarding',
    slug: 'app-onboarding',
    name: 'Onboarding step 1',
    area: 'onboarding',
    h1: 'Your brand',
  },
  {
    path: '/app/home',
    slug: 'app-home',
    name: 'Studio home',
    area: 'studio',
    h1: 'Good morning, Maya',
  },
  {
    path: '/app/upload',
    slug: 'app-upload',
    name: 'Upload and multiply',
    area: 'studio',
    h1: 'One video, 12 posts',
  },
  {
    // Renamed from the Trend board in v4 (16 §5); the path and the screenshot
    // slug stay put so the morning before/after comparison still lines up.
    path: '/app/trends',
    slug: 'app-trends',
    name: 'Niche Scan',
    area: 'studio',
    h1: 'Niche Scan',
  },
  {
    path: `/app/remake/${REMAKE_TREND_ID}`,
    slug: `app-remake-${REMAKE_TREND_ID}`,
    name: 'Remake studio',
    area: 'studio',
    h1: 'Remake: The 3-word reframe',
  },
  {
    path: '/app/calendar',
    slug: 'app-calendar',
    name: 'Calendar and approvals',
    area: 'studio',
    // Was 'Week of 9 November', the fixtures' week. The calendar reads
    // `scheduled_posts` for the real current week now (B2.2), so the month and
    // the day are data. The shape is still asserted — a heading that lost its
    // date, or its "Week of", still fails.
    h1: /^Week of \d{1,2} [A-Z][a-z]+$/,
  },
  {
    // v4: Results is the seven tabs of 15 §5, and each tab's own label is the
    // page's single <h1>. The other six are in EXTRA_SCREENS, because they are
    // query-string states of this route rather than routes of their own.
    path: '/app/results',
    slug: 'app-results',
    name: 'Results',
    area: 'studio',
    h1: 'Overview',
  },
  /*
   * The other six Results tabs.
   *
   * In ROUTES rather than in EXTRA_SCREENS on purpose. ROUTES is what the axe
   * sweep iterates, and a panel that no test opens is a panel that is never
   * audited — the exact failure mode a client-side tab widget would have
   * locked in for six of the seven. Being URLs, they cost one line each.
   */
  {
    path: '/app/results?tab=funnel',
    slug: 'app-results-funnel',
    name: 'Results · Funnel',
    area: 'studio',
    h1: 'Funnel',
  },
  {
    path: '/app/results?tab=content',
    slug: 'app-results-content',
    name: 'Results · Content',
    area: 'studio',
    h1: 'Content',
  },
  {
    path: '/app/results?tab=accounts',
    slug: 'app-results-accounts',
    name: 'Results · Accounts',
    area: 'studio',
    h1: 'Accounts',
  },
  {
    path: '/app/results?tab=goals',
    slug: 'app-results-goals',
    name: 'Results · Goals and KPIs',
    area: 'studio',
    h1: 'Goals and KPIs',
  },
  {
    path: '/app/results?tab=ledger',
    slug: 'app-results-ledger',
    name: 'Results · Ledger',
    area: 'studio',
    h1: 'Ledger',
  },
  {
    path: '/app/results?tab=insights',
    slug: 'app-results-insights',
    name: 'Results · Agent insights',
    area: 'studio',
    h1: 'Agent insights',
  },
  {
    path: '/app/goals',
    slug: 'app-goals',
    name: 'Goals and KPIs',
    area: 'studio',
    h1: 'Goals and KPIs',
  },
  {
    path: '/app/accounts',
    slug: 'app-accounts',
    name: 'Accounts',
    area: 'studio',
    h1: 'Accounts',
  },
  {
    path: '/app/portfolio',
    slug: 'app-portfolio',
    name: 'Portfolio',
    area: 'studio',
    h1: 'Portfolio',
  },
  {
    path: '/app/agents',
    slug: 'app-agents',
    name: 'Agents',
    area: 'studio',
    h1: 'Seven agents, one loop',
  },
  {
    path: '/app/brand-kit',
    slug: 'app-brand-kit',
    name: 'Brand kit',
    area: 'studio',
    h1: 'Brand kit',
  },
  {
    path: '/app/settings',
    slug: 'app-settings',
    name: 'Settings and billing',
    area: 'studio',
    h1: 'Settings and billing',
  },
]

/**
 * What the shared specs iterate: everything, or only what a signed-out visitor
 * can see. See `HAS_STUDIO_SESSION` for why the second case exists.
 */
export const ROUTES: readonly RouteEntry[] = HAS_STUDIO_SESSION
  ? ALL_ROUTES
  : ALL_ROUTES.filter((route) => PUBLIC_AREAS.includes(route.area))

/**
 * Onboarding steps 2 and 3 live on the same route as step 1, behind `?step=`.
 * They are not separate routes, so they are screenshot-only: the morning
 * comparison needs one PNG per reference mockup (S01_Onboarding_step2/3.png).
 */
export const EXTRA_SCREENS: readonly RouteEntry[] = [
  {
    path: '/app/onboarding?step=2',
    slug: 'app-onboarding-step2',
    name: 'Onboarding step 2',
    area: 'onboarding',
    h1: 'Connect your accounts',
  },
  {
    path: '/app/onboarding?step=3',
    slug: 'app-onboarding-step3',
    name: 'Onboarding step 3',
    area: 'onboarding',
    h1: 'Your niche and goal',
  },
]

/** Every screen the screenshot sweep captures. */
export const ALL_SCREENS: readonly RouteEntry[] = [...ROUTES, ...EXTRA_SCREENS]

/**
 * Routes wrapped in the studio shell: a fixed sidebar above 1024px and the
 * mobile top bar below it. Onboarding deliberately has neither.
 */
export const STUDIO_SHELL_ROUTES: readonly RouteEntry[] = ROUTES.filter(
  (route) => route.area === 'studio',
)
