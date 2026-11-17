'use client'

/**
 * S1 · Onboarding — one route, three steps.
 *
 * The draft the client is building lives here and is passed down; the step
 * number lives in the shell's context so the header indicator and this page
 * agree. Nothing is mutated: every change returns a new draft.
 *
 * ============================================================================
 * The draft is prefilled; the outcome is not, and that is deliberate
 * ============================================================================
 *
 * Every other field opens on the demo workspace's values, labelled "Sample
 * data" per non-negotiable 7 — a starting point somebody can edit.
 * `outcomeText` starts **empty**, alone among them, because it is written to
 * `goals.outcome_text`, which the schema describes as "the outcome in the
 * user's own words". Prefilling it would put a sentence nobody wrote into the
 * one column that claims authorship, and the Results Ledger quotes that column
 * back to them. So the last step cannot be completed until they write it.
 */

import { Card } from '@mirrorline/ui'
import * as React from 'react'

import { SampleDataLabel } from '@/components/marketing/primitives'
import { AccountsStep } from '@/components/onboarding/accounts-step'
import { BrandStep } from '@/components/onboarding/brand-step'
import { LivePreview } from '@/components/onboarding/live-preview'
import { NicheStep } from '@/components/onboarding/niche-step'
import {
  DEFAULT_AUDIENCE,
  DEFAULT_COLOUR_ID,
  DEFAULT_FONT_VALUE,
  DEFAULT_GOAL_KEY,
  DEFAULT_GOAL_LINK,
  DEFAULT_NEARBY_NICHES,
  DEFAULT_NICHE,
  DEFAULT_POSTS_PER_DAY,
  DEFAULT_STAGE,
  DEFAULT_TONE,
  LOGO_FILE_NAME,
  type ToneAxisId,
  type ToneValues,
} from '@/components/onboarding/onboarding-data'
import { useOnboardingStep } from '@/components/onboarding/step-context'
import { WizardFooter } from '@/components/onboarding/wizard-footer'

import { saveOnboarding } from './actions'
import { IDLE_ONBOARDING_STATE } from './onboarding-form-state'

interface OnboardingDraft {
  readonly logoFileName: string
  readonly colourId: string
  readonly fontValue: string
  readonly tone: ToneValues
  /** CLAUDE.md non-negotiable 1, made visible. Starts off. */
  readonly rightsConfirmed: boolean
  /** 16 §1's 2×2: a business or an individual, new or existing. */
  readonly audience: string
  readonly stage: string
  /** Free text (16 §1). Never a dropdown — see `onboarding-data.ts`. */
  readonly niche: string
  readonly nearbyNiches: readonly string[]
  /** A `GoalKey` from 15 §2. The goal decides the KPI set, not the industry. */
  readonly goal: string
  /** `goals.outcome_text`. Empty until written — see the note at the top. */
  readonly outcomeText: string
  readonly goalLink: string
  readonly postsPerDay: string
}

const INITIAL_DRAFT: OnboardingDraft = {
  logoFileName: LOGO_FILE_NAME,
  colourId: DEFAULT_COLOUR_ID,
  fontValue: DEFAULT_FONT_VALUE,
  tone: DEFAULT_TONE,
  rightsConfirmed: false,
  audience: DEFAULT_AUDIENCE,
  stage: DEFAULT_STAGE,
  niche: DEFAULT_NICHE,
  nearbyNiches: DEFAULT_NEARBY_NICHES,
  goal: DEFAULT_GOAL_KEY,
  outcomeText: '',
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

  const [state, formAction, isSubmitting] = React.useActionState(
    saveOnboarding,
    IDLE_ONBOARDING_STATE,
  )

  // Two gated steps now. Step 2 is the rights confirmation (non-negotiable 1);
  // step 3 is the outcome, which cannot be prefilled and so cannot be skipped.
  const hasOutcome = draft.outcomeText.trim().length > 0
  const canContinue = step === 2 ? draft.rightsConfirmed : step !== 3 || hasOutcome

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* The four closed-vocabulary answers travel as hidden fields: they are
          set by a SegmentedControl and a Select, which hold their value in
          React rather than in a named form control. `outcomeText` is a real
          <textarea name="outcomeText"> inside NicheStep, so it posts itself. */}
      <input type="hidden" name="niche" value={draft.niche} />
      <input type="hidden" name="audience" value={draft.audience} />
      <input type="hidden" name="stage" value={draft.stage} />
      <input type="hidden" name="goalType" value={draft.goal} />
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
              audience={draft.audience}
              onAudienceChange={(audience) => update('audience', audience)}
              stage={draft.stage}
              onStageChange={(stage) => update('stage', stage)}
              niche={draft.niche}
              onNicheChange={(niche) => update('niche', niche)}
              nearbyNiches={draft.nearbyNiches}
              onNearbyNichesChange={(nearbyNiches) => update('nearbyNiches', nearbyNiches)}
              goal={draft.goal}
              onGoalChange={(goal) => update('goal', goal)}
              outcomeText={draft.outcomeText}
              onOutcomeTextChange={(outcomeText) => update('outcomeText', outcomeText)}
              goalLink={draft.goalLink}
              onGoalLinkChange={(goalLink) => update('goalLink', goalLink)}
              postsPerDay={draft.postsPerDay}
              onPostsPerDayChange={(postsPerDay) => update('postsPerDay', postsPerDay)}
            />
          ) : null}

          {/* `role="alert"` rather than a toast: this is the reason the button
              did not do what it said, and it has to be read before the next
              attempt. Next ships its own route announcer, so the copy is what
              distinguishes this one. */}
          {state.status === 'error' && state.message !== null ? (
            <p
              role="alert"
              className="m-0 rounded-lg bg-danger-soft px-4 py-3 text-body text-on-danger-soft"
            >
              {state.message}
            </p>
          ) : null}

          <WizardFooter
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canContinue={canContinue}
            isSubmitting={isSubmitting}
            onBack={goBack}
            onContinue={goNext}
          />
        </Card>

        {/* Below the form at 390px: the column wraps, the page never scrolls sideways. */}
        <div className="min-w-0 flex-[1_1_280px]">
          <LivePreview colourId={draft.colourId} fontValue={draft.fontValue} tone={draft.tone} />
        </div>
      </div>
    </form>
  )
}
