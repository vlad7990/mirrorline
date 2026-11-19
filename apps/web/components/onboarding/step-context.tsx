'use client'

/**
 * Which of the three onboarding steps is on screen.
 *
 * The step lives in React state so the wizard never reloads between steps, and
 * it is mirrored into `?step=` so a screenshot run or an end-to-end test can
 * deep-link straight to step 2 or 3.
 *
 * The layout draws the progress indicator and the page draws the panels, so the
 * state sits in a context above both.
 *
 * ============================================================================
 * The mirror writes the URL; it must never *navigate*
 * ============================================================================
 *
 * This used to be `router.replace`, and that one word cost two days. The step
 * is already in React state — the panels are swapped by `setStep`, not by the
 * router — so the URL write is a mirror of state we have already applied, kept
 * only so a reload and `helpers/routes.ts`'s `?step=2` deep links land on the
 * right panel. `router.replace` makes that cosmetic write a **navigation**, and
 * a navigation can stall the whole router:
 *
 * - Next dispatches every non-restore action by calling
 *   `setState(deferredPromise)`, and `useActionQueue` does `use(state)` on it,
 *   so a navigation in flight **suspends the router** until it settles.
 * - A second navigation dispatched before the first commits marks the first
 *   `discarded`. `handleResult` returns early for a discarded action, so it
 *   neither resolves that promise nor advances the queue — and the navigate
 *   branch never reassigns `actionQueue.last`, which still points at the dead
 *   node. The next non-navigation action is appended behind it and never runs.
 * - The next non-navigation action here is the form's **server action**. So two
 *   quick Continues followed by Submit left `saveOnboarding` queued behind a
 *   promise that could not resolve: no POST was ever sent, the URL never left
 *   `/app/onboarding`, and the button sat on "Saving your setup…" for ever.
 *
 * Whether the race was lost came down to whether the second click beat the
 * first RSC round trip home — and that round trip goes through `middleware.ts`,
 * which verifies the token with Supabase over the network. Remote, variable
 * latency decided it, which is why the same commit passed one day and failed
 * the next, and why raising a timeout only hid it.
 *
 * `window.history.replaceState` is the write without the navigation. Next
 * patches it (`app-router.js`), copies its own history state across and
 * dispatches `ACTION_RESTORE` — which `dispatchAction` handles
 * **synchronously**, creating no promise and no queue entry — so `usePathname`
 * and `useSearchParams` still hold the new value, with no round trip to stall
 * on and nothing for a later action to queue behind. The RSC request it used to
 * make fetched a byte-identical payload every time anyway: this route is
 * static, and the step is a client concern the server has no opinion about.
 */

import { useSearchParams } from 'next/navigation'
import * as React from 'react'

export type StepNumber = 1 | 2 | 3

export interface OnboardingStepDefinition {
  readonly number: StepNumber
  /** Sentence case, exactly as the indicator prints it. */
  readonly label: string
}

export const ONBOARDING_PATH = '/app/onboarding'

/** 03_SCREENS_SPEC.md "S1 · Onboarding (3 steps)". */
export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
  { number: 1, label: 'Your brand' },
  { number: 2, label: 'Connect accounts' },
  { number: 3, label: 'Niche and goal' },
]

const FIRST_STEP: StepNumber = 1
const LAST_STEP: StepNumber = 3

/** Anything we do not recognise falls back to the first step. */
export function parseStep(raw: string | null): StepNumber {
  if (raw === '2') return 2
  if (raw === '3') return 3
  return FIRST_STEP
}

function clampStep(value: number): StepNumber {
  if (value <= FIRST_STEP) return FIRST_STEP
  if (value >= LAST_STEP) return LAST_STEP
  return 2
}

export interface OnboardingStepContextValue {
  readonly step: StepNumber
  readonly isFirstStep: boolean
  readonly isLastStep: boolean
  readonly goToStep: (step: StepNumber) => void
  readonly goNext: () => void
  readonly goBack: () => void
}

const OnboardingStepContext = React.createContext<OnboardingStepContextValue | null>(null)

export interface OnboardingStepProviderProps {
  children: React.ReactNode
}

export function OnboardingStepProvider({ children }: OnboardingStepProviderProps) {
  const searchParams = useSearchParams()
  const requestedStep = parseStep(searchParams.get('step'))
  const [step, setStep] = React.useState<StepNumber>(requestedStep)

  // A deep link, or the browser Back button, wins over the local copy.
  React.useEffect(() => {
    setStep(requestedStep)
  }, [requestedStep])

  const goToStep = React.useCallback((next: StepNumber) => {
    setStep(next)
    // replace, not push: the wizard is one screen, not three history entries.
    // And `history.replaceState`, not `router.replace`: see the note at the top
    // — mirroring the step must not dispatch a navigation.
    window.history.replaceState(null, '', `${ONBOARDING_PATH}?step=${next}`)
  }, [])

  const value = React.useMemo<OnboardingStepContextValue>(
    () => ({
      step,
      isFirstStep: step === FIRST_STEP,
      isLastStep: step === LAST_STEP,
      goToStep,
      goNext: () => goToStep(clampStep(step + 1)),
      goBack: () => goToStep(clampStep(step - 1)),
    }),
    [step, goToStep],
  )

  return <OnboardingStepContext.Provider value={value}>{children}</OnboardingStepContext.Provider>
}

export function useOnboardingStep(): OnboardingStepContextValue {
  const value = React.useContext(OnboardingStepContext)

  if (value === null) {
    throw new Error('useOnboardingStep must be used inside <OnboardingStepProvider>.')
  }

  return value
}
