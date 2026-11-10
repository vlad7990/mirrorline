'use client'

/**
 * The frame around the onboarding wizard: no sidebar, one centred column, the
 * wordmark top left and the progress indicator top right.
 *
 * It also owns the step state, because both the indicator (here) and the
 * panels (in the page) read it.
 */

import { LogoWordmark } from '@mirrorline/ui'
import * as React from 'react'

import { OnboardingStepProvider } from './step-context'
import { StepIndicator } from './step-indicator'

/** 02_BRAND_AND_VOICE.md "Layout and components": content max ~1200px. */
const COLUMN = 'mx-auto w-full max-w-[1080px]'

export interface OnboardingShellProps {
  children: React.ReactNode
}

export function OnboardingShell({ children }: OnboardingShellProps) {
  return (
    <OnboardingStepProvider>
      <div className="flex min-h-dvh flex-col gap-8 bg-background px-5 pt-10 pb-16 sm:px-6">
        <header className={`${COLUMN} flex flex-wrap items-center justify-between gap-4`}>
          <LogoWordmark size={28} />
          <StepIndicator />
        </header>
        {/* tabIndex={-1} so the skip link moves focus, not just scroll position.
            Safari otherwise jumps the viewport and leaves focus at the top of
            the document, sending the next Tab back to the start. */}
        <main id="main" tabIndex={-1} className={COLUMN}>
          {children}
        </main>
      </div>
    </OnboardingStepProvider>
  )
}
