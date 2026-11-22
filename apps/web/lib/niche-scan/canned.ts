/**
 * The report the scan returns with no API key (V1, §2.5).
 *
 * `18 §4`'s rule, one agent along: **"`ANTHROPIC_API_KEY` missing is a
 * supported mode, not an error."** Every surface answers, every test passes,
 * and the UI says it is a sample. That is what lets V1 be built, reviewed and
 * previewed before a key is wired, and what lets the e2e suite run without
 * spending anything.
 *
 * ## It is labelled, and that is not decoration
 *
 * Non-negotiable 7: "Demo data is labelled 'Sample data'". A niche report is
 * exactly the artefact somebody would screenshot and send to a prospect, so
 * an unlabelled sample is the single most likely way we would accidentally
 * show invented research as real. The caller is told it is a sample and the
 * screen renders the label.
 *
 * ## The examples point at example.com, deliberately
 *
 * Not at real posts. A canned report naming real accounts would be a claim
 * about those accounts that nobody researched, and it would also be the kind
 * of thing that ends up in a screenshot. `example.com` cannot be mistaken for
 * a finding.
 */

import type { NicheReportFindings } from './report'

/** Shown wherever a canned report is rendered. Non-negotiable 7. */
export const SAMPLE_REPORT_LABEL = 'Sample data'

export const SAMPLE_REPORT_NOTE =
  'This is a sample report, not research about your account. Run a scan to replace it.'

/**
 * A plausible report for a niche nobody named.
 *
 * Written to be *shaped* like a real one — the same five findings, examples
 * with source notes and ratios — so that a screen built against it does not
 * then break on the real thing. The content is generic on purpose: the
 * product is industry-agnostic (CLAUDE.md), so the sample must not read as
 * advice for one trade.
 */
export const SAMPLE_REPORT: NicheReportFindings = {
  topFormats: [
    {
      name: 'Myth vs fact',
      whyItWorks:
        'Names a belief the viewer already holds in the first second, so the correction is the reason to stay.',
      beats: ['State the myth', 'Say plainly that it is wrong', 'Give the fact', 'One-line CTA'],
      fit: 86,
    },
    {
      name: 'What this should cost',
      whyItWorks:
        'A price in the hook answers the question people are too polite to ask, and the answer is the whole video.',
      beats: ['Name the job', 'Give the range', 'Explain the spread', 'What changes it'],
      fit: 78,
    },
    {
      name: 'Three mistakes',
      whyItWorks:
        'A numbered promise sets the length expectation, so viewers who stay for one stay for all three.',
      beats: ['Promise the count', 'Mistake and fix, three times', 'Close on the easiest one'],
      fit: 71,
    },
  ],
  topHooks: [
    'Stop doing X if you want Y',
    'Nobody tells you this about …',
    'This should cost about $N — here is why yours was more',
    'I was wrong about …',
  ],
  topics: [
    'What a first-time customer gets wrong',
    'Pricing, explained without a quote',
    'The question we answer every week',
    'Before and after, with the work shown',
  ],
  lengths: [
    { seconds: 18, note: 'Hook-led single point. The most reliable length in this niche.' },
    { seconds: 32, note: 'Enough for three beats without losing the back half.' },
    { seconds: 55, note: 'Works only when the payoff is visual.' },
  ],
  postingPatterns: [
    'One to two a day, every weekday',
    'Strongest window is late afternoon, local time',
    'Series beat one-offs: the same format three times a week outperforms three formats once',
  ],
  examples: [
    {
      url: 'https://example.com/post/sample-myth-vs-fact',
      platform: 'tiktok',
      formatName: 'Myth vs fact',
      hookType: 'contrarian claim',
      lengthSeconds: 19,
      views: 41_000,
      viewsPerFollower: 9.1,
      accountSizeBucket: '1k_10k',
      postedAt: '2026-11-04',
      whyItWorks: 'The myth is on screen as text before the first word is spoken.',
      sourceNote: 'Sample data — not a real source',
    },
    {
      url: 'https://example.com/post/sample-what-this-costs',
      platform: 'instagram',
      formatName: 'What this should cost',
      hookType: 'price reveal',
      lengthSeconds: 27,
      views: 63_000,
      viewsPerFollower: 4.4,
      accountSizeBucket: '10k_100k',
      postedAt: '2026-11-09',
      whyItWorks: 'Opens on the number, then earns it.',
      sourceNote: 'Sample data — not a real source',
    },
    {
      url: 'https://example.com/post/sample-three-mistakes',
      platform: 'youtube',
      formatName: 'Three mistakes',
      hookType: 'specific number',
      lengthSeconds: 44,
      views: 22_000,
      viewsPerFollower: 2.8,
      accountSizeBucket: 'under_1k',
      postedAt: '2026-10-28',
      whyItWorks: 'Small account, high ratio — the format is doing the work, not the following.',
      sourceNote: 'Sample data — not a real source',
    },
  ],
  sourcesUsed: ['Sample data — no sources were consulted'],
}
