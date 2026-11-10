'use client'

/**
 * S1 · Onboarding — one route, three steps.
 *
 * The draft the client is building lives here and is passed down; the step
 * number lives in the shell's context so the header indicator and this page
 * agree. Nothing is mutated: every change returns a new draft.
 */

import { Card } from '@mirrorline/ui'
import * as React from 'react'

import { SampleDataLabel } from '@/components/marketing/primitives'
import { AccountsStep } from '@/components/onboarding/accounts-step'
import { BrandStep } from '@/components/onboarding/brand-step'
import { LivePreview } from '@/components/onboarding/live-preview'
import { NicheStep } from '@/components/onboarding/niche-step'
import {
  DEFAULT_COLOUR_ID,
  DEFAULT_FONT_VALUE,
  DEFAULT_GOAL,
  DEFAULT_GOAL_LINK,
  DEFAULT_NEARBY_NICHES,
  DEFAULT_NICHE,
  DEFAULT_POSTS_PER_DAY,
  DEFAULT_TONE,
  LOGO_FILE_NAME,
  type ToneAxisId,
  type ToneValues,
} from '@/components/onboarding/onboarding-data'
import { useOnboardingStep } from '@/components/onboarding/step-context'
import { WizardFooter } from '@/components/onboarding/wizard-footer'

interface OnboardingDraft {
  readonly logoFileName: string
  readonly colourId: string
  readonly fontValue: string
  readonly tone: ToneValues
  /** CLAUDE.md non-negotiable 1, made visible. Starts off. */
  readonly rightsConfirmed: boolean
  readonly niche: string
  readonly nearbyNiches: readonly string[]
  readonly goal: string
  readonly goalLink: string
  readonly postsPerDay: string
}

const INITIAL_DRAFT: OnboardingDraft = {
  logoFileName: LOGO_FILE_NAME,
  colourId: DEFAULT_COLOUR_ID,
  fontValue: DEFAULT_FONT_VALUE,
  tone: DEFAULT_TONE,
  rightsConfirmed: false,
  niche: DEFAULT_NICHE,
  nearbyNiches: DEFAULT_NEARBY_NICHES,
  goal: DEFAULT_GOAL,
  goalLink: DEFAULT_GOAL_LINK,
  postsPerDay: DEFAULT_POSTS_PER_DAY,
}

export default function OnboardingPage() {
  const { step, isFirstStep, isLastStep, goBack, goNext } = useOnboardingStep()
  const [draft, setDraft] = React.useState<OnboardingDraft>(INITIAL_DRAFT)

  const update = React.useCallback(
    <Key extends keyof OnboardingDraft>(key: Key, value: OnboardingDraft[Key]) => {
      setDraft((previous) => ({ ...previous, [key]: value }))
    },
    [],
  )

  const updateTone = React.useCallback((axisId: ToneAxisId, value: number) => {
    setDraft((previous) => ({ ...previous, tone: { ...previous.tone, [axisId]: value } }))
  }, [])

  // Step 2 is the only gated step: the rights confirmation holds Continue.
  const canContinue = step !== 2 || draft.rightsConfirmed

  return (
    <div className="flex flex-col gap-5">
      {/* The wizard opens on the demo workspace's brand and accounts, not on
          yours. CLAUDE.md non-negotiable 7: say so, in the fixed wording. */}
      <div className="flex flex-wrap items-center gap-3">
        <SampleDataLabel />
        <p className="m-0 text-meta text-text-muted">
          Prefilled with sample data from our demo workspace. Change anything you like.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <Card
          padding="none"
          className="flex min-w-0 flex-[999_1_520px] flex-col gap-6 rounded-xl p-5 sm:p-[22px]"
        >
          {step === 1 ? (
            <BrandStep
              colourId={draft.colourId}
              onColourChange={(colourId) => update('colourId', colourId)}
              fontValue={draft.fontValue}
              onFontChange={(fontValue) => update('fontValue', fontValue)}
              tone={draft.tone}
              onToneChange={updateTone}
              logoFileName={draft.logoFileName}
              onLogoFileNameChange={(fileName) => update('logoFileName', fileName)}
            />
          ) : null}

          {step === 2 ? (
            <AccountsStep
              rightsConfirmed={draft.rightsConfirmed}
              onRightsConfirmedChange={(confirmed) => update('rightsConfirmed', confirmed)}
            />
          ) : null}

          {step === 3 ? (
            <NicheStep
              niche={draft.niche}
              onNicheChange={(niche) => update('niche', niche)}
              nearbyNiches={draft.nearbyNiches}
              onNearbyNichesChange={(nearbyNiches) => update('nearbyNiches', nearbyNiches)}
              goal={draft.goal}
              onGoalChange={(goal) => update('goal', goal)}
              goalLink={draft.goalLink}
              onGoalLinkChange={(goalLink) => update('goalLink', goalLink)}
              postsPerDay={draft.postsPerDay}
              onPostsPerDayChange={(postsPerDay) => update('postsPerDay', postsPerDay)}
            />
          ) : null}

          <WizardFooter
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canContinue={canContinue}
            onBack={goBack}
            onContinue={goNext}
          />
        </Card>

        {/* Below the form at 390px: the column wraps, the page never scrolls sideways. */}
        <div className="min-w-0 flex-[1_1_280px]">
          <LivePreview colourId={draft.colourId} fontValue={draft.fontValue} tone={draft.tone} />
        </div>
      </div>
    </div>
  )
}
