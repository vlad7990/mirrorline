/**
 * /metrics — the KPI tiers, the seven goals, a dashboard preview and the
 * honesty rules (16 §4).
 *
 * The page v4 exists to make possible. Everything else on the site argues
 * that we publish; this one argues that we *report*, and the difference is
 * the whole position against both clipping tools (P1) and agencies (P7).
 *
 * The honesty rules get a section of their own rather than a footnote,
 * because they are the differentiator: anyone can draw a dashboard, and what
 * is unusual is saying out loud what it will refuse to show you.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { KPI_TIERS } from '@/components/kpi/kpi-types'
import { BrowserFrame } from '@/components/marketing/kit/frames'
import { GoalPicker } from '@/components/marketing/goal-picker'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { SampleDataLabel, Section, SectionHeading } from '@/components/marketing/primitives'

/** Offset 5, so this page does not open on a frame another page opened with. */
const [INSET_FRAMES = []] = allocateFrames([3], 5)

export const metadata: Metadata = {
  title: 'Metrics and KPIs',
  description:
    'Every Mirrorline account gets goals, KPIs and a dashboard, on every plan. Seven KPI tiers, targets proposed from your own baseline, and a rule against showing a zero for anything we have not measured.',
}

/** 15 §3, in the words a visitor would use. */
const TIER_EXAMPLES: Readonly<Record<string, string>> = {
  production: 'Videos made, posts published, posts on schedule, approval time, backlog',
  'content-health': '3-second hold, average watch, completion, sends and saves per 1,000 reach',
  growth: 'Net followers, follows per 1,000 views, profile visits, non-follower reach',
  outcome: 'Link clicks, click-through rate, leads, bookings, sales, revenue',
  return: 'Cost per lead, cost per booking, revenue against what you pay us',
  quality: 'Originality Gate pass rate, items rewritten, AI-labelled share, compliance blocks',
  'agent-ops': 'Agent spend against cap, failed jobs, time from upload to first post',
}

interface CascadeStep {
  readonly step: string
  readonly body: string
  readonly who: string
}

/** 15 §1. */
const CASCADE: readonly CascadeStep[] = [
  {
    step: 'Outcome',
    body: 'One sentence in your own words. “Get more customers from short video.”',
    who: 'You, in onboarding',
  },
  {
    step: 'Objectives',
    body: 'Two or three. Grow reach with the right people; turn viewers into enquiries.',
    who: 'Proposed, you edit',
  },
  {
    step: 'Key results',
    body: 'The numbers for the quarter, from your baseline and your niche’s benchmarks.',
    who: 'Proposed, you approve',
  },
  {
    step: 'KPIs',
    body: 'Tracked daily across the seven tiers below, with a weekly plan that follows.',
    who: 'Automatic',
  },
]

interface Hotspot {
  readonly number: number
  /** Percentage positions over the 16:10 screenshot. */
  readonly left: string
  readonly top: string
  readonly title: string
  readonly body: string
}

/**
 * The four parts of the Results screen worth pointing at.
 *
 * Positions are percentages of the screenshot rather than pixels, so they
 * stay put as the frame scales from 620px to a phone's full width. They are
 * eyeballed against `results-16x10` and will need a look if that screenshot
 * is retaken — which is why each one also appears in the list beside it,
 * where the explanation survives a marker drifting.
 */
const DASHBOARD_HOTSPOTS: readonly Hotspot[] = [
  {
    number: 1,
    left: '26%',
    top: '18%',
    title: 'The goal, with its progress',
    body: 'One goal per account, the one chosen in onboarding. Everything under it is measured against that and nothing else.',
  },
  {
    number: 2,
    left: '26%',
    top: '42%',
    title: 'KPI cards, with targets',
    body: 'Each carries its figure, how it moved, and the target it is being read against — plus how old the number is, because platform data arrives late.',
  },
  {
    number: 3,
    left: '74%',
    top: '42%',
    title: 'The states we do not hide',
    body: 'A source nobody connected says “Not connected” and offers a button. A projection is dashed and says what it assumes. Neither is ever shown as a measurement.',
  },
  {
    number: 4,
    left: '50%',
    top: '78%',
    title: 'The weekly ledger',
    body: 'The same table every week, whatever it contains. Nothing is quietly dropped for looking worse than the week before.',
  },
]

interface HonestyRule {
  readonly id: string
  readonly title: string
  readonly body: string
}

