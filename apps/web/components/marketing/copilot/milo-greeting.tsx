'use client'

/**
 * Milo's hello: a speech bubble above the launcher, once a visit.
 *
 * ## It announces itself, because it arrives without being asked
 *
 * `role="status"` with `aria-live="polite"`: nobody pressed anything, so a
 * screen reader is told at the next pause rather than interrupted mid-
 * sentence. `assertive` would cut across whatever is being read, for a
 * greeting — which is the kind of thing that makes people switch the
 * assistant off.
 *
 * ## Dismissing it is a real button, not the bubble
 *
 * A bubble that closes on a click anywhere swallows the click of someone
 * reaching for Milo underneath it, and gives a keyboard user nothing to press
 * at all. So the close is its own control with its own label, and the bubble
 * itself is inert text.
 *
 * ## The motion is CSS, and its absence is the default
 *
 * `globals.css` animates the entrance inside the `prefers-reduced-motion:
 * no-preference` block the rest of the site uses. With motion off the bubble
 * is simply there — visible, readable and dismissible, which is what the
 * brief asks for: no animation, and the bubble still appears.
 */

import { cn } from '@mirrorline/ui'
import { X } from 'lucide-react'
import * as React from 'react'

import { SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'

export interface MiloGreetingProps {
  readonly onDismiss: () => void
  readonly className?: string
}

export function MiloGreeting({ onDismiss, className }: MiloGreetingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-milo-greeting="true"
      className={cn(
        'milo-greeting relative flex max-w-[min(18rem,calc(100vw-6rem))] items-start gap-2',
        // The one squared corner points down-right, at Milo. A bubble with
        // four equal corners is a toast, and a toast is something that has
        // happened rather than someone speaking.
        'rounded-2xl rounded-br-sm border border-gold-deep/40 bg-ink-900/95 px-4 py-3',
        'shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-sm',
        className,
      )}
    >
      <p className="m-0 text-meta text-on-ink-900">{SITE_COPILOT_COPY.greeting}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={SITE_COPILOT_COPY.greetingDismiss}
        className={cn(
          '-mr-1 -mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full',
          'text-on-ink-muted transition-colors hover:bg-ink-800 hover:text-on-ink-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-bright',
        )}
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  )
}
