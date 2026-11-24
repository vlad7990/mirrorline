/**
 * Why a report was rejected, and the one case that must stop being a rejection.
 *
 * The first live production scan failed after 829 seconds and 41 searches with
 * nothing in the log but "The scan did not come back with a usable report."
 * That sentence is true and useless: it cannot tell you whether the model
 * returned placeholders, whether the niche is thin, or whether a schema field
 * was wrong. These tests pin a named rule and a set of counts for every
 * rejection, so the next failure is diagnosable from Railway alone.
 *
 * They also pin the distinction the same incident exposed. `examples.length
 * === 0` was an automatic rejection (D123 addendum). That is right when the
 * model has answered the schema instead of the question, and wrong when the
 * open web genuinely holds few public posts for a real niche — the second is a
 * finding, not a failure, and it ships with a caveat rather than a dead end.
 */

import { describe, expect, it } from 'vitest'

import { reviewReport } from './report'

/** The smallest thing that should count as real research. */
const SUBSTANTIVE = {
  topFormats: [
    {
      name: 'Myth vs fact',
      whyItWorks:
        'Names a belief the viewer already holds, so the correction is the reason to stay.',
      beats: ['State the myth', 'Say it is wrong', 'Give the fact', 'One-line CTA'],
      fit: 8,
      fitReason: 'Fit 8: this account answers the same question every week.',
    },
  ],
  topHooks: [{ text: 'Stop doing X if you want Y', basis: 'posts' }],
  topics: [{ text: 'What a first-time customer gets wrong', basis: 'posts' }],
  lengths: [{ secondsMin: 15, secondsMax: 22, note: 'Hook-led single point.', basis: 'posts' }],
  postingPatterns: [{ text: 'One to two a day', basis: 'guidance' }],
  sourcesUsed: [{ title: 'A guide to the niche', url: 'https://example.com/guide', kind: 'guide' }],
}

const ONE_EXAMPLE = {
  url: 'https://example.com/post/one',
  platform: 'tiktok',
  formatName: 'Myth vs fact',
  hookType: 'contrarian claim',
  lengthSeconds: 19,
  views: 41_000,
  viewsPerFollower: 9.1,
  accountSizeBucket: '1k_10k',
  postedAt: '2026-11-04',
  whyItWorks: 'The myth is on screen before the first word.',
  sourceNote: 'Read off the post',
}

describe('a report with evidence under it', () => {
  it('is accepted, with no caveat', () => {
    // Act
    const review = reviewReport({ ...SUBSTANTIVE, examples: [ONE_EXAMPLE] })

    // Assert
    expect(review.status).toBe('ok')
    if (review.status !== 'ok') return
    expect(review.caveat).toBeNull()
    expect(review.report.findings.examples).toHaveLength(1)
  })

  it('counts what it saw, so the log can say so', () => {
    // Act
    const review = reviewReport({ ...SUBSTANTIVE, examples: [ONE_EXAMPLE] })

    // Assert
    expect(review.counts).toMatchObject({
      formats: 1,
      hooks: 1,
      topics: 1,
      lengths: 1,
      postingPatterns: 1,
      examplesOffered: 1,
      examplesKept: 1,
      examplesDropped: 0,
      sources: 1,
    })
  })
})

describe('the model answered the schema instead of the question', () => {
  it('rejects placeholder text, and names the rule', () => {
    // Arrange: the exact shape of the run that got through before the D123
    // addendum — well-formed strings, no research in them.
    const review = reviewReport({
      topFormats: [
        {
          name: 'placeholder',
          whyItWorks: 'placeholder',
          beats: ['placeholder', 'placeholder', 'placeholder'],
          fit: 5,
          fitReason: 'placeholder',
        },
      ],
      examples: [],
    })

    // Assert
    expect(review.status).toBe('rejected')
    if (review.status !== 'rejected') return
    expect(review.rejection.rule).toBe('placeholder-text')
  })

  it('names which patterns it matched, so the prompt can be fixed', () => {
    // Act
    const review = reviewReport({
      topFormats: [
        { name: 'TBD', whyItWorks: 'lorem ipsum dolor sit amet', beats: ['a', 'b', 'c'] },
      ],
      examples: [],
    })

    // Assert: our own matcher's names, never the model's text.
    if (review.status !== 'rejected') throw new Error('expected a rejection')
    if (review.rejection.rule !== 'placeholder-text') {
      throw new Error(`expected placeholder-text, got ${review.rejection.rule}`)
    }
    expect(review.rejection.patterns.length).toBeGreaterThan(0)
  })

  it('rejects a report that is not an object at all', () => {
    for (const value of ['a report, honestly', null, 42]) {
      const review = reviewReport(value)
      expect(review.status).toBe('rejected')
      if (review.status !== 'rejected') continue
      expect(review.rejection.rule).toBe('not-an-object')
    }
  })

  it('rejects a report with nothing substantive in it', () => {
    // Arrange: two bare claims and nothing else. Real strings, no research.
    const review = reviewReport({ topHooks: ['a hook'], topics: ['a topic'] })

    // Assert
    expect(review.status).toBe('rejected')
    if (review.status !== 'rejected') return
    expect(review.rejection.rule).toBe('nothing-substantive')
  })

  it('does not call a real report placeholder because one word matched', () => {
    // Arrange: "TBD" inside a real sentence is not a placeholder report. The
    // matcher looks at whether a *field* is a placeholder, not whether a token
    // appears anywhere — otherwise a legitimate finding about pricing would
    // reject the whole scan.
    const review = reviewReport({
      ...SUBSTANTIVE,
      topics: [{ text: 'Why the price is TBD until you have seen the job', basis: 'posts' }],
      examples: [ONE_EXAMPLE],
    })

    // Assert
    expect(review.status).toBe('ok')
  })
})

