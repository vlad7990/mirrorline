/**
 * /about — why we built it, and how we work (16 §4).
 *
 * **No investigation details.** 16 §4 says so explicitly, and 10 §4 agrees:
 * "the investigation that led to this company is not a sales asset." The
 * honest version of our origin is what we learnt, not what we found, and
 * naming the thing we investigated would be both unsafe and self-serving.
 *
 * So this page says we studied what does not work and built the opposite,
 * which is true, checkable against the product, and complete.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroFrames } from '@/components/marketing/kit/page-hero-frames'
import { PAGE_HERO_FRAMES, allocateFrames } from '@/components/marketing/kit/page-media'
import { Section, SectionHeading } from '@/components/marketing/primitives'

/** Three for the wall, three for the corner card. 19 v3 §hero, D69. */
const [WALL_FRAMES = [], INSET_FRAMES = []] = allocateFrames(
  [3, 3],
  PAGE_HERO_FRAMES.about.offset,
)

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Mirrorline exists, how we work, and the limits we hold ourselves to. Short, because there is not much to say yet and we would rather not pad it.',
}

interface Belief {
  readonly id: string
  readonly title: string
  readonly body: string
}

const BELIEFS: readonly Belief[] = [
  {
    id: 'owned',
    title: 'Grow the account you own',
    body: 'Reach borrowed from throwaway accounts does not compound and does not convert. One account that is yours, posting consistently, is worth more after a year than a thousand that are not.',
  },
  {
    id: 'original',
    title: 'Original, or it is not worth posting',
    body: 'The platforms stopped recommending recycled material, and they were right to. We copy the structure of what works and never the thing itself.',
  },
  {
    id: 'measured',
    title: 'Report what happened, not what flatters us',
    body: 'A weekly ledger that ends at leads and sales, including the weeks that went badly. A report you cannot trust in a bad week is not a report.',
  },
  {
    id: 'visible',
    title: 'Show the working',
    body: 'Seven agents with logs, costs, spend caps and a compliance gate nothing passes without. You can watch the machine work rather than taking our word for the result.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHeroFrames
        eyebrow="About"
        title={
          <>
            We studied what does not work,{' '}
            <span className="gold-phrase">and built the other thing.</span>
          </>
        }
        lead="Mirrorline is new. We have no client logos to show you and we are not going to invent any, so this page is about how we work and what we refuse to do."
        frames={WALL_FRAMES}
        index={BELIEFS.map((belief, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: belief.title,
        }))}
        inset={
          <HeroInset caption="Three we made, for accounts that do not exist">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      <Section aria-labelledby="why-heading">
        <SectionHeading
          id="why-heading"
          eyebrow="Why this exists"
          title={
            <>
              The shortcuts <span className="gold-phrase">stopped working.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-8 flex max-w-[72ch] flex-col gap-4 text-body text-text-muted">
          <p className="m-0">
            For a few years it was possible to get reach cheaply: repost other people’s videos,
            run a lot of accounts, and let volume do the work. That stopped. Platforms now
            withhold recommendation from accounts that mostly post material that is not theirs,
            and the tools built around the old approach are selling something that no longer
            functions.
          </p>
          <p className="m-0">
            We spent a long time studying that model closely enough to know exactly why it fails —
            not only legally, but commercially: reach from accounts nobody trusts does not turn
            into customers. What we took from it was a list of things not to do, and that list is
            the product’s design.
          </p>
          <p className="m-0">
            So Mirrorline is the slow version. Original content, on accounts the client owns,
            published through the platforms’ own APIs, measured all the way to the thing the
            client actually sells. It is more work, and it is the only version worth building.
          </p>
        </div>
      </Section>

      <Section className="band-snow" aria-labelledby="beliefs-heading">
        <SectionHeading
          id="beliefs-heading"
          eyebrow="How we work"
          title={
            <>
              Four things <span className="gold-phrase">we will not trade away.</span>
            </>
          }
          lead="Each of these costs us something — speed, margin, or an easier sales conversation. They are on this page so you can hold us to them."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
          {BELIEFS.map((belief, position) => (
            <li
              key={belief.id}
              className="reveal-item"
              style={{ '--index': position % 2 } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <span className="machine text-mono text-gold-text">
                  {String(position + 1).padStart(2, '0')}
                </span>
                <h3 className="m-0 font-heading text-title text-text">{belief.title}</h3>
                <p className="m-0 text-meta text-text-muted">{belief.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="subtle" size="md" aria-labelledby="stage-heading">
        <SectionHeading
          id="stage-heading"
          eyebrow="Where we are"
          title="Early, and saying so"
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-6 flex max-w-[72ch] flex-col gap-4 text-body text-text-muted">
          <p className="m-0">
            The engine works and the studio is built. We are taking our first pilots now, which
            means you would be early: the upside is that we have the time to do your account
            properly, and the downside is that we cannot show you five years of results.
          </p>
          <p className="m-0">
            We will not pretend otherwise with invented testimonials, a fabricated client count or
            a certification badge nobody awarded us. When we have real results, with permission,
            they will go up with the method attached so you can judge them.
          </p>
        </div>
      </Section>

      <PageCta cta={PAGE_CTAS.about} />
    </>
  )
}
