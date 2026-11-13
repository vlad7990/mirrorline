/**
 * /changelog — what we shipped (16 §4).
 *
 * Entries describe **what changed in the product**, not internal decisions,
 * and they are written for a client rather than a developer. Removals are in
 * here too: a thing taken off the site is as much a change as a thing added,
 * and the two claims we removed are the entries most worth publishing.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What we have shipped, newest first, written for the people who use it.',
}

interface Entry {
  readonly date: string
  readonly title: string
  readonly body: string
}

/** Newest first. Dates as written, not parsed — nothing sorts these. */
const ENTRIES: readonly Entry[] = [
  {
    date: '13 November 2026',
    title: 'Goals, KPIs and a dashboard on every account',
    body: 'Every account now sets a goal and gets the KPI set that follows it, with targets proposed from a 14-day baseline. A source you have not connected says “Not connected” rather than showing a zero, and projections are dashed and labelled. There is a new Metrics page explaining all of it.',
  },
  {
    date: '13 November 2026',
    title: 'We stopped describing ourselves by industry',
    body: 'Mirrorline works for any business or individual, so the industry cards and industry wording are gone from the site. The only thing we ask is whether you are a business or an individual, and whether the account is new. Our agents research your niche themselves.',
  },
  {
    date: '13 November 2026',
    title: 'The free Niche Scan',
    body: 'You can now ask for a Niche Scan without talking to anyone: tell us what you do in your own words and we send back the format recipes that are growing where you are. There is a sample report so you can see what arrives first.',
  },
  {
    date: '13 November 2026',
    title: 'Two claims removed from this site',
    body: 'The header used to say a fixed number of pilot places were left, and the upload band said the run happened “on this machine”. Neither was true for a visitor, so both are gone. We would rather lose the urgency than keep something we cannot stand behind.',
  },
  {
    date: '12 November 2026',
    title: 'The seven agents explain themselves',
    body: 'The agent loop on the home page now advances as you scroll, so the hand-off from one agent to the next is something you watch rather than a list you read. It falls back to the full list on narrow screens and when you ask for reduced motion.',
  },
  {
    date: '12 November 2026',
    title: 'Real footage in the samples',
    body: 'The sample cuts on the home page are generated video rather than coloured blocks, each with a label saying so. The presenter is not a real person and the section says that too — generated material is always labelled, which is the same rule we hold your videos to.',
  },
  {
    date: '11 November 2026',
    title: 'The upload takes a file, never a link',
    body: 'You can drop a recording straight onto the home page and watch the engine cut it. There is no field for someone else’s video URL and there will not be: we work from footage you own, and the rights question is asked before anything starts.',
  },
]

export default function ChangelogPage() {
  return (
    <>
      <PageHero
        eyebrow="Changelog"
        title={
          <>
            What we shipped, <span className="gold-phrase">newest first.</span>
          </>
        }
        lead="Written for the people who use it rather than for the people who built it. Removals are in here too — a thing we took off the site is as much a change as a thing we added."
        marginNote={`${ENTRIES.length} entries · product changes only`}
      />

      <Section aria-labelledby="entries-heading">
        <SectionHeading
          id="entries-heading"
          eyebrow="Recent"
          title="The last few weeks"
          headingClassName="text-site-h2 font-serif"
        />
        <ol className="m-0 mt-10 flex list-none flex-col gap-0 p-0">
          {ENTRIES.map((entry, position) => (
            <li
              key={`${entry.date}-${entry.title}`}
              className="reveal-item grid gap-2 border-b border-border py-6 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-8"
              style={{ '--index': position % 4 } as React.CSSProperties}
            >
              <p className="machine m-0 text-mono text-text-muted lg:col-span-3">{entry.date}</p>
              <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
                <h3 className="m-0 font-heading text-title text-text">{entry.title}</h3>
                <p className="m-0 max-w-[72ch] text-body text-text-muted">{entry.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <SiteCta next={{ href: '/product', label: 'Product' }} />
    </>
  )
}
