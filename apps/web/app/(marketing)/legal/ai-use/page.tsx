/**
 * /legal/ai-use — how we use AI, how it is labelled, and what consent we need.
 *
 * This is CLAUDE.md non-negotiables 2, 4 and 5 written for someone outside
 * the company. It is the document a platform or a lawyer would ask for first,
 * which is why it says what we will not do before it says what we will.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { DocPage, type DocPageContent } from '@/components/marketing/doc-page'

export const metadata: Metadata = {
  title: 'How we use AI',
  description:
    'Where AI is used in making your videos, how generated scenes are labelled, what consent we need for a voice or a likeness, and the things we will not do.',
}

const CONTENT: DocPageContent = {
  eyebrow: 'How we use AI',
  title: (
    <>
      Generated material <span className="gold-phrase">is always labelled.</span>
    </>
  ),
  lead: 'Where a model wrote, generated or voiced something, you and your audience are told. This page says exactly where that happens, and what we will not do with it.',
  draftName: 'AI use policy',
  sections: [
    {
      id: 'where',
      title: 'Where AI is used',
      paragraphs: [
        'Models help at four points in the work, and a person reviews the output at every one of them before anything can be scheduled.',
      ],
      list: [
        'Finding moments worth cutting out of a long video, and writing candidate hooks.',
        'Writing scripts for remade formats, from your voice and facts profile.',
        'Generating B-roll scenes where no suitable footage of yours exists.',
        'Reading results and proposing what to make more of next week.',
      ],
    },
    {
      id: 'labels',
      title: 'How it is labelled',
      paragraphs: [
        'Any video containing a generated scene carries an AI label in our studio and sets the platform’s own AI disclosure flag where one exists. That is not a setting you or we can switch off for a particular post.',
        'This website follows the same rule. The backdrop behind our page headings and the sample frames in our showcase are generated, and each says so where it appears.',
      ],
    },
    {
      id: 'consent',
      title: 'Voice and likeness',
      paragraphs: [
        'We do not make face swaps, at all, for anyone.',
        'Your voice is cloned only where you have given us a signed consent record, and that record is stored against your workspace. Anyone else appearing in your footage needs their own consent on file before we can use the material.',
        'Withdraw consent and we stop using it. Files already published are yours to take down; we will not argue that a release covers a video you no longer want up.',
      ],
    },
    {
      id: 'never',
      title: 'What we will not do',
      paragraphs: ['These are limits rather than defaults, and they apply on every plan.'],
      list: [
        'We never use another creator’s footage, audio or exact wording — only the structure of a format.',
        'We never alter a video to get it past a similarity check. Anything too close is rewritten.',
        'We never remove or weaken an AI label, and we never strip metadata to hide a video’s origin.',
        'We never generate a scene depicting a real person who has not consented.',
      ],
    },
    {
      id: 'models',
      title: 'Which models, and what they see',
      paragraphs: [
        'We use commercial model APIs for writing and for generated footage. Your material is sent to them to do the work you asked for, and is not used by us to train anything.',
        'We cannot promise what a model vendor does with data under their own terms, so we minimise what reaches them: a script and a brief rather than your whole library, and no personal data about your customers at any point.',
      ],
    },
  ],
  next: { href: '/legal/acceptable-use', label: 'Acceptable use' },
}

export default function AiUsePage() {
  return <DocPage content={CONTENT} />
}