/** 15 §8, which is the part of this page that is actually unusual. */
const HONESTY_RULES: readonly HonestyRule[] = [
  {
    id: 'no-zero',
    title: 'Never a zero for something we have not measured',
    body: 'If a source is not connected, the KPI says “Not connected” and offers you a button. A zero would be a claim about a number nobody took.',
  },
  {
    id: 'projections',
    title: 'Projections are dashed and labelled',
    body: 'Where we show where something is heading, it is a dashed line carrying the word “projection” and what it assumes. It is never mixed into an actual.',
  },
  {
    id: 'targets',
    title: 'Targets are proposals, not promises',
    body: 'Every target comes from your own 14-day baseline plus what the Niche Scan found, and you can edit it. The word on screen is always “target”.',
  },
  {
    id: 'freshness',
    title: 'Every number says how old it is',
    body: 'Platform data arrives late and sometimes not at all. A figure that is six hours old says so rather than looking live.',
  },
  {
    id: 'limits',
    title: 'Platform limits are stated, not hidden',
    body: 'TikTok posts stay private until our app is audited, so the dashboard says that where it matters rather than reporting a reach of nothing.',
  },
  {
    id: 'bad-weeks',
    title: 'The bad weeks are in the ledger too',
    body: 'The weekly ledger is the same table every week whatever it contains. Nothing is quietly dropped for looking worse than the week before.',
  },
]

