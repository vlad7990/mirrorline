/**
 * The shared shape of a policy or statement page: a hero, then numbered
 * sections of plain prose.
 *
 * Five pages use it — the four new legal documents and the accessibility
 * statement — and one component rather than five layouts is what stops them
 * drifting into five slightly different voices.
 *
 * **The legal ones carry the draft notice.** None has been read by a lawyer,
 * and a policy page that looks finished is worse than no policy page: a
 * reader would reasonably rely on it.
 */

import * as React from 'react'

import { PageHero } from './page-hero'
import { DraftNotice, Prose, Section, SectionHeading } from './primitives'
import { SiteCta } from './site-cta'

export interface DocSection {
  readonly id: string
  readonly title: string
  /** Each string is one paragraph. Markdown would be overkill here. */
  readonly paragraphs: readonly string[]
  /** An optional plain list under the paragraphs. */
  readonly list?: readonly string[]
}

export interface DocPageContent {
  readonly eyebrow: string
  readonly title: React.ReactNode
  readonly lead: string
  /** What the draft notice calls this document. Omit where it is not legal. */
  readonly draftName?: string
  readonly sections: readonly DocSection[]
  readonly next: { readonly href: string; readonly label: string }
}

export function DocPage({ content }: { content: DocPageContent }) {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.lead}
        index={content.sections.slice(0, 4).map((section, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: section.title,
        }))}
      />

      <Section aria-labelledby="doc-heading">
        <h2 id="doc-heading" className="sr-only">
          {content.eyebrow}
        </h2>

        {content.draftName ? (
          <DraftNotice documentName={content.draftName} className="mb-10" />
        ) : null}

        <div className="flex flex-col gap-10">
          {content.sections.map((section, position) => (
            <section key={section.id} aria-labelledby={`${section.id}-heading`}>
              <SectionHeading
                id={`${section.id}-heading`}
                level={3}
                title={
                  <>
                    <span className="machine mr-3 text-mono text-gold-bright">
                      {String(position + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </>
                }
              />
              <Prose className="mt-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="m-0">
                    {paragraph}
                  </p>
                ))}
                {section.list ? (
                  <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </Prose>
            </section>
          ))}
        </div>
      </Section>

      <SiteCta next={content.next} />
    </>
  )
}
