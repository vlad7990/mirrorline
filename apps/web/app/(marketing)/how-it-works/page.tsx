/**
 * /how-it-works — Scan → Make → Post & prove, step by step, with the first
 * week's timeline (16 §4).
 *
 * The path sat in the footer for weeks with a 308 to `/agents` behind it,
 * because the site map named a page nobody had built. This is that page.
 *
 * `/agents` answers "who does the work"; this one answers "what happens, and
 * when". The week-one timeline is the part a buyer actually wants: 14 §1's
 * fifth beat is "that's simple", and a plan with dates on it is the only
 * version of simple that survives contact with a sceptic.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Scan your niche, make original videos from your footage or from formats that are growing, then post daily to your own accounts and report what it produced. Here is the first week, day by day.',
}

interface Phase {
  readonly id: string
  readonly number: string
  readonly title: string
  readonly lead: string
  readonly steps: readonly string[]
  /** Who does it. Named, because the agents are the product (04). */
  readonly agents: string
}

const PHASES: readonly Phase[] = [
  {
    id: 'scan',
    number: '01',
    title: 'Scan',
    lead: 'Before anything is made, we find out what is actually working where you are.',
    steps: [
      'You describe your niche in your own words and name up to three accounts you admire.',
      'Trend Scout reads the platforms’ own trend tools, ad libraries and public APIs, and a strategist reviews up to thirty examples by hand.',
      'Everything is ranked by views per follower over 30 days, not by follower count.',
      'You get five to ten format recipes, each with why it is growing and how we would make it yours.',
    ],
    agents: 'Trend Scout',
  },
  {
    id: 'make',
    number: '02',
    title: 'Make',
    lead: 'Two ways in, and most accounts use both. Either way what comes out is original.',
    steps: [
      'You send a talk, a podcast, a webinar or phone footage, and the Multiplier cuts it into many genuinely different shorts.',
      'Or we remake a format you approved: its structure only, with a new script written from your voice and your facts.',
      'Every script has to cite at least one true fact about your business.',
      'The Originality Gate checks each video against its source and against your own last 60 posts. What is too close is rewritten, never nudged under a threshold.',
    ],
    agents: 'Multiplier · Remake Producer · Compliance',
  },
  {
    id: 'post',
    number: '03',
    title: 'Post & prove',
    lead: 'Several posts a day to accounts you own, and a weekly ledger that ends at money.',
    steps: [
      'Everything lands on a calendar first. You approve each post, or let them go after 24 hours and object to anything you do not want.',
      'The Publisher posts through the official platform APIs only, at the times that work for your account.',
      'The Performance Analyst reads what happened and writes next week’s plan — which formats to make more of, which hooks to retire.',
      'On Monday you get the ledger: posts, views, sends, saves, follows, leads and bookings. Including the weeks that go badly.',
    ],
    agents: 'Client Concierge · Publisher · Performance Analyst',
  },
]

interface TimelineDay {
  readonly when: string
  readonly what: string
  readonly who: string
}

/**
 * The first week, in order.
 *
 * Deliberately **not** a promise about results — 14 §1 beat 6 and
 * non-negotiable 7. Every row is something *we* do on a date, which is a
 * commitment we control, rather than a number that depends on an audience we
 * have not met.
 */
