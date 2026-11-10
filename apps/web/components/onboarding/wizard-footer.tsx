'use client'

/**
 * The footer under every step: a quiet "Back" on the left and the one primary
 * action on the right. On the last step the primary action is a link into the
 * studio rather than a button, because it leaves the wizard.
 */

import { Button } from '@mirrorline/ui'
import Link from 'next/link'

/** Where "Open my studio" lands. */
const STUDIO_HREF = '/app/home'

export interface WizardFooterProps {
  isFirstStep: boolean
  isLastStep: boolean
  /** False while a step still has something outstanding. */
  canContinue: boolean
  onBack: () => void
  onContinue: () => void
}

export function WizardFooter({
  isFirstStep,
  isLastStep,
  canContinue,
  onBack,
  onContinue,
}: WizardFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
      <Button variant="ghost" onClick={onBack} disabled={isFirstStep} className="text-text-muted">
        Back
      </Button>

      {isLastStep ? (
        <Button asChild variant="primary" size="lg">
          <Link href={STUDIO_HREF}>Open my studio</Link>
        </Button>
      ) : (
        <Button variant="primary" onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
      )}
    </div>
  )
}
