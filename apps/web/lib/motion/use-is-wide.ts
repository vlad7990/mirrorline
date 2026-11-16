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