export default function MetricsPage() {
  return (
    <>
      <PageHeroImage
        eyebrow="Metrics and KPIs"
        title={
          <>
            Every account gets goals, <span className="gold-phrase">KPIs and a dashboard.</span>
          </>
        }
        lead="On every plan, in every industry. You pick one goal and the KPI set, the targets and the dashboard follow it — your trade only decides what the agents research."
        image={PAGE_HERO_IMAGES.metrics}
        index={KPI_TIERS.map((tier) => ({
          number: String(tier.number).padStart(2, '0'),
          title: tier.name,
        }))}
        inset={
          <HeroInset caption="Three accounts, three different goals.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      {/* The cascade ----------------------------------------------------- */}
      <Section aria-labelledby="cascade-heading">
        <SectionHeading
          id="cascade-heading"
          eyebrow="How a goal becomes a number"
          title={
            <>
              Outcome, objectives, <span className="gold-phrase">key results, KPIs.</span>
            </>
          }
          lead="You set the outcome in onboarding. The Performance Analyst proposes the rest after a 14-day baseline, and you approve it or change it."
          headingClassName="text-site-h2 font-serif"
        />
        <ol className="m-0 mt-10 grid list-none grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border p-0 lg:grid-cols-4">
          {CASCADE.map((item, position) => (
            <li
              key={item.step}
              className="reveal-item flex flex-col gap-2 bg-surface p-5"
              style={{ '--index': position } as React.CSSProperties}
            >
              <span className="machine text-mono text-gold-bright">
                {String(position + 1).padStart(2, '0')}
              </span>
              <h3 className="m-0 font-heading text-subtitle text-text">{item.step}</h3>
              <p className="m-0 text-meta text-text-muted">{item.body}</p>
              <p className="m-0 mt-auto border-t border-border pt-3 text-caption text-text-muted">
                {item.who}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* The seven goals -------------------------------------------------- */}
      {/* `band-snow`, paired with `surface="snow"` on the KPI cards inside.
          This section renders the studio's own `KpiCard`, and that component
          takes a surface precisely because its target line is small gold text
          whose correct value depends on what it sits on. Leaving it on the
          default `theme` surface failed axe here; `band-ink-alt` failed it
          the other way (D40). A band pins the palette and the matching
          surface tells the card which palette it was pinned to — the two are
          meant to be set together. */}
      <Section className="band-snow" size="md" aria-labelledby="goals-heading">
        <SectionHeading
          id="goals-heading"
          eyebrow="The seven goals"
          title={
            <>
              Pick one. <span className="gold-phrase">It decides the rest.</span>
            </>
          }
          lead="You may add a second. Not one of them is an industry, and that is the point: two businesses in completely different trades chasing bookings get the same KPI set."
          headingClassName="text-site-h2 font-serif"
        />
        {/* The seven cards became a picker (19 v2 ★2, D52). They stated what
            each goal was and showed nothing happening, on the one page whose
            argument is that we *report* — so the section carrying that
            argument was the most inert on the site. */}
        <div className="mt-10">
          <GoalPicker />
        </div>
      </Section>

      {/* The seven tiers -------------------------------------------------- */}
      <Section aria-labelledby="tiers-heading">
        <SectionHeading
          id="tiers-heading"
          eyebrow="The seven tiers"
          title={
            <>
              The same structure <span className="gold-phrase">for every account.</span>
            </>
          }
          lead="Which KPIs sit in front of you depends on your goal. Which tiers exist does not — every account is measured from production all the way through to return."
          headingClassName="text-site-h2 font-serif"
        />
        <ol className="m-0 mt-10 flex list-none flex-col gap-0 p-0">
          {KPI_TIERS.map((tier, position) => (
            <li
              key={tier.key}
              className="reveal-item grid gap-2 border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-6"
              style={{ '--index': position } as React.CSSProperties}
            >
              <div className="flex items-baseline gap-3 lg:col-span-3">
                <span className="machine text-mono text-gold-bright">
                  {String(tier.number).padStart(2, '0')}
                </span>
                <h3 className="m-0 font-heading text-subtitle text-text">{tier.name}</h3>
              </div>
              <p className="m-0 text-meta text-text-muted lg:col-span-6">
                {TIER_EXAMPLES[tier.key]}
              </p>
              <p className="machine m-0 text-mono text-text-muted lg:col-span-3">{tier.source}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 mb-0 max-w-[68ch] text-meta text-text-muted">
          You can add your own on top of these — phone calls, walk-ins, reviews — entered by hand
          or by CSV, with the same target and trend treatment as the rest.
        </p>
      </Section>

      {/* The dashboard ---------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="dashboard-heading">
        <SectionHeading
          id="dashboard-heading"
          eyebrow="The dashboard"
          title={
            <>
              What it actually <span className="gold-phrase">looks like.</span>
            </>
          }
          lead="Results has seven tabs: Overview, Funnel, Content, Accounts, Goals and KPIs, Ledger, and the Performance Analyst’s weekly note. This is the Overview, with a fictional account’s figures."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        {/* The whole screen, annotated — rather than `MetricsPreview` again.
            That component renders the live KPI cards, and the goal picker
            above already does: three dashboards on one page is two too many.
            What this section adds is the thing the cards cannot show on their
            own, which is where they sit in a screen somebody works in.

            The markers are numbered and repeated as a list below, so nothing
            here depends on hovering. A hotspot whose explanation only appears
            on hover is invisible on a phone and to a keyboard. */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <BrowserFrame
            className="lg:col-span-7"
            shot="results-16x10"
            path="/app/results"
            alt="The Results screen: a goal bar, KPI cards with targets, the funnel and the weekly ledger."
            sizes="(min-width: 1024px) 620px, 100vw"
            caption="Sample data from a fictional demo account."
          >
            {DASHBOARD_HOTSPOTS.map((spot) => (
              <span
                key={spot.number}
                aria-hidden="true"
                className="machine absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold-deep text-caption font-semibold text-ink-900 shadow-lg"
                style={{ left: spot.left, top: spot.top }}
              >
                {spot.number}
              </span>
            ))}
          </BrowserFrame>

          <ol className="m-0 flex list-none flex-col gap-4 p-0 lg:col-span-5">
            {DASHBOARD_HOTSPOTS.map((spot) => (
              <li key={spot.number} className="flex gap-3">
                <span className="machine mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-deep text-caption font-semibold text-ink-900">
                  {spot.number}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-heading text-subtitle text-text">{spot.title}</span>
                  <span className="text-meta text-text-muted">{spot.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* The honesty rules ------------------------------------------------ */}
      <Section tone="subtle" aria-labelledby="honesty-heading">
        <SectionHeading
          id="honesty-heading"
          eyebrow="The honesty rules"
          title={
            <>
              What this dashboard <span className="gold-phrase">will not show you.</span>
            </>
          }
          lead="Anyone can draw a chart. These are the six rules about what goes in it, and they are the reason the numbers are worth reading."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
          {HONESTY_RULES.map((rule, position) => (
            <li
              key={rule.id}
              className="reveal-item"
              style={{ '--index': position % 3 } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <h3 className="m-0 font-heading text-subtitle text-text">{rule.title}</h3>
                <p className="m-0 text-meta text-text-muted">{rule.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <PageCta cta={PAGE_CTAS.metrics} />
    </>
  )
}
