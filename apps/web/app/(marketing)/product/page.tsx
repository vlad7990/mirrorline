/**
 * /product — what the studio makes, and what it looks like making it.
 *
 * Rebuilt for 19_INNER_PAGES v2 (D49). The page it replaces was a hero, a
 * grid of twelve coloured rectangles and four text cards: documentation next
 * to a cinematic home page, which is what the whole audit was about.
 *
 * **The twelve-cut wall is gone from here, which is the one subtraction worth
 * explaining.** It was a `VideoThumb` grid with no `media`, so it rendered as
 * twelve flat demo colours — exactly the thing 19 v2 bans. The obvious fix
 * was to pass `cutMedia` and keep it. The better one was to drop it: the home
 * page already owns "one episode, twelve cuts" as a pinned sequence with real
 * footage, and a second, worse copy on this page is how two pages end up each
 * slightly wrong — this file's own argument for not re-explaining the agents.
 * The numbers it carried survive as the readout under the tour, which is the
 * part that was load-bearing.
 *
 * What is here instead is what 19 asks for: a tour of six real screens, a
 * strip of outputs that are not all the same person, and the Originality Gate
 * with its workings open.
 */

import { cutSummary, sourceVideo } from '@mirrorline/mock'
import type { Metadata } from 'next'

import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { ReelStrip } from '@/components/marketing/kit/reel-strip'
import { OriginalityDemo } from '@/components/marketing/originality-demo'
import { SampleDataLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { ProductTour } from '@/components/marketing/product-tour'
import { PRODUCT_TOUR } from '@/components/marketing/product-tour-content'
import { reelAsset } from '@/components/marketing/reel-assets'

export const metadata: Metadata = {
  title: 'Product',
  description:
    'One long video becomes eight to fifteen short vertical videos, each with its own hook, length and format. Rising formats are rebuilt as your originals. Every cut passes the compliance gate before it can be scheduled.',
}

/**
 * Eight frames for the strip. The gate demo takes no frames — its evidence is
 * the script beside the beats — so one window is all this page allocates.
 *
 * The `= []` is for `noUncheckedIndexedAccess` and nothing else:
 * `allocateFrames` returns exactly one window per count, so a page that asks
 * for one and gets none is not a case that happens. It is written as a
 * default rather than a `!` because an assertion that is wrong fails at the
 * worst moment and an empty strip fails visibly in a screenshot.
 */
const [STRIP_FRAMES = []] = allocateFrames([8])

interface StripHook {
  readonly hook: string
  readonly highlight: string
  readonly lengthLabel: string
}

/**
 * The hooks that go on the strip, paired with the frames by hand.
 *
 * Paired rather than mapped blindly: a hook about a sourdough starter over a
 * photograph of a bike repair stand is the mismatch D45 removed two hooks to
 * avoid, and the only way to not have it is for somebody to read both. The
 * order here follows `STRIP_FRAMES`, which is frames 1–8 of `SAMPLE_FRAMES`:
 * bakery, car bay, yoga studio, empty property, parcel, florist, creator at a
 * desk, hardware shop.
 */
const STRIP_HOOKS: readonly StripHook[] = [
  {
    hook: '3 things I’d never do to a sourdough starter',
    highlight: 'to a sourdough starter',
    lengthLabel: '0:27',
  },
  { hook: 'The noise worth stopping for', highlight: 'worth stopping for', lengthLabel: '0:24' },
  { hook: 'The stretch that is doing nothing', highlight: 'that is doing nothing', lengthLabel: '0:26' },
  { hook: 'What to ask before you commit', highlight: 'before you commit', lengthLabel: '0:28' },
  { hook: 'What goes in before the lid', highlight: 'before the lid', lengthLabel: '0:18' },
  {
    hook: '3 things I’d never put in a bridal bouquet',
    highlight: 'in a bridal bouquet',
    lengthLabel: '0:29',
  },
  { hook: 'Why your best people go quiet', highlight: 'go quiet', lengthLabel: '0:36' },
  { hook: 'Ask this before you buy the tool', highlight: 'before you buy the tool', lengthLabel: '0:21' },
]

/**
 * Three cuts of the one episode, for the hero inset.
 *
 * **This was a real `<video>` until Lighthouse was run on it.** D49 argued
 * /product should be the one page with a true loop, because its subject *is*
 * the single episode. The argument was sound and the measurement beat it: the
 * hero `ReelMedia` cost a 107 KB download and a **1,098 ms long task** —
 * software video decode on a throttled mobile CPU — which delayed the largest
 * paint by 4.6 s and put the page at **57** against the 90 this page is held
 * to. Nothing else on the page came close to that cost.
 *
 * Three stills from the same episode keep what the exception was protecting.
 * They are cuts 1, 2 and 3 of one 52-minute recording, so the room, the light
 * and the sweater do not change between them (D28) — the inset still shows
 * one episode becoming several posts, which is this page's whole claim. It
 * just shows it with the same cross-fade every other page uses, at no
 * download and no main-thread cost.
 *
 * `posterSrc` is non-optional on a `ReelAsset`, so a cut in the manifest
 * always has a frame; the filter is for the cut being absent entirely.
 */
const HERO_CUT_FRAMES = (['cut-01', 'cut-02', 'cut-03'] as const)
  .map((cutId) => reelAsset(cutId))
  .filter((asset) => asset !== null)
  .map((asset) => ({
    src: asset.posterSrc,
    subject: 'a presenter mid-sentence, from one recorded episode',
  }))

export default function ProductPage() {
  return (
    <>
      <PageHeroImage
        eyebrow="The product"
        title={
          <>
            One video. <span className="gold-phrase">Twelve posts.</span>
          </>
        }
        lead="Upload a talk, a podcast or a webinar. The Multiplier finds the moments that stand on their own, cuts them to 9:16, writes the hook and burns in captions in your brand style."
        image={PAGE_HERO_IMAGES.product}
        index={PRODUCT_TOUR.map((stop) => ({ number: stop.number, title: stop.title }))}
        inset={
          /* One episode, three of its cuts. The presenter is the same person
             in the same room on purpose: this page is about one recording
             becoming many posts, which is the one context where a single face
             is the honest picture rather than a range claimed with it (D45). */
          <HeroInset caption="Three cuts of one 52-minute episode.">
            <InsetCycle frames={HERO_CUT_FRAMES} />
          </HeroInset>
        }
      />

      {/* The tour -------------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="tour-heading">
        <SectionHeading
          id="tour-heading"
          eyebrow="The studio"
          rail
          title={
            <>
              Six screens, <span className="gold-phrase">end to end.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Every one of these is the software as it is today, not a drawing of what it might become."
          aside={<SampleDataLabel />}
        />
        <div className="mt-10">
          <ProductTour />
        </div>

        {/* What the upload screen above is actually reporting. This is the
            readout the twelve-cut wall used to carry; the numbers were the
            useful half of it. */}
        <p className="machine mt-8 mb-0 text-mono text-text-muted">
          one {sourceVideo.durationLabel} episode · cuts {cutSummary.total} · passed{' '}
          {cutSummary.passed} · need a look {cutSummary.needsReview} · blocked {cutSummary.blocked}
        </p>
      </Section>

      {/* What comes out --------------------------------------------------- */}
      <Section className="band-ink-alt" aria-labelledby="output-heading">
        <SectionHeading
          id="output-heading"
          eyebrow="The output"
          rail
          title={
            <>
              Different accounts, <span className="gold-phrase">different work.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Eight frames from eight unlike accounts. The hooks are what the client would say; the pictures are generated, and every one of them says so."
        />
        <div className="mt-10">
          <ReelStrip
            label="Sample reels made for eight different kinds of account"
            items={STRIP_FRAMES.map((frame, index) => ({
              frame,
              hook: STRIP_HOOKS[index]?.hook,
              highlight: STRIP_HOOKS[index]?.highlight,
              lengthLabel: STRIP_HOOKS[index]?.lengthLabel,
            }))}
          />
        </div>
      </Section>

      {/* The gate --------------------------------------------------------- */}
      <Section className="band-white" aria-labelledby="gate-heading">
        <SectionHeading
          id="gate-heading"
          eyebrow="The Originality Gate"
          rail
          title={
            <>
              The format, <span className="gold-phrase">never the footage.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="The sentence is easy to write, so here is the measurement under it: what we borrowed, what we wrote, and how close the result came to the line it has to stay under."
        />
        <div className="mt-10">
          <OriginalityDemo />
        </div>
      </Section>

      <PageCta cta={PAGE_CTAS.product} />
    </>
  )
}
