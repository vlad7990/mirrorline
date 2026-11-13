/**
 * /resources — the playbook index (16 §4).
 *
 * Three articles, each useful without us. An article that only makes sense
 * as an argument for buying belongs on a product page instead.
 */

import { Card } from '@mirrorline/ui'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

import { ARTICLES } from './resources-content'

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'What changed in the originality rules, what to measure if you only measure five things, and how to turn one recording into a month of posts.',
}

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={
          <>
            Useful <span className="gold-phrase">without us.</span>
          </>
        }
        lead="Three pieces on what changed and what to do about it. Each is written so you could act on it today with no account and no call — that is the test for anything we put here."
        index={ARTICLES.map((article, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: article.title,
        }))}
        marginNote="no gated downloads · no email required"
      />

      <Section aria-labelledby="articles-heading">
        <SectionHeading
          id="articles-heading"
          eyebrow="The playbook"
          title="Three to start with"
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-3">
          {ARTICLES.map((article, position) => (
            <li
              key={article.slug}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-3">
                <span className="machine text-mono text-gold-bright">
                  {String(position + 1).padStart(2, '0')}
                </span>
                <h3 className="m-0 font-heading text-title text-text">
                  {/* The whole card is not a link: a card-sized hit area
                      reads as one enormous link to a screen reader. The
                      title is the link, and it names its own destination. */}
                  <Link
                    href={`/resources/${article.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 text-meta text-text-muted">{article.summary}</p>
                <p className="machine m-0 mt-auto flex items-center gap-2 border-t border-border pt-3 text-mono text-text-muted">
                  {article.readingMinutes} min read
                  <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <SiteCta next={{ href: '/niche-scan', label: 'Free Niche Scan' }} />
    </>
  )
}
