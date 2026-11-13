/**
 * /legal/cancellation-refunds — plain billing, written out (09 §10).
 *
 * The direct answer to P3, which is the most common complaint about this
 * whole category: credits that expire, charges after cancelling, and files
 * that leave with the account. Every promise the marketing pages make about
 * billing has to be checkable here, or it should not be on those pages.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { DocPage, type DocPageContent } from '@/components/marketing/doc-page'

export const metadata: Metadata = {
  title: 'Cancellation and refunds',
  description:
    'Flat monthly pricing, no credits, cancel in one click, and every file exportable — including after you leave.',
}

const CONTENT: DocPageContent = {
  eyebrow: 'Cancellation and refunds',
  title: (
    <>
      Cancel in one click. <span className="gold-phrase">Keep every file.</span>
    </>
  ),
  lead: 'No credits, no notice period, no cancellation call, and nothing charged after you stop. This page is the checkable version of what the rest of the site says about billing.',
  draftName: 'cancellation and refund terms',
  sections: [
    {
      id: 'how-billing-works',
      title: 'How billing works',
      paragraphs: [
        'Plans are a flat price for a calendar month, charged in advance. The Pilot is a single charge covering two weeks and does not renew into anything unless you ask it to.',
        'There is no setup fee, no onboarding fee, and no annual commitment. There are no credits anywhere in the product: nothing is metered by the minute, and nothing you have paid for expires at the end of a month.',
      ],
    },
    {
      id: 'cancelling',
      title: 'Cancelling',
      paragraphs: [
        'You cancel from Settings, in one click, at any time. You do not need to email us, give notice, or speak to anyone first.',
        'The plan runs to the end of the period you have already paid for and then stops. Posting continues until that date unless you ask us to stop sooner, which we will do immediately on request.',
        'Nothing is charged after that date. If a charge appears after you cancelled, it is a mistake and we refund it in full without arguing about it.',
      ],
    },
    {
      id: 'refunds',
      title: 'Refunds',
      paragraphs: [
        'We do not refund a month that has already run, because the work was done and the posts went out.',
        'We do refund in full where we did not deliver: the posts did not go out, the reporting did not arrive, or we stopped the engagement ourselves. We also refund the unused part of a period where we end an engagement for any reason of our own.',
        'The Pilot is deliberately small so that a decision about us costs two weeks rather than a quarter. If the Pilot does not convince you, that is the answer it was for, and we do not try to recover it with a retention offer.',
      ],
    },
    {
      id: 'your-files',
      title: 'Your files and your accounts',
      paragraphs: [
        'Every video, cut, script and caption we make for you is yours. You can export all of it at any time from Settings, at full resolution, and that export keeps working after you cancel.',
        'We do not hold your library hostage to a subscription, and we do not degrade or watermark anything if you leave.',
        'Your social accounts were connected by you and can be disconnected by you, without asking us. We never hold the only set of keys to anything you own.',
      ],
    },
    {
      id: 'price-changes',
      title: 'Price changes',
      paragraphs: [
        'These are introductory prices while we work with our first clients. If a price changes, it changes for new engagements; yours stays as agreed for as long as the plan runs uninterrupted.',
        'Any change to what a plan includes is told to you before the period it applies to, not after.',
      ],
    },
  ],
  next: { href: '/legal/cookies', label: 'Cookies' },
}

export default function CancellationRefundsPage() {
  return <DocPage content={CONTENT} />
}
