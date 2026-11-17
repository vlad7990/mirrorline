/**
 * The cookie choice, and the one key it is allowed to write.
 *
 * This used to live inside `cookie-banner.tsx`, which was fine while the
 * banner was the only thing that cared. 18 §3.3 adds a second reader: the
 * co-pilot launcher **must not appear until the banner is dismissed**, because
 * a second floating thing over a consent prompt is a dark pattern. Two
 * components now depend on the same fact, so the fact stops being private to
 * one of them.
 *
 * It is a `.ts` module rather than part of the component for the ordinary
 * reason in this repo: `jsx: "preserve"` means Vitest cannot import a `.tsx`
 * at all, so anything with a rule in it worth testing has to live outside the
 * component. The storage rules here are exactly that — what a blocked
 * `localStorage` does, and what an unrecognised stored value means.
 *
 * **Nothing is written before a choice is made**, and the only thing ever
 * written is the choice itself: a strictly necessary record of a preference,
 * the one category that needs no consent to store.
 */

export const CONSENT_STORAGE_KEY = 'mirrorline.cookie-consent'

/** `essential` declines everything non-essential; `all` accepts. */
export type ConsentChoice = 'essential' | 'all'

export function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'essential' || value === 'all'
}

/**
 * The stored choice, or null when there is not one.
 *
 * Null covers three cases on purpose — never asked, storage blocked, and a
 * value we do not recognise — and all three mean the same thing downstream:
 * ask again, and show nothing that assumes an answer. The conservative
 * failure is to re-ask; the dangerous one is to assume a consent we cannot
 * actually remember being given.
 */
export function readConsentChoice(
  storage: Pick<Storage, 'getItem'> | undefined,
): ConsentChoice | null {
  if (!storage) return null

  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY)
    return isConsentChoice(raw) ? raw : null
  } catch {
    return null
  }
}

/**
 * Record the choice, and say nothing if it cannot be recorded.
 *
 * A failed write is not an error the visitor can act on: the choice still
 * holds for this visit in React state, and the only consequence is being
 * asked again next time. Returns whether it stuck, so a caller that wants to
 * know can look rather than guess.
 */
export function writeConsentChoice(
  storage: Pick<Storage, 'setItem'> | undefined,
  choice: ConsentChoice,
): boolean {
  if (!storage) return false

  try {
    storage.setItem(CONSENT_STORAGE_KEY, choice)
    return true
  } catch {
    return false
  }
}

/** The browser's storage, or undefined on the server and where it is blocked. */
export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    return window.localStorage
  } catch {
    // Reading the property itself throws in some privacy modes, before any
    // get or set is attempted.
    return undefined
  }
}
