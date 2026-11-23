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

import { type ComparisonCorpus, judgeOriginality } from '../originality/gate'
import { ideaDraft } from '../scripts/video-idea'

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
 *
 * Split from the `SAMPLE_REPORT` export below for one reason: so the sample
 * can carry a **real** Originality Gate verdict rather than a hand-written
 * one. Each idea's `originality` is `null` here and is filled in by the gate.
 */
const SAMPLE_FINDINGS: NicheReportFindings = {
  topFormats: [
    {
      name: 'Myth vs fact',
      whyItWorks:
        'Names a belief the viewer already holds in the first second, so the correction is the reason to stay.',
      beats: ['State the myth', 'Say plainly that it is wrong', 'Give the fact', 'One-line CTA'],
      fit: 9,
      fitReason: 'Fit 9: the sample account answers the same question every week, which is the myth.',
    },
    {
      name: 'What this should cost',
      whyItWorks:
        'A price in the hook answers the question people are too polite to ask, and the answer is the whole video.',
      beats: ['Name the job', 'Give the range', 'Explain the spread', 'What changes it'],
      fit: 8,
      fitReason: 'Fit 8: the sample account publishes its prices, so the hook costs it nothing.',
    },
    {
      name: 'Three mistakes',
      whyItWorks:
        'A numbered promise sets the length expectation, so viewers who stay for one stay for all three.',
      beats: ['Promise the count', 'Mistake and fix, three times', 'Close on the easiest one'],
      fit: 7,
      fitReason: 'Fit 7: needs three mistakes worth naming, and the sample account has two.',
    },
  ],
  // Every claim carries where it came from, and the sample shows both kinds
  // on purpose: a screen built only against `posts` would never render the
  // "industry guidance" tag until a real scan produced one.
  topHooks: [
    { text: 'Stop doing X if you want Y', basis: 'posts', brandRisk: null },
    { text: 'Nobody tells you this about …', basis: 'posts', brandRisk: null },
    {
      text: 'This should cost about $N — here is why yours was more',
      basis: 'posts',
      brandRisk: null,
    },
    { text: 'I was wrong about …', basis: 'guidance', brandRisk: null },
  ],
  topics: [
    { text: 'What a first-time customer gets wrong', basis: 'posts', brandRisk: null },
    { text: 'Pricing, explained without a quote', basis: 'posts', brandRisk: null },
    { text: 'The question we answer every week', basis: 'guidance', brandRisk: null },
    {
      text: 'The argument this trade keeps having',
      basis: 'posts',
      // The sample carries one of these too, because the tag is the part of
      // the screen most likely to be built wrong and never seen.
      brandRisk: 'Taking a side here wins one half of the niche and loses the other.',
    },
  ],
  lengths: [
    {
      secondsMin: 15,
      secondsMax: 22,
      note: 'Hook-led single point. The most reliable length in this niche.',
      basis: 'posts',
    },
    {
      secondsMin: 28,
      secondsMax: 38,
      note: 'Enough for three beats without losing the back half.',
      basis: 'posts',
    },
    {
      secondsMin: 45,
      secondsMax: 60,
      note: 'Works only when the payoff is visual.',
      basis: 'guidance',
    },
  ],
  postingPatterns: [
    { text: 'One to two a day, every weekday', basis: 'guidance', brandRisk: null },
    { text: 'Strongest window is late afternoon, local time', basis: 'guidance', brandRisk: null },
    {
      text: 'Series beat one-offs: the same format three times a week outperforms three formats once',
      basis: 'posts',
      brandRisk: null,
    },
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
  // Shaped like a real source list — a title, a domain and a kind — so the
  // screen built against it does not break on the real thing. The domain is
  // `example.com` for the same reason the examples are: a canned source
  // naming a real publication would be a claim nobody checked.
  sourcesUsed: [
    {
      title: 'Sample data — no sources were consulted',
      url: 'https://example.com/sample-source',
      domain: 'example.com',
      kind: 'guide',
    },
  ],
  /*
   * The sample ends where a real report ends (V2): three things to film.
   *
   * Written against the generic sample business rather than a trade, for the
   * same reason the formats are — and each one carries a `fact`, because a
   * sample that skipped the field the gate checks would let the screen be
   * built against a shape the real thing cannot have.
   */
  firstVideos: [
    {
      title: 'The thing people ask before they book',
      formatName: 'Myth vs fact',
      hook: 'Everyone asks me this before they book, and the answer surprises them.',
      beats: [
        { label: 'Hook', text: 'Say the question out loud, in their words.' },
        { label: 'Setup', text: 'Explain why people believe the opposite.' },
        { label: 'Payoff', text: 'Give the real answer, with one example from this week.' },
        { label: 'Call to action', text: 'Tell them where to ask the follow-up.' },
      ],
      footage: [
        'You talking to camera, somewhere quiet, phone at eye level',
        'One shot of the thing you are describing',
      ],
      fact: 'Sample business — the fact would come from your profile',
      // Filled in by the real gate in `SAMPLE_REPORT` below.
      originality: null,
    },
    {
      title: 'What this actually costs',
      formatName: 'What this should cost',
      hook: 'Here is what this costs, and what changes the number.',
      beats: [
        { label: 'Hook', text: 'Open on the price range, said plainly.' },
        { label: 'Setup', text: 'Name the two things that move it.' },
        { label: 'Payoff', text: 'Show a real job at each end of the range.' },
        { label: 'Call to action', text: 'Say how someone finds out which one they are.' },
      ],
      footage: ['A job in progress', 'The finished result, same angle'],
      fact: 'Sample business — the fact would come from your profile',
      // Filled in by the real gate in `SAMPLE_REPORT` below.
      originality: null,
    },
    {
      title: 'Three things that go wrong first',
      formatName: 'Three mistakes',
      hook: 'Three things go wrong first, and the third is the expensive one.',
      beats: [
        { label: 'Hook', text: 'Promise the count in the first sentence.' },
        { label: 'Setup', text: 'Give the first two quickly, with the fix for each.' },
        { label: 'Payoff', text: 'Spend the back half on the one that costs money.' },
        { label: 'Call to action', text: 'Point at the easiest one to fix today.' },
      ],
      footage: ['Each mistake, on camera, ten seconds apiece'],
      fact: 'Sample business — the fact would come from your profile',
      // Filled in by the real gate in `SAMPLE_REPORT` below.
      originality: null,
    },
  ],
}

/**
 * The sample's three ideas, judged by the **real** gate (V3, D126).
 *
 * Not a hand-written verdict, for two reasons.
 *
 * **The sample is the screen most people see.** It is the one in the handoff
 * screenshots and the one most likely to reach a prospect, so the number on it
 * has to be a measurement rather than a decoration. A pleasing figure typed
 * into a fixture is exactly the kind of thing non-negotiable 7 exists to stop,
 * "Sample data" label or not.
 *
 * **It makes the sample prove the gate.** The ideas are compared against this
 * same sample's own research, so if somebody later edits a sample idea to echo
 * a sample example, the gate says so and `report.test.ts` fails. A fixture
 * that could not fail would tell us nothing.
 *
 * `judgeOriginality` is pure and deterministic, so this runs once at module
 * load and cannot vary between renders.
 */
const SAMPLE_CORPORA: readonly ComparisonCorpus[] = [
  {
    label: 'the research in your niche report',
    texts: [
      ...SAMPLE_FINDINGS.topFormats.flatMap((format) => [
        format.whyItWorks,
        ...format.beats,
      ]),
      ...SAMPLE_FINDINGS.examples.flatMap((example) => [
        example.whyItWorks,
        example.hookType,
      ]),
    ],
  },
  // Empty, and the verdict will say so. We do not hold the client's own posts
  // (B6), and a sample that implied we did would be advertising a check that
  // does not run. See `first-videos.ts` → `comparisonCorpora`.
  { label: 'your own last 90 posts', texts: [] },
]

export const SAMPLE_REPORT: NicheReportFindings = {
  ...SAMPLE_FINDINGS,
  firstVideos: SAMPLE_FINDINGS.firstVideos.map((idea) => ({
    ...idea,
    originality: judgeOriginality({
      draft: ideaDraft(idea),
      corpora: SAMPLE_CORPORA,
      attempt: 1,
    }),
  })),
}
