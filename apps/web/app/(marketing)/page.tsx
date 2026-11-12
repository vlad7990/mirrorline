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
import { ArrowRight, Film, Plug, Repeat, Tag } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { LOOP_CLOSING_LINE } from '@/components/marketing/agents'
import { AgentLoop } from '@/components/marketing/agent-loop'
import { Choices } from '@/components/marketing/choices'
import { CutWall } from '@/components/marketing/cut-wall'
import { ReelBackdrop } from '@/components/marketing/reel-backdrop'
import { Faq, type FaqItem } from '@/components/marketing/faq'
import { GateReadout } from '@/components/marketing/gate-readout'
import { CountUp } from '@/components/marketing/count-up'
import { FeatureTabs } from '@/components/marketing/feature-tabs'
import { HeroCinematic, UPLOAD_ANCHOR_ID } from '@/components/marketing/hero-cinematic'
import { HeroUpload } from '@/components/marketing/hero-upload'
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
  title: 'Turn one long video into daily short-form growth',
  description:
    'Mirrorline is an AI content studio for coaches, consultants and local service businesses. Your own footage becomes short vertical videos, posted to your own accounts through the official platform APIs.',
}

/* -------------------------------------------------------------------------- */
/* The limits — CLAUDE.md "Non-negotiables", written for a visitor             */
/* -------------------------------------------------------------------------- */

interface Limit {
  readonly id: string
  readonly title: string
  readonly line: string
  readonly Icon: typeof Film
}

const LIMITS: readonly Limit[] = [
  {
    id: 'own-footage',
    title: 'We will not touch another creator’s video',
    line: 'We work from footage you own, or footage we hold the rights to. Nothing is downloaded, stored or reused from anyone else.',
    Icon: Film,
  },
  {
    id: 'format-not-footage',
    title: 'We will not repost a format’s footage',
    line: 'When a format rises in your niche we rebuild its structure, then write a new script and shoot it with your material.',
    Icon: Repeat,
  },
  {
    id: 'ai-labelled',
    title: 'We will not hide a generated scene',
    line: 'Where a scene is made by a model, it says so in the studio and on the platform. No face swaps, and no voice without a signed release.',
    Icon: Tag,
  },
  {
    id: 'official-apis',
    title: 'We will not post from anywhere but the official APIs',
    line: 'Instagram, TikTok and YouTube’s own APIs, to accounts you connect and can disconnect without asking us. No device automation, proxies or app clones.',
    Icon: Plug,
  },
]

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The cycling second line, verbatim from docs/design/handoff-v4.
 *
 * The first is what a static render and a reduced-motion reader see, so it
 * has to stand alone as the headline's ending — "Turn one long video into a
 * week of posts." reads correctly with no animation at all.
 *
 * Every one of these is a claim about what the product produces, never about
 * what it achieves. "booked calls." is the closest to the line and stays on
 * the right side of it: the studio schedules posts that carry a booking
 * link, and non-negotiable 7 forbids promising the calls arrive.
 */
