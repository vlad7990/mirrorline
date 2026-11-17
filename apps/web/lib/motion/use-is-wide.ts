'use client'

/**
 * Is there room for a panel beside the content, or does it have to cover it?
 *
 * The `xl` breakpoint, and the one question two screens now ask. It was
 * private to `calendar-view.tsx` while the post panel was the only thing that
 * split this way; 18 §2.4 then asked the co-pilot to "copy the calendar's
 * post-panel split so the studio has one answer to 'where does the detail
 * go'", and one answer means one hook rather than two copies that can drift
 * to different pixel values.
 *
 * ## The server snapshot, and what it costs
 *
 * `useSyncExternalStore` needs a server snapshot and there is no viewport on
 * the server, so this returns `false` — narrow — and hydration corrects it.
 * That is a real trade and worth naming: on a wide screen the first paint is
 * the narrow layout for one frame.
 *
 * **It is the right trade in this direction.** Narrow-first means the server
 * renders the drawer closed and the inline aside absent; correcting *to* wide
 * adds an element. Starting wide would render an aside that a narrow client
 * then has to remove, and removing server-rendered content during hydration
 * is the shape that produces a mismatch. D55 recorded React #418 at
 * `/app/calendar` and 390px as never reproducing; this snapshot is the first
 * thing to re-read if it comes back, which is why the reasoning is here
 * rather than in a commit message.
 *
 * ## Re-read on 16 November: #418 cannot be width-specific on this route
 *
 * The queue carried "React #418 at `/app/calendar`, 390px" through five pull
 * requests. D55 failed to reproduce it in 70 fresh browser contexts. What
 * follows is the argument for why no number of contexts would have found it,
 * which is worth more than another run — and it is why the next person reads
 * this file instead of loading the page again.
 *
 * **The server has no viewport, and this app never asks for one.** No
 * `userAgent()`, no `next/headers`, no viewport client hint, no `innerWidth`
 * and no `clientWidth` anywhere in `apps/web` or `packages/ui` — swept, not
 * assumed. The HTML for `/app/calendar` is therefore the same bytes at 390 as
 * at 1440, and a mismatch that appears at one width but not the other has
 * nowhere to come from.
 *
 * **Every responsive split on that route is CSS, which hydration cannot see.**
 * The sidebar is `hidden lg:block`, the mobile bar is `lg:hidden`, and the
 * post panel's aside is `hidden xl:block` — present in the server HTML at
 * every width and hidden by a class, not by a branch.
 *
 * **This hook is the single exception, and both its consumers are safe.**
 * `calendar-view.tsx` spends it on `<Dialog open={!isWide && isDrawerOpen}>`;
 * `studio-copilot.tsx` spends it on `{isOpen ? <StudioCopilotPanel
 * isWide={isWide} ... /> : null}`. In both the value is ANDed with a
 * `useState(false)`, so the first render is the same tree whatever the
 * viewport says. C3 added the second consumer *after* D55 was written, and it
 * inherited the shape rather than breaking it.
 *
 * **What would invalidate all of the above:** server-side width branching —
 * `userAgent()` or a client hint read in a server component — or a consumer
 * that renders `isWide` directly rather than behind a `false`-initial state.
 * Either makes this file a suspect again. Neither exists today.
 */

import { useMemo, useSyncExternalStore } from 'react'

/** Tailwind's `xl`. Kept as a string so the hook and the classes agree. */
export const WIDE_QUERY = '(min-width: 1280px)'

export function useIsWide(): boolean {
  const subscribe = useMemo(
    () => (onChange: () => void) => {
      const list = window.matchMedia(WIDE_QUERY)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    // The server has no viewport; start narrow and let hydration correct it.
    () => false,
  )
}
