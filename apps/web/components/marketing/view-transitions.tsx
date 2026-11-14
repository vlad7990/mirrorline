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
 *
 * **A transition waits for its own navigation, and that took two goes to get
 * right.** The first version kept one resolver in a ref and fired it on any
 * pathname change, which is correct exactly as long as there is never more
 * than one navigation in the air. Two defects came out of that, and both of
 * them read to a reader as "it went to the wrong page":
 *
 * 1. *Someone else's navigation released the transition.* Click Pricing, then
 *    Compare 70ms later. The second click overwrites the resolver, so when
 *    Pricing commits it resolves the *Compare* transition — which photographs
 *    Pricing as its "new" state and animates that in. Compare then arrives
 *    with no transition at all. The router was never confused; the animation
 *    was, and it showed the reader a page they had already clicked past.
 * 2. *A transition waited for a navigation that had already landed.* The
 *    capture is deferred to the browser's next rendering opportunity, so on a
 *    prefetched route React can commit the new tree before the callback runs.
 *    The pathname change arrives with nothing registered, the callback then
 *    registers a wait for a pathname that is already current, and the screen
 *    holds a picture of the old page for the full timeout — a second of
 *    nothing happening, which is what makes a person click again.
 *
 * So a transition now records *which* pathname it is waiting for, releases
 * immediately if that pathname is already committed, and is superseded — not
 * orphaned — when a later click starts another one.
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

/** A transition holding the screen until one particular pathname commits. */
interface PendingTransition {
  /** The pathname of the link that started it. Nothing else releases it. */
  readonly target: string
  /** Resolves the callback's promise. Safe to call more than once. */
  readonly release: () => void
}

export function ViewTransitions() {
  const pathname = usePathname()
  const pending = React.useRef<PendingTransition | null>(null)
  // The pathname React has actually committed, readable from inside the
  // transition callback — which runs outside of render and so cannot read the
  // `pathname` of the closure that is current by then.
  const committed = React.useRef(pathname)

  // The new snapshot is taken when the callback's promise resolves, so it has
  // to resolve *after* the new route has rendered — not when `push` returns,
  // which is immediately, and would photograph the old page twice.
  React.useEffect(() => {
    committed.current = pathname

    const inFlight = pending.current
    // Only the navigation this transition was started for may release it. Any
    // other one arriving first is a second click overtaking the first, and
    // resolving here would photograph the page the reader has clicked past.
    if (!inFlight || inFlight.target !== pathname) return

    pending.current = null
    inFlight.release()
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

      // Not `target`: that name is already the clicked element above, and the
      // two being one letter apart is how the wrong one gets compared.
      const targetPath = next.pathname

      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            // Superseding is done here rather than in the click handler, and
            // that distinction is the whole of it. The browser defers this
            // callback to its next rendering opportunity, so two clicks in
            // one task both return from `startViewTransition` before either
            // callback has run: a handler that released `pending` would find
            // nothing there, and this line would then overwrite the first
            // transition's registration and orphan it. Releasing at the
            // moment of registration is the only point that sees the real
            // order.
            pending.current?.release()

            // A prefetched route can commit before the browser gets round to
            // calling this. Waiting for a pathname that is already current
            // freezes the screen for the whole timeout, so check first.
            if (committed.current === targetPath) {
              pending.current = null
              resolve()
              return
            }

            let done = false
            const release = () => {
              if (done) return
              done = true
              window.clearTimeout(timer)
              resolve()
            }

            const timer = window.setTimeout(release, SETTLE_TIMEOUT_MS)
            pending.current = { target: targetPath, release }
          }),
      )
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
