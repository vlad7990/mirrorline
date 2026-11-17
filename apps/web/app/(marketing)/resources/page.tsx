/**
 * /resources — the playbook index (16 §4), rebuilt on the inner-page kit for
 * 19_INNER_PAGES v2.
 *
 * The page it replaces was three articles in three plain cards under the old
 * `PageHero`. What v2 asks for is six ★ sections, and three of them did not
 * exist in any form: categories, the templates and glossary, and a newsletter
 * signup that collects nothing.
 *
 * **The promise in the old hero is the constraint on the new page.** It said
 * "no gated downloads · no email required", and that is the sentence the whole
 * page has to keep. So the templates are the templates — printed on the page,
 * in the HTML — rather than a card offering to email them, and the signup form
 * is honest about having no list behind it. A resources page that harvests
 * addresses for material it is already showing you is the exact pattern this
 * one is written against.
 *
 * **It renders per request rather than at build time**, which is new for a
 * marketing page here. The category filter is links the server answers
 * (★3: "a filter that works without JavaScript where it can"), so the page
 * reads `searchParams`. That is the server prop and not `useSearchParams` —
 * D46 is about the client hook and does not apply; the filtered list is in the
 * document before any script runs. The cost is the render, and it buys a
 * filter that survives scripting being off.
 */

import type { Metadata } from 'next'

import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { ArticleCardGrid } from '@/components/marketing/resources/article-cards'
import {
  ARTICLE_CATEGORIES,
  ARTICLES,
  articlesIn,
  isCategoryKey,
} from '@/components/marketing/resources/articles'
import { CategoryFilter } from '@/components/marketing/resources/category-filter'
import {
  GlossaryList,
  SampleTrio,
  TemplateList,
} from '@/components/marketing/resources/library-sections'
import { NewsletterSignup } from '@/components/marketing/resources/newsletter-signup'

/**
 * Offset 6 so this page does not open on a frame /product or /how-it-works
 * used, and two windows so the hero and the glossary never share one (19 v2:
 * no two sections of one page show the same set of frames).
 */
const [INSET_FRAMES = [], GLOSSARY_FRAMES = []] = allocateFrames([3, 3], 6)

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Six pieces on the originality rules, what to measure, posting through the official APIs, writing the first three seconds and starting from zero — plus templates and a glossary. Nothing gated.',
}

interface ResourcesPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const params = await searchParams
  const requested = typeof params.category === 'string' ? params.category : undefined

  // An unknown category shows everything rather than an empty page. Someone
  // arriving on a stale or mistyped link should land on the library, not on a
  // "no results" screen that reads as the site being broken.
  const active = isCategoryKey(requested) ? requested : undefined
  const visible = articlesIn(active)
  const activeLabel = ARTICLE_CATEGORIES.find((category) => category.key === active)?.label

  return (
    <>
      <PageHeroImage
        eyebrow="Resources"
        title={
          <>
            Useful <span className="gold-phrase">without us.</span>
          </>
        }
        lead="Six pieces on what changed and what to do about it, the templates we actually use, and the words the platforms use when they explain themselves. Each is written so you could act on it today with no account and no call — that is the test for anything we put here."
        image={PAGE_HERO_IMAGES.resources}
        index={ARTICLE_CATEGORIES.map((category, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: category.label,
        }))}
        inset={
          <HeroInset caption="Sample frames from the kind of work these pieces are about.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      {/* The articles, and the filter above them -------------------------- */}
      <Section id="articles" className="band-snow" aria-labelledby="articles-heading">
        <SectionHeading
          id="articles-heading"
          eyebrow="The playbook"
          rail
          title={
            <>
              Six pieces, <span className="gold-phrase">none of them gated.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="No downloads, no email, no account. Pick a category, or read the lot."
        />

        <div className="mt-8">
          <CategoryFilter active={active} />
        </div>

        <div className="mt-8">
          <ArticleCardGrid
            articles={visible}
            label={activeLabel ? `Articles on ${activeLabel.toLowerCase()}` : 'All articles'}
          />
        </div>

        {/* Said plainly rather than left to be counted off the grid, and it
            is also what tells a screen-reader user that the filter did
            something: the list comes back on a fresh page load, so there is
            no live region to announce the change. */}
        <p className="mb-0 mt-6 text-meta text-text-muted">
          Showing <span className="machine">{visible.length}</span> of{' '}
          <span className="machine">{ARTICLES.length}</span>
          {activeLabel ? <> · {activeLabel}</> : null}
        </p>
      </Section>

      {/* The templates ---------------------------------------------------- */}
      <Section className="band-ink-alt" aria-labelledby="templates-heading">
        <SectionHeading
          id="templates-heading"
          eyebrow="Templates"
          rail
          title={
            <>
              Four sheets, <span className="gold-phrase">printed here rather than emailed.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="These are the ones worth having on paper. Copy them out — there is nothing to sign up for and nothing to download."
        />
        <div className="mt-10">
          <TemplateList />
        </div>
      </Section>

      {/* The glossary ----------------------------------------------------- */}
      <Section className="band-white" aria-labelledby="glossary-heading">
        <SectionHeading
          id="glossary-heading"
          eyebrow="Glossary"
          rail
          title={
            <>
              The words, <span className="gold-phrase">as the platforms use them.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Industry terms rather than ours, so a definition here is still useful on somebody else's page."
        />

        <div className="mt-10">
          <GlossaryList />
        </div>

        <SampleTrio
          frames={GLOSSARY_FRAMES}
          caption="Every term above assumes this shape: a 9:16 vertical, a few seconds long."
          className="mt-12"
        />
      </Section>

      {/* The newsletter --------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="newsletter-heading">
        <SectionHeading
          id="newsletter-heading"
          eyebrow="When there is more"
          rail
          title={
            <>
              There is no list yet, <span className="gold-phrase">and this form says so.</span>
            </>
          }
          headingClassName="text-site-h2"
        />
        <div className="mt-8">
          <NewsletterSignup />
        </div>
      </Section>

      <PageCta cta={PAGE_CTAS.resources} />
    </>
  )
}
