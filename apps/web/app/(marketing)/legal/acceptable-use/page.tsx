/**
 * /legal/acceptable-use — what we will not make, and who we will not work
 * with (09 §12, 13's closing rules).
 *
 * The not-served list is published rather than kept internal: someone in one
 * of those categories deserves to find out from this page rather than from a
 * sales call, and publishing it is also how we are held to it.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { DocPage, type DocPageContent } from '@/components/marketing/doc-page'

export const metadata: Metadata = {
  title: 'Acceptable use',
  description:
    'What we will not make, who we do not work with, and the rule packs that apply automatically in regulated fields.',
}

const CONTENT: DocPageContent = {
  eyebrow: 'Acceptable use',
  title: (
    <>
      What we will not make, <span className="gold-phrase">and who we will not make it for.</span>
    </>
  ),
  lead: 'We work with any business or individual in any industry, with four categories excluded and one age limit. All of it is on this page rather than in a contract you see later.',
  draftName: 'acceptable use policy',
  sections: [
    {
      id: 'not-served',
      title: 'Who we do not work with',
      paragraphs: [
        'These are declined at sign-up and on review. It is not a judgement about legality — each carries platform, regulatory or reputational risk we are not equipped to carry on someone else’s behalf.',
      ],
      list: [
        'Political campaigning, parties and issue advocacy.',
        'Gambling and betting, including affiliate promotion of either.',
        'Cryptocurrency and token promotion, including “education” that routes to a token.',
        'Adult content.',
        'Anyone under 18.',
      ],
    },
    {
      id: 'content',
      title: 'What we will not make',
      paragraphs: [
        'Independently of who is asking, we will not produce certain things, and a request for one is grounds to end the engagement.',
      ],
      list: [
        'Claims about outcomes we cannot support — guaranteed results, incomes, rankings or recoveries.',
        'Medical, legal or financial advice presented as individual guidance rather than as general information.',
        'Content depicting a real person who has not consented, or any face swap.',
        'Testimonials, reviews or case studies that did not happen.',
        'Anything designed to look like editorial, news or a platform’s own interface.',
      ],
    },
    {
      id: 'rule-packs',
      title: 'Regulated fields',
      paragraphs: [
        'Health, finance, legal and property are served normally. A rule pack is switched on automatically for the account, and you can read exactly what it blocks.',
        'A rule pack is a constraint on the scripts, not a legal opinion. You remain responsible for the claims your business makes; we make it harder to make a bad one by accident.',
      ],
    },
    {
      id: 'enforcement',
      title: 'How this is applied',
      paragraphs: [
        'Every video passes the Compliance agent before it can be scheduled, and the checks include the banned-claim list above. Where something is blocked you see why, rather than finding a post missing.',
        'If an account turns out to be in an excluded category after it starts, we stop work and refund the unused part of the period. We would rather lose the money than the argument.',
      ],
    },
  ],
  updated: '9 November 2026',
}

export default function AcceptableUsePage() {
  return <DocPage content={CONTENT} />
}
