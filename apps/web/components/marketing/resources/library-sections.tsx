/**
 * How the templates and the glossary are drawn (19 v2 ★/resources item 4).
 *
 * Server components, both. The content is in `library.ts`; this file is only
 * the shape it takes on the page, and the two are split for the reason
 * `page-cta-content.ts` gives — a `.tsx` module cannot be imported by a
 * Vitest spec, and the content is the part worth asserting against.
 *
 * **The templates are rendered as monospaced lines on purpose.** They are
 * things to be copied out onto paper or into a notes app, and setting them in
 * the body face would make them read as prose about a template rather than as
 * the template. `.machine` is the voice DESIGN.md reserves for what the
 * machine produced; here it marks what the reader is meant to take away,
 * which is the same signal doing a second job rather than a new one.
 *
 * The glossary is a real `<dl>`. A list of terms and definitions marked up as
 * a stack of divs is the sort of thing that looks identical and navigates
 * completely differently: a screen reader announces "definition list, twelve
 * items" and can move between terms, which a grid of paragraphs does not
 * offer.
 */

import { AiLabel, Card, cn } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import type { SampleFrame } from '../kit/page-media'
import { GLOSSARY, TEMPLATES } from './library'

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

export function TemplateList() {
  return (
    <ul
      aria-label="Templates you can copy"
      className="m-0 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2"
    >
      {TEMPLATES.map((template, position) => (
        <li
          key={template.id}
          className="reveal-item"
          style={{ '--index': position % 2 } as React.CSSProperties}
        >
          <Card className="flex h-full flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="m-0 font-heading text-title text-text">{template.title}</h3>
              <p className="m-0 text-meta text-text-muted">{template.purpose}</p>
            </div>

            {/* The template itself. An `<ol>` rather than a `<pre>`: these are
                discrete lines in a given order, and a preformatted block
                would also inherit the horizontal scrolling that comes with
                refusing to wrap — which on a 390px screen hides half of
                every line. */}
            <ol className="m-0 flex list-none flex-col gap-2 rounded-lg bg-surface-subtle p-4">
              {template.lines.map((line) => (
                <li key={line} className="machine text-mono leading-relaxed text-text">
                  {line}
                </li>
              ))}
            </ol>

            <p className="m-0 mt-auto text-meta text-text-muted">{template.note}</p>
          </Card>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* The glossary, and the one visual its section gets                           */
/* -------------------------------------------------------------------------- */

/**
 * Three sample frames, as the glossary section's visual.
 *
 * 19 §Shared rules asks for a visual in every second section, and a glossary
 * is as text-only as a section gets. `ReelStrip` was the obvious reach and
 * the wrong one: it is cut for eight frames in an eight-column grid, so three
 * of them sit as narrow slivers against five empty columns.
 *
 * The frames are not decoration dropped in to satisfy a rule. Every term
 * above assumes a 9:16 vertical a few seconds long, and that shape is the one
 * thing a definition list cannot show — which is what the caption says.
 *
 * Three lazy images, which takes this page to twelve. That is the ceiling 19
 * v2 §image budget sets rather than a target, and it is the reason the
 * glossary gets a trio instead of a strip.
 */
export interface SampleTrioProps {
  readonly frames: readonly SampleFrame[]
  /** What the reader is looking at, and why it is here. Required. */
  readonly caption: React.ReactNode
  readonly className?: string
}

export function SampleTrio({ frames, caption, className }: SampleTrioProps) {
  return (
    <figure className={cn('m-0 flex flex-col gap-3', className)}>
      <ul className="m-0 flex list-none gap-3 p-0 sm:gap-4">
        {frames.map((frame, index) => (
          <li
            key={frame.src}
            className="reel-push reveal-item w-[6.5rem] shrink-0 sm:w-[8.5rem]"
            style={{ '--index': index } as React.CSSProperties}
          >
            <div className="relative aspect-[9/16] overflow-hidden rounded-thumb bg-viewer">
              {/* Decorative: the caption below carries the meaning. `sizes`
                  keeps a phone from fetching the full-width file for a
                  104px tile. */}
              <Image
                src={frame.src}
                alt=""
                aria-hidden="true"
                fill
                loading="lazy"
                sizes="(min-width: 640px) 136px, 104px"
                className="object-cover"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-viewer/75 to-transparent"
              />
              <span className="absolute left-2 top-2">
                <AiLabel>AI sample</AiLabel>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <figcaption className="text-caption text-text-muted">
        {caption} Every frame is an AI-generated sample, not footage of a client.
      </figcaption>
    </figure>
  )
}

export function GlossaryList() {
  return (
    <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
      {GLOSSARY.map((entry) => (
        // The pair is wrapped so the grid treats a term and its definition as
        // one cell. Without it they are laid out as independent items, and a
        // term can end up in one column with its definition in the other.
        <div key={entry.term} className="flex flex-col gap-1.5">
          <dt className="m-0 font-heading text-label font-semibold text-text">{entry.term}</dt>
          <dd className="m-0 text-meta text-text-muted">
            {entry.definition}
            {entry.caveat ? (
              <span className="mt-1.5 block border-l-2 border-border-strong pl-3">
                {entry.caveat}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
