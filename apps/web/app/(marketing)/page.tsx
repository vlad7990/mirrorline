/**
 * The landing page.
 *
 * The spine is honesty: the limits come before the loop, because the limits
 * are the only reason we can say any of this. The proof is the output: the
 * twelve cuts one episode became, on the viewer surface, with their hooks,
 * lengths, formats, compliance verdicts and AI labels.
 *
 * Every figure comes from @mirrorline/mock, the fictional demo client in
 * docs/specs/08_MOCK_DATA.md, and carries a visible "Sample data" label, as
 * CLAUDE.md non-negotiable 7 requires. There are no testimonials, no ratings,
 * no customer results, no certifications and no guarantees anywhere on this
 * page: see docs/design/STITCH_REVIEW.md, item 1.
 */

import { cutSummary, cuts, funnel, metrics, sourceVideo } from '@mirrorline/mock'
import { SiteCta } from '@/components/marketing/site-cta'
import { Button, Card, FunnelBar, VideoThumb } from '@mirrorline/ui'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { LOOP_CLOSING_LINE } from '@/components/marketing/agents'
import { AgentLoop } from '@/components/marketing/agent-loop'
import { CutWall } from '@/components/marketing/cut-wall'
import { ReelBackdrop } from '@/components/marketing/reel-backdrop'
import { Faq } from '@/components/marketing/faq'
import { FAQ_ITEMS } from '@/components/marketing/faq-content'
import { GateReadout } from '@/components/marketing/gate-readout'
import { CountUp } from '@/components/marketing/count-up'
import { FeatureTabs } from '@/components/marketing/feature-tabs'
import {
  CHOICE_ANCHOR_ID,
  HeroCinematic,
  UPLOAD_ANCHOR_ID,
} from '@/components/marketing/hero-cinematic'
import { HeroUpload } from '@/components/marketing/hero-upload'
import {
  AudiencePicker,
  AudiencePickerStatus,
} from '@/components/marketing/home/audience-picker'
import {
  ChangedIn2026,
  ContrastTable,
  NicheScanExplainer,
  TwoWaysIn,
} from '@/components/marketing/home/argument-sections'
import { ProblemPicker } from '@/components/marketing/home/problem-picker'
import { MetricsPreview } from '@/components/kpi/metrics-preview'
import { NotAFarm, PlainBilling } from '@/components/marketing/home/trust-sections'
import { FinalCta } from '@/components/marketing/home/final-cta'
import { AUDIENCES, PROOF_CARDS, SHOWCASE_CARDS } from '@/components/marketing/home-content'
import { ShowcaseMarquee } from '@/components/marketing/showcase-marquee'
import { SplitReveal } from '@/components/marketing/split-reveal'
import {
  ComingSoonLabel,
  SampleDataLabel,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives'
import { SELLABLE_TIERS, perDayUsd } from '@/components/marketing/pricing-tiers'


export const metadata: Metadata = {
  title: 'Original short video, every day, on the accounts you own',
  description:
    'Mirrorline runs short-video growth for any business or individual, in any industry. Send your own videos or we create originals from formats growing in your niche, posted to your own accounts through the official platform APIs.',
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

/*
 * `LIMITS` — the four "things we will not do" — lived here. 16 §3 row 15
 * merges that band into "Not a farm, not a repost page", where the same
 * limits are stated against the model they are actually a contrast with.
 * The copy moved to `home/trust-sections.tsx` and gained the two it was
 * missing: detection evasion, and Repost Watch.
 */

/**
 * The cycling second line, completing "Original short video, …".
 *
 * Each one has to be true of **both** ways in and of any niche — the old set
 * ("a week of posts", "twelve short videos") described the Multiplier alone
 * and said nothing to an account with no footage yet.
 */
const HERO_PHRASES = [
  'every day.',
  'on accounts you own.',
  'in any niche.',
  'never a repost.',
] as const

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

// The FAQ moved to components/marketing/faq-content.tsx when /faq was
// built: 16 §3 row 18 has the home page show six and /faq carry all of
// them, which only works from one list.

/**
 * 16 §3 row 18: the home page shows the top six and `/faq` (PR7) carries the
 * rest. Sliced rather than kept as a second list, so the two cannot drift.
 */
const HOME_FAQ_COUNT = 6

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * CLAUDE.md non-negotiable 6: "every video passes the Compliance agent before
 * it can be scheduled." That makes one agent in the loop different from the
 * other six, so the ladder marks it instead of treating all seven alike.
 */
const GATE_AGENT_ID = 'compliance'

/** The demo week is Monday to Sunday, so the funnel note can say how long. */
const DEMO_WEEK_DAYS = 7

export default function LandingPage() {
  const funnelSteps = funnel.map((stage) => ({ label: stage.label, count: stage.value }))

  return (
    <>
      {/* Hero -----------------------------------------------------------
          Asymmetric, not a centred stack: 7 columns of argument against 5 of
          evidence. The screenshot is the real upload screen, not a drawing of
          one, because the claim on the left is a claim about a product that
          exists and the fastest way to support it is to show the thing.

          The headline is five words. It was twelve, which reads fine at the
          46px the studio uses and breaks into four lines at the size a public
          page wants. The qualifier it used to carry moved into the subtext. */}
      {/* The handoff centres the hero and gives it the page's one action,
          rather than setting a text column against a screenshot. The
          screenshot moves down to the proof section, where it is evidence
          instead of decoration. */}
      <HeroCinematic phrases={HERO_PHRASES} />

      {/* 1b. The picker --------------------------------------------------
          16 §3 row 1 puts this in the hero; D34 had already emptied the hero
          of controls and D39 keeps it that way, so it opens the band directly
          below instead. Everything that reads the choice sits beneath it. */}
      <Section
        id={CHOICE_ANCHOR_ID}
        className="band-ink-alt scroll-mt-24"
        size="md"
        aria-labelledby="choose-heading"
      >
        <SectionHeading
          id="choose-heading"
          rail
          eyebrow="Start here"
          title={
            <>
              Two questions, <span className="gold-phrase">no industry list.</span>
            </>
          }
          lead="We never ask what trade you are in. Our agents research your niche themselves — these two answers are only so the rest of this page shows you the right examples."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="reveal mt-8 flex flex-col gap-4">
          <AudiencePicker />
          <AudiencePickerStatus />
          <p className="m-0 max-w-[62ch] text-meta text-on-ink-muted">
            Whichever you pick, the first step is the same and it is free: a Niche Scan of what is
            actually growing where you are.
          </p>
        </div>
      </Section>

      {/* 2. Sound familiar? ---------------------------------------------- */}
      <Section aria-labelledby="problems-heading">
        <SectionHeading
          id="problems-heading"
          rail
          eyebrow="Sound familiar?"
          title={
            <>
              You have tried this before, <span className="gold-phrase">and it did not hold.</span>
            </>
          }
          lead="Six things people say about the tools, the agencies and the doing-it-yourself. Open the one that is yours."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-8">
          <ProblemPicker />
        </div>
      </Section>

      {/* 3. What changed in 2026 ----------------------------------------- */}
      <Section className="band-ink-alt" size="md" aria-labelledby="changed-heading">
        <SectionHeading
          id="changed-heading"
          rail
          eyebrow="What changed in 2026"
          title={
            <>
              The shortcut <span className="gold-phrase">stopped working.</span>
            </>
          }
          lead="Three rule changes, and between them they explain why the posting that used to work does not any more."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-8">
          <ChangedIn2026 />
        </div>
      </Section>

      {/* 4. We built the opposite ---------------------------------------- */}
      {/* The second light band (D39). One snow section read as an outlier;
          two read as the alternation DESIGN.md's public-site section calls
          deliberate art direction. */}
      <Section className="band-snow" aria-labelledby="opposite-heading">
        <SectionHeading
          id="opposite-heading"
          rail
          eyebrow="We built the opposite"
          title={
            <>
              Every row here is <span className="gold-phrase">a complaint we read.</span>
            </>
          }
          lead="We studied what people say about clipping tools, agencies, doing it yourself and repost pages, then built the other thing. Categories, never brand names — the argument is about the method, whoever sells it."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-10">
          <ContrastTable />
        </div>
      </Section>

      {/* 5. Any niche ---------------------------------------------------- */}
      <Section aria-labelledby="niche-heading">
        <SectionHeading
          id="niche-heading"
          rail
          eyebrow="Any niche"
          title={
            <>
              Our agents <span className="gold-phrase">research yours.</span>
            </>
          }
          lead="This is why there is no industry page anywhere on this site. The Niche Scan finds what is growing where you are, every week, whatever that is."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-10">
          <NicheScanExplainer />
        </div>
      </Section>

      {/* 6. Start here: two ways in --------------------------------------
          The upload used to *be* the hero (D22); the cinematic rebuild moved
          it here and 16 §3 row 6 puts it alongside the other way in, so the
          band now names both rather than only the footage you already have. */}
      <Section
        id={UPLOAD_ANCHOR_ID}
        className="band-ink-alt scroll-mt-24"
        aria-labelledby="start-heading"
      >
        <SectionHeading
          id="start-heading"
          rail
          eyebrow="Two ways in"
          title={
            <>
              Your footage, <span className="gold-phrase">or originals we make.</span>
            </>
          }
          lead="Most accounts use both, and the mix changes as the library grows. Neither costs more than the other."
          headingClassName="text-site-h2 font-serif"
        />
        <TwoWaysIn className="mt-10" />
        <div className="reveal mt-10 border-t border-ink-line pt-10">
          <h3 className="m-0 mb-2 font-heading text-title text-on-ink-900">
            Send us something now
          </h3>
          <p className="m-0 mb-6 max-w-[62ch] text-meta text-on-ink-muted">
            Drop in a talk, a podcast or a webinar you recorded. The rights question is asked before
            anything starts, rather than after.
          </p>
          <HeroUpload />
        </div>
      </Section>

      {/* 7. How the loop runs -------------------------------------------- */}
      <Section className="band-ink-alt" aria-labelledby="steps-heading">
        <SectionHeading
          id="steps-heading"
          rail
          eyebrow="How the loop runs"
          title={
            <>
              Four jobs, <span className="gold-phrase">one loop.</span>
            </>
          }
          lead="Each one hands to the next, and the last one decides what the first does on Monday."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        <div className="mt-10">
          <FeatureTabs />
        </div>
      </Section>

      {/* The output, as proof ------------------------------------------- */}
      {/* The one band that may carry a generated backdrop: it already states
          that every frame is AI-generated and that the presenter is not a
          real person, so the layer behind the panel is covered by the same
          disclosure. See ReelBackdrop's own note. */}
      <Section aria-labelledby="proof-heading" backdrop={<ReelBackdrop />}>
        <SectionHeading
          id="proof-heading"
          rail
          eyebrow="The output"
          title="One episode, twelve cuts"
          lead={`A ${sourceVideo.durationLabel} talk became ${cuts.length} short videos, each with its own moment, hook, length and format. None of them is the same clip with a new title, and the ones that did not pass say so on the frame.`}
          aside={<SampleDataLabel />}
        />
        <div className="mt-8">
          <CutWall />
        </div>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          Sample data. These frames belong to Maya Torres Coaching, a fictional demo client: a
          leadership coach with a weekly podcast. The presenter is not a real person and every
          frame here is AI-generated — said plainly, because labelling generated material is the
          rule we hold your videos to. They show the shape of the work. They are not a customer
          result and they are not an average.
        </p>
      </Section>

      {/* The showcase --------------------------------------------------- */}
      {/* Full-bleed: the rails are meant to run off both edges, so this one
          section opts out of the 1200px column the others keep. */}
      {/* `overflow-x-clip`, not `overflow-hidden`, and the difference is
          load-bearing: `hidden` establishes a scroll container, which becomes
          the scrollport every view timeline inside it is measured against.
          The scroll-driven rails were frozen at a constant 54% of their
          timeline because of it — they never move relative to this section,
          only relative to the page. `clip` suppresses the overflow without
          creating a scroll container, so the rails see the document again. */}
      <section
        className="band-ink-alt overflow-x-clip py-16 sm:py-20"
        aria-labelledby="showcase-heading"
      >
        <div className="mx-auto mb-10 w-full max-w-[1200px] px-5 sm:px-8">
          {/* The one GSAP effect on the page, and the one thing CSS could not
              do: the sentence is split into its words and they arrive in
              order. Everything else here is scroll-driven CSS (D32). */}
          <SplitReveal>
            <h2 id="showcase-heading" className="m-0 max-w-[20ch] text-site-h2 text-on-ink-900">
              Made for people who <span className="gold-phrase">sell what they know.</span>
            </h2>
          </SplitReveal>
          <p className="m-0 mt-3 max-w-[62ch] text-body text-on-ink-muted">
            Sample hooks for fictional businesses, to show the shape of the work. Yours would be
            cut from your own recordings. These are not customers and not customer results.
          </p>
        </div>
        <ShowcaseMarquee />
      </section>

      {/* "What else you could do instead" lived here and is gone: 16 §3 row 4
          merges it into "We built the opposite" near the top of the page, and
          running both left two comparison tables on one page making the same
          argument twenty sections apart. `Choices` is still used on /compare,
          which is where a full alternatives table belongs. */}

      {/* 9. Seven agents, one loop --------------------------------------- */}
      <Section tone="subtle" aria-labelledby="loop-heading">
        <SectionHeading
          id="loop-heading"
          rail
          eyebrow="The studio"
          title="Seven agents, one loop"
          lead="Each agent has one job, its own spend cap and its own log. A format found on Monday becomes your videos, posted all week, and the results shape the next week."
          aside={
            <Button asChild variant="secondary" className="press arrow-cta">
              <Link href="/agents">
                How it works
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        {/* A ladder, not seven tiles: the rail draws the hand-off from one
            agent down to the next, so the order is in the layout rather than
            on a counter, and Compliance is marked because nothing gets past
            it.

            Pinned from lg (D35): the section holds while the reader scrolls
            and the hand-off advances one agent at a time. Every name and line
            stays in the list at all widths, so the unpinned fallback is this
            same ladder rather than a fragment of it. */}
        <div className="mt-8">
          <AgentLoop gateAgentId={GATE_AGENT_ID} />
        </div>
        {/* The automated re-plan is post-MVP, so the loop's closing hand-off is
            labelled rather than sold. CLAUDE.md non-negotiable 7. */}
        <div className="mt-2 flex flex-col items-start gap-2 border-t border-border pt-5">
          <ComingSoonLabel />
          <p className="m-0 max-w-[68ch] text-body text-text-muted">{LOOP_CLOSING_LINE}</p>
        </div>
      </Section>

      {/* 10. Nothing reaches your calendar unchecked --------------------- */}
      <Section aria-labelledby="gate-heading">
        <SectionHeading
          id="gate-heading"
          title="Nothing reaches your calendar unchecked"
          lead="Every cut goes through the Compliance agent before it can be scheduled. It compares the wording with its source, checks the rights, the consent records and the AI labels, then writes down what it did and what it cost."
          aside={<SampleDataLabel />}
        />
        <Card padding="lg" className="mt-8">
          <GateReadout />
        </Card>
      </Section>

      {/* 11. Metrics ----------------------------------------------------
          16 §3 row 11, and the section v4 turns on: every account, on every
          plan, gets goals, KPIs and this dashboard. It shows a not-connected
          card and a projection deliberately — a preview of nothing but
          healthy green numbers would misrepresent the product in the one
          direction non-negotiable 7 rules out. */}
      {/* On a light band, for two reasons that agree. It is a preview of the
          studio, and the studio is light — showing it on ink would be showing
          a screen that does not exist. And the `band-*` utilities remap
          surface, border and text but **not** the status colours, so a green
          delta or a gold target inside a card on ink falls below 4.5:1. That
          is a real gap in the band system; the honest fix here is to put the
          dashboard where it actually lives rather than to invent ink variants
          of locked status tokens. Logged in D40. */}
      <Section className="band-snow" aria-labelledby="metrics-heading">
        <SectionHeading
          id="metrics-heading"
          rail
          eyebrow="Metrics"
          title={
            <>
              Track every account <span className="gold-phrase">against your goals.</span>
            </>
          }
          lead="Pick a goal in onboarding and the KPI set, the targets and the dashboard follow it. Targets are proposed from your own 14-day baseline, and they are called targets, never guarantees."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        <MetricsPreview className="mt-10" />
        <p className="mt-6 mb-0 text-meta text-text-muted">
          Every KPI shows its definition, its source and how fresh it is. A source you have not
          connected says so, with a button — it never shows a zero.
        </p>
      </Section>

      {/* 12. From views to calls ---------------------------------------- */}
      <Section aria-labelledby="funnel-heading">
        <SectionHeading
          id="funnel-heading"
          title="From views to calls"
          lead="The weekly report does not stop at views. It follows the same week all the way to the thing you actually sell, including the weeks that go badly."
          aside={<SampleDataLabel />}
        />
        <Card className="mt-8 flex flex-col gap-4">
          {/* The section heading already carries the "Sample data" label, and
              the paragraph below the funnel carries the full disclosure. One
              label per section is enough to read; two is noise. */}
          <h3 className="m-0 font-heading text-subtitle text-text">
            One week for a fictional demo client
          </h3>
          <div className="scroll-x">
            <div className="min-w-[560px]">
              <FunnelBar steps={funnelSteps} />
            </div>
          </div>
          <p className="m-0 max-w-[68ch] text-meta text-text-muted">
            Sample data. Illustrative figures from Maya Torres Coaching, a fictional demo client:{' '}
            <span className="machine">{metrics.posts}</span> posts over{' '}
            <span className="machine">{DEMO_WEEK_DAYS}</span> days, built from{' '}
            <span className="machine">{cutSummary.total}</span> cuts. They are not an average, a
            benchmark or anything we promise. Your own numbers will look different.
          </p>
        </Card>
      </Section>

      {/* 13. A demo week ------------------------------------------------- */}
      <Section aria-labelledby="numbers-heading">
        <SectionHeading
          id="numbers-heading"
          rail
          eyebrow="A demo week"
          title={
            <>
              One demo week, <span className="gold-phrase">in numbers.</span>
            </>
          }
          lead="Figures from the fictional demo client, so you can see what the loop reports. Your numbers will differ, and we report them as they are."
          headingClassName="text-site-h2 font-serif"
          aside={<SampleDataLabel />}
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-3">
          {PROOF_CARDS.map((proof) => (
            <li key={proof.label}>
              <Card className="flex h-full flex-col gap-3">
                <p className="m-0">
                  <CountUp
                    value={proof.value}
                    decimals={proof.decimals}
                    suffix={proof.suffix}
                    className="machine text-site-h2 text-gold-bright"
                  />
                </p>
                <h3 className="m-0 font-heading text-title text-text">{proof.label}</h3>
                <p className="m-0 text-meta text-text-muted">{proof.story}</p>
                <p className="m-0 mt-auto border-t border-border pt-3 text-caption text-text-muted">
                  {proof.agents}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* 14. Who it is for -----------------------------------------------
          A light band, and one of three now rather than the lone one it used
          to be (D39): the contrast table and the metrics preview carry the
          other two, so the ink/snow alternation reads as rhythm. */}
      <Section className="band-snow" aria-labelledby="audiences-heading">
        <SectionHeading
          id="audiences-heading"
          rail
          eyebrow="Who it is for"
          title={
            <>
              Any business, any individual, <span className="gold-phrase">any industry.</span>
            </>
          }
          lead="What changes the work is not your trade — it is whether you are a business or a person, and whether the account already exists. Those two answers set the plan, the mix of inputs and the cadence."
          headingClassName="text-site-h2 font-serif"
          /* The cards carry sample hooks, so the section has to say so —
             non-negotiable 7. */
          aside={<SampleDataLabel />}
        />
        {/* Two across, not four, and each card is a frame beside its detail
            rather than a box of text (docs/design/MOTION_STUDY.md §4).

            The four cards were four *industries* until v4 — the clearest
            contradiction of 16 §1 anywhere on the site. They are the four
            account types from 13 §1 now, and they carry the plan and the
            cadence, which are the things that actually differ between them. */}
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
          {AUDIENCES.map((audience, position) => {
            const sample = SHOWCASE_CARDS.find((card) => card.context === audience.sampleContext)

            return (
              <li
                className="reveal-item"
                key={audience.number}
                style={{ '--index': position % 2 } as React.CSSProperties}
              >
                <Card className="flex h-full gap-5">
                  {/* A burned-in hook on a brand colour, not a generated
                      still: every still we have is one fictional person, and
                      putting the same face on all four would say something
                      untrue about who these cards are for. */}
                  {sample ? (
                    <div className="w-[104px] shrink-0 sm:w-[124px]">
                      <VideoThumb
                        caption={`${sample.lead} ${sample.highlight}`}
                        highlight={sample.highlight}
                        index={position}
                        length={sample.lengthLabel}
                      />
                    </div>
                  ) : null}

                  <div className="flex min-w-0 flex-col gap-2">
                    {/* `gold-text`, not `gold-deep`. Large text only needs
                        3:1; at mono size it needs 4.5:1 and gold-deep does
                        not clear it on the snow band. axe caught it (D36). */}
                    <span className="machine text-mono text-gold-text">{audience.number}</span>
                    <h3 className="m-0 font-heading text-title text-text">{audience.title}</h3>
                    <p className="m-0 text-meta text-text-muted">{audience.body}</p>
                    <p className="machine m-0 text-mono text-text-muted">
                      {audience.plan} · {audience.cadence}
                    </p>
                    {/* A goal, never a promise. Non-negotiable 7 rules out
                        saying these will arrive — only that they are what the
                        work is aimed at. */}
                    <p className="m-0 mt-auto border-t border-border pt-3 text-meta text-gold-text">
                      Aimed at: {audience.goal}
                    </p>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </Section>

      {/* 15. Not a farm, not a repost page -------------------------------
          16 §3 row 15 merges "Four things we will not do" into this. The
          limits are the same; the frame is stronger, because what they are
          actually contrasted with is the model this company exists as the
          legal turnaround of (11 §4). No real farm and no competitor is
          named, and the tone stays flat. */}
      <Section tone="subtle" aria-labelledby="farm-heading">
        <SectionHeading
          id="farm-heading"
          rail
          eyebrow="Not a farm"
          title={
            <>
              Accounts you own, <span className="gold-phrase">through the front door.</span>
            </>
          }
          lead="Reposts and fake accounts are penalised now. Everything below is a limit rather than a feature, and together they are the only reason we can say any of the rest of this."
          headingClassName="text-site-h2 font-serif"
        />
        <NotAFarm className="mt-10" />
      </Section>

      {/* 16. Your files, your accounts, plain billing --------------------- */}
      <Section size="md" aria-labelledby="billing-heading">
        <SectionHeading
          id="billing-heading"
          rail
          eyebrow="Plain billing"
          title={
            <>
              Your files, your accounts, <span className="gold-phrase">no credits.</span>
            </>
          }
          lead="The direct answer to the complaint we read most often about this category. It is a feature, so it is on the page rather than in the terms."
          headingClassName="text-site-h2 font-serif"
        />
        <PlainBilling className="mt-10" />
      </Section>

      {/* 17. Pricing ----------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="pricing-heading">
        <SectionHeading
          id="pricing-heading"
          title="Start with a pilot, then pick a month"
          lead="Flat prices, set per engagement in writing before any work starts. No setup fee, no annual lock-in, and you can stop after the pilot."
          aside={
            <Button asChild variant="secondary" className="press arrow-cta">
              <Link href="/pricing">
                See what each tier includes
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        {/* "Best for" per plan, which 09 §11 requires and the old teaser did
            not carry. It is the line that does the work here: the price only
            means something once you know which plan is yours. */}
        <dl className="m-0 mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SELLABLE_TIERS.map((tier) => (
            <div key={tier.id} className="flex flex-col gap-1 bg-surface p-5">
              <dt className="text-label font-semibold text-text">{tier.name}</dt>
              <dd className="m-0 flex flex-col gap-1.5">
                <span className="flex items-baseline gap-1.5">
                  <span className="machine text-title text-text">${perDayUsd(tier)}</span>
                  <span className="text-meta text-text-muted">
                    a day · <span className="machine">{tier.price}</span> {tier.period}
                  </span>
                </span>
                <span className="text-meta text-text-muted">{tier.bestFor}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 mb-0 text-meta text-text-muted">
          Studio, at <span className="machine">$79</span> a month for an individual starting from
          zero, is not open yet. It takes a waitlist and nothing else.
        </p>
      </Section>

      {/* FAQ ------------------------------------------------------------- */}
      <Section aria-labelledby="faq-heading">
        <SectionHeading
          id="faq-heading"
          title="The six we are asked most"
          lead="Short answers, including the ones where the honest answer is that we cannot promise."
        />
        <div className="mt-8">
          <Faq items={FAQ_ITEMS.slice(0, HOME_FAQ_COUNT)} />
        </div>
      </Section>

      {/* 19. Final CTA --------------------------------------------------- */}
      <Section size="md" aria-labelledby="final-cta-heading">
        <h2 id="final-cta-heading" className="sr-only">
          Get started
        </h2>
        <FinalCta />
      </Section>

      <SiteCta next={{ href: '/product', label: 'Product' }} />
    </>
  )
}
