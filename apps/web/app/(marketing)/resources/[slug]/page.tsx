/**
 * /resources/[slug] — one playbook article.
 *
 * `generateStaticParams` so all three prerender; an unknown slug 404s rather
 * than rendering an empty shell.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { Prose, Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

import { ARTICLES, findArticle } from '../resources-content'

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

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params
  const article = findArticle(slug)
  if (!article) notFound()

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={article.title}
        lead={article.summary}
        index={article.sections.slice(0, 4).map((section, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: section.title,
        }))}
        marginNote={`${article.readingMinutes} min read`}
      />

      <Section aria-labelledby="article-heading">
        <h2 id="article-heading" className="sr-only">
          {article.title}
        </h2>
        <div className="flex flex-col gap-10">
          {article.sections.map((section, position) => (
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

      <SiteCta next={{ href: '/resources', label: 'All resources' }} />
    </>
  )
}
