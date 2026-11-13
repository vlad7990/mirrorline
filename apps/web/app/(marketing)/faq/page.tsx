/**
 * /faq — all of them (16 §4). The home page shows the first six.
 *
 * One list, in `faq-content.tsx`, so the two cannot drift.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { Faq } from '@/components/marketing/faq'
import { FAQ_ITEMS } from '@/components/marketing/faq-content'
import { PageHero } from '@/components/marketing/page-hero'
import { Section } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Every question we are asked, including the ones where the honest answer is that we cannot promise: posting, accounts, copyright, voice, cancelling, file ownership and what data we track.',
}

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Short answers, <span className="gold-phrase">including the awkward ones.</span>
          </>
        }
        lead="The home page carries the six we are asked most. This is all of them, and the ones where the honest answer is “we cannot promise that” say so."
        marginNote={`${FAQ_ITEMS.length} questions · no guarantees anywhere`}
      />

      <Section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="sr-only">
          Frequently asked questions
        </h2>
        <Faq items={FAQ_ITEMS} />
      </Section>

      <SiteCta next={{ href: '/niche-scan', label: 'Free Niche Scan' }} />
    </>
  )
}
