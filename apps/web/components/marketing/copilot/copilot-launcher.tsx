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

import { MiloAvatar } from '@/components/mascot/milo-avatar'
import { AI_TAG, SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'
import type { MiloState } from '@/lib/mascot/milo'

/**
 * The launcher's Milo: head and shoulders, from the 112px asset.
 *
 * Tried at 28 first, sized to the button's text, and it was a dark smudge —
 * the character is detailed enough that below about 40px the face stops
 * reading at all. 48 inside a 60px pill is the brief's 56 minus the padding
 * that keeps the pill's own rounding off his corners, and it still draws the
 * 112px asset, which is what the 2× rule is for.
 */
const MILO_SIZE = 48

/** Tall enough that the pill never crops the mascot inside it. */
const LAUNCHER_HEIGHT = 'min-h-[3.75rem]'

export interface CopilotLauncherProps {
  readonly isOpen: boolean
  readonly panelId: string
  /**
   * `greeting` on the first mount of a session, `idle` afterwards.
   *
   * Decided above, in `site-copilot.tsx`, because "once per session" is a
   * fact about the session rather than about this button — and this button is
   * hidden and shown again every time the panel opens and closes.
   */
  readonly miloState: MiloState
  readonly onOpen: () => void
}

export const CopilotLauncher = React.forwardRef<HTMLButtonElement, CopilotLauncherProps>(
  function CopilotLauncher({ isOpen, panelId, miloState, onOpen }, ref) {
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
          className={cn(
            // The pill hugs Milo on the left and keeps its usual breathing
            // room around the words on the right.
            'h-auto gap-2.5 py-1.5 pl-1.5 pr-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]',
            LAUNCHER_HEIGHT,
            isOpen && 'hidden',
          )}
        >
          {/* `aria-hidden`, because the button's own label already says who
              this is. Without it a screen reader reads the mascot's alt text
              and then the label, and announces Milo twice. */}
          <span aria-hidden="true" className="contents">
            <MiloAvatar state={miloState} size={MILO_SIZE} />
          </span>
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
