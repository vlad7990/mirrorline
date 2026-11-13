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
import { CONTRAST_ROWS } from '@/components/marketing/home/problem-content'
import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

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
      <PageHero
        eyebrow="Compare"
        title={
          <>
            The other ways <span className="gold-phrase">of getting this done.</span>
          </>
        }
        lead="Five approaches, including ours, and the rows where the other four win. We name categories rather than companies: the argument is about the method, whoever is selling it."
        index={[
          { number: '01', title: 'Doing it yourself' },
          { number: '02', title: 'A freelance editor' },
          { number: '03', title: 'Clipping tools' },
          { number: '04', title: 'A content agency' },
          { number: '05', title: 'Repost pages' },
        ]}
        marginNote="categories, not brand names"
      />

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
                <tr key={row.category} className="border-b border-border last:border-b-0">
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

      <SiteCta next={{ href: '/pricing', label: 'Pricing' }} />
    </>
  )
}
