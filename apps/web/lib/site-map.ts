/**
 * The public site's navigation, from 16 §4.
 *
 * One table for the header and the footer, so the two cannot drift — they
 * each kept their own list before, and had already diverged (`/how-it-works`
 * sat in the footer with no route behind it).
 *
 * **`isLive` is the point of this file.** Spec 16 names twenty-odd routes and
 * they land across several pull requests. A nav that lists all of them from
 * day one ships a preview full of 404s, and a nav edited in every PR is a
 * merge conflict in every PR. So the whole map is declared once and the
 * renderers show only what exists; a PR that adds a route flips one flag, and
 * a test asserts every live entry resolves to a real page.
 *
 * No `'use client'`: the header is a client component and the footer is a
 * server one, and a constant shared across that boundary has to live in a
 * module with no directive. See `site-chrome.ts` for what happens otherwise.
 */

export interface SiteLink {
  readonly href: string
  readonly label: string
  /** False until the route exists. Unlisted everywhere until then. */
  readonly isLive: boolean
}

/**
 * The header's main navigation, in 16 §4's order:
 * Product · How it works · Metrics · Pricing · Compare · Resources.
 *
 * "Sign in" and the Niche Scan button are rendered separately — they are an
 * account link and the page's primary action, not navigation.
 */
export const NAV_LINKS: readonly SiteLink[] = [
  { href: '/product', label: 'Product', isLive: true },
  { href: '/how-it-works', label: 'How it works', isLive: true },
  { href: '/metrics', label: 'Metrics', isLive: true },
  { href: '/pricing', label: 'Pricing', isLive: true },
  { href: '/compare', label: 'Compare', isLive: true },
  { href: '/resources', label: 'Resources', isLive: false },
]

/** The lead magnet. One button, the same words, everywhere (14 §3). */
export const NICHE_SCAN: SiteLink = {
  href: '/niche-scan',
  label: 'Get my free Niche Scan',
  isLive: true,
}

export interface FooterColumn {
  readonly heading: string
  readonly links: readonly SiteLink[]
}

/** 16 §4: the nav, plus About, Contact, Trust, FAQ, Changelog, Legal, Accessibility. */
export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { href: '/product', label: 'Product', isLive: true },
      { href: '/how-it-works', label: 'How it works', isLive: true },
      { href: '/metrics', label: 'Metrics', isLive: true },
      { href: '/agents', label: 'Agents', isLive: true },
      { href: '/compare', label: 'Compare', isLive: true },
      { href: '/pricing', label: 'Pricing', isLive: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About', isLive: false },
      { href: '/contact', label: 'Contact', isLive: false },
      { href: '/trust', label: 'Our rules', isLive: true },
      { href: '/resources', label: 'Resources', isLive: false },
      { href: '/changelog', label: 'Changelog', isLive: false },
      { href: '/faq', label: 'FAQ', isLive: false },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: '/sign-in', label: 'Sign in', isLive: true },
      { href: '/sign-up', label: 'Create an account', isLive: true },
      { href: '/niche-scan', label: 'Free Niche Scan', isLive: true },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy notice', isLive: false },
      { href: '/legal/terms', label: 'Terms', isLive: false },
      { href: '/legal/ai-use', label: 'How we use AI', isLive: false },
      { href: '/legal/acceptable-use', label: 'Acceptable use', isLive: false },
      { href: '/legal/cancellation-refunds', label: 'Cancellation and refunds', isLive: false },
      { href: '/legal/cookies', label: 'Cookies', isLive: false },
      { href: '/accessibility', label: 'Accessibility', isLive: false },
    ],
  },
]

/**
 * The drafts that exist today, shown until `/legal/*` replaces them (PR7).
 *
 * Separate from the Legal column because the wording differs: these say
 * "(draft)" out loud, which the reviewed versions will not need to.
 */
export const DRAFT_LEGAL_LINKS: readonly SiteLink[] = [
  { href: '/privacy', label: 'Privacy notice (draft)', isLive: true },
  { href: '/terms', label: 'Terms (draft)', isLive: true },
]

/** Drops anything not yet built. The one filter both renderers use. */
export function liveLinks(links: readonly SiteLink[]): readonly SiteLink[] {
  return links.filter((link) => link.isLive)
}

/** Every link the map knows about, live or not. Used by the coverage test. */
export function allSiteLinks(): readonly SiteLink[] {
  return [
    ...NAV_LINKS,
    NICHE_SCAN,
    ...FOOTER_COLUMNS.flatMap((column) => column.links),
    ...DRAFT_LEGAL_LINKS,
  ]
}
