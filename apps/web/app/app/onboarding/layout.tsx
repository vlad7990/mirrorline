import type { Metadata } from 'next'
import { Suspense } from 'react'

import { OnboardingShell } from '@/components/onboarding/onboarding-shell'

export const metadata: Metadata = {
  title: 'Set up your studio',
  description:
    'Three steps: your brand, the accounts we post to, and the niche and goal every post points at.',
}

export interface OnboardingLayoutProps {
  children: React.ReactNode
}

/**
 * Onboarding has no sidebar: one centred column, the wordmark top left and the
 * progress indicator top right.
 *
 * The shell reads `?step=` through useSearchParams, so it sits behind a
 * Suspense boundary.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <Suspense>
      <OnboardingShell>{children}</OnboardingShell>
    </Suspense>
  )
}
