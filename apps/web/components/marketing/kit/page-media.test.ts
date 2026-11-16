/**
 * The rules 19 v2 states in prose, as assertions.
 *
 * Three of them are the kind that pass review and fail in the browser: a
 * renamed asset still typechecks, a repeated frame still renders, and a
 * copy-pasted CTA still builds. Each is cheap to assert and expensive to
 * notice by eye across nine pages, which is the whole argument for putting
 * them here rather than in a checklist.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { PAGE_CTAS } from './page-cta-content'
import { PAGE_HERO_FRAMES, PAGE_HERO_IMAGES, SAMPLE_FRAMES, allocateFrames } from './page-media'

/** `public/` holds the files these manifests name. */
const PUBLIC_DIR = join(import.meta.dirname, '..', '..', '..', 'public')

/** Turns a web path from a manifest into a path on disk. */
function onDisk(src: string): string {
  return join(PUBLIC_DIR, src)
}

describe('sample frames', () => {
  test('every frame named in the manifest exists on disk', () => {
    // Arrange
    const sources = SAMPLE_FRAMES.map((frame) => frame.src)

    // Act
    const missing = sources.filter((src) => !existsSync(onDisk(src)))

    // Assert
    expect(missing).toEqual([])
  })

  test('no frame is listed twice', () => {
    // Arrange
    const sources = SAMPLE_FRAMES.map((frame) => frame.src)

    // Act
    const unique = new Set(sources)

    // Assert
    expect(unique.size).toBe(sources.length)
  })

  test('every frame says what it shows', () => {
    // A frame with no subject is a frame a page can caption wrongly, which is
    // the failure D45 names: a heading that claims a range the picture does
    // not contain.
    const silent = SAMPLE_FRAMES.filter((frame) => frame.subject.trim() === '')

    expect(silent).toEqual([])
  })
})

describe('allocateFrames', () => {
  test('hands each section its own frames', () => {
    // Arrange
    const counts = [8, 3]

    // Act
    const [strip, phases] = allocateFrames(counts)

    // Assert
    expect(strip).toHaveLength(8)
    expect(phases).toHaveLength(3)
    const overlap = strip?.filter((frame) => phases?.includes(frame))
    expect(overlap).toEqual([])
  })

  test('no frame repeats across any number of sections on one page', () => {
    // Arrange — the heaviest page 19 v2 describes: a strip, a phase trio and
    // a single comparison frame.
    const counts = [8, 3, 1]

    // Act
    const windows = allocateFrames(counts)
    const all = windows.flatMap((window) => window.map((frame) => frame.src))

    // Assert
    expect(new Set(all).size).toBe(all.length)
  })

  test('the offset moves a page off the start of the set', () => {
    // Two pages that both open with a strip should not both open with the
    // baker, or the site reads as one page repeated.
    const [first] = allocateFrames([4])
    const [second] = allocateFrames([4], 4)

    expect(first?.[0]?.src).not.toBe(second?.[0]?.src)
  })

  test('refuses to wrap rather than quietly repeating a frame', () => {
    // Asking for thirteen frames when there are twelve is a mistake in the
    // page, and the only honest answers are "fewer frames" or "more frames".
    // Wrapping would silently satisfy the call and break the rule.
    expect(() => allocateFrames([7, 6])).toThrow(/only 12/)
  })

  test('an empty page asks for nothing and gets nothing', () => {
    expect(allocateFrames([])).toEqual([])
  })
})

describe('page hero images', () => {
  test('every hero image exists on disk', () => {
    // Arrange
    const sources = Object.values(PAGE_HERO_IMAGES).map((image) => image.src)

    // Act
    const missing = sources.filter((src) => !existsSync(onDisk(src)))

    // Assert
    expect(missing).toEqual([])
  })

  test('no two pages share a hero image', () => {
    // The point of generating eight was that one repeated room reads as a
    // template. Two pages pointing at one file is that failure, reintroduced
    // by a copy-paste rather than by a decision.
    const sources = Object.values(PAGE_HERO_IMAGES).map((image) => image.src)

    expect(new Set(sources).size).toBe(sources.length)
  })

  test('every hero image is described', () => {
    // It is the largest thing on the page. An empty alt on something that big
    // tells a screen-reader user nothing about where they have landed.
    const undescribed = Object.entries(PAGE_HERO_IMAGES).filter(
      ([, image]) => image.alt.trim().length < 20,
    )

    expect(undescribed).toEqual([])
  })
})

describe('page CTAs', () => {
  test('no two pages close with the same headline', () => {
    // This is the rule the whole module exists for: `site-cta.tsx` put one
    // block at the foot of every page, and the only thing stopping that
    // happening again is an assertion that it has not.
    const headlines = Object.values(PAGE_CTAS).map((cta) => `${cta.title} ${cta.accent}`)

    expect(new Set(headlines).size).toBe(headlines.length)
  })

  test('none of them is the block they replaced', () => {
    const headlines = Object.values(PAGE_CTAS).map((cta) => `${cta.title} ${cta.accent}`)

    expect(headlines).not.toContain('Record once. Show up everywhere.')
  })

  test('every page in the CTA set has a hero of one kind, and the reverse', () => {
    // The manifests are keyed by the same page slugs and drift apart the
    // first time a page is added to one and not the other. `auth` is the one
    // deliberate exception: /sign-in and /sign-up share an image and have no
    // closing CTA, because they are a door rather than a page of argument.
    //
    // F6 made this a three-way check rather than a pair. A page now has
    // either a generated room or a wall of frames, so the union is what has
    // to match — a page in neither would ship the old text hero, which is
    // exactly the seam 19 v2 §Scope admitted to and F6 is closing.
    const withHero = [
      ...Object.keys(PAGE_HERO_IMAGES).filter((key) => key !== 'auth'),
      ...Object.keys(PAGE_HERO_FRAMES),
    ]
    const withCta = Object.keys(PAGE_CTAS)

    expect([...withCta].sort()).toEqual([...withHero].sort())
  })

  test('no page has both kinds of hero', () => {
    // Two heroes is not something that renders twice — it is a state where
    // one manifest is read and the other silently is not, so the entry
    // nobody sees is the one that goes stale.
    const both = Object.keys(PAGE_HERO_FRAMES).filter((key) => key in PAGE_HERO_IMAGES)

    expect(both).toEqual([])
  })
})

describe('frame-wall heroes', () => {
  test('no two of them open on the same frames', () => {
    // The reason `PAGE_HERO_IMAGES` holds eight entries rather than one
    // reused eight times, applied to the pages that could not have eight: a
    // shared offset makes two walls identical, which is the repeated-room
    // failure with extra steps.
    const offsets = Object.values(PAGE_HERO_FRAMES).map((set) => set.offset)

    expect(new Set(offsets).size).toBe(offsets.length)
  })

  test('every wall is three frames that exist and do not repeat', () => {
    // The wall is cut for three and `PageHeroFrames` throws on any other
    // count. This is that assertion one layer earlier, where the failure
    // names the page rather than the component.
    const sources = new Set(SAMPLE_FRAMES.map((frame) => frame.src))

    for (const [page, set] of Object.entries(PAGE_HERO_FRAMES)) {
      const [wall = []] = allocateFrames([3], set.offset)

      expect(wall, page).toHaveLength(3)
      expect(new Set(wall.map((frame) => frame.src)).size, page).toBe(3)
      for (const frame of wall) {
        expect(sources.has(frame.src), `${page} → ${frame.src}`).toBe(true)
      }
    }
  })
})
