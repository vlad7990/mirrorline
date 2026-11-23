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

import { Card, Eyebrow, ProgressBar, StoryboardFrames } from '@mirrorline/ui'
import { ExternalLink } from 'lucide-react'

// The one way the "Sample data" label gets drawn, per its own header: "so it
// reads the same everywhere and is easy to audit". A second badge for the
// same rule is how non-negotiable 7 starts being enforced inconsistently.
import { SampleDataLabel } from '@/components/marketing/primitives'
import { PrintButton } from '@/components/studio/print-button'
import { storyboardFromBeats } from '@/components/trends/trend-beats'
import { SAMPLE_REPORT_NOTE } from '@/lib/niche-scan/canned'
import {
  FIT_MAX,
  rankExamples,
  type FormatFinding,
  type NicheReportFindings,
  type ReportSource,
  type TrendExample,
} from '@/lib/niche-scan/report'

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
      <ul className="mt-3 space-y-2 text-body text-text">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span aria-hidden="true" className="select-none text-accent">
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
 * One format: the recipe, its fit, and the beats that get remade.
 *
 * **This is the only format view on the screen now (P0.4).** There used to be
 * two: this grid, and a second board of `TrendCard`s below the report built
 * from the same rows — with its own filter bar, its own fit bar and its own
 * storyboard. A reader counted six formats at the top and three at the bottom
 * and had no way to know they were the same research. The board's two good
 * parts, the storyboard and the fit bar, moved up here; the rest went.
 *
 * The storyboard carries the beat *names* and the list under it carries the
 * beats in full — see `frameLabel`. Four sentences in four 9:16 frames is
 * what the duplicate board was doing, and it overflowed every one of them.
 */
