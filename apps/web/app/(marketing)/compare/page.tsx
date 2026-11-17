/**
 * /compare — us against the other ways of getting this done (16 §4).
 *
 * **Categories only, never brands.** 14 §1 and 10 §4 are explicit, and the
 * reason is worth restating where the temptation is strongest: naming a
 * product would be a claim about that product that we would have to stand
 * behind, and it is not the argument anyway. The argument is what a *method*
 * costs you, whoever is selling it.
 *
 * It does not claim we win every row. We are slower to start than a tool and
 * dearer than a freelancer, and saying so is what makes the rows we do win
 * worth reading — a comparison table where one column wins everything gets
 * read as marketing and discarded.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { Choices } from '@/components/marketing/choices'
import { CompareColumns } from '@/components/marketing/compare-columns'
import { DecisionHelper } from '@/components/marketing/decision-helper'
import { CONTRAST_ROWS } from '@/components/marketing/home/problem-content'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { Section, SectionHeading } from '@/components/marketing/primitives'

/**
 * Three for the hero's cycle, one for the agency column.
 *
 * Offset 2 so this page does not open on a frame /pricing or /how-it-works
 * opened with.
 */
const [INSET_FRAMES = [], AGENCY_FRAMES = []] = allocateFrames([3, 1], 2)

export const metadata: Metadata = {
  title: 'Compare',
  description:
    'Mirrorline against clipping tools, agencies, doing it yourself and repost pages. Categories rather than brand names, including the rows where we lose.',
}

interface Honest {
  readonly id: string
  readonly title: string
  readonly body: string
}

/**
 * Where the other options genuinely win.
 *
 * Not modesty for its own sake: a visitor who has already priced a freelancer
 * knows we are dearer, and a table that pretends otherwise tells them the
 * rest of it is unreliable too.
 */
const WHERE_WE_LOSE: readonly Honest[] = [
  {
    id: 'cost',
    title: 'Cost to start',
    body: 'A freelance editor is cheaper for one video, and a clipping tool is cheaper than both. If you need twelve cuts once rather than posts every day, hire the editor.',
  },
  {
    id: 'speed',
    title: 'Speed on day one',
    body: 'A tool returns clips in minutes. We spend the first two days on a Niche Scan before making anything, because content made before we know what works in your niche is content you throw away.',
  },
  {
    id: 'control',
    title: 'Hands on the edit',
    body: 'If you want to choose every cut point yourself, an editor you brief directly will suit you better. You approve our work; you do not direct it frame by frame.',
  },
]

