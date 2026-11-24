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
  FIT_MAX,
  fitPercent,
  isStorableSourceUrl,
  normaliseFit,
  parseExample,
  reviewReport,
  parseSources,
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
    const review = reviewReport({
      topFormats: SAMPLE_REPORT.topFormats,
      topHooks: SAMPLE_REPORT.topHooks,
      topics: SAMPLE_REPORT.topics,
      lengths: SAMPLE_REPORT.lengths,
      postingPatterns: SAMPLE_REPORT.postingPatterns,
      examples: SAMPLE_REPORT.examples,
      sourcesUsed: SAMPLE_REPORT.sourcesUsed,
    })

    expect(review.status).toBe('ok')
    if (review.status !== 'ok') return
    expect(review.report.findings.topFormats).toHaveLength(3)
    expect(review.report.findings.examples).toHaveLength(3)
    expect(review.report.droppedExamples).toEqual([])
  })

  test('rejects a report with no formats and no examples', () => {
    // Not an empty report — *no* report. Rendering one would be a screen
    // claiming research happened. The rule is named now, so the log can say
    // which one fired (`report-review.test.ts` covers the names).
    expect(reviewReport({ topHooks: ['a hook'], topics: ['a topic'] }).status).toBe('rejected')
  })

  test('refuses a report whose formats are placeholder text', () => {
    // The `placeholder` run (D123): 297 seconds, 22 searches, and one format
    // named "placeholder" with no examples. Every field was a well-formed
    // string, so the original rule kept it and the job reported success.
    //
    // What catches it now is the *placeholder* rule rather than the
    // no-examples rule, which stopped being automatic — a real niche the open
    // web barely shows must still produce a report.
    expect(
      reviewReport({
        topFormats: [{ name: 'placeholder', whyItWorks: 'placeholder', fit: 0 }],
        examples: [],
      }).status,
    ).toBe('rejected')
  })

  test('rejects something that is not an object at all', () => {
    expect(reviewReport('a report, honestly').status).toBe('rejected')
    expect(reviewReport(null).status).toBe('rejected')
  })

  test('keeps a partial report, and reports what it threw away', () => {
    const review = reviewReport({
      topFormats: [{ name: 'Myth vs fact', whyItWorks: 'It works.', fit: 150 }],
      examples: [GOOD, { ...GOOD, url: 'https://cdn.example.com/a.mp4' }],
    })
    if (review.status !== 'ok') throw new Error('expected a report')
    const parsed = review.report

    expect(parsed.findings.examples).toHaveLength(1)
    expect(parsed.droppedExamples).toHaveLength(1)
    // 150 is not a fit score on any scale. Read as the 0–100 shape it most
    // resembles, then clamped — the format is still a finding, and the number
    // is the model's opinion of it rather than a reason to drop the row.
    expect(parsed.findings.topFormats[0]?.fit).toBe(FIT_MAX)
    expect(parsed.findings.topHooks).toEqual([])
  })

  test('a missing fit score reads as 0, not as a confident middle', () => {
    // `examples` is present because a report without one is no report at all
    // — see the `placeholder` run in D123.
    const review = reviewReport({
      topFormats: [{ name: 'Three mistakes', whyItWorks: 'The count sets expectations.' }],
      examples: [GOOD],
    })
    if (review.status !== 'ok') throw new Error('expected a report')

    expect(review.report.findings.topFormats[0]?.fit).toBe(0)
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

/**
 * The bug a prospect saw first (P0.2).
 *
 * The first live scan scored its three recommended formats 9, 8 and 7 — and
 * every one of them drew a bar that was all but empty, because the bar was
 * drawn against 100. The screen said "these are the three best formats for
 * you" in words and "these are terrible matches" in pixels, and the pixels
 * are what a reader believes.
 */
describe('a fit score means something beside its scale', () => {
  test('a 9 fills nine tenths of the bar, not a ninetieth', () => {
    expect(normaliseFit(9)).toBe(9)
    expect(fitPercent(normaliseFit(9))).toBe(90)
  })

  test('a 0–100 score written before the scale was fixed still reads right', () => {
    // The sample report and every row the first live scan wrote are on this
    // scale. 86 is a strong fit, and it has to stay one.
    expect(normaliseFit(86)).toBe(9)
    expect(fitPercent(normaliseFit(86))).toBe(90)
  })

  test('an impossible score is clamped, never rejected', () => {
    expect(normaliseFit(150)).toBe(FIT_MAX)
    expect(fitPercent(FIT_MAX)).toBe(100)
  })

  test('an absent score is 0 and draws nothing', () => {
    expect(normaliseFit(undefined)).toBe(0)
    expect(normaliseFit('a strong fit')).toBe(0)
    expect(normaliseFit(-4)).toBe(0)
    expect(fitPercent(0)).toBe(0)
  })

  test('a parsed format carries the normalised score', () => {
    const review = reviewReport({
      topFormats: [{ name: 'Myth vs fact', whyItWorks: 'It works.', fit: 78 }],
      examples: [GOOD],
    })
    if (review.status !== 'ok') throw new Error('expected a report')

    expect(review.report.findings.topFormats[0]?.fit).toBe(8)
  })
})

/**
 * Sources are an audit record, so they have to be readable as one (P0.5).
 *
 * `12 §1` makes `sources_used` the run-level half of the audit trail. It was
 * a list of bare urls printed semicolon-joined, which is a record only in the
 * sense that the bytes were kept.
 */
describe('a source is a page, with a name and a kind', () => {
  test('keeps the title, derives the domain and keeps the kind', () => {
    const sources = parseSources([
      {
        title: 'Top ads by industry',
        url: 'https://www.tiktok.com/business/creativecenter/top-ads',
        kind: 'post',
      },
    ])

    expect(sources).toEqual([
      {
        title: 'Top ads by industry',
        url: 'https://www.tiktok.com/business/creativecenter/top-ads',
        domain: 'tiktok.com',
        kind: 'post',
      },
    ])
  })

  test('a bare url from an older report becomes a guide, never evidence', () => {
    // The weaker of the two claims. A link we kept but cannot describe is not
    // a post we read a format off, and must not be shown as one.
    const sources = parseSources(['https://blog.example.com/short-video-guide'])

    expect(sources[0]?.kind).toBe('guide')
    expect(sources[0]?.domain).toBe('blog.example.com')
    expect(sources[0]?.title).toBe('blog.example.com')
  })

  test('an unknown kind is read as guidance rather than as evidence', () => {
    const sources = parseSources([
      { title: 'Something', url: 'https://example.com/a', kind: 'research' },
    ])

    expect(sources[0]?.kind).toBe('guide')
  })

  test('refuses a media file and a non-link, and deduplicates', () => {
    const sources = parseSources([
      { title: 'A clip', url: 'https://cdn.example.com/a.mp4', kind: 'post' },
      { title: 'Not a link', url: 'tiktok.com/@a', kind: 'post' },
      { title: 'A post', url: 'https://example.com/a', kind: 'post' },
      { title: 'The same post, twice', url: 'https://example.com/a', kind: 'post' },
    ])

    expect(sources).toHaveLength(1)
    expect(sources[0]?.url).toBe('https://example.com/a')
  })
})

describe('the sample is judged by the real gate (V3, D126)', () => {
  test('every sample idea passes, and the number is a measurement', () => {
    // The sample is the screen most likely to reach a prospect, so its
    // originality figure has to be the gate's own arithmetic rather than a
    // pleasing number typed into a fixture. `canned.ts` runs `judgeOriginality`
    // over the sample's ideas against the sample's own research; this is the
    // test that fails if somebody later edits an idea to echo an example.
    for (const idea of SAMPLE_REPORT.firstVideos) {
      expect(idea.originality?.outcome).toBe('passed')
      expect(idea.originality?.copiedSentences).toEqual([])
      expect(idea.originality?.similarity).toBeLessThanOrEqual(
        idea.originality?.limit ?? 0,
      )
    }
  })

  test('the sample does not claim a comparison we cannot make', () => {
    // We hold none of the client's own posts (B6), so the sample must report
    // that corpus as *not* compared. A sample implying otherwise would be
    // advertising a check that does not run — non-negotiable 7.
    for (const idea of SAMPLE_REPORT.firstVideos) {
      expect(idea.originality?.comparedAgainst).toContain(
        'the research in your niche report',
      )
      expect(idea.originality?.notComparedAgainst).toEqual([
        'your own last 90 posts',
      ])
    }
  })
})
