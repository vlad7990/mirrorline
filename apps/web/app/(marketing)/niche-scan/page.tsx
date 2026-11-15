/**
 * /niche-scan — the lead magnet (14 §3).
 *
 * The one offer on the whole site that costs nothing and asks for nothing
 * back but an email, which is why every CTA anywhere points here.
 */

import { trends } from '@mirrorline/mock'
import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { SCAN_STEPS } from '@/components/marketing/home/problem-content'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { Section, SectionHeading } from '@/components/marketing/primitives'

import { ScanForm } from './scan-form'

/** Offset 9, so this page does not open on a frame another page opened with. */
const [INSET_FRAMES = []] = allocateFrames([3], 9)

/**
 * Three of the recipes a scan comes back with.
 *
 * The real ones, from the same fixture the studio's Niche Scan screen renders
 * — not three written for this page. A marketing page inventing prettier
 * recipes than the product produces is exactly the gap between demo and
 * delivery that P2 is a complaint about.
 */
const SAMPLE_RECIPES = trends.slice(0, 3)

export const metadata: Metadata = {
  title: 'Free Niche Scan',
  description:
    'Tell us what you do, in your own words. We find what is actually growing in your niche and send back five to ten format recipes, with why each works and how we would make it yours.',
}

export default function NicheScanPage() {
  return (
    <>
      <PageHeroImage
        eyebrow="Free Niche Scan"
        title={
          <>
            What is working in your niche, <span className="gold-phrase">before you pay us.</span>
          </>
        }
        lead="A strategist and our Trend Scout look at what is actually growing where you are, and send back the format recipes. It costs nothing, there is no call attached, and you could use it without us."
        image={PAGE_HERO_IMAGES['niche-scan']}
        index={SCAN_STEPS.map((step) => ({ number: step.number, title: step.title }))}
        inset={
          <HeroInset caption="Three accounts the scan has been run for.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      <Section aria-labelledby="form-heading">
        <h2 id="form-heading" className="sr-only">
          Request a Niche Scan
        </h2>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
          <ScanForm />

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              {/* Retitled when the form became a stepper (D54). Two numbered
                  runs of four, side by side, read as one list and its legend
                  — and the first item of this one, "You tell us your niche",
                  really is the form's first question, so the two appear to
                  line up and then diverge, which is the worst version of the
                  confusion. The heading and the line under it say which
                  sequence is which: four questions on the left, and what
                  happens to the answers on the right. */}
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 font-heading text-title text-text">After you send it</h3>
                <p className="m-0 text-meta text-text-muted">
                  The form is four questions. This is what happens to the answers.
                </p>
              </div>
              <ol className="m-0 flex list-none flex-col gap-0 p-0">
                {SCAN_STEPS.map((step) => (
                  <li
                    key={step.number}
                    className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <span className="machine shrink-0 text-mono text-gold-bright">
                      {step.number}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h4 className="m-0 font-heading text-subtitle text-text">{step.title}</h4>
                      <p className="m-0 text-meta text-text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-subtle p-5">
              <h3 className="m-0 font-heading text-subtitle text-text">
                Where the scan does not look
              </h3>
              <p className="m-0 text-meta text-text-muted">
                We read public trend tools, ad libraries and official APIs, and a strategist reviews
                up to thirty public examples by hand. We never scrape private data, never log into
                anyone else’s account, and never download or store another creator’s video or
                audio. What we keep is a link and a description of the format — never the media.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* What comes back ------------------------------------------------- */}
      {/* No band utility: the recipe cards carry `text-success` for the
          growth figure, which a band would pin to its ink-band value on a
          light ground (D40). Same trap as the goal picker on /metrics. */}
      <Section tone="subtle" aria-labelledby="recipes-heading">
        <SectionHeading
          id="recipes-heading"
          eyebrow="What comes back"
          rail
          title={
            <>
              Five to ten recipes. <span className="gold-phrase">Here are three.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Each one is a structure with its beats, why it is growing, and how well it fits the account. A recipe is a shape — never somebody else's video, and never their footage."
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
          {SAMPLE_RECIPES.map((recipe, position) => (
            <li
              key={recipe.id}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="m-0 font-heading text-subtitle text-text">{recipe.format}</h3>
                  <span className="machine shrink-0 text-mono text-success">
                    {recipe.growthLabel}
                  </span>
                </div>

                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {recipe.beats.map((beat) => (
                    <li
                      key={beat.order}
                      className="flex items-baseline gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="machine shrink-0 text-mono text-text-muted">
                        {String(beat.order).padStart(2, '0')}
                      </span>
                      <span className="text-meta text-text">{beat.label}</span>
                    </li>
                  ))}
                </ol>

                <p className="m-0 text-meta text-text-muted">{recipe.whyItWorks}</p>
                <p className="m-0 mt-auto border-t border-border pt-3 text-caption text-text-muted">
                  <span className="machine">{recipe.viewsPerFollower}x</span> views per follower in
                  this niche &middot; sample data from a fictional demo account
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <PageCta cta={PAGE_CTAS['niche-scan']} />
    </>
  )
}
