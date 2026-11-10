/**
 * The studio navigation, in the order DESIGN.md "Layout" fixes:
 * "navigation: Home, Upload, Trends, Calendar, Results, Agents, Brand kit,
 * Settings".
 *
 * One list, shared by the desktop sidebar and the mobile drawer, so the two can
 * never drift apart.
 */

export interface NavItem {
  readonly href: string
  readonly label: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/app/home', label: 'Home' },
  { href: '/app/upload', label: 'Upload' },
  { href: '/app/trends', label: 'Trends' },
  { href: '/app/calendar', label: 'Calendar' },
  { href: '/app/results', label: 'Results' },
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
