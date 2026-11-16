/**
 * Which picture goes on which inner page, and which frames go in which section.
 *
 * `19_INNER_PAGES.md` v2 sets two rules this module exists to keep:
 *
 *   - **No two sections of one page show the same set of sample frames.** That
 *     is easy to say and easy to break by hand, because the frames are chosen
 *     section by section in different files. `allocateFrames` hands out
 *     consecutive, non-overlapping windows from one call, so a page cannot
 *     repeat a set without the call site visibly asking it to.
 *   - **No flat colour tiles.** Every frame listed here has a file behind it,
 *     and a test asserts that each one exists on disk — the same promise
 *     `reel-assets.ts` makes about the cut wall, for the same reason: a
 *     renamed asset would otherwise ship as a broken image and pass every
 *     other expectation.
 *
 * Nothing here is a photograph of a client. Every file is AI-generated and
 * every surface that renders one carries the label, which is non-negotiable 4.
 */

/* -------------------------------------------------------------------------- */
/* Sample frames                                                               */
/* -------------------------------------------------------------------------- */

export interface SampleFrame {
  /** A 9:16 generated still under `public/samples/`. */
  readonly src: string
  /**
   * What the frame actually shows.
   *
   * Written as the subject rather than as alt text, because the two differ:
   * these frames are decorative wherever a real hook sits beside them, and
   * descriptive where they stand alone. The call site decides; this is the
   * fact it decides from, and it is also what stops a section claiming a
   * trade the picture does not contain.
   */
  readonly subject: string
}

/**
 * The twelve frames from D45, in file order.
 *
 * Six faces, three pairs of hands and three places, spanning age, gender and
 * ethnicity on purpose. The *frames* vary by trade and the *labels* stay
 * goals — that distinction is the whole of 16 §1, and it is what lets a page
 * show the work fits anyone without sorting anyone into a vertical.
 */
export const SAMPLE_FRAMES: readonly SampleFrame[] = [
  { src: '/samples/sample-01.webp', subject: 'a baker behind a counter of bread racks' },
  { src: '/samples/sample-02.webp', subject: 'a mechanic working under a car on a lift' },
  { src: '/samples/sample-03.webp', subject: 'a man sitting on a mat in a bright studio' },
  { src: '/samples/sample-04.webp', subject: 'an empty room with afternoon light on the floor' },
  { src: '/samples/sample-05.webp', subject: 'two hands opening a parcel on a table' },
  { src: '/samples/sample-06.webp', subject: 'a florist trimming stems, seen from above' },
  { src: '/samples/sample-07.webp', subject: 'someone talking to a camera at their own desk' },
  { src: '/samples/sample-08.webp', subject: 'a shopkeeper holding a phone at arm’s length' },
  { src: '/samples/sample-09.webp', subject: 'a hand pouring milk into a coffee' },
  { src: '/samples/sample-10.webp', subject: 'hands sanding a curved piece of wood' },
  { src: '/samples/sample-11.webp', subject: 'a mechanic working on a bike in a repair stand' },
  { src: '/samples/sample-12.webp', subject: 'a greenhouse aisle lined with plants' },
]

/**
 * Consecutive, non-overlapping windows of frames, one per section.
 *
 * Given the number of frames each section wants, in page order, this returns
 * one window per section with no frame appearing twice. A page that asks for
 * more than the twelve we have is a mistake rather than a thing to paper over
 * by wrapping — so it throws, which on a server component is a build-time
 * failure rather than a subtle repeat nobody notices.
 *
 * `offset` exists so two different pages can take different slices of the
 * same twelve. Without it every page would open with the baker, and the site
 * would look like one page repeated.
 */
export function allocateFrames(
  counts: readonly number[],
  offset = 0,
  frames: readonly SampleFrame[] = SAMPLE_FRAMES,
): readonly (readonly SampleFrame[])[] {
  const total = counts.reduce((sum, count) => sum + count, 0)
  if (total > frames.length) {
    throw new Error(
      `A page asked for ${total} sample frames and there are only ${frames.length}. ` +
        'Either the page wants fewer frames or the set needs more members — ' +
        'repeating one across two sections of a page is not an option (19 v2).',
    )
  }

  // Reduced over an accumulator rather than walked with a mutable cursor: the
  // windows are derived from the counts, so deriving them is the honest shape.
  return counts.reduce<{
    readonly taken: number
    readonly windows: readonly (readonly SampleFrame[])[]
  }>(
    (state, count) => {
      const start = (offset + state.taken) % frames.length
      // The slice may run past the end of the array, which is why the list is
      // doubled rather than sliced in place. The throw above is what
      // guarantees the wrap never revisits a frame within one page.
      const window = [...frames, ...frames].slice(start, start + count)
      return { taken: state.taken + count, windows: [...state.windows, window] }
    },
    { taken: 0, windows: [] },
  ).windows
}

