/**
 * The shared body of `/businesses` and `/individuals` (16 §4).
 *
 * **These are the only two audience pages there will ever be.** They exist
 * because 13 §1 segments by *account type*, and a visitor arriving from a
 * post aimed at one of them should land somewhere that recognises them. They
 * are emphatically not the industry pages 16 §1 forbids: neither page names a
 * trade, and what differs between them is the plan, the input mix and the
 * cadence — which is the whole of what actually differs.
 *
 * One component rather than two near-identical pages, because two copies of a
 * layout is how they drift until one quietly stops matching the product.
 *
 * **F6 moved it onto the F1 kit** (19 v3). The text hero became a frame wall,
 * every second section now carries a picture rather than a third list of
 * cards, and the shared closing block became this page's own `PageCta` — the
 * seam 19 v2 §Scope admitted to when it left these two on the old kit.
 */

import { Card } from '@mirrorline/ui'
import * as React from 'react'

import Image from 'next/image'

import { GOALS, type GoalKey } from '@/lib/audience/account-type'

import { GOAL_EXAMPLES } from './home/problem-content'
import { HeroInset, InsetCycle } from './kit/hero-inset'
import { PAGE_CTAS, PageCta } from './kit/page-cta'
import { PageHeroFrames } from './kit/page-hero-frames'
import { PAGE_HERO_FRAMES, type SampleFrame, allocateFrames } from './kit/page-media'
import { ReelStrip } from './kit/reel-strip'
import { busiestDay, distributePosts } from './month-preview-content'
import { Section, SectionHeading } from './primitives'

/** Monday first, because a first week starts on one. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export interface AudienceStage {
  readonly id: string
  /** "You already have an account", "You are starting from zero". */
  readonly title: string
  readonly body: string
  /** From 13 §1. The things that genuinely differ. */
  readonly plan: string
  readonly inputMix: string
  /**
   * The weekly range, low to high — not the sentence that describes it.
   *
   * It used to be the string "7–21 posts a week", which was fine while it was
   * only ever printed. The week strip below draws a cell per post, so a typed
   * sentence would be a second source for a number already written down, and
   * the picture would go on agreeing with itself after the cadence changed.
   * Derived, never typed (D24).
   */
  readonly postsPerWeek: readonly [number, number]
}

/** The sentence, from the range. One place, so the strip and the line agree. */
export function cadenceLabel([low, high]: readonly [number, number]): string {
  return low === high ? `${low} posts a week` : `${low}–${high} posts a week`
}

interface WeekStripProps {
  readonly postsPerWeek: readonly [number, number]
  /** One still beside the week, so the card is not a fourth list of numbers. */
  readonly frame?: SampleFrame
  /** Which card this is, for the summary a screen reader gets instead. */
  readonly stage: string
}

/**
 * A week of this stage's posts, as cells, beside one sample still.
 *
 * `distributePosts` is /pricing's, unchanged: the same question — "what does
 * this number look like spread over days" — with seven days instead of thirty
 * and the plan's top of range rather than its month. Reusing it is the point;
 * two functions that round the same way until one is edited is how the
 * mini-calendar and this strip would stop agreeing.
 *
 * The grid is decorative and the sentence under it is not. A screen reader
 * gets the summary and skips 7–21 unlabelled squares, which is what the
 * squares are: a picture of a number already read out.
 */
function WeekStrip({ postsPerWeek, frame, stage }: WeekStripProps) {
  const [, high] = postsPerWeek
  const distribution = distributePosts(high, WEEKDAYS.length)
  const busiest = busiestDay(distribution)

  return (
    <figure className="m-0 mt-auto flex items-end gap-4 border-t border-border pt-4">
      <div aria-hidden="true" className="grid flex-1 grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day, index) => (
          <div key={day} className="flex flex-col items-center gap-1">
            <div className="flex w-full flex-col-reverse gap-0.5" style={{ minHeight: '2.75rem' }}>
              {Array.from({ length: distribution[index] ?? 0 }, (_, post) => (
                <span
                  key={post}
                  className="block h-2 w-full rounded-[2px] bg-gold-text/70"
                  style={{ opacity: 1 - post / (busiest + 2) }}
                />
              ))}
            </div>
            <span className="machine text-[0.625rem] text-text-muted">{day}</span>
          </div>
        ))}
      </div>

      {frame ? (
        <div className="relative hidden aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-thumb sm:block">
          <Image
            src={frame.src}
            alt=""
            aria-hidden="true"
            fill
            loading="lazy"
            sizes="48px"
            className="object-cover"
          />
        </div>
      ) : null}

      <figcaption className="sr-only">
        {stage}: a sample week at {cadenceLabel(postsPerWeek)}, busiest day {busiest} posts. Sample
        data.
      </figcaption>
    </figure>
  )
}

export interface AudienceConcern {
  readonly question: string
  readonly answer: string
}

