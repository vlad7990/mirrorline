/**
 * /product — what the studio makes, in order.
 *
 * From docs/design/handoff-v4 §Product: the multiply demo, the trend remake,
 * then four numbered steps. The handoff's page and this one differ in one
 * way worth stating — its demo card is a scripted animation, and ours shows
 * the real twelve cuts the engine produced from the demo client's episode
 * (D25, amendment 2).
 *
 * The agents are not re-explained here. They have their own page, and
 * repeating them would make two pages that are each slightly wrong.
 */

import { cutSummary, cuts, sourceVideo } from '@mirrorline/mock'
import { Card, VideoThumb, ViewerPanel } from '@mirrorline/ui'
import type { Metadata } from 'next'

import { FEATURE_TABS } from '@/components/marketing/home-content'
import { PageHero } from '@/components/marketing/page-hero'
import { SampleDataLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'

export const metadata: Metadata = {
  title: 'Product',
  description:
    'One long video becomes eight to fifteen short vertical videos, each with its own hook, length and format. Rising formats are rebuilt as your originals. Every cut passes the compliance gate before it can be scheduled.',
}

export default function ProductPage() {
  return (
    <>
      {/* The shot is `studio-cuts-16x10`, the upload screen after a run. It
          came free when the home hero stopped using it, and it is the right
          image for this page. An `upload-*` name would read better but no
          such file exists — the e2e run caught that 404 rather than letting
          a broken image ship. */}
      <PageHero
        eyebrow="The product"
        title={
          <>
            One video. <span className="gold-phrase">Twelve posts.</span>
          </>
        }
        lead="Upload a talk, a podcast or a webinar. The Multiplier finds the moments that stand on their own, cuts them to 9:16, writes the hook and burns in captions in your brand style."
        shot="studio-cuts-16x10"
        shotAlt="The upload screen after a run: twelve vertical cuts, each with its hook, length, format and compliance verdict."
        shotCaption="The studio after one upload, on sample data from a fictional demo client."
        index={FEATURE_TABS}
        marginNote="one episode 52:14 · twelve cuts · three minutes"
      />

      {/* What one episode became ---------------------------------------- */}
      <Section className="band-ink-alt" aria-labelledby="multiply-heading">
        <SectionHeading
          id="multiply-heading"
          eyebrow="Multiply"
          title={
            <>
              One episode, <span className="gold-phrase">twelve cuts.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
          lead={
            <>
              A <span className="machine">{sourceVideo.durationLabel}</span> talk became{' '}
              <span className="machine">{cuts.length}</span> short videos. None of them is the same
              clip with a new title, and the ones that did not pass say so on the frame.
            </>
          }
          aside={<SampleDataLabel />}
        />

        <div className="mt-10">
          <ViewerPanel
            readout={
              <>
                cuts <span className="machine">{cutSummary.total}</span> · passed{' '}
                <span className="machine">{cutSummary.passed}</span> · need a look{' '}
                <span className="machine">{cutSummary.needsReview}</span> · blocked{' '}
                <span className="machine">{cutSummary.blocked}</span>
              </>
            }
          >
            <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
              {cuts.map((cut, position) => (
                <li key={cut.id} className="min-w-0">
                  <VideoThumb
                    caption={cut.hook}
                    cutNumber={cut.index}
                    highlight={cut.highlightPhrase}
                    index={position}
                    length={cut.lengthLabel}
                  />
                </li>
              ))}
            </ol>
          </ViewerPanel>
        </div>
      </Section>

      {/* The four jobs, as prose ---------------------------------------- */}
      {/* The Home page gives these a slider; here they are a list. Someone
          who reached the product page wants to read all four, not click
          through them one at a time. */}
      <Section className="band-snow" aria-labelledby="steps-heading">
        <SectionHeading
          id="steps-heading"
          eyebrow="How it works"
          title={
            <>
              Four jobs, <span className="gold-phrase">in order.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
          lead="Each hands to the next, and the last one decides what the first does on Monday."
        />
        <ol className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2">
          {FEATURE_TABS.map((step) => (
            <li key={step.id}>
              <Card className="flex h-full flex-col gap-3">
                <span className="machine text-metric text-gold-deep">{step.number}</span>
                <h3 className="m-0 font-heading text-title text-text">{step.title}</h3>
                <p className="m-0 text-body text-text-muted">{step.body}</p>
                <p className="m-0 mt-auto border-t border-border pt-3 text-meta text-text-muted">
                  <span className="machine">{step.stat}</span>
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <SiteCta next={{ href: '/agents', label: 'Agents' }} />
    </>
  )
}
