/**
 * /how-it-works — Scan → Make → Post & prove, with something to look at in
 * every phase.
 *
 * Rebuilt for 19_INNER_PAGES v2 (D49). The content was already right: three
 * phases, named agents, and a first week with dates on it rather than numbers
 * we cannot promise. What was wrong was that all of it was prose — five
 * text-only sections in a row, which is the specific thing 19 bans and the
 * reason the page read as documentation.
 *
 * So each phase now gets its own kind of visual, and they are deliberately
 * three different kinds: a recipe card for Scan, because what comes back from
 * the scan *is* a card; two phone frames for Make, because the whole point of
 * that phase is "what you send" and "what we make" being two different
 * things; and the real calendar screenshot with the week's figures for Post &
 * prove, because that phase ends in a dashboard. Three of the same device
 * would have been decoration; three different ones are each the phase's own
 * evidence.
 *
 * `WEEK_ONE` keeps its real day numbering. 19's table asks for a "Mon–Sun"
 * strip, and the honest version of this schedule does not fit seven named
 * days — it runs to day 18, because the baseline takes a fortnight and
 * targets wait for it. Renaming days 1–18 as Monday to Sunday would have been
 * making the spec's shape true at the cost of the content.
 */

import { metrics, trends } from '@mirrorline/mock'
import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { CountUp } from '@/components/marketing/count-up'
import { ClientEffort, DivisionOfLabour } from '@/components/marketing/effort-sections'
import { FaqSection } from '@/components/marketing/kit/faq-section'
import { BrowserFrame, PhoneFrame } from '@/components/marketing/kit/frames'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { ONBOARDING_FAQ } from '@/components/marketing/onboarding-faq-content'
import { Section, SectionHeading } from '@/components/marketing/primitives'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Scan your niche, make original videos from your footage or from formats that are growing, then post daily to your own accounts and report what it produced. Here is the first week, day by day.',
}

/**
 * Three for the hero's cycle, two for the Make phase's pair.
 *
 * Offset 4 so this page does not open with the same frame /product opens
 * with. Without it every page would start at the baker and the site would
 * look like one page repeated (see `allocateFrames`).
 */
const [INSET_FRAMES = [], MAKE_FRAMES = []] = allocateFrames([3, 2], 4)

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

/* -------------------------------------------------------------------------- */
/* The three phase visuals                                                     */
/* -------------------------------------------------------------------------- */

/** Scan: one of the recipes that comes back, as the scan itself renders it. */
function ScanVisual() {
  const recipe = trends[0]
  if (recipe === undefined) return null

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">One recipe, of five to ten</span>
          <h3 className="m-0 font-heading text-subtitle text-text">{recipe.format}</h3>
        </div>
        <span className="machine shrink-0 text-mono text-success">{recipe.growthLabel}</span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {recipe.beats.map((beat) => (
          <li
            key={beat.order}
            className="flex items-baseline gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
          >
            <span className="machine shrink-0 text-mono text-text-muted">
              {String(beat.order).padStart(2, '0')}
            </span>
            <span className="text-meta text-text">{beat.label}</span>
          </li>
        ))}
      </ol>

      <p className="m-0 text-meta text-text-muted">{recipe.whyItWorks}</p>
      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        <span className="machine">{recipe.viewsPerFollower}×</span> views per follower in this
        niche · sample data from a fictional demo account
      </p>
    </Card>
  )
}

