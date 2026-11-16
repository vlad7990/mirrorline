/**
 * /faq — all of them (16 §4). The home page shows the first six.
 *
 * One list, in `faq-content.tsx`, so the two cannot drift.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { Faq } from '@/components/marketing/faq'
import { FAQ_ITEMS } from '@/components/marketing/faq-content'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroFrames } from '@/components/marketing/kit/page-hero-frames'
import { PAGE_HERO_FRAMES, allocateFrames } from '@/components/marketing/kit/page-media'
import { Section } from '@/components/marketing/primitives'

/** Three for the wall, three for the corner card. 19 v3 §hero, D69. */
const [WALL_FRAMES = [], INSET_FRAMES = []] = allocateFrames(
  [3, 3],
  PAGE_HERO_FRAMES.faq.offset,
)

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Every question we are asked, including the ones where the honest answer is that we cannot promise: posting, accounts, copyright, voice, cancelling, file ownership and what data we track.',
}

export default function FaqPage() {
  return (
    <>
      <PageHeroFrames
        eyebrow="FAQ"
        title={
          <>
            Short answers, <span className="gold-phrase">including the awkward ones.</span>
          </>
        }
        lead="The home page carries the six we are asked most. This is all of them, and the ones where the honest answer is “we cannot promise that” say so."
        frames={WALL_FRAMES}
        index={[
          { number: '01', title: 'All of them', description: `${FAQ_ITEMS.length} questions` },
          { number: '02', title: 'No guarantees', description: 'anywhere on this page' },
        ]}
        inset={
          <HeroInset caption="Three samples, in place of a promise">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      <Section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="sr-only">
          Frequently asked questions
        </h2>
        <Faq items={FAQ_ITEMS} />
      </Section>

      <PageCta cta={PAGE_CTAS.faq} />
    </>
  )
}
