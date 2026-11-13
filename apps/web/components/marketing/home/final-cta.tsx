'use client'

/**
 * The closing call to action (16 §3 row 19), which changes with the choice
 * made in the picker near the top of the page.
 *
 * 14 §3 fixes the shape: **one main button for everyone** — the free Niche
 * Scan — and a second button that depends on the account type. A business
 * gets the pilot; an individual with an audience gets Creator; an individual
 * starting out gets the Studio waitlist, because Studio cannot be bought and
 * offering it as a purchase would be untrue.
 *
 * The second button is the only thing that varies. Swapping the headline too
 * was tempting and wrong: a visitor who toggles the picker to compare would
 * watch the page rewrite itself, which reads as a trick rather than as
 * tailoring.
 */

import { Button, Card } from '@mirrorline/ui'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { track } from '@/lib/analytics/events'
import { type AccountChoice, withChoiceParams } from '@/lib/audience/account-type'
import { useAccountChoice } from '@/lib/audience/account-type-context'
import { NICHE_SCAN } from '@/lib/site-map'

interface SecondAction {
  readonly label: string
  readonly href: string
  readonly note: string
}

/** 14 §3's second button, per account type. */
function secondAction(choice: AccountChoice): SecondAction {
  if (choice.audience === 'business') {
    return {
      label: 'Start a pilot',
      href: '/pricing',
      note: 'Two weeks, $750, and you see real videos before committing to a month.',
    }
  }

  if (choice.stage === 'existing') {
    return {
      label: 'See the Creator plan',
      href: '/pricing',
      note: '$499 a month for one person on two platforms, built around your own long-form.',
    }
  }

  return {
    label: 'Join the Studio waitlist',
    href: '/pricing',
    note: 'Studio is $79 a month and is not open yet. The waitlist is the only thing to join.',
  }
}

export function FinalCta() {
  const { choice } = useAccountChoice()
  const second = secondAction(choice)

  return (
    <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 max-w-[52ch] flex-col gap-2">
        <h2 className="m-0 font-heading text-title text-text">
          Start with the scan. It costs nothing.
        </h2>
        <p className="m-0 text-meta text-text-muted">
          We look at what is actually growing in your niche and show you the format recipes before
          you decide anything. {second.note}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
        <Button asChild size="lg" variant="gold" className="press">
          <Link
            href={NICHE_SCAN.isLive ? withChoiceParams(NICHE_SCAN.href, choice) : '#choose'}
            onClick={() => track('niche_scan_started', { from: 'home-final-cta' })}
          >
            {NICHE_SCAN.label}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="press">
          <Link href={withChoiceParams(second.href, choice)}>{second.label}</Link>
        </Button>
      </div>
    </Card>
  )
}
