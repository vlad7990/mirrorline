'use client'

/**
 * The visitor's Business/Individual × New/Existing choice, shared down the page.
 *
 * Sections below the picker read this to swap their examples and their CTA
 * (16 §3 row 1). Nothing here knows about industries.
 *
 * **Precedence: URL, then storage, then the default.** A link someone was sent
 * has to win over whatever that person chose on a previous visit, or a shared
 * `?who=individual&account=new` would silently open on the wrong reading.
 *
 * **The first render is always the default**, on the server and on the client
 * alike, and storage is applied in an effect afterwards. Reading
 * `localStorage` while rendering would make the server and client markup
 * disagree — a hydration mismatch, and a silent one, because React patches
 * the text and moves on.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import {
  AUDIENCE_PARAM,
  type AccountChoice,
  type AccountStage,
  type Audience,
  DEFAULT_CHOICE,
  STAGE_PARAM,
  isAccountStage,
  isAudience,
  readStoredChoice,
  writeStoredChoice,
} from './account-type'

interface AccountChoiceValue {
  readonly choice: AccountChoice
  readonly setAudience: (audience: Audience) => void
  readonly setStage: (stage: AccountStage) => void
  /**
   * False until storage has been applied. The picker uses it to avoid
   * announcing a selection change that is really just the stored value
   * arriving.
   */
  readonly isHydrated: boolean
}

const AccountChoiceContext = React.createContext<AccountChoiceValue | null>(null)

export function AccountChoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [stored, setStored] = React.useState<AccountChoice | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    setStored(readStoredChoice())
    setIsHydrated(true)
  }, [])

  const urlAudience = searchParams.get(AUDIENCE_PARAM)
  const urlStage = searchParams.get(STAGE_PARAM)

  const choice = React.useMemo<AccountChoice>(
    () => ({
      audience: isAudience(urlAudience)
        ? urlAudience
        : (stored?.audience ?? DEFAULT_CHOICE.audience),
      stage: isAccountStage(urlStage) ? urlStage : (stored?.stage ?? DEFAULT_CHOICE.stage),
    }),
    [urlAudience, urlStage, stored],
  )

  const commit = React.useCallback(
    (next: AccountChoice) => {
      setStored(next)
      writeStoredChoice(next)

      const params = new URLSearchParams(searchParams.toString())
      params.set(AUDIENCE_PARAM, next.audience)
      params.set(STAGE_PARAM, next.stage)
      // `scroll: false` because the picker sits mid-page: jumping to the top
      // on every toggle would throw away the reader's position. `replace`
      // rather than `push` so the back button leaves the page rather than
      // walking back through every toggle.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const value = React.useMemo<AccountChoiceValue>(
    () => ({
      choice,
      isHydrated,
      setAudience: (audience) => commit({ ...choice, audience }),
      setStage: (stage) => commit({ ...choice, stage }),
    }),
    [choice, commit, isHydrated],
  )

  return <AccountChoiceContext.Provider value={value}>{children}</AccountChoiceContext.Provider>
}

/**
 * Read the visitor's choice.
 *
 * Falls back to the default outside a provider rather than throwing. A
 * marketing section is not worth a white screen, and every caller has a
 * sensible rendering for the default anyway.
 */
export function useAccountChoice(): AccountChoiceValue {
  const context = React.useContext(AccountChoiceContext)

  const fallback = React.useMemo<AccountChoiceValue>(
    () => ({
      choice: DEFAULT_CHOICE,
      isHydrated: false,
      setAudience: () => undefined,
      setStage: () => undefined,
    }),
    [],
  )

  return context ?? fallback
}