/** Make: what you send on the left, what comes back on the right. */
function MakeVisual() {
  const [sent, made] = MAKE_FRAMES

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {sent ? (
        <PhoneFrame caption="What you send: your own footage, filmed on a phone.">
          {/* eslint-disable-next-line @next/next/no-img-element -- the same
              reasoning `ReelStill` carries: a 9:16 still already sized for a
              ~180px frame has nothing for the optimiser to resize, and this
              one is decorative with the caption doing the telling. */}
          <img
            src={sent.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </PhoneFrame>
      ) : null}
      {made ? (
        <PhoneFrame caption="What comes back: a cut with its hook, in your brand style.">
          {/* eslint-disable-next-line @next/next/no-img-element -- as above. */}
          <img
            src={made.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </PhoneFrame>
      ) : null}
    </div>
  )
}

interface WeekFigure {
  readonly label: string
  readonly value: number
}

/**
 * One week of the demo account, as the ledger reports it.
 *
 * Posts first and bookings last, which is the order the ledger runs in: the
 * thing we control, through to the thing the client cares about. Every figure
 * is from the same fixture the studio's Results screen renders.
 */
const WEEK_FIGURES: readonly WeekFigure[] = [
  { label: 'posts', value: metrics.posts },
  { label: 'views', value: metrics.views },
  { label: 'profile visits', value: metrics.profileVisits },
  { label: 'link clicks', value: metrics.linkClicks },
  { label: 'leads', value: metrics.leads },
  { label: 'calls booked', value: metrics.callsBooked },
]

/** Post & prove: the week on the calendar, and what that week reported. */
function PostVisual() {
  return (
    <div className="flex flex-col gap-6">
      <BrowserFrame
        shot="calendar-16x10"
        path="/app/calendar"
        alt="The posting week: three platform rows of scheduled posts, each one awaiting approval."
        sizes="(min-width: 1024px) 460px, 100vw"
        caption="The week before anyone approves it. Sample data from a fictional demo account."
      />
      <ul className="m-0 grid list-none grid-cols-3 gap-x-4 gap-y-5 p-0">
        {WEEK_FIGURES.map((figure, position) => (
          <li
            key={figure.label}
            className="reveal-item flex flex-col gap-0.5"
            style={{ '--index': position % 3 } as React.CSSProperties}
          >
            <span className="machine text-metric text-text">
              <CountUp value={figure.value} />
            </span>
            <span className="text-caption text-text-muted">{figure.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const PHASE_VISUALS: Record<string, React.ReactNode> = {
  scan: <ScanVisual />,
  make: <MakeVisual />,
  post: <PostVisual />,
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHeroImage
        eyebrow="How it works"
        title={
          <>
            Scan, make, <span className="gold-phrase">post and prove.</span>
          </>
        }
        lead="Three phases, seven agents, and about fifteen minutes a week from you. Below is what happens in each phase, and then the first week with dates on it."
        image={PAGE_HERO_IMAGES['how-it-works']}
        index={PHASES.map((phase) => ({
          number: phase.number,
          title: phase.title,
          description: phase.agents,
        }))}
        inset={
          <HeroInset caption="Three accounts, one week of work each.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      {/* The three phases ------------------------------------------------- */}
      {PHASES.map((phase, position) => (
        <Section
          key={phase.id}
          /* No band utility on the even phases, and that is deliberate rather
             than an omission. Putting `band-snow` here read better and failed
             axe twice: a band utility *pins* the palette (D40), so
             `text-gold-bright` on the step numbers and `text-success` on the
             recipe card kept their ink-band values on a light ground and came
             in under 4.5:1. Outside a band those tokens follow the theme and
             are correct in both. The separation the band was buying is not
             worth two serious contrast violations. */
          className={position % 2 === 1 ? 'band-ink-alt' : undefined}
          aria-labelledby={`${phase.id}-heading`}
        >
          <SectionHeading
            id={`${phase.id}-heading`}
            eyebrow={`Phase ${phase.number}`}
            rail
            title={phase.title}
            lead={phase.lead}
            headingClassName="text-site-h2"
          />

          {/* The steps and the visual side by side, and the visual leads on
              the middle phase. Alternating which side it sits on is what
              stops three phases in a row reading as one long table. */}
          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className={position === 1 ? 'lg:order-2 lg:col-span-7' : 'lg:col-span-7'}>
              <ol className="m-0 flex list-none flex-col gap-0 p-0">
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
              <p className="machine mb-0 mt-6 text-mono text-text-muted">Agents: {phase.agents}</p>
            </div>

            <div className={position === 1 ? 'lg:order-1 lg:col-span-5' : 'lg:col-span-5'}>
              {PHASE_VISUALS[phase.id]}
            </div>
          </div>
        </Section>
      ))}

      {/* Week one --------------------------------------------------------- */}
      <Section className="band-white" aria-labelledby="timeline-heading">
        <SectionHeading
          id="timeline-heading"
          eyebrow="The first week"
          rail
          title={
            <>
              What happens, <span className="gold-phrase">and when.</span>
            </>
          }
          lead="Every row is something we do on a date, not a number we expect you to hit. Results depend on an audience we have not met yet; the schedule does not."
          headingClassName="text-site-h2"
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

      {/* The reader's own week, which the three phases describe in the third
          person and never put a number on (11 §2 P8). */}
      <ClientEffort />
      <DivisionOfLabour />

      <FaqSection
        id="onboarding-faq"
        eyebrow="Before you start"
        title="The first fortnight"
        accent="answered in advance."
        lead="What we need on day one, when anything appears, and what happens if the first batch is not right."
        items={ONBOARDING_FAQ}
        band="white"
      />

      <PageCta cta={PAGE_CTAS['how-it-works']} />
    </>
  )
}