describe('a real niche the open web barely shows', () => {
  it('still produces a report, with an honest caveat', () => {
    // Arrange: substantive findings, no public post examples. This is the case
    // that used to fail outright and must not — "few web-visible posts" is a
    // finding about the niche, not a failure of the scan.
    const review = reviewReport({ ...SUBSTANTIVE, examples: [] })

    // Assert
    expect(review.status).toBe('ok')
    if (review.status !== 'ok') return
    expect(review.caveat).toBeTruthy()
    expect(review.caveat).toMatch(/public post/i)
  })

  it('tags every claim as guidance, because no post evidence is in the report', () => {
    // Arrange: the fixture claims `posts` basis on hooks, topics and lengths.
    // With nothing underneath them that tag is a claim we cannot support —
    // D121's rule that the scan says only what it measured.
    const review = reviewReport({ ...SUBSTANTIVE, examples: [] })

    // Assert
    if (review.status !== 'ok') throw new Error('expected a report')
    const { findings } = review.report
    for (const claim of [...findings.topHooks, ...findings.topics, ...findings.postingPatterns]) {
      expect(claim.basis).toBe('guidance')
    }
    for (const length of findings.lengths) {
      expect(length.basis).toBe('guidance')
    }
  })

  it('leaves the tags alone when there is evidence', () => {
    // Act
    const review = reviewReport({ ...SUBSTANTIVE, examples: [ONE_EXAMPLE] })

    // Assert
    if (review.status !== 'ok') throw new Error('expected a report')
    expect(review.report.findings.topHooks[0]?.basis).toBe('posts')
  })

  it('carries the caveat into the findings, so the screen can print it', () => {
    // Act
    const review = reviewReport({ ...SUBSTANTIVE, examples: [] })

    // Assert: on the findings rather than only in the return value, because
    // the findings are what gets stored and re-read.
    if (review.status !== 'ok') throw new Error('expected a report')
    expect(review.report.findings.evidenceCaveat).toBe(review.caveat)
  })

  it('is still rejected when the thin report is also placeholder', () => {
    // Arrange: thinness is not a licence to ship nonsense.
    const review = reviewReport({
      topFormats: [{ name: 'placeholder', whyItWorks: 'placeholder', beats: ['a', 'b', 'c'] }],
      topHooks: [{ text: 'placeholder', basis: 'guidance' }],
      examples: [],
    })

    // Assert
    expect(review.status).toBe('rejected')
  })
})

describe('the counts are reported on a rejection too', () => {
  it('says how many examples were offered and how many survived', () => {
    // Arrange: three offered, all unusable — a media file, a bare handle and a
    // non-url. "Offered 3, kept 0" is a different diagnosis from "offered 0".
    const review = reviewReport({
      topFormats: [],
      topHooks: [],
      topics: [],
      lengths: [],
      postingPatterns: [],
      sourcesUsed: [],
      examples: [
        { ...ONE_EXAMPLE, url: 'https://cdn.example.com/clip.mp4' },
        { ...ONE_EXAMPLE, url: 'tiktok.com/@someone' },
        { ...ONE_EXAMPLE, url: 'not a url at all' },
      ],
    })

    // Assert
    expect(review.status).toBe('rejected')
    expect(review.counts.examplesOffered).toBe(3)
    expect(review.counts.examplesKept).toBe(0)
    expect(review.counts.examplesDropped).toBeGreaterThan(0)
  })
})
