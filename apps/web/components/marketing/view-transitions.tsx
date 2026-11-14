'use client'

/**
 * 17 §1 M11 · A short cross-fade and slide between marketing pages.
 *
 * **Why this and not Next's `experimental.viewTransition`.** That flag needs
 * React's `<ViewTransition>`, which ships only on the experimental channel;
 * `react@19.2.0` exports nothing of the sort, and moving the whole app onto
 * an experimental React for one page transition is not a trade worth making.
 * So this is the browser's own API — which is what 17 names anyway:
 * "View Transitions API with fallback".
 *
 * **One delegated listener, not a `<TransitionLink>`.** The alternative is
 * replacing every `<Link>` across twenty-two routes and then relying on
 * nobody ever writing a plain one again. A single listener on the document
 * covers the header, the footer, the body copy and anything added later, and
 * it is one place to delete if this has to come out.
 *
 * **It wraps Next's navigation rather than taking it over, and the first
 * attempt had that backwards.** React attaches its listeners to the root
 * container, which is *inside* `document`, so `<Link>`'s handler runs first
 * and has already called `preventDefault()` by the time a bubble-phase
 * listener here sees the click. The first version read that as "someone else
 * handled this" and bailed: zero transitions, on a preview where the API was
 * supported and the navigation worked perfectly. Nothing failed, which is
 * why only opening it in a browser found it.
 *
 * So `defaultPrevented` is now the *signal* that Next has taken the
 * navigation. We do not preventDefault, we do not `router.push`, and we
 * never `stopPropagation` — which would have been the other fix, and would
 * have silently broken every component that closes itself when you click a
 * link inside it. `startViewTransition` captures the outgoing snapshot
 * synchronously, and React cannot have committed the new route inside the
 * same task, so the snapshot is still the page being left.
 *
 * **It is scoped to the public site, and that is a decision.**
 * `studio-nav.tsx` carries the rule that the arrival of a studio screen
 * stays instant, because people move between those screens dozens of times a
 * day and a transition on one reads as lag rather than as feedback. This
 * component is mounted by the marketing layout, so it never sees a studio
 * navigation — and `isPublicPath` would refuse one if it did.
 *
 * **The freeze is the risk worth engineering against.** A view transition
 * holds a frozen screenshot of the old page until the callback's promise
 * settles, so a stalled navigation leaves the reader looking at a picture of
 * a page that no longer answers. The promise is therefore resolved by the
 * pathname actually changing *and* by a hard timeout, whichever comes first.
 * A transition that gives up early is a cross-fade nobody notices; one that
 * never gives up is a broken site.
 */

import { usePathname } from 'next/navigation'
import * as React from 'react'

/**
 * Longer than any statically prerendered marketing route needs, and short
 * enough that a stall reads as a slow page rather than a dead one.
 */
const SETTLE_TIMEOUT_MS = 1_000

/** Everything under `/app` is the studio, and keeps its instant arrival. */
function isPublicPath(pathname: string): boolean {
  return !pathname.startsWith('/app')
}

export function ViewTransitions() {
  const pathname = usePathname()
  const settle = React.useRef<(() => void) | null>(null)

  // The new snapshot is taken when the callback's promise resolves, so it has
  // to resolve *after* the new route has rendered — not when `push` returns,
  // which is immediately, and would photograph the old page twice.
  React.useEffect(() => {
    settle.current?.()
    settle.current = null
  }, [pathname])

  React.useEffect(() => {
    // Both of these are the fallback, and the fallback is an ordinary
    // navigation: no class, no polyfill, nothing left behind.
    if (typeof document.startViewTransition !== 'function') return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const onClick = (event: MouseEvent) => {
      // `defaultPrevented` is required, not disqualifying: it means Next's
      // Link has taken this click and is navigating on the client. A click it
      // did not take is a full page load, which the browser transitions (or
      // does not) on its own.
      if (!event.defaultPrevented || event.button !== 0) return
      // A modified click is the reader asking for a new tab or a download.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const next = new URL(anchor.href, window.location.href)
      if (next.origin !== window.location.origin) return
      // Same page: a hash link, or the nav item you are already on.
      // Animating a page into itself is a flicker with nothing to show for it.
      if (next.pathname === window.location.pathname) return
      if (!isPublicPath(next.pathname)) return

      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            let done = false
            const finish = () => {
              if (done) return
              done = true
              window.clearTimeout(timer)
              resolve()
            }

            const timer = window.setTimeout(finish, SETTLE_TIMEOUT_MS)
            settle.current = finish
          }),
      )
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
