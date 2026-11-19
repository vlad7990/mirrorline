'use client'

/**
 * The footer under every step: a quiet "Back" on the left and the one primary
 * action on the right.
 *
 * **The last step submits rather than navigates.** It used to be a `Link` to
 * the studio, which was correct while onboarding was a prefilled demo that
 * saved nothing — the wizard had no answer to lose. Now it writes the niche and
 * the goal (`app/app/onboarding/actions.ts`), so leaving by link would discard
 * exactly the three answers the step exists to collect, and do it silently.
 *
 * `Button` already defaults `type` to `'button'`, so Back and Continue cannot
 * submit the form the way an unqualified button inside a form would. Only this
 * one asks for `type="submit"`.
 */

import { Button } from '@mirrorline/ui'

export interface WizardFooterProps {
  isFirstStep: boolean
  isLastStep: boolean
  /** False while a step still has something outstanding. */
  canContinue: boolean
  /** True while the save is in flight, so the action cannot be double-sent. */
  isSubmitting: boolean
  onBack: () => void
  onContinue: () => void
}

export function WizardFooter({
  isFirstStep,
  isLastStep,
  canContinue,
  isSubmitting,
  onBack,
  onContinue,
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      <Button
        variant="ghost"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className="text-text-muted"
      >
        Back
      </Button>

      {isLastStep ? (
        <Button type="submit" variant="primary" size="lg" disabled={!canContinue || isSubmitting}>
          {isSubmitting ? 'Saving your setup…' : 'Open my studio'}
        </Button>
      ) : (
        <Button variant="primary" onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
      )}
    </div>
  )
}
