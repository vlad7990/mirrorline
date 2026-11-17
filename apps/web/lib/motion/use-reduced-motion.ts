'use client'

/**
 * Does this reader want stillness?
 *
 * Most movement on this site is CSS inside a `prefers-reduced-motion:
 * no-preference` block, which needs no JavaScript at all — see the top of
 * `globals.css`. This hook is for the case where the preference changes what
 * is *rendered* rather than how it moves: the co-pilot's answer, which types
 * itself under no-preference and simply appears otherwise (18 §2.4). CSS
 * cannot express "show the finished sentence instead of the stream".
 *
 * It listens for changes rather than reading once, because the preference can
 * be toggled mid-session at the operating-system level and a panel that is
 * already open should follow.
 *
 * The first value is always `false`, on the server and the first client
 * render alike, with the real answer arriving in the effect — the same
 * hydration rule the rest of this app follows.
 */

import * as React from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function useReducedMotion(): boolean {
  const [isReduced, setIsReduced] = React.useState(false)

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const media = window.matchMedia(QUERY)
    const update = () => setIsReduced(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isReduced
}
