'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { NAV_ITEMS, isNavItemActive } from './nav-items'

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
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
                className={[
                  'flex min-h-touch items-center rounded-md px-3 text-label',
                  // DESIGN.md "Motion — Press": a 3% dip on :active, fine
                  // pointers only, dropped under prefers-reduced-motion. This
                  // is the ONLY motion the nav gets. The arrival of the screen
                  // itself stays instant — no fade, no slide, no stagger —
                  // because moving between studio screens is something a
                  // person does dozens of times a day, and a transition on it
                  // would read as lag rather than as feedback. `.press` owns
                  // the transition shorthand, so the hover tint lands at once.
                  'press',
                  isActive
                    ? 'bg-accent-soft font-semibold text-on-accent-soft'
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
