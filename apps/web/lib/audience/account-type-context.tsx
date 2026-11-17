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
 *
 * **The URL is read by a child, not by this provider, and that is what lets
 * the marketing site render on the server at all.** `useSearchParams` opts
 * its whole subtree out of static rendering unless a Suspense boundary sits
 * above it. While this provider read the params itself, the only place to put
 * that boundary was around the entire marketing layout — and so the
 * prerendered HTML of every public page *was the fallback*: no header, no
 * `<main>`, no footer, none of the copy, with the client building all of it
 * after hydration. Measured on a production build, `/` contained zero
 * `<main>` elements. See D46.
 *
 * So `SearchParamsReader` below is the only thing inside a boundary. It
 * renders nothing, reads the two params and reports them upward, and the
 * shell and the page prerender as static HTML.
 *
 * **The cost, stated plainly:** someone arriving on a shared
 * `?who=individual` link sees the default for one effect tick before the URL
 * is applied, where previously the client's first render already had it. That
 * is the same deal storage has always had, one paragraph above, and it is the
 * price of the page being in the HTML at all. Precedence is unchanged — URL,
 * then storage, then the default.
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

/** Whichever of the two params the URL actually carries, validated. */
interface UrlChoice {
  readonly audience?: Audience
  readonly stage?: AccountStage
}

/** Nothing in the URL. A module constant, so it is a stable initial state. */
const NO_URL_CHOICE: UrlChoice = {}

/**
 * The one component that reads the query string, and the only thing on the
 * public site that needs a Suspense boundary above it.
 *
 * It renders `null`, so its boundary's fallback is `null` too and nothing
 * flashes. The two params are handled independently rather than through
 * `parseChoiceFromParams`, which is all-or-nothing: `?who=individual` on its
 * own has to still set the audience.
 */
function SearchParamsReader({ onChange }: { onChange: (next: UrlChoice) => void }) {
  const searchParams = useSearchParams()
  const audience = searchParams.get(AUDIENCE_PARAM)
  const stage = searchParams.get(STAGE_PARAM)

  React.useEffect(() => {
    onChange({
      audience: isAudience(audience) ? audience : undefined,
      stage: isAccountStage(stage) ? stage : undefined,
    })
  }, [audience, stage, onChange])

  return null
}

export function AccountChoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [fromUrl, setFromUrl] = React.useState<UrlChoice>(NO_URL_CHOICE)
  const [stored, setStored] = React.useState<AccountChoice | null>(null)
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    setStored(readStoredChoice())
    setIsHydrated(true)
  }, [])

  const choice = React.useMemo<AccountChoice>(
    () => ({
      audience: fromUrl.audience ?? stored?.audience ?? DEFAULT_CHOICE.audience,
      stage: fromUrl.stage ?? stored?.stage ?? DEFAULT_CHOICE.stage,
    }),
    [fromUrl, stored],
  )

  const commit = React.useCallback(
    (next: AccountChoice) => {
      setStored(next)
      writeStoredChoice(next)

      // Read the live query string rather than a subscribed copy: this
      // provider no longer watches `useSearchParams`, and this runs from a
      // click, so `window.location` is both available and current. Starting
      // from it keeps any other param — `?plan=growth` — on the URL.
      const params = new URLSearchParams(window.location.search)
      params.set(AUDIENCE_PARAM, next.audience)
      params.set(STAGE_PARAM, next.stage)
      // `scroll: false` because the picker sits mid-page: jumping to the top
      // on every toggle would throw away the reader's position. `replace`
      // rather than `push` so the back button leaves the page rather than
      // walking back through every toggle.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router],
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

  return (
    <AccountChoiceContext.Provider value={value}>
      {/* The boundary is this small on purpose — see the file header. */}
      <React.Suspense fallback={null}>
        <SearchParamsReader onChange={setFromUrl} />
      </React.Suspense>
      {children}
    </AccountChoiceContext.Provider>
  )
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
