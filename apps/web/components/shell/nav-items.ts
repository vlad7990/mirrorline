/**
 * The studio navigation, in the order DESIGN.md "Layout" fixes:
 * "navigation: Home, Upload, Trends, Calendar, Results, Agents, Brand kit,
 * Settings".
 *
 * One list, shared by the desktop sidebar and the mobile drawer, so the two can
 * never drift apart.
 *
 * **Four changes in v4, all from 16 §5.** Trends is now "Niche Scan", which is
 * what the screen has actually been since PR6 — the agents research your niche
 * rather than handing you a trending list. Goals and KPIs, Accounts and
 * Portfolio are the three new screens.
 *
 * They are inserted around Results rather than appended, because the order of
 * a sidebar is an argument about what the product is for: make it, schedule
 * it, then see what it did and against what. Appending the three measurement
 * screens after Settings would have put the admin before the answer.
 *
 * DESIGN.md's list is the layout's, and it does not forbid screens the content
 * specs added after it was written. The 44px item height and the active
 * treatment, which are what it actually fixes, are untouched.
 */

export interface NavItem {
  readonly href: string
  readonly label: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/app/home', label: 'Home' },
  { href: '/app/upload', label: 'Upload' },
  { href: '/app/trends', label: 'Niche Scan' },
  { href: '/app/calendar', label: 'Calendar' },
  { href: '/app/results', label: 'Results' },
  { href: '/app/goals', label: 'Goals and KPIs' },
  { href: '/app/accounts', label: 'Accounts' },
  { href: '/app/portfolio', label: 'Portfolio' },
  { href: '/app/agents', label: 'Agents' },
  { href: '/app/brand-kit', label: 'Brand kit' },
  { href: '/app/settings', label: 'Settings' },
]

/**
 * True when `pathname` is this item's route or a page nested under it, so a
 * nested route does not leave every item unhighlighted.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
