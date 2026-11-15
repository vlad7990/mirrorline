'use client'

/**
 * The one small launcher, bottom-right (18 §1).
 *
 * **It is labelled AI on its face**, not in a tooltip and not in a footer:
 * §3.3 asks for the label on the launcher and in the panel header, and a
 * badge that only a hover reveals is the version of that rule which does not
 * count.
 *
 * Whether it renders at all is decided above it — `site-copilot.tsx` holds
 * the consent gate — so this component stays a button and nothing more.
 */

import { Button, cn } from '@mirrorline/ui'
import * as React from 'react'

import { AI_TAG, SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'

export interface CopilotLauncherProps {
  readonly isOpen: boolean
  readonly panelId: string
  readonly onOpen: () => void
}

export const CopilotLauncher = React.forwardRef<HTMLButtonElement, CopilotLauncherProps>(
  function CopilotLauncher({ isOpen, panelId, onOpen }, ref) {
    return (
      <div className="fixed bottom-5 right-5 z-40 print:hidden sm:bottom-7 sm:right-7">
        <Button
          ref={ref}
          type="button"
          variant="gold"
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={SITE_COPILOT_COPY.launcherAria}
          className={cn('gap-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]', isOpen && 'hidden')}
        >
          <span
            aria-hidden="true"
            className="rounded-full bg-ink-900/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-on-ink-900"
          >
            {AI_TAG}
          </span>
          {SITE_COPILOT_COPY.launcherLabel}
        </Button>
      </div>
    )
  },
)
