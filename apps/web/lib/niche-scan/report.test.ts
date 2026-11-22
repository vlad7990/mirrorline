/**
 * What we refuse to store as research (V1, §2.5, D115).
 *
 * The shape checks are table stakes. The two that carry weight are the ones
 * about **media** and about **links**, because they are where a model's
 * plausible-looking output would quietly become a breach of non-negotiable 1
 * or an unverifiable compliance record.
 *
 * Every case here is written as "given something a model might really
 * return", not as a contrived null — the realistic failure is a well-formed
 * object with one wrong field, not garbage.
 */

import { describe, expect, test } from 'vitest'

import { SAMPLE_REPORT } from './canned'
import {
  isStorableSourceUrl,
  parseExample,
  parseReport,
  rankExamples,
  type TrendExample,
} from './report'

/** A complete, valid example. Each test below breaks exactly one field of it. */
const GOOD = {
  url: 'https://www.tiktok.com/@example/video/0000000000',
  platform: 'tiktok',
  formatName: 'Myth vs fact',
  hookType: 'contrarian claim',
  lengthSeconds: 22,
  views: 48_000,
  viewsPerFollower: 9.6,
  accountSizeBucket: '1k_10k',
  postedAt: '2026-11-03',
  whyItWorks: 'The myth is on screen before the first word.',
  sourceNote: 'TikTok Creative Center, top ads by industry',
}

describe('we store the pointer, never the work', () => {
  test('keeps a link to a post', () => {
    expect(isStorableSourceUrl('https://www.instagram.com/p/abc123/')).toBe(true)
  })

  test.each([
    ['a direct video file', 'https://cdn.example.com/clips/stolen.mp4'],
    ['a video file with a query string', 'https://cdn.example.com/clips/stolen.mp4?token=x'],
    ['audio', 'https://cdn.example.com/audio/track.m4a'],
    ['an image', 'https://cdn.example.com/thumbs/frame.jpg'],
  ])('refuses %s, because that is the work and not a pointer', (_label, url) => {
    // Non-negotiable 1. Storing the link to a media file is a breach whether
    // or not we ever fetch it, so the url never reaches the database.
    expect(isStorableSourceUrl(url)).toBe(false)
  })

  test.each([
    ['a storage path', 'uploads/workspace-a/scraped.mp4'],
    ['a bare domain with no scheme', 'www.tiktok.com/@example/video/1'],
    ['something that is not a string', 42],
    ['an empty string', ''],
  ])('refuses %s', (_label, value) => {
    expect(isStorableSourceUrl(value)).toBe(false)
  })

  test('an example pointing at a media file is dropped, with a reason', () => {
    const result = parseExample({ ...GOOD, url: 'https://cdn.example.com/a.mp4' })

    expect(result.example).toBeNull()
    // The reason is logged rather than swallowed — a scan that silently
    // discarded half its findings would look like a thin niche.
    expect(result.dropped).toContain('media file')
  })

  test('an example with no source note is dropped', () => {
    // `12 §1` makes source_note the audit record. A row without one is a
    // finding nobody can trace.
    const withoutNote: Record<string, unknown> = { ...GOOD }
    delete withoutNote.sourceNote
    const result = parseExample(withoutNote)

    expect(result.example).toBeNull()
    expect(result.dropped).toContain('source note')
  })
})

describe('a well-formed example survives intact', () => {
  test('keeps every field 12 §1 asks for', () => {
    const { example } = parseExample(GOOD)

    expect(example).not.toBeNull()
    expect(example).toMatchObject({
      url: GOOD.url,
      platform: 'tiktok',
      formatName: 'Myth vs fact',
      accountSizeBucket: '1k_10k',
      postedAt: '2026-11-03',
      viewsPerFollower: 9.6,
      sourceNote: GOOD.sourceNote,
    })
  })

  test('accepts snake_case too, because a model returns either', () => {
    const { example } = parseExample({
      url: GOOD.url,
      platform: 'tiktok',
      format_name: 'Three mistakes',
      hook_type: 'specific number',
      source_note: 'YouTube Data API search',
      why_it_works: 'The count sets the expectation.',
      account_size_bucket: 'under_1k',
      posted_at: '2026-10-28',
      views_per_follower: 2.8,
    })

    expect(example?.formatName).toBe('Three mistakes')
    expect(example?.accountSizeBucket).toBe('under_1k')
    expect(example?.viewsPerFollower).toBe(2.8)
  })

  test('drops an invented account-size bucket to null rather than storing it', () => {
    // The database would refuse `enormous` with a check violation. Nulling it
    // here keeps the rest of a good example instead of losing the row.
    const { example } = parseExample({ ...GOOD, accountSizeBucket: 'enormous' })

    expect(example).not.toBeNull()
    expect(example?.accountSizeBucket).toBeNull()
  })

  test('refuses a date that is not ISO, rather than half-parsing it', () => {
    const { example } = parseExample({ ...GOOD, postedAt: '3 November' })

    expect(example?.postedAt).toBeNull()
  })

  test('refuses a platform we do not support', () => {
    const result = parseExample({ ...GOOD, platform: 'threads' })

    expect(result.example).toBeNull()
    expect(result.dropped).toContain('platform')
  })
})

