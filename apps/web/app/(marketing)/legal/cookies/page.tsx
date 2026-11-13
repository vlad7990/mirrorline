/**
 * /legal/cookies — what this site stores, which today is almost nothing.
 *
 * Written as an inventory rather than as the usual paragraph of hedging,
 * because the inventory is short and being able to publish a short one is the
 * point. If it ever gets longer, this page gets longer with it.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { DocPage, type DocPageContent } from '@/components/marketing/doc-page'

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'This site sets no analytics or advertising cookies. The full list of what is stored in your browser, and why.',
}

const CONTENT: DocPageContent = {
  eyebrow: 'Cookies',
  title: (
    <>
      Three keys, <span className="gold-phrase">and no cookies at all.</span>
    </>
  ),
  lead: 'There is no analytics vendor on this site, no advertising pixel, and no third party collecting anything about your visit. What follows is the entire list of what is stored in your browser.',
  draftName: 'cookie policy',
  sections: [
    {
      id: 'inventory',
      title: 'What is stored',
      paragraphs: [
        'All three are local storage entries in your own browser rather than cookies, which means none of them is sent to our server with a request, and none can be read by anyone else.',
      ],
      list: [
        'mirrorline.cookie-consent — whether you chose “essential only” or “that is fine”, so the banner stops asking.',
        'mirrorline.account-choice — whether you said you are a business or an individual, with a new or an existing account, so the examples on the page match what you told us.',
        'mirrorline.theme — your light or dark preference in the studio.',
      ],
    },
    {
      id: 'not-set',
      title: 'What is not set',
      paragraphs: [
        'No analytics cookie, because there is no analytics vendor connected. The funnel events the product measures are written to the browser console in development and discarded in production — nothing leaves your browser.',
        'No advertising or re-marketing pixel, from anyone. No embedded third-party script that could set one. No cross-site identifier.',
        'We do not fingerprint the browser, and we do not use a server-side identifier in place of a cookie.',
      ],
    },
    {
      id: 'consent',
      title: 'What the banner is for',
      paragraphs: [
        'Non-essential storage is declined by default, which is currently a statement rather than a setting, because there is nothing non-essential to decline.',
        'The banner exists now rather than later on purpose. A consent control added after a vendor is connected arrives after the tracking, and decline-by-default is much harder to introduce to a product that has got used to assuming yes.',
        'If we ever connect an analytics vendor it will be off until you turn it on, this page will list it, and the banner will say what changed.',
      ],
    },
    {
      id: 'removing',
      title: 'Removing them',
      paragraphs: [
        'Clearing site data in your browser removes all three immediately, and nothing breaks: the banner reappears, the examples go back to their default, and the studio returns to the system theme.',
        'Blocking storage entirely also works. Every one of these is read inside a guard, so the site behaves normally if storage is unavailable — it simply forgets your preferences between visits.',
      ],
    },
  ],
  next: { href: '/accessibility', label: 'Accessibility' },
}

export default function CookiesPage() {
  return <DocPage content={CONTENT} />
}
