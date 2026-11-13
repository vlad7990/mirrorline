/**
 * /individuals — creators, experts and personal brands (16 §4).
 *
 * The audience where the product is most easily mistaken for a clipping tool,
 * so the page leans on the two things a tool does not do: it publishes, and
 * it reports. P1 is the whole argument here.
 *
 * It is also the page where Studio has to be handled carefully. Studio is
 * $79 and **not open** — 09 §11 forbids implying otherwise — so the
 * starting-from-zero card says waitlist rather than offering a price to pay.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { AudiencePage, type AudiencePageContent } from '@/components/marketing/audience-page'

export const metadata: Metadata = {
  title: 'For individuals',
  description:
    'For creators, experts and personal brands. Your long-form becomes daily short video on accounts you own, with a weekly ledger instead of a folder of clips.',
}

const CONTENT: AudiencePageContent = {
  eyebrow: 'For individuals',
  title: (
    <>
      You are already making it. <span className="gold-phrase">Most of it never posts.</span>
    </>
  ),
  lead: 'Creators, experts and personal brands. If you record long-form, the raw material exists and the cutting does not. If you are starting out, three repeatable series beat sporadic effort.',
  marginNote: 'about 15 minutes a week from you',
  stages: [
    {
      id: 'existing',
      title: 'You have an audience and a back catalogue',
      body: 'A podcast, a channel, a stream, a newsletter you also record. You post a fraction of what you make because cutting it is an evening a day, and the evening is the thing you do not have. One upload becomes a month of posts, and you spend about fifteen minutes a week approving them.',
      plan: 'Creator, $499 a month',
      inputMix: 'Your long-form + remakes',
      cadence: '14–28 posts a week',
    },
    {
      id: 'new',
      title: 'You are starting from zero',
      body: 'No audience yet and nothing to cut up. What works here is not volume but shape: three repeatable series, posted on schedule, until the account has a reason to be followed. Studio is the plan for this and it is not open yet — the waitlist is the only thing to join.',
      plan: 'Studio, $79 — waitlist',
      inputMix: 'Mostly created + phone clips',
      cadence: '7–14 posts a week',
    },
  ],
  commonGoals: ['audience', 'community', 'leads', 'launch'],
  concerns: [
    {
      question: 'Will it still sound like me?',
      answer:
        'That is the complaint we read most often about everything else in this category, so it is the thing we built around. Your profile holds your tone, the words you use, the words you never use, and your real positions. Every script has to cite at least one true fact about you, and a script that could belong to anyone doing what you do gets rewritten.',
    },
    {
      question: 'Is this just reposting my own stuff?',
      answer:
        'No, and the distinction matters more than it used to. A cut is a different post with its own hook, length and framing, not the same video uploaded again — and platforms stopped recommending accounts that mostly recycle. Everything passes the Originality Gate against your own last 60 posts as well as against any source.',
    },
    {
      question: 'What if someone reposts my videos?',
      answer:
        'Repost Watch crossposts your originals so you are eligible for the platforms’ own protection tools, which otherwise reach monetised accounts first, and gives you a checklist for acting on it. We never file claims on your behalf — that is your decision and your standing, not ours.',
    },
    {
      question: 'I do not want AI pretending to be me.',
      answer:
        'It will not. No face swaps, ever. Your voice is used only with a consent record on file, and every generated scene carries an AI label in our interface and the platform’s own flag. If you would rather have no generated footage at all, we work from your material only.',
    },
    {
      question: 'Can I cancel if it is not working?',
      answer:
        'One click, from Settings, any time. No contract and no notice period, and you export every file — including after you have gone.',
    },
  ],
  next: { href: '/pricing', label: 'Pricing' },
}

export default function IndividualsPage() {
  return <AudiencePage content={CONTENT} />
}
