'use client'

/**
 * The cookie consent banner (16 §4): **non-essential declined by default**.
 *
 * Which is easy for us, because there is nothing to decline yet. No analytics
 * vendor is connected, no advertising pixel exists, and the funnel adapter
 * writes to the console in development and does nothing in production. So the
 * banner is currently a true statement rather than a consent gate, and it
 * says that plainly instead of performing a choice that has no effect.
 *
 * It is built now on purpose. A banner added later, once there *is* something
 * to consent to, is a banner that arrives after the tracking — and
 * decline-by-default is much harder to add to a product that has got used to
 * assuming yes.
 *
 * **Nothing is set before a choice is made.** The only thing ever written is
 * the choice itself, under `mirrorline.cookie-consent`, which is a strictly
 * necessary record of a preference and the one category needing no consent.
 */

import { Button, cn } from '@mirrorline/ui'
import Link from 'next/link'
import * as React from 'react'

const STORAGE_KEY = 'mirrorline.cookie-consent'

type Choice = 'essential' | 'all'

function readChoice(): Choice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'essential' || raw === 'all' ? raw : null
  } catch {
    // Storage blocked. We then show the banner every visit, which is the
    // conservative failure: never assume a consent we cannot remember.
    return null
  }
}

function writeChoice(choice: Choice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // The choice still holds for this visit, in React state.
  }
}

export function CookieBanner() {
  // Hidden on the server and on the first client render, so the markup
  // matches and hydration cannot mismatch. The effect decides.
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (readChoice() === null) setIsOpen(true)
  }, [])

  const choose = (choice: Choice) => {
    writeChoice(choice)
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-heading"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-ink-line bg-ink-900/95 backdrop-blur-xl',
        'px-5 py-4 sm:px-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="cookie-heading" className="m-0 text-label font-semibold text-on-ink-900">
            We are not tracking you
          </h2>
          <p className="m-0 max-w-[76ch] text-meta text-on-ink-muted">
            This site sets no analytics or advertising cookies, and there is no vendor collecting
            anything about this visit. If that ever changes, it will be off until you say
            otherwise.{' '}
            <Link
              href="/legal/cookies"
              className="underline underline-offset-4 hover:text-on-ink-900"
            >
              Read the detail
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          {/* Decline is first and is an equally-weighted action. A banner
              whose refusal is a greyed-out link is a dark pattern, whatever
              its policy page says. */}
          <Button variant="secondary" onClick={() => choose('essential')}>
            Essential only
          </Button>
          <Button variant="gold" onClick={() => choose('all')}>
            That is fine
          </Button>
        </div>
      </div>
    </div>
  )
}
