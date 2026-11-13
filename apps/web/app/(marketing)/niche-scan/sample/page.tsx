/**
 * /niche-scan/sample — what a scan report actually looks like (16 §4).
 *
 * **Every figure is invented, and the page says so repeatedly.** This is the
 * most dangerous page on the site for non-negotiable 7: a report full of
 * plausible numbers is exactly the thing a reader screenshots and quotes
 * back. So the sample label sits in the hero, above the recipes, and beside
 * the account summary.
 *
 * The fictional account is deliberately a **plain trade nobody could mistake
 * for a vertical we specialise in** — a bookkeeping practice — and the
 * recipes are formats rather than industry advice. The point being made is
 * that the method travels.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { SampleDataLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

export const metadata: Metadata = {
  title: 'Sample Niche Scan',
  description:
    'An example of the report a Niche Scan returns: format recipes ranked by fit, with why each is growing and how we would make it yours. Every figure on this page is invented.',
}

interface Recipe {
  readonly name: string
  readonly fit: number
  readonly viewsPerFollower: string
  readonly length: string
  readonly why: string
  readonly beats: readonly string[]
  readonly yours: string
}

/** Formats, not industry advice. Each one travels to any trade. */
const RECIPES: readonly Recipe[] = [
  {
    name: 'Myth vs fact',
    fit: 91,
    viewsPerFollower: '7.4×',
    length: '0:28',
    why: 'It names something the audience already half-believes, then corrects it in one line. The disagreement is what gets it sent on.',
    beats: [
      'The myth, on screen',
      '“Here’s what’s actually true”',
      'One piece of proof',
      'What to do instead',
    ],
    yours: 'The thing clients say to you most often that is not quite right. You almost certainly have five.',
  },
  {
    name: 'What this should cost',
    fit: 86,
    viewsPerFollower: '5.1×',
    length: '0:34',
    why: 'Price is the question everyone has and nobody asks first. Answering it unprompted reads as confidence rather than as a pitch.',
    beats: ['The number, said plainly', 'What changes it', 'What a bad deal looks like', 'How to check'],
    yours: 'A real range from your own work, with the honest caveats. Never a figure you would not stand behind.',
  },
  {
    name: 'Three mistakes',
    fit: 82,
    viewsPerFollower: '4.6×',
    length: '0:41',
    why: 'A count sets an expectation the viewer stays for. The third is the one worth watching to, so it carries the payoff.',
    beats: ['“Three things people get wrong”', 'One, quickly', 'Two, quickly', 'Three, with the detail'],
    yours: 'The mistakes you fix for people every week. Specific beats clever.',
  },
  {
    name: 'A day of the work',
    fit: 74,
    viewsPerFollower: '3.2×',
    length: '0:52',
    why: 'People follow a person doing a job more readily than a business describing one. It builds the account rather than any single post.',
    beats: ['Where you start', 'The awkward middle', 'What finished looks like', 'What you would change'],
    yours: 'One real job, filmed on a phone, with nothing tidied up for the camera.',
  },
  {
    name: 'Answering a real question',
    fit: 71,
    viewsPerFollower: '2.9×',
    length: '0:26',
    why: 'The question on screen does the targeting: anyone who has asked it stops. It is also the easiest format to make consistently.',
    beats: ['The question, verbatim', 'The short answer', 'The caveat', 'Where to ask yours'],
    yours: 'Your inbox. Every question someone emailed you is a post you have already written.',
  },
]

const ACCOUNT_SUMMARY = [
  { label: 'Niche, as typed', value: 'Bookkeeping for tradespeople' },
  { label: 'Account type', value: 'Business, existing' },
  { label: 'Goal', value: 'Leads and enquiries' },
  { label: 'Examples reviewed', value: '30' },
] as const