export default function ComparePage() {
  return (
    <>
      <PageHeroImage
        eyebrow="Compare"
        title={
          <>
            The other ways <span className="gold-phrase">of getting this done.</span>
          </>
        }
        lead="Five approaches, including ours, and the rows where the other four win. We name categories rather than companies: the argument is about the method, whoever is selling it."
        image={PAGE_HERO_IMAGES.compare}
        index={[
          { number: '01', title: 'Doing it yourself' },
          { number: '02', title: 'A freelance editor' },
          { number: '03', title: 'Clipping tools' },
          { number: '04', title: 'A content agency' },
          { number: '05', title: 'Repost pages' },
        ]}
        inset={
          <HeroInset caption="Three accounts that chose differently.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      {/* What each one hands you ------------------------------------------ */}
      <Section className="band-snow" aria-labelledby="columns-heading">
        <SectionHeading
          id="columns-heading"
          eyebrow="What you end up with"
          rail
          title={
            <>
              Four approaches, <span className="gold-phrase">four different objects.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="The difference is less about quality than about what is actually in your hands on Friday — a folder, a post, a thin calendar or a full one."
        />
        <div className="mt-10">
          {AGENCY_FRAMES[0] ? <CompareColumns frame={AGENCY_FRAMES[0]} /> : null}
        </div>
      </Section>

      {/* The table -------------------------------------------------------- */}
      <Section aria-labelledby="choices-heading">
        <SectionHeading
          id="choices-heading"
          eyebrow="Five approaches"
          title={
            <>
              What each one <span className="gold-phrase">actually costs you.</span>
            </>
          }
          lead="Not only in money. What changes between these rows is whose footage goes out, what happens before it does, and whether anybody measures what came back."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-10">
          <Choices />
        </div>
      </Section>

      {/* The complaints --------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="complaints-heading">
        <SectionHeading
          id="complaints-heading"
          eyebrow="Built from complaints"
          title={
            <>
              Every row here <span className="gold-phrase">is something people said.</span>
            </>
          }
          lead="We read what people write about clipping tools, agencies, doing it yourself and repost pages, then built the other thing. These are paraphrased, never quoted, and the sources stay in our research notes."
          headingClassName="text-site-h2 font-serif"
        />
        <div className="mt-10 hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              What the usual approaches give you, and what Mirrorline does instead
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-[22%] p-4 text-label font-semibold text-text">
                  The approach
                </th>
                <th scope="col" className="p-4 text-label font-semibold text-text-muted">
                  What you got
                </th>
                <th scope="col" className="p-4 text-label font-semibold text-text">
                  What we do instead
                </th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST_ROWS.map((row) => (
                /* `scroll-lit`: the row lights as it reaches the middle of
                   the screen and dims as it leaves (19 v2 ★2, the device the
                   home page uses). It dims and never disappears — theme.css
                   carries the warning, and the reason is that a view-timeline
                   animation holds its start state, so fading real text toward
                   transparent would park it below 4.5:1 for as long as it sat
                   there. Both ends of this are readable. */
                <tr key={row.category} className="scroll-lit border-b border-border last:border-b-0">
                  <th scope="row" className="p-4 align-top">
                    <span className="block font-heading text-subtitle text-text">
                      {row.category}
                    </span>
                    <span className="machine mt-1 block text-mono text-gold-text">
                      {row.problems.join(' · ')}
                    </span>
                  </th>
                  <td className="p-4 align-top text-meta text-text-muted">{row.before}</td>
                  <td className="p-4 align-top text-meta text-text">{row.mirrorline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="m-0 mt-10 flex list-none flex-col gap-4 p-0 md:hidden">
          {CONTRAST_ROWS.map((row) => (
            <li key={row.category}>
              <Card className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="m-0 font-heading text-subtitle text-text">{row.category}</h3>
                  <span className="machine shrink-0 text-mono text-gold-text">
                    {row.problems.join(' · ')}
                  </span>
                </div>
                <p className="m-0 text-meta text-text-muted">
                  <span className="font-semibold">Before: </span>
                  {row.before}
                </p>
                <p className="m-0 border-t border-border pt-3 text-meta text-text">
                  <span className="font-semibold">With us: </span>
                  {row.mirrorline}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Where we lose ---------------------------------------------------- */}
      <Section tone="subtle" aria-labelledby="lose-heading">
        <SectionHeading
          id="lose-heading"
          eyebrow="Where we lose"
          title={
            <>
              Three reasons <span className="gold-phrase">to pick something else.</span>
            </>
          }
          lead="If one of these is the thing that matters to you, we are the wrong choice, and you should know that from this page rather than from a sales call."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
          {WHERE_WE_LOSE.map((item, position) => (
            <li
              key={item.id}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <h3 className="m-0 font-heading text-subtitle text-text">{item.title}</h3>
                <p className="m-0 text-meta text-text-muted">{item.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* The decision helper ---------------------------------------------- */}
      {/* Last, on purpose. It is the only section that asks the reader for
          anything, and it should come after they have seen the table, the
          columns and the three rows where we lose — so the verdict lands as a
          summary of what they have just read rather than as a quiz that
          decides it for them. */}
      <Section className="band-snow" aria-labelledby="helper-heading">
        <SectionHeading
          id="helper-heading"
          eyebrow="Three questions"
          rail
          title={
            <>
              Should you <span className="gold-phrase">use us at all?</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Answer honestly and this will often say no. Most people who read a page like this would be better served by an editor, or by doing it themselves for another few months."
        />
        <div className="mt-10">
          <DecisionHelper />
        </div>
      </Section>

      <PageCta cta={PAGE_CTAS.compare} />
    </>
  )
}
