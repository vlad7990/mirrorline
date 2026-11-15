/**
 * /resources/[slug] — one playbook article (19 v2 ★/resources item 7).
 *
 * Three things the old template did not have: a reading-progress line, a
 * labelled cover, and a related block at the foot.
 *
 * **The cover is the hero image rather than a picture above the hero.** An
 * `ArticleCover` is `{ src, alt }`, which is exactly the shape `PageHeroImage`
 * takes, so the article's own 16:9 cover becomes the full-bleed image the
 * headline sits on — one priority image on the page, labelled unconditionally
 * by that component, and no second large picture competing with it for the
 * LCP slot.
 *
 * **The progress line is CSS, not a scroll listener.** `.reading-progress` in
 * globals.css is driven by `animation-timeline: scroll(root block)`, and it
 * draws nothing at all where that is unsupported or where motion is turned
 * off — the reasoning is written at the rule, and the short version is that a
 * progress bar frozen at one end is worse than no progress bar.
 *
 * `generateStaticParams` so all six prerender; an unknown slug 404s rather
 * than rendering an empty shell.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { allocateFrames } from '@/components/marketing/kit/page-media'
import { Prose, Section, SectionHeading } from '@/components/marketing/primitives'
import { ArticleCardGrid } from '@/components/marketing/resources/article-cards'
import {
  ARTICLE_CATEGORIES,
  ARTICLES,
  findArticle,
  relatedArticles,
} from '@/components/marketing/resources/articles'
import { SampleTrio } from '@/components/marketing/resources/library-sections'
import { HEADER_HEIGHT_PX } from '@/components/marketing/site-chrome'

interface Params {
  readonly params: Promise<{ readonly slug: string }>
}

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const article = findArticle(slug)
  if (!article) return { title: 'Not found' }

  return { title: article.title, description: article.summary }
}

/**
 * A different trio per article, so six article pages are not six pages
 * showing the same three frames.
 *
 * Keyed off the article's position in `ARTICLES` rather than a hash of the
 * slug: it is stable, it is readable, and with six articles and twelve frames
 * it walks the set twice without ever repeating within one page.
 */
function framesFor(position: number) {
  const [frames = []] = allocateFrames([3], (position * 3) % 12)
  return frames
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params
  const article = findArticle(slug)
  if (!article) notFound()

  const position = ARTICLES.findIndex((entry) => entry.slug === slug)
  const category = ARTICLE_CATEGORIES.find((entry) => entry.key === article.category)
  const related = relatedArticles(slug)

  return (
    <>
      {/* First in the flow, so it sticks from the top of the article. It is
          `aria-hidden` and carries no role: a bar reporting a percentage of
          *scrolling* to a screen reader is noise, because that reader already
          knows where they are in the document. */}
      <div
        aria-hidden="true"
        className="reading-progress"
        style={{ '--reading-progress-top': `${HEADER_HEIGHT_PX}px` } as React.CSSProperties}
      >
        <span className="reading-progress-fill" />
      </div>

      <PageHeroImage
        eyebrow={category?.label ?? 'Resources'}
        title={article.title}
        lead={article.summary}
        image={article.cover}
        index={article.sections.slice(0, 4).map((section, index) => ({
          number: String(index + 1).padStart(2, '0'),
          title: section.title,
        }))}
      />

      <Section className="band-snow" aria-labelledby="article-heading">
        <h2 id="article-heading" className="sr-only">
          {article.title}
        </h2>

        <p className="machine m-0 text-mono text-text-muted">
          <span className="sr-only">Reading time: </span>
          {article.readingMinutes} min read
        </p>

        <div className="mt-8 flex flex-col gap-10">
          {article.sections.map((section, index) => (
            <section key={section.id} aria-labelledby={`${section.id}-heading`}>
              <SectionHeading
                id={`${section.id}-heading`}
                level={3}
                title={
                  <>
                    <span className="machine mr-3 text-mono text-gold-deep">
                      {String(index + 1).padStart(2, '0')}
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

      {/* The related block: the reels first, then the other articles ------ */}
      <Section className="band-white" aria-labelledby="related-heading">
        <SectionHeading
          id="related-heading"
          eyebrow="Next"
          rail
          title={
            <>
              The work this describes, <span className="gold-phrase">and three more pieces.</span>
            </>
          }
          headingClassName="text-site-h2"
        />

        <SampleTrio
          frames={framesFor(position)}
          caption="Sample verticals of the kind this piece is about."
          className="mt-10"
        />

        <div className="mt-12">
          <ArticleCardGrid articles={related} label="More articles" columns={3} />
        </div>
      </Section>

      <PageCta cta={PAGE_CTAS.resources} />
    </>
  )
}
