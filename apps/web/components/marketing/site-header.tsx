'use client'

/**
 * The public site's fixed header — gold and ink (D25).
 *
 * Three stacked pieces, per docs/design/handoff-v4 §"Global layout":
 *   1. a 2px scroll-progress bar in the gold gradient;
 *   2. the announcement bar, a gold gradient strip carrying the pilot
 *      capacity line;
 *   3. an 80px nav row that goes translucent and blurs once the page moves.
 *
 * The whole thing is `fixed`, not `sticky`, because the handoff keeps the
 * announcement visible rather than letting it scroll away. The marketing
 * layout reserves the height with padding so nothing hides underneath.
 *
 * The announcement is the capacity line from D21, restyled. It is the one
 * piece of urgency we can honestly use: a fact about how many clients we will
 * take, not a claim about how many we have. See `PILOT_PLACES`.
 */

import { LogoWordmark, cn } from '@mirrorline/ui'
import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import { PILOT_PLACES } from './capacity-bar'
import { Modal } from './modal'

export interface NavLink {
  readonly href: string
  readonly label: string
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/product', label: 'Product' },
  { href: '/agents', label: 'Agents' },
  { href: '/trust', label: 'Trust' },
  { href: '/pricing', label: 'Pricing' },
]

/** Past this, the nav row goes translucent. The handoff's number. */
const BLUR_AFTER_PX = 40

const LINK_CLASS =
  'relative inline-flex h-11 items-center px-3 text-label font-medium text-on-ink-muted transition-colors hover:text-on-ink-900'

const DRAWER_LINK_CLASS =
  'inline-flex h-12 items-center rounded-md px-3 text-title text-text hover:bg-surface-subtle'

/**
 * How far down the page we are, 0–1.
 *
 * Passive listener and a rAF guard: this fires on every scroll frame, and the
 * one thing a progress bar must not do is make scrolling worse.
 */
function useScrollProgress(): { progress: number; isScrolled: boolean } {
  const [state, setState] = React.useState({ progress: 0, isScrolled: false })

  React.useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const y = window.scrollY
      setState({
        progress: scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0,
        isScrolled: y > BLUR_AFTER_PX,
      })
    }

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return state
}

export function SiteHeader() {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const { progress, isScrolled } = useScrollProgress()
  const pathname = usePathname()

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Decorative: the scrollbar already says this to anyone who can see it,
          and there is nothing here for a screen reader to do. */}
      <div aria-hidden="true" className="h-0.5 w-full">
        <div
          className="h-full origin-left bg-gold-gradient"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {PILOT_PLACES > 0 ? (
        <aside
          aria-label="Pilot availability"
          className="flex min-h-10 items-center justify-center gap-2 bg-gold-gradient px-5 py-2 text-center"
        >
          <p className="m-0 text-label font-semibold text-ink-900">
            Now booking pilots · <span className="machine">{PILOT_PLACES}</span>{' '}
            {PILOT_PLACES === 1 ? 'place' : 'places'} this month
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center text-label font-semibold text-ink-900 underline-offset-4 hover:underline"
          >
            <span className="sr-only">See pricing</span>
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.2} />
          </Link>
        </aside>
      ) : null}

      {/* The nav row. Opaque at rest so the hero does not bleed through on
          first paint; translucent once there is something to blur. */}
      <div
        className={cn(
          'border-b transition-[background-color,backdrop-filter,border-color] duration-500',
          isScrolled
            ? 'border-ink-line bg-ink-900/80 backdrop-blur-xl'
            : 'border-transparent bg-ink-900',
        )}
      >
        <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center rounded-md text-on-ink-900"
            aria-label="Mirrorline, home"
          >
            {/* The mark defaults to the studio's coral; on the site it is
                gold, like everything else that carries the brand here. */}
            <LogoWordmark size={26} markClassName="text-gold-bright" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(LINK_CLASS, isActive && 'text-on-ink-900')}
                >
                  {link.label}
                  {/* The handoff's underline: 1px gold, scaling in from the
                      left. On the active link only, so it reads as position
                      rather than as decoration. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-3 bottom-2 h-px origin-left bg-gold transition-transform duration-[400ms] ease-out',
                      isActive ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center px-2 text-label font-medium text-on-ink-900"
            >
              Sign in
            </Link>
            <LeadDialogButton intent="demo" variant="gold">
              Book a private demo
            </LeadDialogButton>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="press inline-grid size-11 place-items-center rounded-md border border-ink-line-strong bg-ink-700 text-on-ink-900 md:hidden"
            aria-haspopup="dialog"
            aria-expanded={isDrawerOpen}
          >
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.8} />
            <span className="sr-only">Open the menu</span>
          </button>
        </div>
      </div>

      <Modal
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Menu"
        variant="drawer"
        closeLabel="Close the menu"
      >
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsDrawerOpen(false)}
              className={DRAWER_LINK_CLASS}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/sign-in" onClick={() => setIsDrawerOpen(false)} className={DRAWER_LINK_CLASS}>
            Sign in
          </Link>
        </nav>
        <div className="mt-5 flex flex-col gap-2">
          <LeadDialogButton intent="pilot" fullWidth />
          <LeadDialogButton intent="demo" variant="secondary" fullWidth />
        </div>
      </Modal>
    </header>
  )
}