/* -------------------------------------------------------------------------- */
/* Page hero images                                                            */
/* -------------------------------------------------------------------------- */

export interface PageHeroImage {
  /** A 16:9 generated image under `public/page-heroes/`. */
  readonly src: string
  /**
   * What the room contains, for someone who cannot see it.
   *
   * A hero image is decorative — the headline beside it carries the page —
   * but it is also the largest thing on the screen, and an empty `alt` on
   * something that big tells a screen-reader user nothing about where they
   * have landed. So it is described, briefly, as a room.
   */
  readonly alt: string
}

/**
 * One image per page, against `hero-parts.tsx`'s one-room argument.
 *
 * That file says a hero backdrop is "a *room*, not an illustration of a
 * topic, so it does not need to change when the subject does". It was right
 * for five pages that shared a studio shot behind a screenshot. 19 v2 asks for
 * something else: a full-bleed image per page that the headline sits directly
 * on, and at that size one repeated room reads as a template rather than as a
 * site. The honest cost is eight things to label instead of one, which the
 * hero component handles by labelling unconditionally.
 */
export const PAGE_HERO_IMAGES = {
  product: {
    src: '/page-heroes/product.webp',
    alt: 'A workspace at the end of the afternoon, with a grid of tall vertical video frames on the screens.',
  },
  'how-it-works': {
    src: '/page-heroes/how-it-works.webp',
    alt: 'A long workbench lit in three separate pools of light, one after another.',
  },
  pricing: {
    src: '/page-heroes/pricing.webp',
    alt: 'A quiet corner of a studio in the morning: a plain table, a notebook and one chair.',
  },
  compare: {
    src: '/page-heroes/compare.webp',
    alt: 'Four small work surfaces side by side, each kept in a different way.',
  },
  metrics: {
    src: '/page-heroes/metrics.webp',
    alt: 'A wall screen showing soft bars and curves, with someone standing back from it.',
  },
  'niche-scan': {
    src: '/page-heroes/niche-scan.webp',
    alt: 'A research wall of pinned pictures and cards, with someone studying it.',
  },
  resources: {
    src: '/page-heroes/resources.webp',
    alt: 'A reading corner with full shelves and afternoon light across the floor.',
  },
  auth: {
    src: '/page-heroes/auth.webp',
    alt: 'A warm open doorway seen from a dim hallway, looking into a studio beyond.',
  },
} as const satisfies Record<string, PageHeroImage>

export type PageHeroKey = keyof typeof PAGE_HERO_IMAGES

/* -------------------------------------------------------------------------- */
/* Pages whose hero is a wall of frames                                        */
/* -------------------------------------------------------------------------- */

export interface PageHeroFrameSet {
  /**
   * Where this page's window into the twelve starts.
   *
   * Distinct per page, and a test says so. Without it every F6 page would
   * open on the baker and the eleven of them would read as one page with
   * eleven headlines — the same failure "no two pages share a hero image"
   * guards against on the generated rooms.
   */
  readonly offset: number
  /** What the wall is of, for the handoff and for whoever picks the next offset. */
  readonly subject: string
}

/**
 * The F6 pages, which have a hero wall rather than a room of their own.
 *
 * 19 §Shared rules asks every inner page for its own full-bleed generated
 * image. Eight exist; five credits remain and nine more pages want one, which
 * is eighteen credits (19 v2 §asset budget). D69 chose the wall over reuse,
 * because reuse is the one thing `PAGE_HERO_IMAGES`' own test calls a failure.
 *
 * `/legal/*` and `/accessibility` are not here on purpose: 19 §Page by page
 * gives them "no reels, readable layout, light motion only", so they have no
 * hero backdrop at all and a key here would be an invitation to add one.
 */
export const PAGE_HERO_FRAMES = {
  businesses: { offset: 0, subject: 'a baker, a mechanic and a man on a studio mat' },
  individuals: { offset: 3, subject: 'an empty lit room, a parcel being opened and a florist' },
} as const satisfies Record<string, PageHeroFrameSet>

export type PageHeroFrameKey = keyof typeof PAGE_HERO_FRAMES
