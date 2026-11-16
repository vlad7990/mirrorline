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
 *
 * **F6d gave these pages a reading layout rather than the marketing kit**
 * (19 v3 ★ /legal/\* and /accessibility). Three absences, and the absences
 * are the design:
 *
 *   - **No hero picture, and not because of the credits.** 19 §Page by page
 *     gives this group "no reels, readable layout, light motion only". They
 *     are absent from `PAGE_HERO_FRAMES` too, so there is nowhere to add a
 *     frame wall to them out of habit.
 *   - **No closing CTA.** `SiteCta` used to sit at the foot of every one of
 *     these. A page someone opens to find out what we do with their data
 *     should not close by selling them a pilot — the old foot was asking
 *     them to buy while they were still reading the terms.
 *   - **No motion beyond the stagger the rest of the site already uses.**
 *
 * What they gained: a sticky table of contents, anchor links, and a
 * last-updated date that comes from the document rather than from the build.
 */

import * as React from 'react'

import { DocContents } from './doc-contents'
import { DraftNotice, Prose, Section, SectionHeading } from './primitives'

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
  /**
   * When this wording was written, as the document says it — "9 November
   * 2026", the convention `/legal/privacy` already used.
   *
   * A string the document owns rather than a build date, and that is the
   * whole point of the field: a policy re-dated by a deploy tells a reader
   * it was reviewed on a day nobody read it. Required, because a policy with
   * no date is the thing 19 ★3 is asking to fix.
   */
  readonly updated: string
  readonly sections: readonly DocSection[]
}

export function DocPage({ content }: { content: DocPageContent }) {
  return (
    <>
      {/* A document header, not a page hero.
          `PageHero` draws `HeroBackdrop` unconditionally and carries the "the
          room behind this is an AI-generated image" label with it — which is
          right on a marketing page and wrong here twice over: 19 gives this
          group "no reels, readable layout, light motion only", and a policy
          page that opens on a photograph of a room is dressing up the one
          document a reader came to read plainly. Caught by looking at the
          rendered page; the first version of this port kept the hero and the
          label sat there describing a picture these pages should not have. */}
      <Section size="md" className="band-ink">
        <span className="site-eyebrow">{content.eyebrow}</span>
        <h1 className="reveal-lead m-0 mt-4 max-w-[26ch] text-balance text-site-h2 text-on-ink-900">
          {content.title}
        </h1>
        <p className="reveal m-0 mt-5 max-w-[60ch] text-subtitle font-normal text-on-ink-muted">
          {content.lead}
        </p>
      </Section>

      <Section aria-labelledby="doc-heading">
        <h2 id="doc-heading" className="sr-only">
          {content.eyebrow}
        </h2>

        {content.draftName ? (
          <DraftNotice documentName={content.draftName} className="mb-10" />
        ) : null}

        <p className="m-0 mb-8 text-meta text-text-muted">
          Last updated <span className="machine">{content.updated}</span>.
        </p>

        {/* The contents, beside the document on a wide screen and above it on
            a phone. Sticky here because the list has a column of its own: at
            one column it simply scrolls away above the text, which is the
            right behaviour on a screen with no room to spare.

            `DocContents` is shared with `/legal/privacy` and `/legal/terms`,
            which are bespoke layouts this component never reached. */}
        <div className="grid gap-10 lg:grid-cols-12">
          <DocContents
            className="lg:col-span-4"
            sticky
            items={content.sections.map((section) => ({
              href: `#${section.id}-heading`,
              title: section.title,
            }))}
          />

          <div className="flex flex-col gap-10 lg:col-span-8">
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
        </div>
      </Section>
    </>
  )
}