const WEEK_ONE: readonly TimelineDay[] = [
  {
    when: 'Day 1',
    what: 'You tell us your niche and goal, connect your accounts, and confirm what you own. About twenty minutes.',
    who: 'You, with the Concierge',
  },
  {
    when: 'Day 1–2',
    what: 'The Niche Scan runs, and a strategist checks it by hand.',
    who: 'Trend Scout',
  },
  {
    when: 'Day 2',
    what: 'You see the format recipes and pick the ones worth remaking.',
    who: 'You',
  },
  {
    when: 'Day 2–3',
    what: 'The first cuts come out of whatever you sent, and the first remakes are written.',
    who: 'Multiplier · Remake Producer',
  },
  {
    when: 'Day 3',
    what: 'Everything passes the Originality Gate and the compliance checks before it can be scheduled.',
    who: 'Compliance',
  },
  {
    when: 'Day 3–4',
    what: 'You approve the first week from your phone. Roughly fifteen minutes.',
    who: 'You',
  },
  {
    when: 'Day 4',
    what: 'Posting starts, several times a day, to your own accounts.',
    who: 'Publisher',
  },
  {
    when: 'Day 4–17',
    what: 'The 14-day baseline runs. We do not propose targets before we have measured you.',
    who: 'Performance Analyst',
  },
  {
    when: 'Day 18',
    what: 'Targets are proposed from your baseline and your niche’s benchmarks. You approve or change them.',
    who: 'Performance Analyst, then you',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title={
          <>
            Scan, make, <span className="gold-phrase">post and prove.</span>
          </>
        }
        lead="Three phases, seven agents, and about fifteen minutes a week from you. Below is what happens in each phase, and then the first week with dates on it."
        shot="studio-cuts-16x10"
        shotAlt="The studio showing one long video cut into twelve short vertical posts, each with its hook and compliance result."
        shotCaption="Sample data from a fictional demo account."
        index={PHASES.map((phase) => ({
          number: phase.number,
          title: phase.title,
          description: phase.agents,
        }))}
        marginNote="three phases · about 15 minutes a week from you"
      />

      {/* The three phases ------------------------------------------------- */}
      {PHASES.map((phase, position) => (
        <Section
          key={phase.id}
          className={position % 2 === 1 ? 'band-ink-alt' : undefined}
          aria-labelledby={`${phase.id}-heading`}
        >
          <SectionHeading
            id={`${phase.id}-heading`}
            eyebrow={`Phase ${phase.number}`}
            title={phase.title}
            lead={phase.lead}
            headingClassName="text-site-h2 font-serif"
          />
          <ol className="m-0 mt-10 flex list-none flex-col gap-0 p-0">
            {phase.steps.map((step, stepPosition) => (
              <li
                key={step}
                className="reveal-item flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                style={{ '--index': stepPosition } as React.CSSProperties}
              >
                <span className="machine shrink-0 text-mono text-gold-bright">
                  {String(stepPosition + 1).padStart(2, '0')}
                </span>
                <p className="m-0 max-w-[72ch] text-body text-text-muted">{step}</p>
              </li>
            ))}
          </ol>
          <p className="machine mt-6 mb-0 text-mono text-text-muted">Agents: {phase.agents}</p>
        </Section>
      ))}

      {/* Week one --------------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="timeline-heading">
        <SectionHeading
          id="timeline-heading"
          eyebrow="The first week"
          title={
            <>
              What happens, <span className="gold-phrase">and when.</span>
            </>
          }
          lead="Every row is something we do on a date, not a number we expect you to hit. Results depend on an audience we have not met yet; the schedule does not."
          headingClassName="text-site-h2 font-serif"
        />
        <ol className="m-0 mt-10 flex list-none flex-col gap-0 p-0">
          {WEEK_ONE.map((day, position) => (
            <li
              key={day.when}
              className="reveal-item grid gap-1 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-6"
              style={{ '--index': position } as React.CSSProperties}
            >
              <span className="machine text-mono text-gold-text lg:col-span-2">{day.when}</span>
              <p className="m-0 text-meta text-text lg:col-span-7">{day.what}</p>
              <p className="m-0 text-meta text-text-muted lg:col-span-3">{day.who}</p>
            </li>
          ))}
        </ol>
        <Card className="mt-8 flex flex-col gap-2">
          <h3 className="m-0 font-heading text-subtitle text-text">Why targets wait two weeks</h3>
          <p className="m-0 max-w-[72ch] text-meta text-text-muted">
            A target set on day one is a guess dressed up as a plan. We measure your account for
            fourteen days first, compare that with what the Niche Scan found in your niche, and
            then propose numbers you can argue with. They are called targets throughout, and you
            can change any of them.
          </p>
        </Card>
      </Section>

      <SiteCta next={{ href: '/metrics', label: 'Metrics' }} />
    </>
  )
}
