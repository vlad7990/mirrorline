/**
 * /niche-scan — the lead magnet (14 §3).
 *
 * The one offer on the whole site that costs nothing and asks for nothing
 * back but an email, which is why every CTA anywhere points here.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { SCAN_STEPS } from '@/components/marketing/home/problem-content'
import { PageHero } from '@/components/marketing/page-hero'
import { Section } from '@/components/marketing/primitives'

import { ScanForm } from './scan-form'

export const metadata: Metadata = {
  title: 'Free Niche Scan',
  description:
    'Tell us what you do, in your own words. We find what is actually growing in your niche and send back five to ten format recipes, with why each works and how we would make it yours.',
}

export default function NicheScanPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Niche Scan"
        title={
          <>
            What is working in your niche, <span className="gold-phrase">before you pay us.</span>
          </>
        }
        lead="A strategist and our Trend Scout look at what is actually growing where you are, and send back the format recipes. It costs nothing, there is no call attached, and you could use it without us."
        index={SCAN_STEPS.map((step) => ({ number: step.number, title: step.title }))}
        marginNote="free · about 48 hours · no call attached"
      />

      <Section aria-labelledby="form-heading">
        <h2 id="form-heading" className="sr-only">
          Request a Niche Scan
        </h2>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
          <ScanForm />

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="m-0 font-heading text-title text-text">What you get back</h3>
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
    </>
  )
}
