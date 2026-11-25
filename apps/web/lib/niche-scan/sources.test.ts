/**
 * Every accepted report lists its sources (D138).
 *
 * The run this is written from passed every other way: 157 seconds, 18
 * searches, formats and videos — and `sources=0` while the notes held
 * `pages=8`. The field was optional in the schema, so the model left it out.
 *
 * These tests run the merge through the *report parser* rather than only over
 * the object, because "the report has sources" is only true if `parseSources`
 * accepts them.
 */

import { describe, expect, test } from 'vitest'

import { parseNotes } from './notes'
import { reviewReport } from './report'
import { noteSourceRows, withNoteSources } from './sources'

const NOTES = parseNotes({
  formats: [
    {
      name: 'myth correction',
      howItGoes: 'claim on screen, then the correction to camera',
      whereSeen: ['https://www.tiktok.com/@trainer/video/123'],
      basis: 'posts',
    },
  ],
  hookNotes: [{ text: 'opens on the wrong belief', basis: 'posts' }],
  examples: [
    {
      url: 'https://www.instagram.com/p/abc123/',
      platform: 'instagram',
      formatName: 'myth correction',
      whatHappens: 'claim, then the correction',
      sourceNote: 'instagram search',
    },
  ],
  pages: [
    { title: 'Short video in 2026', url: 'https://example.com/guide', kind: 'guide' },
    { title: 'A trainer reel', url: 'https://www.instagram.com/p/abc123/', kind: 'post' },
  ],
  coverage: 'searched instagram and tiktok',
})

/** A minimal report the review accepts, as the model would return it. */
const REPLY = {
  topFormats: [
    {
      name: 'myth correction',
      whyItWorks: 'it opens on the belief the viewer already holds',
      beats: ['claim on screen', 'correction to camera', 'one tip'],
      fit: 8,
      fitReason: 'she already corrects reactive-dog myths in consultations',
    },
  ],
  topHooks: [{ text: 'name the wrong belief in the first second', basis: 'posts' }],
  topics: [{ text: 'leash reactivity', basis: 'posts' }],
  lengths: [
    { secondsMin: 20, secondsMax: 35, note: 'the shorter cuts held attention', basis: 'posts' },
  ],
  postingPatterns: [{ text: 'three to five posts a week', basis: 'guidance' }],
  examples: [
    {
      url: 'https://www.instagram.com/p/abc123/',
      platform: 'instagram',
      formatName: 'myth correction',
      whyItWorks: 'the claim is on screen before the first word',
      sourceNote: 'instagram search',
    },
  ],
}

describe('the rows the notes can account for', () => {
  test('pages come first, because they are the only rows with a real title', () => {
    // Act
    const rows = noteSourceRows(NOTES)

    // Assert
    expect(rows[0]).toEqual({
      title: 'Short video in 2026',
      url: 'https://example.com/guide',
      kind: 'guide',
    })
  })

  test('posts and the urls a format was read off are included', () => {
    const urls = noteSourceRows(NOTES).map((row) => row.url)

    expect(urls).toContain('https://www.instagram.com/p/abc123/')
    expect(urls).toContain('https://www.tiktok.com/@trainer/video/123')
  })

  test('a post row carries no title, because we read the post and not a page title', () => {
    const post = noteSourceRows(NOTES).find(
      (row) => row.url === 'https://www.tiktok.com/@trainer/video/123',
    )

    expect(post).toEqual({ url: 'https://www.tiktok.com/@trainer/video/123', kind: 'post' })
  })

  test('notes with no urls produce no rows', () => {
    const guidanceOnly = parseNotes({
      formats: [{ name: 'a', howItGoes: 'b', whereSeen: [], basis: 'guidance' }],
      coverage: 'no public posts found',
    })

    expect(noteSourceRows(guidanceOnly)).toHaveLength(0)
  })
})

describe('a report the model wrote without sources still has them', () => {
  test('the review accepts it and counts the sources', () => {
    // Arrange — exactly the failing shape: no `sourcesUsed` anywhere.
    expect('sourcesUsed' in REPLY).toBe(false)

    // Act
    const review = reviewReport(withNoteSources(REPLY, NOTES))

    // Assert
    expect(review.status).toBe('ok')
    expect(review.counts.sources).toBeGreaterThan(0)
  })

  test('they reach the findings, which is what the screen reads', () => {
    const review = reviewReport(withNoteSources(REPLY, NOTES))
    if (review.status !== 'ok') throw new Error('the fixture report should be accepted')

    const urls = review.report.findings.sourcesUsed.map((source) => source.url)

    expect(urls).toContain('https://example.com/guide')
    expect(urls).toContain('https://www.tiktok.com/@trainer/video/123')
  })

  test('a url in both the pages and the examples is listed once', () => {
    const review = reviewReport(withNoteSources(REPLY, NOTES))
    if (review.status !== 'ok') throw new Error('the fixture report should be accepted')

    const instagram = review.report.findings.sourcesUsed.filter(
      (source) => source.url === 'https://www.instagram.com/p/abc123/',
    )

    // Deduplicated by `parseSources`, and the titled row is the one kept.
    expect(instagram).toHaveLength(1)
    expect(instagram[0]?.title).toBe('A trainer reel')
  })

  test('sources the model did send are kept as well', () => {
    const withOwn = withNoteSources(
      {
        ...REPLY,
        sourcesUsed: [{ title: 'Its own find', url: 'https://example.org/post', kind: 'guide' }],
      },
      NOTES,
    )
    const review = reviewReport(withOwn)
    if (review.status !== 'ok') throw new Error('the fixture report should be accepted')

    expect(review.report.findings.sourcesUsed.map((source) => source.url)).toContain(
      'https://example.org/post',
    )
  })
})

describe('what the merge does not do', () => {
  test('a reply that is not an object comes back untouched', () => {
    expect(withNoteSources(null, NOTES)).toBeNull()
    expect(withNoteSources('not json', NOTES)).toBe('not json')
    expect(withNoteSources([1, 2], NOTES)).toEqual([1, 2])
  })

  test('it adds no sources when the notes hold none', () => {
    const guidanceOnly = parseNotes({ coverage: 'nothing public to link to' })
    const merged = withNoteSources(REPLY, guidanceOnly) as { sourcesUsed: readonly unknown[] }

    // Empty rather than invented: a niche with no linkable video is a finding,
    // and a source list is not somewhere to make one up.
    expect(merged.sourcesUsed).toHaveLength(0)
  })

  test('it does not touch the rest of the report', () => {
    const merged = withNoteSources(REPLY, NOTES) as { topFormats: readonly unknown[] }

    expect(merged.topFormats).toEqual(REPLY.topFormats)
  })
})