const HERO_PHRASES = [
  'a week of posts.',
  'twelve short videos.',
  'booked calls.',
  'a daily presence.',
] as const

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'do-you-post',
    question: 'Do you post for me?',
    answer: (
      <>
        <p className="m-0">
          Yes, once you approve. The Publisher puts approved posts out through the official APIs of
          Instagram, TikTok and YouTube, at the times that have worked for your audience.
        </p>
        <p className="m-0">
          You can leave every post on manual approval, or turn auto-approve on yourself. Nothing is
          posted on your behalf until you choose one.
        </p>
      </>
    ),
  },
  {
    id: 'whose-accounts',
    question: 'Whose accounts do the posts go to?',
    answer: (
      <>
        <p className="m-0">
          Yours. You connect each account, and you can disconnect it at any time without asking us.
        </p>
        <p className="m-0">
          We do not create accounts for you, we do not run accounts on your behalf, and we do not
          use device automation, proxies or app clones.
        </p>
      </>
    ),
  },
  {
    id: 'copyright',
    question: 'What about copyright?',
    answer: (
      <>
        <p className="m-0">
          We only work from material you own or we hold rights to. When a format is rising in your
          niche we take its structure (the hook pattern, the beats, the pacing) and nothing else:
          new script, your footage, your voice.
        </p>
        <p className="m-0">
          Before a video can be scheduled, the Compliance agent compares it with its source and
          holds the wording under our <span className="machine">30%</span> similarity limit, checks
          the rights and consent records, and checks the AI labels.
        </p>
        <p className="m-0">
          That is our own check, not legal clearance. We cannot promise a platform or a rights
          holder will always agree with it, so you see the result and can decide for yourself.
        </p>
      </>
    ),
  },
  {
    id: 'face-and-voice',
    question: 'Do you use my face or voice?',
    answer: (
      <>
        <p className="m-0">
          Only if you ask us to, and only with a signed release we keep on file. No face swaps,
          ever.
        </p>
        <p className="m-0">
          Without a release we use the footage you recorded and a stock voice, and any generated
          scene carries its AI label.
        </p>
      </>
    ),
  },
  {
    id: 'platform-rule',
    question: 'What if a video breaks a platform rule?',
    answer: (
      <>
        <p className="m-0">
          Compliance blocks it before it reaches the calendar and tells you why in plain words. For
          example: background music from a venue, or a claim with nothing behind it.
        </p>
        <p className="m-0">
          You can fix it and send it back through, or override the block yourself; the override is
          logged either way. If something does slip through, tell us and we take it down.
        </p>
      </>
    ),
  },
  {
    id: 'results',
    question: 'When do I see results?',
    answer: (
      <>
        <p className="m-0">
          We do not promise numbers, and we will not quote you any. Short-form growth is slow and
          uneven, it depends on your niche, your footage and your offer, and no agency can honestly
          predict it.
        </p>
        <p className="m-0">
          What we can tell you is what you get and when: in a two-week pilot you get{' '}
          <span className="machine">12</span> videos, a posting schedule and one report. After that
          you get posts out on time, every week, and a report that runs from views to clicks to
          calls. The figures in it are the real ones, including the weeks that go badly.
        </p>
        <p className="m-0">
          Judge us on that. If the posts stop or the reporting goes quiet, leave.
        </p>
      </>
    ),
  },
]

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

      {/* Start here ------------------------------------------------------ */}
      {/* The upload, in its own band. It used to *be* the hero (D22); the
          cinematic rebuild moved it here and the hero's one action points at
          this id (D34). It is still the first step of the product and still
          the first thing below the fold — what changed is that it no longer
          shares a frame with a headline and a backdrop. */}
      <Section
        id={UPLOAD_ANCHOR_ID}
        className="band-ink-alt scroll-mt-24"
        size="md"
        aria-labelledby="start-heading"
      >
        <SectionHeading
          id="start-heading"
          eyebrow="Start here"
          title={
            <>
              Your own footage, <span className="gold-phrase">and nothing else.</span>
            </>
          }
          lead="Drop in a talk, a podcast or a webinar you recorded. The run happens on this machine, and the rights question is asked before anything starts rather than after."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="reveal mt-8">
          <HeroUpload />
        </div>
      </Section>

      {/* What it does, in four steps ------------------------------------ */}
      <Section className="band-ink-alt" aria-labelledby="steps-heading">
        <SectionHeading
          id="steps-heading"
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

      {/* The limits ----------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="limits-heading">
        <SectionHeading
          id="limits-heading"
          title="Four things we will not do"
          lead="These are limits, not features we can switch off for a bigger account. They are also the only reason we can say any of this."
        />
        {/* One bordered band with hairline dividers, not four cards. DESIGN.md
            "Elevation & Depth": depth comes from 1px borders and the contrast
            between surface and background, so a limit does not need a card of
            its own to read as a separate thing. */}
        <ul className="mt-8 flex list-none flex-col divide-y divide-border rounded-lg border border-border bg-surface p-0 lg:flex-row lg:divide-x lg:divide-y-0">
          {LIMITS.map((limit) => (
            <li key={limit.id} className="flex flex-1 items-start gap-4 p-5 lg:flex-col lg:gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-on-accent-soft">
                <limit.Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="m-0 font-heading text-subtitle text-text">{limit.title}</h3>
                <p className="m-0 text-meta text-text-muted">{limit.line}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          None of these is a certification and none of them is a guarantee. They describe how the
          studio is built, and you can hold us to them.
        </p>
      </Section>

      {/* The alternatives ----------------------------------------------- */}
      {/* Straight after the limits, because the limits are what the
          comparison is actually about: the row a repost tool loses is the
          row our four limits exist to win. */}
      <Section aria-labelledby="choices-heading">
        <SectionHeading
          id="choices-heading"
          eyebrow="The choices"
          title="What else you could do instead"
          lead="We do not win every row. A freelancer is cheaper to start and a repost tool is faster. What changes is whose footage goes out, and what happens before it does."
        />
        <div className="mt-8">
          <Choices />
        </div>
      </Section>

      {/* Who it is for --------------------------------------------------- */}
      {/* The one light band on the page. The handoff alternates ink and
          snow; a single snow section is what stops the page reading as one
          long dark scroll. */}
      <Section className="band-snow" aria-labelledby="audiences-heading">
        <SectionHeading
          id="audiences-heading"
          eyebrow="Who it is for"
          title={
            <>
              Built for people who <span className="gold-phrase">already know their subject.</span>
            </>
          }
          lead="You have the expertise and the recordings. What you do not have is an evening a day to cut them up."
          headingClassName="text-site-h2 font-serif"
          /* The cards carry sample hooks now, so the section has to say so —
             non-negotiable 7. It did not need this when they were four boxes
             of our own copy. */
          aside={<SampleDataLabel />}
        />
        {/* Two across, not four, and each card is a frame beside its detail
            rather than a box of text. Four equal text boxes were the last of
            the "plain stacks" in DESIGN_BACKLOG, and the obvious fix — a
            hover lift — would have been a lie, because these are not
            interactive. What they actually lacked was something to look at,
            so each one now shows the shape of a post for that audience
            (docs/design/MOTION_STUDY.md §4).

            The hooks are the showcase's own fictional-business samples,
            matched by niche rather than by index so reordering either list
            cannot pair a clinic with a gym's hook. */}
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
          {AUDIENCES.map((audience, position) => {
            const sample = SHOWCASE_CARDS.find((card) => card.niche === audience.sampleNiche)

            return (
              <li
                className="reveal-item"
                key={audience.number}
                style={{ '--index': position % 2 } as React.CSSProperties}
              >
                <Card className="flex h-full gap-5">
                  {/* The frame keeps the demo colour rather than borrowing a
                      generated still: every still we have is one fictional
                      coach, and putting her face on "Clinics and wellness"
                      would say something untrue about who these are. */}
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
                    {/* `gold-text`, not `gold-deep`. This was `text-metric`
                        before the cards were rebuilt, and large text only
                        needs 3:1 — at mono size it needs 4.5:1 and gold-deep
                        does not clear it on the snow band. axe caught it;
                        shrinking text is exactly when that happens. */}
                    <span className="machine text-mono text-gold-text">{audience.number}</span>
                    <h3 className="m-0 font-heading text-title text-text">{audience.title}</h3>
                    <p className="m-0 text-meta text-text-muted">{audience.body}</p>
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

      {/* One demo week, in numbers --------------------------------------- */}
      <Section aria-labelledby="numbers-heading">
        <SectionHeading
          id="numbers-heading"
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

      {/* The gate ------------------------------------------------------- */}
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

      {/* The seven-agent loop ------------------------------------------- */}
      <Section tone="subtle" aria-labelledby="loop-heading">
        <SectionHeading
          id="loop-heading"
          eyebrow="The studio"
          title="Seven agents, one loop"
          lead="Each agent has one job, its own spend cap and its own log. A format found on Monday becomes your videos, posted all week, and the results shape the next week."
          aside={
            <Button asChild variant="secondary" className="press">
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

      {/* From views to calls -------------------------------------------- */}
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

      {/* Pricing teaser -------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="pricing-heading">
        <SectionHeading
          id="pricing-heading"
          title="Start with a pilot, then pick a month"
          lead="Flat prices, set per engagement in writing before any work starts. No setup fee, no annual lock-in, and you can stop after the pilot."
          aside={
            <Button asChild variant="secondary" className="press">
              <Link href="/pricing">
                See what each tier includes
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        <dl className="m-0 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10">
          {/* Per-day leads here too, so the teaser and the pricing page frame
              the same number the same way. One line rather than two: this is
              a glance, not the decision. */}
          {SELLABLE_TIERS.map((tier) => (
            <div key={tier.id} className="flex items-baseline gap-2">
              <dt className="text-label text-text">{tier.name}</dt>
              <dd className="m-0 flex items-baseline gap-1.5">
                <span className="machine text-title text-text">${perDayUsd(tier)}</span>
                <span className="text-meta text-text-muted">
                  a day · <span className="machine">{tier.price}</span> {tier.period}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* FAQ ------------------------------------------------------------- */}
      <Section aria-labelledby="faq-heading">
        <SectionHeading
          id="faq-heading"
          title="The six we are asked most"
          lead="Short answers, including the ones where the honest answer is that we cannot promise."
        />
        <div className="mt-8">
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      <SiteCta next={{ href: '/product', label: 'Product' }} />
    </>
  )
}
