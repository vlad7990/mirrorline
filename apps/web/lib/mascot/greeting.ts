/**
 * When Milo is allowed to say hello, and where he keeps quiet.
 *
 * Three rules, and they live here rather than inside an effect because each is
 * a decision somebody will want to change without reading React:
 *
 *   1. **Once per visit**, not once per page. A visitor walking from
 *      `/pricing` to `/product` to `/about` is one visit and gets one wave.
 *   2. **Every visit**, though. Coming back tomorrow is a new visit and he
 *      says hello again — which is the difference between a greeting and an
 *      onboarding step somebody has completed.
 *   3. **Never on `/legal/*`.** Those pages are read by someone checking what
 *      we do with their data or what they are agreeing to, and a cartoon
 *      leaning in to chat over the terms is the wrong instinct. The launcher
 *      itself stays — the bubble does not.
 *
 * ## Why `sessionStorage`, and why that is not a consent question
 *
 * "Once per visit" has to survive a reload, and module scope does not. A tab
 * session is exactly the lifetime wanted: it ends when the tab does, it does
 * not follow anyone between visits, and no other site can read it.
 *
 * It holds one character, `1`, meaning "already waved". It is not an
 * identifier, it is not shared, and nothing can be inferred from it about who
 * is reading — which is why it sits outside the cookie banner's remit rather
 * than waiting on it. 18 §3.3's promise is about the transcript and about
 * tracking; neither is weakened by a flag that says a bubble has been shown.
 *
 * Every function takes storage as an argument, so the rules can be tested
 * without a browser and so a tab with storage disabled degrades to "greet
 * again" rather than throwing.
 */

/** The one key. Namespaced, because `sessionStorage` is shared per origin. */
export const GREETING_STORAGE_KEY = 'mirrorline:milo-greeted'

/** What a greeted session looks like. Any other value is treated as absent. */
const GREETED = '1'

/**
 * A storage that might not work.
 *
 * Safari in private mode throws on `setItem`, and an embedded webview may have
 * no storage at all. Both mean "we cannot remember", not "stop".
 */
export type MaybeStorage = Pick<Storage, 'getItem' | 'setItem'> | null | undefined

/** Pages where the launcher stays and the bubble does not. */
export function isQuietPath(pathname: string): boolean {
  return pathname === '/legal' || pathname.startsWith('/legal/')
}

/**
 * Should Milo wave on this page load?
 *
 * Storage that throws answers `true`: a greeting shown twice is a smaller
 * failure than one never shown, and this is the branch nobody can see while
 * developing.
 */
export function shouldGreet(storage: MaybeStorage, pathname: string): boolean {
  if (isQuietPath(pathname)) return false
  if (!storage) return true

  try {
    return storage.getItem(GREETING_STORAGE_KEY) !== GREETED
  } catch {
    return true
  }
}

/** Remember that this visit has had its greeting. Failure is not an error. */
export function markGreeted(storage: MaybeStorage): void {
  if (!storage) return

  try {
    storage.setItem(GREETING_STORAGE_KEY, GREETED)
  } catch {
    // Private mode, or storage turned off. The greeting simply repeats.
  }
}

/** How long after the page settles Milo speaks. */
export const GREETING_DELAY_MS = 3_000

/** How long the bubble stays before it withdraws on its own. */
export const GREETING_VISIBLE_MS = 6_000

/**
 * How long the wave animation runs, after which Milo returns to `idle`.
 *
 * Shorter than the bubble on purpose: the words stay long enough to read, and
 * the mascot stops moving well before then. A character waving for six
 * seconds reads as a loop rather than as a hello.
 */
export const GREETING_WAVE_MS = 900