export interface AudiencePageContent {
  /**
   * Which page this is.
   *
   * One key rather than a hero prop and a CTA prop, because the two manifests
   * are keyed by page slug and a test asserts they hold the same keys. A page
   * that could take its frames from one slug and its closing block from
   * another would be a way to defeat that test by hand.
   */
  readonly page: keyof typeof PAGE_HERO_FRAMES
  readonly eyebrow: string
  readonly title: React.ReactNode
  readonly lead: string
  /** One line under the hero's corner card, saying what the frames are. */
  readonly insetCaption: string
  /** The two account stages for this audience. */
  readonly stages: readonly AudienceStage[]
  /** Which of the seven goals this audience most often picks. */
  readonly commonGoals: readonly GoalKey[]
  /** What this audience usually worries about, answered plainly. */
  readonly concerns: readonly AudienceConcern[]
  /** What the reel strip near the foot of the page is introduced as. */
  readonly stripLabel: string
}

export function AudiencePage({ content }: { content: AudiencePageContent }) {
  const goals = GOALS.filter((goal) => content.commonGoals.includes(goal.key))

  // One call, so no two sections of this page can show the same frames
  // (19 v2). Three for the wall, three for the corner card, one per stage
  // card, four for the strip: eleven of the twelve.
  const [WALL = [], INSET = [], STAGE_FRAMES = [], STRIP_FRAMES = []] = allocateFrames(
    [3, 3, content.stages.length, 4],
    PAGE_HERO_FRAMES[content.page].offset,
  )

  return (
    <>
      <PageHeroFrames
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.lead}
        frames={WALL}
        index={content.stages.map((stage, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: stage.title,
          description: stage.plan,
        }))}
        inset={
          <HeroInset caption={content.insetCaption}>
            <InsetCycle frames={INSET} />
          </HeroInset>
        }
      />

      {/* The two stages --------------------------------------------------- */}
      <Section aria-labelledby="stages-heading">
        <SectionHeading
          id="stages-heading"
          eyebrow="Where you are starting"
          title={
            <>
              Two starting points, <span className="gold-phrase">two different first months.</span>
            </>
          }
          lead="This is the only question that changes the work. Not what you do for a living — whether there is already an account with something on it."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
          {content.stages.map((stage, position) => (
            <li
              key={stage.id}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-3">
                <h3 className="m-0 font-heading text-title text-text">{stage.title}</h3>
                <p className="m-0 text-body text-text-muted">{stage.body}</p>
                <dl className="m-0 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                  {[
                    { label: 'Plan', value: stage.plan },
                    { label: 'Mostly', value: stage.inputMix },
                    { label: 'Cadence', value: cadenceLabel(stage.postsPerWeek) },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <dt className="text-caption text-text-muted">{item.label}</dt>
                      <dd className="machine m-0 text-mono text-text">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                {/* The cadence as a picture, drawn from the same pair of
                    numbers the line above prints. A busy week and a quiet one
                    are the difference between these two cards, and the
                    sentence alone does not show it. */}
                <WeekStrip
                  postsPerWeek={stage.postsPerWeek}
                  frame={STAGE_FRAMES[position]}
                  stage={stage.title}
                />
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Goals ------------------------------------------------------------ */}
      <Section className="band-snow" aria-labelledby="goals-heading">
        <SectionHeading
          id="goals-heading"
          eyebrow="What you are aiming at"
          title={
            <>
              The goal decides <span className="gold-phrase">what we measure.</span>
            </>
          }
          lead="You pick one in onboarding and the KPI set follows it. These are the ones chosen most often here, but all seven are open to you."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-4">
          {goals.map((goal, position) => (
            <li
              key={goal.key}
              className="reveal-item"
              style={{ '--index': position % 4 } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <h3 className="m-0 font-heading text-subtitle text-text">{goal.label}</h3>
                <p className="m-0 text-meta text-text-muted">{GOAL_EXAMPLES[goal.key]}</p>
                <p className="machine m-0 mt-auto border-t border-border pt-3 text-mono text-gold-text">
                  {goal.headlineKpi}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Concerns --------------------------------------------------------- */}
      <Section tone="subtle" aria-labelledby="concerns-heading">
        <SectionHeading
          id="concerns-heading"
          eyebrow="The usual worries"
          title={
            <>
              Answered plainly, <span className="gold-phrase">including the awkward ones.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
        />
        <dl className="m-0 mt-10 flex flex-col gap-0">
          {content.concerns.map((concern, position) => (
            <div
              key={concern.question}
              className="reveal-item grid gap-2 border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-8"
              style={{ '--index': position } as React.CSSProperties}
            >
              <dt className="font-heading text-subtitle text-text lg:col-span-4">
                {concern.question}
              </dt>
              <dd className="m-0 max-w-[72ch] text-body text-text-muted lg:col-span-8">
                {concern.answer}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* What it looks like ----------------------------------------------- */}
      <Section className="band-ink" aria-labelledby="output-heading">
        <SectionHeading
          id="output-heading"
          eyebrow="What comes back"
          title={
            <>
              Four of ours, <span className="gold-phrase">made the way yours would be.</span>
            </>
          }
          lead="Every one of these is a sample we generated to show the work, not a client's video. The trades differ because the agents research each account's own; the format is what carries across."
          headingClassName="text-site-h2 font-serif"
        />
        <ReelStrip
          className="mt-10"
          label={content.stripLabel}
          items={STRIP_FRAMES.map((frame) => ({ frame }))}
        />
      </Section>

      <PageCta cta={PAGE_CTAS[content.page]} />
    </>
  )
}