function FormatCard({ format }: { format: FormatFinding }) {
  const isScored = format.fit > 0
  const fitLabel = `Fit for this account: ${format.fit} out of ${FIT_MAX}`

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-body font-medium text-text">{format.name}</h3>
        {/*
          A fit of 0 means the scan did not score it, not that it scored badly
          — so it reads as unscored rather than as a zero. The scale is printed
          beside the number, because "Fit 9" alone was read against a 100-point
          bar for a week and looked like a terrible match.
        */}
        <span className="shrink-0 text-meta text-text-muted">
          {isScored ? (
            <>
              Fit <span className="machine text-text">{format.fit}</span>/{FIT_MAX}
            </>
          ) : (
            'Not scored'
          )}
        </span>
      </div>

      {isScored ? (
        <ProgressBar
          value={format.fit}
          max={FIT_MAX}
          label={fitLabel}
          valueText={`${format.fit} out of ${FIT_MAX}`}
        />
      ) : null}

      <p className="m-0 text-body text-text">{format.whyItWorks}</p>

      {format.beats.length > 0 ? (
        <>
          <StoryboardFrames
            beats={storyboardFromBeats(format.beats)}
            label={`Beats of ${format.name}`}
          />
          <ol className="m-0 list-none space-y-1 p-0 text-meta text-text-muted">
            {format.beats.map((beat, index) => (
              <li key={beat}>
                {index + 1}. {beat}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </Card>
  )
}

/**
 * The sources, numbered, named and tagged (P0.5).
 *
 * This was `sourcesUsed.join('; ')` — four wrapped lines of raw `https://…`
 * under the word "Sources". It satisfied `12 §1` as a database record and
 * failed it as a document: nobody can audit a list they cannot read.
 *
 * The **post / guide** tag is the part that is not presentation. A post is
 * evidence that a format is working in this niche; a guide is an article
 * about the niche, which is industry guidance and nothing more (`15
 * §honesty rules`). Printing them as one undifferentiated list quietly
 * promotes the second to the first.
 */
const SOURCE_KIND_LABELS: Record<ReportSource['kind'], string> = {
  post: 'post',
  guide: 'guide',
}

function SourceList({ sources }: { sources: readonly ReportSource[] }) {
  return (
    <Card className="p-5">
      <Eyebrow>Sources</Eyebrow>
      <p className="mt-2 max-w-prose text-meta text-text-muted">
        Every page this scan read. A <strong className="font-medium">post</strong> is a public post
        we read a format off; a <strong className="font-medium">guide</strong> is an article about
        the niche — industry guidance, not evidence that a format is working.
      </p>
      <ol className="mt-3 space-y-2 text-meta text-text-muted">
        {sources.map((source, index) => (
          <li className="flex gap-2" key={source.url}>
            <span className="machine shrink-0 text-text-muted">{index + 1}.</span>
            <span className="min-w-0">
              <a
                className="font-medium text-primary underline underline-offset-4 dark:text-accent"
                href={source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {source.title}
              </a>{' '}
              <span className="text-text-muted">{source.domain}</span>{' '}
              <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-caption text-on-neutral-soft">
                {SOURCE_KIND_LABELS[source.kind]}
              </span>
            </span>
          </li>
        ))}
      </ol>
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
    <li className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body font-medium text-text">
          {example.formatName}
        </span>
        <span className="text-meta uppercase tracking-wide text-text-muted">{example.platform}</span>
        {example.accountSizeBucket ? (
          <span className="text-meta text-text-muted">
            {BUCKET_LABELS[example.accountSizeBucket] ?? example.accountSizeBucket}
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-body text-text">{example.whyItWorks}</p>

      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-meta text-text-muted">
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

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta">
        <a
          // `text-primary` in light and `text-accent` in dark, which is the
          // pairing the rest of the app uses for an inline link. The gold
          // alone is a `serious` contrast failure on a light surface — axe
          // caught it, which is the whole reason D75 made `moderate` blocking.
          className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 dark:text-accent"
          href={example.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open the post
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        {/* The audit record, on the screen rather than only in the table. */}
        <span className="text-text-muted">Source: {example.sourceNote}</span>
      </div>
    </li>
  )
}

export function NicheReportPanel({ findings, isSample, niche, scannedAt }: NicheReportPanelProps) {
  const examples = rankExamples(findings.examples)

  return (
    <section
      aria-labelledby="niche-report-heading"
      className="space-y-6"
      /*
       * What "Print or save as PDF" puts on the page (V1, D120). BACKEND_PHASE
       * §V1 asks for this report to be "viewable in the studio, downloadable
       * as PDF, and usable by us for prospects" — and the last of those three
       * is why the region stops here rather than at the page: a prospect
       * should receive the research, not our sidebar and a filter bar.
       *
       * The "Sample data" label is **inside** it, deliberately. This is the
       * artefact most likely to be sent to somebody, which is exactly when
       * non-negotiable 7 matters most; a PDF of sample research with the
       * label cropped off would be the worst version of this feature.
       */
      data-print-region
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2
          className="font-heading text-title text-text"
          id="niche-report-heading"
        >
          {niche ? `What is working in ${niche}` : 'What is working in this niche'}
        </h2>
        {isSample ? <SampleDataLabel /> : null}
        {scannedAt ? (
          <span className="text-meta text-text-muted">
            Scanned {new Date(scannedAt).toLocaleDateString('en-GB')}
          </span>
        ) : null}
        {/* Pushed to the end of the row so the heading keeps the left edge. */}
        <span className="ms-auto">
          <PrintButton />
        </span>
      </div>

      {isSample ? (
        <p className="max-w-prose text-body text-text-muted">{SAMPLE_REPORT_NOTE}</p>
      ) : null}

      {findings.topFormats.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {findings.topFormats.map((format) => (
            <FormatCard format={format} key={format.name} />
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
          <ul className="mt-3 space-y-2 text-body text-text">
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
          {/*
            The heading only claims a ranking when there is something to rank
            by. The first live scan returned no views-per-follower figure on any
            example — the prompt tells the model to omit what it cannot verify —
            and "Examples, ranked by views per follower" then sat above a list
            where every row read "Not measured yet": a true sentence about the
            method and a false one about this report.
          */}
          <Eyebrow>
            {examples.some((example) => example.viewsPerFollower !== null)
              ? 'Examples, ranked by views per follower'
              : 'Examples the scan found'}
          </Eyebrow>
          <p className="mt-2 max-w-prose text-meta text-text-muted">
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

      {findings.sourcesUsed.length > 0 ? <SourceList sources={findings.sourcesUsed} /> : null}
    </section>
  )
}
