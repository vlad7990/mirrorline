/**
 * The questions a pricing page actually gets asked (19 v2 ★4).
 *
 * Every answer here is a commitment we can keep today, and several of them
 * are answers most retainer pages avoid: what happens if it does not work,
 * who owns the accounts, and what the price does not cover. A pricing FAQ
 * that only answers the comfortable questions is a sales page with a
 * disclosure widget on it.
 *
 * `.tsx` rather than `.ts` because the answers carry mono figures and a link.
 * Nothing here is imported by a test, so the `jsx: "preserve"` limitation
 * that split `page-cta-content.ts` does not apply.
 */

import Link from 'next/link'
import * as React from 'react'

import type { FaqItem } from './faq'

export const PRICING_FAQ: readonly FaqItem[] = [
  {
    id: 'what-if-it-does-not-work',
    question: 'What happens if it does not work?',
    answer: (
      <>
        <p className="m-0">
          The pilot ends on its own after two weeks. There is no notice to give and nothing to
          cancel — if you do not start a month, nothing further is charged.
        </p>
        <p className="m-0">
          We cannot promise views or followers, and we will not: that depends on an audience we
          have not met. What the pilot buys is <span className="machine">12</span> videos, a
          posting schedule and a report you can judge, including the parts that went badly.
        </p>
      </>
    ),
  },
  {
    id: 'who-owns-the-accounts',
    question: 'Who owns the accounts and the videos?',
    answer: (
      <>
        <p className="m-0">
          You do, both. You connect your own Instagram, TikTok and YouTube accounts and can
          disconnect them without asking us. We never create an account for you and never hold your
          login.
        </p>
        <p className="m-0">
          The videos are made from your footage and are yours to keep and reuse after we stop
          working together.
        </p>
      </>
    ),
  },
  {
    id: 'is-there-a-contract',
    question: 'Is there a contract or a minimum term?',
    answer: (
      <p className="m-0">
        No minimum term and no annual discount. Plans are billed a month at a time and you can stop
        at the end of any month. There is no setup fee.
      </p>
    ),
  },
  {
    id: 'what-is-not-included',
    question: 'What is not included?',
    answer: (
      <>
        <p className="m-0">
          Ad spend, paid promotion and anything that needs a camera crew. We work from footage you
          already have or can record on a phone.
        </p>
        <p className="m-0">
          Long-form YouTube is not a plan yet. We will not sell it before the platform audit it
          needs has passed.
        </p>
      </>
    ),
  },
  {
    id: 'why-the-prices-move',
    question: 'Why do you say the prices are introductory?',
    answer: (
      <p className="m-0">
        Because they are. These are the figures we are working with our first clients on, and we
        set the final price per engagement, in writing, before any work starts. We would rather say
        that than print a rate card we have not tested.
      </p>
    ),
  },
  {
    id: 'should-i-use-you-at-all',
    question: 'Is there a reason not to use you?',
    answer: (
      <>
        <p className="m-0">
          Several. If you need twelve cuts once rather than posts every day, a freelance editor is
          cheaper. If you want to choose every cut point yourself, you will find us frustrating. If
          you have no footage and no intention of recording any, none of this works.
        </p>
        <p className="m-0">
          <Link href="/compare" className="text-gold-text underline underline-offset-4">
            The comparison page
          </Link>{' '}
          goes through that properly, including the rows where we lose.
        </p>
      </>
    ),
  },
]
