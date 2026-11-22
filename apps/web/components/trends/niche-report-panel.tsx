/**
 * The niche report, on the S4 Niche Scan screen (V1, §2.5).
 *
 * The five findings `§2.5` asks for — top formats, hooks, topics, lengths,
 * posting patterns — and the examples they were read from.
 *
 * ## Three states, and they must not look alike
 *
 * 1. **A real report.** Rendered plainly, with no sample label.
 * 2. **The sample.** Rendered with "Sample data" at the top, because this is
 *    the artefact somebody would screenshot and send to a prospect and
 *    non-negotiable 7 says demo data is labelled. The label is a heading, not
 *    a footnote.
 * 3. **Could not read.** Handled by the page, which says so. An error must
 *    never render as "no formats found" — that reads as a statement about the
 *    client's niche rather than about our request.
 *
 * ## Every example is a link out, and nothing else
 *
 * No thumbnail, no embed, no preview — `url` plus a description plus the
 * source note (D115, non-negotiable 1). We hold the pointer, never the work,
 * and a screen that rendered a frame of somebody else's video would make that
 * false no matter what the database stored.
 */

import { Card, Eyebrow } from '@mirrorline/ui'
import { ExternalLink } from 'lucide-react'

// The one way the "Sample data" label gets drawn, per its own header: "so it
// reads the same everywhere and is easy to audit". A second badge for the
// same rule is how non-negotiable 7 starts being enforced inconsistently.
import { SampleDataLabel } from '@/components/marketing/primitives'
import { SAMPLE_REPORT_NOTE } from '@/lib/niche-scan/canned'
import { rankExamples, type NicheReportFindings, type TrendExample } from '@/lib/niche-scan/report'

const BUCKET_LABELS: Record<string, string> = {
  under_1k: 'under 1k followers',
  '1k_10k': '1k–10k followers',
  '10k_100k': '10k–100k followers',
  '100k_1m': '100k–1M followers',
  over_1m: 'over 1M followers',
}

interface NicheReportPanelProps {
  readonly findings: NicheReportFindings
  /** True when this is `SAMPLE_REPORT`. Drives the label, nothing else. */
  readonly isSample: boolean
  readonly niche?: string
  readonly scannedAt?: string | null
}

function ListCard({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null

  return (
    <Card className="p-5">
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span aria-hidden="true" className="select-none text-gold-600">
              ·
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * One example: a link, why it works, and where we looked.
 *
 * `rel="noopener noreferrer"` with `target="_blank"` because these are other
 * people's posts on other people's platforms — we send the client away to
 * look rather than bringing anything in.
 */
function ExampleRow({ example }: { example: TrendExample }) {
  const ratio = example.viewsPerFollower

  return (
    <li className="border-t border-ink-100 py-4 first:border-t-0 first:pt-0 dark:border-ink-800">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-ink-900 dark:text-ink-100">
          {example.formatName}
        </span>
        <span className="text-xs uppercase tracking-wide text-ink-500">{example.platform}</span>
        {example.accountSizeBucket ? (
          <span className="text-xs text-ink-500">
            {BUCKET_LABELS[example.accountSizeBucket] ?? example.accountSizeBucket}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-ink-700 dark:text-ink-300">{example.whyItWorks}</p>

      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-600 dark:text-ink-400">
        {/*
          Views per follower leads, and raw views are deliberately absent:
          12 §1 ranks on the ratio, and putting the big number first is how a
          coasting account starts looking like a model worth copying.
        */}
        <div>
          <dt className="inline">Views per follower: </dt>
          <dd className="inline font-medium">
            {ratio === null ? 'Not measured yet' : ratio.toFixed(1)}
          </dd>
        </div>
        {example.lengthSeconds === null ? null : (
          <div>
            <dt className="inline">Length: </dt>
            <dd className="inline">{example.lengthSeconds}s</dd>
          </div>
        )}
        <div>
          <dt className="inline">Hook: </dt>
          <dd className="inline">{example.hookType}</dd>
        </div>
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a
          className="inline-flex items-center gap-1 font-medium text-gold-700 underline decoration-gold-300 underline-offset-2 hover:decoration-gold-600 dark:text-gold-400"
          href={example.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open the post
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        {/* The audit record, on the screen rather than only in the table. */}
        <span className="text-ink-500">Source: {example.sourceNote}</span>
      </div>
    </li>
  )
}

export function NicheReportPanel({ findings, isSample, niche, scannedAt }: NicheReportPanelProps) {
  const examples = rankExamples(findings.examples)

  return (
    <section aria-labelledby="niche-report-heading" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2
          className="text-lg font-medium text-ink-900 dark:text-ink-100"
          id="niche-report-heading"
        >
          {niche ? `What is working in ${niche}` : 'What is working in this niche'}
        </h2>
        {isSample ? <SampleDataLabel /> : null}
        {scannedAt ? (
          <span className="text-xs text-ink-500">
            Scanned {new Date(scannedAt).toLocaleDateString('en-GB')}
          </span>
        ) : null}
      </div>

      {isSample ? (
        <p className="max-w-prose text-sm text-ink-600 dark:text-ink-400">{SAMPLE_REPORT_NOTE}</p>
      ) : null}

      {findings.topFormats.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {findings.topFormats.map((format) => (
            <Card className="p-5" key={format.name}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium text-ink-900 dark:text-ink-100">
                  {format.name}
                </h3>
                {/*
                  A fit of 0 means the scan did not score it, not that it is a
                  bad fit — so it reads as unscored rather than as a zero.
                */}
                <span className="shrink-0 text-xs text-ink-500">
                  {format.fit === 0 ? 'Not scored' : `Fit ${format.fit}`}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-700 dark:text-ink-300">{format.whyItWorks}</p>
              {format.beats.length > 0 ? (
                <ol className="mt-3 space-y-1 text-xs text-ink-600 dark:text-ink-400">
                  {format.beats.map((beat, index) => (
                    <li key={beat}>
                      {index + 1}. {beat}
                    </li>
                  ))}
                </ol>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <ListCard items={findings.topHooks} title="Hooks that are working" />
        <ListCard items={findings.topics} title="Topics" />
        <ListCard items={findings.postingPatterns} title="Posting patterns" />
      </div>

      {findings.lengths.length > 0 ? (
        <Card className="p-5">
          <Eyebrow>Lengths</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300">
            {findings.lengths.map((length) => (
              <li key={length.seconds}>
                <span className="font-medium">{length.seconds}s</span> — {length.note}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {examples.length > 0 ? (
        <Card className="p-5">
          <Eyebrow>Examples, ranked by views per follower</Eyebrow>
          <p className="mt-2 max-w-prose text-xs text-ink-500">
            Links to public posts. We keep the link and the description of the format, never the
            video or the audio.
          </p>
          <ul className="mt-4">
            {examples.map((example) => (
              <ExampleRow example={example} key={example.url} />
            ))}
          </ul>
        </Card>
      ) : null}

      {findings.sourcesUsed.length > 0 ? (
        <p className="text-xs text-ink-500">Sources: {findings.sourcesUsed.join('; ')}</p>
      ) : null}
    </section>
  )
}
