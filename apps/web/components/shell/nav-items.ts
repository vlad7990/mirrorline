/**
 * The studio navigation, in the order DESIGN.md "Layout" fixes:
 * "navigation: Home, Upload, Trends, Calendar, Results, Agents, Brand kit,
 * Settings".
 *
 * One list, shared by the desktop sidebar and the mobile drawer, so the two can
 * never drift apart.
 *
 * **One rename in v4, from 16 §5.** Trends is "Niche Scan", which is what the
 * screen has actually been since PR6 — the agents research your niche rather
 * than handing you a trending list.
 *
 * **Eight items, and it stays eight.** 16 §5 added three screens and this list
 * briefly ran to eleven, which is where this note comes from. A sidebar is not
 * an index of the routes that exist; it is the handful of places someone goes
 * often, and every item added makes the other ten slightly harder to find. The
 * three measurement screens are reached from wherever someone already is when
 * they want them:
 *
 * - **Goals and KPIs** — a Results tab, and a link on Home's goal card, which
 *   is the thing you are reading when you decide to change a target.
 * - **Accounts** — a Results tab, and a link from Connected accounts in
 *   Settings, which is where you are when an account is the thing on your mind.
 * - **Portfolio** — the workspace switcher. It is the only cross-workspace
 *   screen in the product, and the switcher is already the control for "which
 *   brand am I looking at".
 *
 * All three keep their own route, their own `<h1>`, and their own e2e and axe
 * coverage. Only the sidebar shortcut is gone.
 */

export interface NavItem {
  readonly href: string
  readonly label: string
  /**
   * Other routes this item should light up for.
   *
   * Without it, opening Goals and KPIs or Accounts leaves the whole sidebar
   * unhighlighted — the reader is somewhere the nav says they are not. Both
   * are Results tabs as well as routes, so Results is the honest answer to
   * "where am I".
   */
  readonly alsoActiveFor?: readonly string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/app/home', label: 'Home' },
  { href: '/app/upload', label: 'Upload' },
  { href: '/app/trends', label: 'Niche Scan' },
  { href: '/app/calendar', label: 'Calendar' },
  { href: '/app/results', label: 'Results', alsoActiveFor: ['/app/goals', '/app/accounts'] },
  { href: '/app/agents', label: 'Agents' },
  { href: '/app/brand-kit', label: 'Brand kit' },
  { href: '/app/settings', label: 'Settings' },
]

/**
 * True when `pathname` is this item's route, a page nested under it, or one of
 * the routes it stands in for, so no screen leaves every item unhighlighted.
 *
 * `/app/portfolio` is deliberately claimed by no item: it is reached from the
 * workspace switcher, which sits above the nav, so lighting up a nav item
 * there would point at the wrong control.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const routes = [item.href, ...(item.alsoActiveFor ?? [])]
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
