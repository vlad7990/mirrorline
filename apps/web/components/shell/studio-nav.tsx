'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NAV_ITEMS, isNavItemActive } from './nav-items'
import { SlidingIndicator } from './sliding-indicator'

/**
 * The studio navigation list. The sidebar and the mobile drawer both render
 * this, so the active state is worked out in exactly one place.
 *
 * DESIGN.md "Components": "Sidebar nav item: 44px tall; the active one uses
 * accent-soft with dark-coral text."
 */

export function StudioNav({
  className,
  onNavigate,
}: {
  className?: string
  /** Called after a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Studio" className={className}>
      <ul className="relative flex flex-col gap-0.5">
        {/* The active fill, as one element that moves (17 §2). It sits behind
            the links, so the active link no longer paints its own. */}
        <SlidingIndicator axis="y" activeKey={pathname} className="nav-indicator" />
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
                className={[
                  // `relative`, so the link paints above the marker behind it.
                  'relative flex min-h-touch items-center rounded-md px-3 text-label',
                  // DESIGN.md "Motion — Press": a 3% dip on :active, fine
                  // pointers only, dropped under prefers-reduced-motion.
                  //
                  // **The arrival of the screen itself stays instant** — no
                  // fade, no slide, no stagger — because moving between studio
                  // screens is something a person does dozens of times a day,
                  // and a transition on it reads as lag rather than as
                  // feedback. That rule has not changed; it used to say this
                  // was the only motion the nav got, and 17 §2 added one more
                  // that does not break it. The marker behind these links
                  // slides, but nothing waits on it: the link is styled active
                  // the instant the route changes, and the marker is
                  // `aria-hidden` decoration catching up.
                  'press',
                  isActive
                    ? // The fill now comes from the marker, so the active link
                      // contributes only its text treatment.
                      'font-semibold text-on-accent-soft'
                    : 'font-medium text-text-muted hover:bg-surface-subtle hover:text-text',
                ].join(' ')}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