export default function SampleScanPage() {
  return (
    <>
      <PageHero
        eyebrow="Sample report"
        title={
          <>
            What a scan <span className="gold-phrase">comes back with.</span>
          </>
        }
        lead="This is an example for a fictional two-person bookkeeping practice. Every figure on this page is invented — it shows the shape of the report, not a result anyone achieved."
        marginNote="example only · every figure invented"
      />

      <Section aria-labelledby="account-heading">
        <SectionHeading
          id="account-heading"
          eyebrow="The account scanned"
          title="A fictional bookkeeping practice"
          lead="Chosen because it is nobody’s idea of a social-media business. If the method works here it works anywhere, which is the whole claim behind not having industry pages."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        <dl className="m-0 mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {ACCOUNT_SUMMARY.map((item) => (
            <div key={item.label} className="flex flex-col gap-1 bg-surface p-5">
              <dt className="text-caption text-text-muted">{item.label}</dt>
              <dd className="machine m-0 text-mono text-text">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section className="band-snow" aria-labelledby="recipes-heading">
        <SectionHeading
          id="recipes-heading"
          eyebrow="The recipes"
          title={
            <>
              Five formats, <span className="gold-phrase">ranked by fit.</span>
            </>
          }
          lead="Ranked by views per follower over thirty days, not by follower count — a small account getting ten times its following is a better model than a huge one coasting."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        <ul className="m-0 mt-10 flex list-none flex-col gap-5 p-0">
          {RECIPES.map((recipe, position) => (
            <li
              key={recipe.name}
              className="reveal-item"
              style={{ '--index': position % 3 } as React.CSSProperties}
            >
              <Card className="grid gap-5 lg:grid-cols-12">
                <div className="flex flex-col gap-2 lg:col-span-4">
                  <div className="flex items-baseline gap-3">
                    <span className="machine text-mono text-gold-text">
                      {String(position + 1).padStart(2, '0')}
                    </span>
                    <h3 className="m-0 font-heading text-title text-text">{recipe.name}</h3>
                  </div>
                  <dl className="m-0 grid grid-cols-3 gap-3 rounded-md bg-surface-subtle p-3">
                    {[
                      { label: 'Fit', value: `${recipe.fit}/100` },
                      { label: 'Views / follower', value: recipe.viewsPerFollower },
                      { label: 'Length', value: recipe.length },
                    ].map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-0.5">
                        <dt className="text-caption text-text-muted">{stat.label}</dt>
                        <dd className="machine m-0 text-mono text-text">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="flex flex-col gap-3 lg:col-span-4">
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow">Why it is growing</span>
                    <p className="m-0 text-meta text-text-muted">{recipe.why}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow">How we would make it yours</span>
                    <p className="m-0 text-meta text-text-muted">{recipe.yours}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:col-span-4">
                  <span className="eyebrow">The beats</span>
                  {/* An abstract storyboard, never a frame of anyone's video
                      (DESIGN.md: "Don't show a trend as someone else's
                      video"). The scan stores links and descriptions only. */}
                  <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {recipe.beats.map((beat, beatPosition) => (
                      <li key={beat} className="flex items-center gap-3">
                        <span className="machine w-5 shrink-0 text-mono text-text-muted">
                          {beatPosition + 1}
                        </span>
                        <span className="h-6 w-1 shrink-0 rounded-full bg-accent" />
                        <span className="min-w-0 text-meta text-text">{beat}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="subtle" size="md" aria-labelledby="caveat-heading">
        <SectionHeading
          id="caveat-heading"
          eyebrow="What this is not"
          title="A plan, not a prediction"
          headingClassName="text-site-h2 font-serif"
        />
        <p className="mt-6 mb-0 max-w-[72ch] text-body text-text-muted">
          A scan tells you what is working in your niche right now and how we would adapt it. It
          does not tell you how many followers or leads you will get, because nobody can honestly
          say that about an audience they have not met. Your own targets come later, from a
          fourteen-day baseline of your actual account, and you approve them.
        </p>
      </Section>

      <SiteCta next={{ href: '/pricing', label: 'Pricing' }} />
    </>
  )
}
