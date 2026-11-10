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
 */

import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedStep = parseStep(searchParams.get('step'))
  const [step, setStep] = React.useState<StepNumber>(requestedStep)

  // A deep link, or the browser Back button, wins over the local copy.
  React.useEffect(() => {
    setStep(requestedStep)
  }, [requestedStep])

  const goToStep = React.useCallback(
    (next: StepNumber) => {
      setStep(next)
      // replace, not push: the wizard is one screen, not three history entries.
      router.replace(`${ONBOARDING_PATH}?step=${next}`, { scroll: false })
    },
    [router],
  )

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
