/**
 * The route table every end-to-end spec reads.
 *
 * Single source of truth: routes.spec.ts, responsive.spec.ts, a11y.spec.ts and
 * screenshots.spec.ts all iterate this list, so adding a screen means editing
 * one file. The slug is the screenshot file-name stem, so it must stay stable.
 */

export type RouteArea = 'marketing' | 'auth' | 'studio' | 'onboarding'

export interface RouteEntry {
  /** The path Playwright navigates to, query string included. */
  readonly path: string
  /** File-name stem: "index", "app-home", "app-remake-trend-01". */
  readonly slug: string
  /** Human name, used in test titles. */
  readonly name: string
  readonly area: RouteArea
  /** The exact, visible text of the page's single <h1>. */
  readonly h1: string
}

/** The remake studio is one route per trend; trend-01 is the board's first card. */
export const REMAKE_TREND_ID = 'trend-01'

export const ROUTES: readonly RouteEntry[] = [
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
    h1: 'Turn one long video into',
  },
  {
    path: '/how-it-works',
    slug: 'how-it-works',
    name: 'How it works',
    area: 'marketing',
    h1: 'Seven agents, one loop',
  },
  {
    path: '/pricing',
    slug: 'pricing',
    name: 'Pricing',
    area: 'marketing',
    h1: 'One flat price a month',
  },
  {
    path: '/trust',
    slug: 'trust',
    name: 'Trust',
    area: 'marketing',
    h1: 'The rules we work by',
  },
  {
    path: '/privacy',
    slug: 'privacy',
    name: 'Privacy notice',
    area: 'marketing',
    h1: 'Privacy notice',
  },
  {
    path: '/terms',
    slug: 'terms',
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
    path: '/app/trends',
    slug: 'app-trends',
    name: 'Trend board',
    area: 'studio',
    h1: 'Formats rising now',
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
    h1: 'Week of 9 November',
  },
  {
    path: '/app/results',
    slug: 'app-results',
    name: 'Results',
    area: 'studio',
    h1: '21 posts, 6 calls booked',
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
