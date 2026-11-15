'use client'

/**
 * One consent answer, shared by the banner that asks and the launcher that waits.
 *
 * 18 §3.3: the co-pilot launcher is "not shown until the cookie banner is
 * dismissed", because a second floating thing on top of a consent prompt is a
 * dark pattern — and the banner is already `fixed` to the bottom of every
 * public page. Two components, one fact, so the fact lives above both of them
 * rather than being inferred twice from storage.
 *
 * **The first render is always "not yet known", on the server and the client
 * alike**, and storage is read in an effect afterwards. This is the same rule
 * `account-type-context.tsx` follows and for the same reason: reading
 * `localStorage` during render makes the two markups disagree, and React
 * patches a hydration mismatch silently rather than telling anyone.
 *
 * So there are three states and they are deliberately distinct: not resolved
 * (show neither), resolved with no choice (show the banner, not the
 * launcher), resolved with a choice (show the launcher, not the banner).
 */

import * as React from 'react'

import {
  type ConsentChoice,
  browserStorage,
  readConsentChoice,
  writeConsentChoice,
} from './cookie-consent'

interface CookieConsentValue {
  /** Null until a choice exists — including while storage is still unread. */
  readonly choice: ConsentChoice | null
  /** False until the effect has looked. Nothing consent-gated renders before it. */
  readonly isResolved: boolean
  /** The gate 18 §3.3 names: the banner has been answered and is gone. */
  readonly hasChosen: boolean
  readonly choose: (choice: ConsentChoice) => void
}

const CookieConsentContext = React.createContext<CookieConsentValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = React.useState<ConsentChoice | null>(null)
  const [isResolved, setIsResolved] = React.useState(false)

  React.useEffect(() => {
    setChoice(readConsentChoice(browserStorage()))
    setIsResolved(true)
  }, [])

  const choose = React.useCallback((next: ConsentChoice) => {
    // The write may fail — blocked storage — and the choice still holds for
    // this visit, which is why state is set either way.
    writeConsentChoice(browserStorage(), next)
    setChoice(next)
  }, [])

  const value = React.useMemo<CookieConsentValue>(
    () => ({ choice, isResolved, hasChosen: choice !== null, choose }),
    [choice, isResolved, choose],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent(): CookieConsentValue {
  const value = React.useContext(CookieConsentContext)
  if (!value) {
    // Loud rather than a default, because the quiet failure here is a
    // launcher that renders over an unanswered consent banner.
    throw new Error('useCookieConsent must be used inside CookieConsentProvider')
  }
  return value
}