describe('a report is a report, or it is nothing', () => {
  test('the canned report parses, which keeps the sample honest', () => {
    // If the sample stopped satisfying the parser, the screen would be built
    // against a shape the real thing can never have.
    const parsed = parseReport({
      topFormats: SAMPLE_REPORT.topFormats,
      topHooks: SAMPLE_REPORT.topHooks,
      topics: SAMPLE_REPORT.topics,
      lengths: SAMPLE_REPORT.lengths,
      postingPatterns: SAMPLE_REPORT.postingPatterns,
      examples: SAMPLE_REPORT.examples,
      sourcesUsed: SAMPLE_REPORT.sourcesUsed,
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.findings.topFormats).toHaveLength(3)
    expect(parsed?.findings.examples).toHaveLength(3)
    expect(parsed?.droppedExamples).toEqual([])
  })

  test('returns null when there are no formats and no examples', () => {
    // Not an empty report — *no* report. Rendering one would be a screen
    // claiming research happened.
    expect(parseReport({ topHooks: ['a hook'], topics: ['a topic'] })).toBeNull()
  })

  test('returns null for something that is not an object at all', () => {
    expect(parseReport('a report, honestly')).toBeNull()
    expect(parseReport(null)).toBeNull()
  })

  test('keeps a partial report, and reports what it threw away', () => {
    const parsed = parseReport({
      topFormats: [{ name: 'Myth vs fact', whyItWorks: 'It works.', fit: 150 }],
      examples: [GOOD, { ...GOOD, url: 'https://cdn.example.com/a.mp4' }],
    })

    expect(parsed?.findings.examples).toHaveLength(1)
    expect(parsed?.droppedExamples).toHaveLength(1)
    // 150 is not a fit score. Clamped rather than rejected — the format is
    // still a finding, and the number is the model's opinion of it.
    expect(parsed?.findings.topFormats[0]?.fit).toBe(100)
    expect(parsed?.findings.topHooks).toEqual([])
  })

  test('a missing fit score reads as 0, not as a confident middle', () => {
    const parsed = parseReport({
      topFormats: [{ name: 'Three mistakes', whyItWorks: 'The count sets expectations.' }],
    })

    expect(parsed?.findings.topFormats[0]?.fit).toBe(0)
  })
})

describe('ranking is views per follower, never raw views', () => {
  function example(partial: Partial<TrendExample>): TrendExample {
    return { ...(parseExample(GOOD).example as TrendExample), ...partial }
  }

  test('a small high-ratio account outranks a coasting large one', () => {
    // `12 §1`'s own example: 4k followers at 40k views beats 2M coasting.
    const coaster = example({ url: 'https://example.com/a', views: 2_000_000, viewsPerFollower: 1 })
    const small = example({ url: 'https://example.com/b', views: 40_000, viewsPerFollower: 10 })

    const ranked = rankExamples([coaster, small])

    expect(ranked[0]?.url).toBe('https://example.com/b')
  })

  test('an unmeasured ratio sorts last rather than as zero', () => {
    const measured = example({ url: 'https://example.com/a', viewsPerFollower: 0.2 })
    const unmeasured = example({ url: 'https://example.com/b', viewsPerFollower: null })

    const ranked = rankExamples([unmeasured, measured])

    expect(ranked[0]?.url).toBe('https://example.com/a')
    expect(ranked[1]?.viewsPerFollower).toBeNull()
  })

  test('does not mutate what it was given', () => {
    const input = [
      example({ url: 'https://example.com/a', viewsPerFollower: 1 }),
      example({ url: 'https://example.com/b', viewsPerFollower: 9 }),
    ]

    rankExamples(input)

    expect(input[0]?.url).toBe('https://example.com/a')
  })
})
