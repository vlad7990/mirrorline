/**
 * The part of `/product` where a video becomes a post (16 §4: "publishing").
 *
 * The page used to stop at the Originality Gate, which is one step short of
 * the thing being sold: the Gate decides a video *may* go out, and this is
 * where it goes out. Three phones, one per destination, each carrying a real
 * generated frame — `PhoneFrame` refuses an empty screen on purpose, because
 * a bezel round a colour tile is a picture of nothing.
 *
 * **The TikTok caveat sits under the TikTok phone.** It is the least
 * convenient sentence on the page and it belongs next to the claim it
 * qualifies, not in a footnote under all three.
 *
 * The strip underneath is the integrations list, and the only interesting
 * thing about it is that two of the four say **Planned**. A row of
 * capabilities with no roadmap in it is how a marketing page implies a
 * product that does not exist yet.
 */

import { cn } from '@mirrorline/ui'

import { PhoneFrame } from './kit/frames'
import type { SampleFrame } from './kit/page-media'
import { Section, SectionHeading } from './primitives'
import { INTEGRATIONS, PUBLISHING_DESTINATIONS, PUBLISHING_NEVER } from './publishing-content'

export interface PublishingSectionProps {
  /** One generated still per destination, allocated by the page. */
  readonly frames: readonly SampleFrame[]
}

export function PublishingSection({ frames }: PublishingSectionProps) {
  return (
    <Section className="band-ink-alt" aria-labelledby="publishing-heading">
      <SectionHeading
        id="publishing-heading"
        eyebrow="Publishing"
        rail
        title={
          <>
            Then it posts, <span className="gold-phrase">to accounts you own.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="Several times a day, through the platforms' own APIs, to accounts you connected and can disconnect in a click. We never hold a password, and nothing is posted anywhere you did not connect."
      />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {PUBLISHING_DESTINATIONS.map((destination, index) => {
          const frame = frames[index]
          return (
            <div key={destination.id} className="flex flex-col gap-3">
              {frame ? (
                <PhoneFrame className="mx-auto max-w-[13rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a
                      9:16 still already sized for a ~200px frame has nothing
                      for the optimiser to resize, and the heading under it
                      does the telling, so it is decorative here. */}
                  <img
                    src={frame.src}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </PhoneFrame>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-label text-on-ink-900">{destination.platform}</h3>
                <p className="m-0 text-meta text-on-ink-muted">{destination.how}</p>
                <p
                  className={cn(
                    'm-0 text-meta',
                    destination.status === 'audit-pending' ? 'text-gold-400' : 'text-on-ink-muted',
                  )}
                >
                  {destination.note}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Non-negotiable 3, in four words each. */}
      <ul className="mt-10 flex list-none flex-wrap gap-2 p-0">
        {PUBLISHING_NEVER.map((rule) => (
          <li
            key={rule}
            className="rounded-full border border-ink-line px-3 py-1 text-meta text-on-ink-muted"
          >
            {rule}
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-ink-line pt-8">
        <h3 className="m-0 text-label text-on-ink-900">What else connects</h3>
        <ul className="mt-4 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
          {INTEGRATIONS.map((integration) => (
            <li key={integration.id} className="flex flex-col gap-1.5">
              <p className="m-0 flex flex-wrap items-center gap-2 text-body text-on-ink-900">
                {integration.label}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]',
                    integration.status === 'planned'
                      ? 'border border-ink-line text-on-ink-muted'
                      : 'bg-gold-500/15 text-gold-400',
                  )}
                >
                  {integration.status === 'planned' ? 'Planned' : 'Built'}
                </span>
              </p>
              <p className="m-0 text-meta text-on-ink-muted">{integration.what}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
