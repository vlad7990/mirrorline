/**
 * /businesses — for any business, in any industry (16 §4).
 *
 * "Agnostic page for any business" is the brief, and the hard part is
 * resisting the pull back towards verticals: the instinct on a page like this
 * is to list the kinds of business we serve, which would rebuild the industry
 * cards v4 removed. So the page segments the only way 13 §1 allows — new
 * account or existing one — and every example is phrased so it belongs to any
 * trade reading it.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { AudiencePage, type AudiencePageContent } from '@/components/marketing/audience-page'

export const metadata: Metadata = {
  title: 'For businesses',
  description:
    'Short-video growth for any business, in any industry, on a new or an existing account. Your own recordings or originals we make, posted daily to accounts you own, reported to leads and bookings.',
}

const CONTENT: AudiencePageContent = {
  page: 'businesses',
  eyebrow: 'For businesses',
  title: (
    <>
      Any business, <span className="gold-phrase">whatever it is you do.</span>
    </>
  ),
  lead: 'We do not need to know your trade to start — our agents research it. What we do need to know is whether you already have an account worth growing, or whether we are starting one.',
  insetCaption: 'Three samples, three unrelated trades',
  stripLabel: 'Sample reels made for four different kinds of business',
  stages: [
    {
      id: 'existing',
      title: 'You already have an account',
      body: 'It exists, it posts occasionally, and there is almost certainly a pile of recorded material nobody has cut up — a talk, a webinar, a long call you had permission to record. That back catalogue is already a month of posts, which is why existing accounts see something happening fastest.',
      plan: 'Pilot → Growth or Scale',
      inputMix: 'Your footage + remakes',
      postsPerWeek: [7, 21],
    },
    {
      id: 'new',
      title: 'You are starting from nothing',
      body: 'No presence on one platform, or on any of them. We start it properly rather than with three posts and six months of silence: mostly originals at first, built from the formats the Niche Scan found working in your niche, shifting to your own footage as the library grows.',
      plan: 'Pilot → Growth',
      inputMix: 'Mostly created, then yours',
      postsPerWeek: [7, 14],
    },
  ],
  commonGoals: ['leads', 'bookings', 'sales', 'awareness'],
  concerns: [
    {
      question: 'We are in a regulated field. Can you work with us?',
      answer:
        'Yes. Health, finance, legal and property all get a rule pack switched on automatically, and you can review what it blocks and why. We say this during the sale rather than after it, because the rule pack is a reason to trust us rather than a caveat to bury.',
    },
    {
      question: 'Nobody here is comfortable on camera.',
      answer:
        'Then we work from what exists — recorded talks, calls you had permission to record, product footage — or we make originals with captions and no presenter at all. A face is one way to make this work and it is not the only one.',
    },
    {
      question: 'Who actually owns the accounts and the files?',
      answer:
        'You do, both. You connect each account and can disconnect it without asking us, and you can export every file we have ever made for you, including after you cancel.',
    },
    {
      question: 'What happens if it does not work?',
      answer:
        'The pilot is two weeks and $750, and it exists so you can find that out before committing to a month. After that it is month to month with a one-click cancel. We will not quote you a number of leads, because nobody can honestly predict one for an audience they have not met.',
    },
    {
      question: 'We already pay someone to do this.',
      answer:
        'Then the question worth asking them is what their last four weeks produced beyond views. If the answer comes back as leads, bookings or sales per post, you are in good hands and you do not need us.',
    },
  ],
}

export default function BusinessesPage() {
  return <AudiencePage content={CONTENT} />
}
