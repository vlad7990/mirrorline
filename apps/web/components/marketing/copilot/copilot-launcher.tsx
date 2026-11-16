'use client'

/**
 * Milo, bottom-right, on every public page — and he *is* the button.
 *
 * He used to be a 48px detail inside a gold pill that carried the words. The
 * pill is gone: the character is the affordance now, 112px on a desktop, and
 * the words are a small label beside him where there is room for one.
 *
 * **It is still labelled AI** (18 §3.3, which asks for the label on the
 * launcher and in the panel header). The label moved from a badge on the pill
 * into the button's accessible name — "Ask Milo about Mirrorline — AI
 * assistant" — and the panel header still carries it in writing. A picture of
 * a character with no text beside it is exactly the case that name exists for.
 *
 * ## Four things decide where he sits, and they add up
 *
 * `bottom` is one `calc`, and each term is a rule from the brief:
 *
 *   - **the gap** — 24px from the edges on a desktop, 16px on a phone;
 *   - **the safe area** — `env(safe-area-inset-bottom)`, so he clears the
 *     home indicator and the mobile browser's bottom bar;
 *   - **the cookie banner** — `--cookie-banner-height`, published by the
 *     banner itself while it is up, so Milo rides above it rather than under
 *     it. He is no longer hidden behind the consent decision (D74), so the
 *     two are on screen together and the layering has to be deliberate;
 *   - **a CTA in the way** — `--milo-cta-lift`, from `useCtaClearance`.
 *
 * Two of those are pure CSS, which is why they survive a page whose
 * JavaScript has not arrived: the launcher is server-rendered and in the first
 * paint, and only the last two can move it afterwards.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { MiloAvatar } from '@/components/mascot/milo-avatar'
import { MiloGreeting } from '@/components/marketing/copilot/milo-greeting'
import { useCtaClearance } from '@/components/marketing/copilot/use-cta-clearance'
import { AI_TAG, SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'
import type { MiloState } from '@/lib/mascot/milo'

export interface CopilotLauncherProps {
  readonly isOpen: boolean
  readonly panelId: string
  /**
   * `greeting` while he waves, `idle` the rest of the time, and whatever the
   * co-pilot's stream is doing once a question is in flight.
   *
   * Decided above, in `site-copilot.tsx`, because "once per visit" is a fact
   * about the visit rather than about this button — and this button is hidden
   * and shown again every time the panel opens and closes.
   */
  readonly miloState: MiloState
  /** Whether the speech bubble is showing. Also owned above. */
  readonly isGreeting: boolean
  readonly onDismissGreeting: () => void
  readonly onOpen: () => void
}

export const CopilotLauncher = React.forwardRef<HTMLButtonElement, CopilotLauncherProps>(
  function CopilotLauncher(
    { isOpen, panelId, miloState, isGreeting, onDismissGreeting, onOpen },
    ref,
  ) {
    const dockRef = React.useRef<HTMLDivElement>(null)
    useCtaClearance(dockRef)

    return (
      <div ref={dockRef} className="milo-dock print:hidden" data-milo-dock="true">
        {isGreeting ? <MiloGreeting onDismiss={onDismissGreeting} /> : null}

        <button
          ref={ref}
          type="button"
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={SITE_COPILOT_COPY.launcherAria}
          data-milo-launcher="true"
          /* The attribute, not a `hidden` class. `.milo-launcher` sets
             `display: inline-flex` in `globals.css`, and against a Tailwind
             utility of equal specificity source order decides — which it won
             silently, leaving a 112px mascot sitting over the open panel and
             swallowing every click on the Ask button beneath it. The
             attribute is also the honest one: it takes the button out of the
             accessibility tree while the panel it opens is already open. */
          hidden={isOpen}
          className={cn('milo-launcher')}
        >
          {/* `aria-hidden`, because the button's own label already says who
              this is. Without it a screen reader reads the mascot's alt text
              and then the label, and announces Milo twice. */}
          <span aria-hidden="true" className="milo-launcher-face">
            <MiloAvatar responsive state={miloState} className="milo-launcher-image" />
            {/* 18 §3.3 wants the AI label **on the launcher**, and the pill
                that used to carry it is gone. It cannot live only in the
                accessible name: that is the "disclaimer nobody sees" the rule
                exists to prevent, and it would leave a sighted visitor with a
                cartoon face and no statement of what it is. A chip on the
                mascot is visible at all three sizes, including the 72px phone
                where the "Ask Milo" label is not. */}
            <span className="milo-launcher-tag">{AI_TAG}</span>
          </span>

          {/* Desktop only: at 390px the words would cost a third of the
              screen's width to say what the accessible name already says. */}
          <span aria-hidden="true" className="milo-launcher-label">
            {SITE_COPILOT_COPY.launcherLabel}
          </span>
        </button>
      </div>
    )
  },
)
