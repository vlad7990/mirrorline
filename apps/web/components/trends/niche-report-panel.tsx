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

import {
  Card,
  Eyebrow,
  LogoWordmark,
  ProgressBar,
  StatusChip,
  StoryboardFrames,
} from '@mirrorline/ui'
import { ExternalLink } from 'lucide-react'

// The one way the "Sample data" label gets drawn, per its own header: "so it
// reads the same everywhere and is easy to audit". A second badge for the
// same rule is how non-negotiable 7 starts being enforced inconsistently.
import { SampleDataLabel } from '@/components/marketing/primitives'
import { PrintButton } from '@/components/studio/print-button'
import { storyboardFromBeats } from '@/components/trends/trend-beats'
import { SAMPLE_REPORT_LABEL, SAMPLE_REPORT_NOTE } from '@/lib/niche-scan/canned'
import {
  FIT_MAX,
  rankExamples,
  type Claim,
  type ClaimBasis,
  type FormatFinding,
  type NicheReportFindings,
  type ReportSource,
  type TrendExample,
} from '@/lib/niche-scan/report'
import type { OriginalityOutcome } from '@/lib/originality/gate'
import type { VideoIdea } from '@/lib/scripts/video-idea'

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
  /** The workspace's own name, for the cover. Absent is not an error. */
  readonly clientName?: string | null
}

/** Printed on the cover and in the body. One sentence, non-negotiable 4's spirit. */
const AI_NOTE =
  'Researched and written by Mirrorline’s Trend Scout agent (an AI), from public posts and published guides. Every example is a link to its source: we keep the link and the description of the format, never the video or the audio.'

/**
 * The first page of the PDF, and nothing on screen (D122).
 *
 * BACKEND_PHASE §V1 wants this report "usable by us for prospects", so the
 * artefact needs a front: who it is for, what it covers, when it was made, and
 * who made it. Ink with the gold wordmark, because it is the same document the
 * marketing site promises.
 *
 * **`hidden print:block`, not a second route.** The cover exists only on
 * paper, so it cannot drift from the report the way a separately-rendered
 * export would — it is the same component, the same data, one media query.
 *
 * The AI note is on the cover deliberately. This is the page a prospect reads
 * first, and "an AI wrote this" belongs there rather than in a footnote on
 * page four.
 */
function ReportCover({
  niche,
  clientName,
  scannedAt,
  isSample,
}: {
  niche?: string
  clientName?: string | null
  scannedAt?: string | null
  isSample: boolean
}) {
  const scanned = scannedAt ? new Date(scannedAt) : null

  return (
    <div className="report-cover hidden print:block">
      {/*
        `text-on-ink-900` on the word, not just on the mark. `LogoWordmark`
        defaults the word to `text-text`, which is near-black — correct on
        every surface it has ever stood on, and invisible on this one.
      */}
      <LogoWordmark className="text-on-ink-900" markClassName="text-gold-bright" size={28} />

      <p className="report-cover-eyebrow">Niche Scan</p>

      <h2 className="report-cover-title">
        {niche ? `What is working in ${niche}` : 'What is working in this niche'}
      </h2>

      <dl className="report-cover-meta">
        {clientName ? (
          <div>
            <dt>Prepared for</dt>
            <dd>{clientName}</dd>
          </div>
        ) : null}
        {/*
          Absent rows are left out rather than filled with "Not stated". A
          cover is the formal face of the document; a blank where a fact
          belongs reads as a template somebody forgot to complete, and the
          sample report legitimately has neither a niche nor a scan date.
        */}
        {niche ? (
          <div>
            <dt>Niche</dt>
            <dd>{niche}</dd>
          </div>
        ) : null}
        {scanned ? (
          <div>
            <dt>Scanned</dt>
            <dd>
              {scanned.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Prepared by</dt>
          <dd>Mirrorline</dd>
        </div>
      </dl>

      {/*
        Non-negotiable 7, on the cover rather than inside. A sample report that
        is going to be handed to somebody must say so on the face of it — the
        label further down prints too, and this is the one a reader meets first.
      */}
      {isSample ? <p className="report-cover-sample">{SAMPLE_REPORT_LABEL}</p> : null}

      <p className="report-cover-note">
        {isSample ? `${SAMPLE_REPORT_NOTE} ` : ''}
        {AI_NOTE}
      </p>
    </div>
  )
}

/**
 * "Industry guidance", said once per claim that needs it (P1.9).
 *
 * Only on `guidance` and `unstated`. A `posts` claim says nothing extra,
 * because the whole section is about what the scan read off real posts and a
 * tag on every line is a tag nobody reads. The two that are *not* evidence are
 * the ones a reader has to be able to tell apart.
 */
function GuidanceTag({ basis }: { basis: ClaimBasis }) {
  if (basis === 'posts') return null

  return (
    <span className="ms-2 whitespace-nowrap rounded-full bg-neutral-soft px-2 py-0.5 text-caption text-on-neutral-soft">
      industry guidance
    </span>
  )
}

/**
 * A section of claims, with one honesty line at the foot instead of a badge on
 * every row (P1.10).
 *
 * The first live report put "Not measured yet" on every card in every section.
 * It was true each time and unreadable in aggregate — a screen that repeats a
 * caveat twenty times has trained the reader to skip it by the fourth. One
 * line per section says the same thing once, where it still gets read.
 */
function ListCard({ title, items }: { title: string; items: readonly Claim[] }) {
  if (items.length === 0) return null

  const hasGuidance = items.some((item) => item.basis !== 'posts')

  return (
    <Card className="p-5">
      <Eyebrow>{title}</Eyebrow>
      <ul className="mt-3 space-y-2 text-body text-text">
        {items.map((item) => (
          <li className="flex gap-2" key={item.text}>
            <span aria-hidden="true" className="select-none text-accent">
              ·
            </span>
            <span>
              {item.text}
              <GuidanceTag basis={item.basis} />
              {/*
                A topic that splits the niche is a business decision (P1.8).
                It is shown, because the client may well want it — and it is
                shown as optional, because publishing it takes a side on their
                account rather than on ours.
              */}
              {item.brandRisk ? (
                <span className="mt-1 block text-meta text-text-muted">
                  <span className="font-medium text-text">Optional · brand risk: </span>
                  {item.brandRisk}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {hasGuidance ? (
        <p className="mt-3 text-meta text-text-muted">
          Lines tagged <span className="font-medium">industry guidance</span> come from published
          articles about this niche, not from posts we measured.
        </p>
      ) : null}
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

      {/*
        The sentence behind the number (P1.7). A bare "Fit 9" is an opinion
        with no argument attached; this one names something from the client's
        own profile, which also makes it checkable when it is wrong.
      */}
      {format.fitReason ? (
        <p className="m-0 text-meta text-text-muted">{format.fitReason}</p>
      ) : null}

      <p className="m-0 text-body text-text">{format.whyItWorks}</p>

      {format.beats.length > 0 ? (
        <>
          {/*
            Screen only. The frames are an abstraction of a recipe whose text
            is listed in full underneath, and on paper they are four filled
            near-black rectangles per format — a page of toner spent on
            decoration the reader already has in words.
          */}
          <StoryboardFrames
            beats={storyboardFromBeats(format.beats)}
            data-print-hide
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

          **Absent means absent (P1.10).** This line used to read "Not measured
          yet" on every row of every example — true each time, and by the
          fourth repetition a thing readers skip. The caveat now sits once, at
          the foot of the section; a row with no ratio simply does not claim
          one.
        */}
        {ratio === null ? null : (
          <div>
            <dt className="inline">Views per follower: </dt>
            <dd className="inline font-medium">{ratio.toFixed(1)}</dd>
          </div>
        )}
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

/** The word for each outcome. "Rewritten" is the gate working, not a warning. */
const GATE_OUTCOME_LABEL: Record<OriginalityOutcome, string> = {
  passed: 'Passed',
  rewritten: 'Sent back to be rewritten',
  blocked: 'Blocked',
}

/**
 * What the Originality Gate said about one idea (V3, D126).
 *
 * `04 §4`: "The result is shown to the client with the number, the limit, and
 * what the gate did … A gate whose failures are invisible is indistinguishable
 * from a gate that never fires, which is precisely what the predecessor
 * project had." So this renders four things, and none of them is optional:
 *
 * 1. **The word.** Passed, sent back, or blocked.
 * 2. **The number and the limit**, side by side — a percentage with no ceiling
 *    beside it cannot be judged by the person reading it.
 * 3. **What it was compared against**, and separately **what it was not**. The
 *    second list is the honest one: we hold none of the client's own posts yet,
 *    and printing that gap is the alternative to implying we closed it.
 * 4. **The reasons**, when there are any — named lines, so the objection is
 *    arguable rather than an assertion.
 *
 * A `null` verdict reads as "not checked" rather than as a blank space. A
 * report stored before the gate existed carries no verdict, and absence must
 * never look like a clean bill.
 */
function GateVerdict({ verdict }: { verdict: VideoIdea['originality'] }) {
  if (!verdict) {
    return (
      <p className="mt-3 text-meta text-text-muted">
        <span className="font-medium text-text">Originality Gate: </span>
        not checked — this report was written before the gate ran.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-meta font-medium text-text">Originality Gate</span>
        <StatusChip status={verdict.outcome === 'blocked' ? 'blocked' : 'passed'}>
          {GATE_OUTCOME_LABEL[verdict.outcome]}
        </StatusChip>
        <span className="text-meta text-text-muted">
          <span className="machine">{verdict.similarity}%</span> of the phrasing is shared · limit{' '}
          <span className="machine">{verdict.limit}%</span>
        </span>
      </div>

      <p className="m-0 max-w-prose text-meta text-text-muted">
        Compared against {verdict.comparedAgainst.join(', ')}.
        {verdict.notComparedAgainst.length > 0
          ? ` Not compared against ${verdict.notComparedAgainst.join(', ')} — we do not hold those yet.`
          : ''}
      </p>

      {verdict.reasons.length > 0 ? (
        <ul className="m-0 mt-1 space-y-1 text-meta text-text-muted">
          {verdict.reasons.map((reason) => (
            <li className="flex gap-2" key={reason}>
              <span aria-hidden="true" className="select-none text-accent">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * "Your first 3 videos" — where the research stops being research (V2).
 *
 * `BACKEND_PHASE §V2`'s first visible output, and the section that answers the
 * question a client actually has. Everything above it describes a niche; this
 * is three things to film this week, built on the formats above, in their
 * voice, each standing on one fact from their own profile.
 *
 * **Nothing here is a draft of someone else's video.** The scripts share the
 * formats' beat structure and no sentence with any source — checked in code by
 * `screenIdeas`, not promised in a prompt — and an idea that failed either
 * check is absent rather than flagged. `§V3`: no warn-and-continue.
 */
function FirstVideos({ ideas, niche }: { ideas: readonly VideoIdea[]; niche?: string }) {
  if (ideas.length === 0) return null

  return (
    <Card className="p-5">
      <Eyebrow>Your first {ideas.length === 1 ? 'video' : `${ideas.length} videos`}</Eyebrow>
      <h3 className="mt-2 font-heading text-title text-text">
        {niche ? `Three to film this week in ${niche}` : 'Three to film this week'}
      </h3>
      <p className="mt-2 max-w-prose text-meta text-text-muted">
        Built from the formats above, in your words, each one standing on something true about your
        business. New script, your footage — we never remake anyone else’s video.
      </p>

      <ol className="mt-4 space-y-5">
        {ideas.map((idea, index) => (
          <li className="border-t border-border pt-5 first:border-t-0 first:pt-0" key={idea.title}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="machine text-meta text-text-muted">{index + 1}</span>
              <h4 className="text-body font-medium text-text">{idea.title}</h4>
              <span className="text-meta text-text-muted">from “{idea.formatName}”</span>
            </div>

            {/* The hook is the video. It gets the line it deserves. */}
            <p className="mt-2 max-w-prose text-body text-text">
              <span className="font-medium">Hook: </span>“{idea.hook}”
            </p>

            <ol className="mt-3 space-y-1 text-meta text-text-muted">
              {idea.beats.map((beat) => (
                <li key={beat.label}>
                  <span className="font-medium text-text">{beat.label}: </span>
                  {beat.text}
                </li>
              ))}
            </ol>

            {idea.footage.length > 0 ? (
              <div className="mt-3">
                <p className="m-0 text-meta font-medium text-text">What to film</p>
                <ul className="mt-1 space-y-1 text-meta text-text-muted">
                  {idea.footage.map((shot) => (
                    <li className="flex gap-2" key={shot}>
                      <span aria-hidden="true" className="select-none text-accent">
                        ·
                      </span>
                      <span>{shot}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/*
              The fact is printed, not merely required. §V2 asks every script
              to carry one; showing which one makes it checkable by the person
              who would be quoted on it.
            */}
            <p className="mt-3 text-meta text-text-muted">
              <span className="font-medium text-text">Your fact: </span>
              {idea.fact}
            </p>

            {/*
              And what the gate said about it. On the screen rather than only
              in the row — §V3's "the block is visible in the studio", and the
              one line that makes the three above auditable.
            */}
            <GateVerdict verdict={idea.originality} />
          </li>
        ))}
      </ol>
    </Card>
  )
}

export function NicheReportPanel({
  findings,
  isSample,
  niche,
  scannedAt,
  clientName,
}: NicheReportPanelProps) {
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
      <ReportCover
        clientName={clientName}
        isSample={isSample}
        niche={niche}
        scannedAt={scannedAt}
      />

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

      {/*
        The thin-evidence line, said once at the top.

        A real niche can hold very little public short video we can link to,
        and that used to fail the whole scan — nothing shown and nothing
        explained. It now produces a report carrying this line, with every
        claim tagged as guidance, because a `posts` tag over no posts is a
        claim about measurement we did not do.

        Above the findings rather than beside them: it governs everything
        below it, and D121's lesson is that a caveat repeated on every row is
        a caveat nobody reads.
      */}
      {findings.evidenceCaveat ? (
        <p className="max-w-prose rounded-lg border border-border bg-neutral-soft px-4 py-3 text-meta text-on-neutral-soft">
          {findings.evidenceCaveat}
        </p>
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
              <li key={`${length.secondsMin}-${length.secondsMax}-${length.note}`}>
                {/*
                  A range, because nobody measured "21 seconds" (P1.9). When
                  the two ends agree it prints as one number — an old row
                  carrying a single value says what it said, without being
                  dressed up as a range it never was.
                */}
                <span className="machine font-medium">
                  {length.secondsMin === length.secondsMax
                    ? `${length.secondsMin}s`
                    : `${length.secondsMin}–${length.secondsMax}s`}
                </span>{' '}
                — {length.note}
                <GuidanceTag basis={length.basis} />
              </li>
            ))}
          </ul>
          {findings.lengths.some((length) => length.basis !== 'posts') ? (
            <p className="mt-3 text-meta text-text-muted">
              Lines tagged <span className="font-medium">industry guidance</span> come from
              published articles about this niche, not from posts we measured.
            </p>
          ) : null}
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
          {/*
            One line for the whole section (P1.10), replacing the "Not measured
            yet" that used to sit on every row. Counts are shown where the page
            published them and omitted where it did not — which is the rule,
            said once, where it is still read.
          */}
          {examples.some((example) => example.viewsPerFollower === null) ? (
            <p className="mt-4 max-w-prose text-meta text-text-muted">
              Figures are shown only where the page published them. Where a platform does not show
              a view or follower count in search results, the row carries no number rather than an
              estimate.
            </p>
          ) : null}
        </Card>
      ) : null}

      {findings.sourcesUsed.length > 0 ? <SourceList sources={findings.sourcesUsed} /> : null}

      <FirstVideos ideas={findings.firstVideos} niche={niche} />
    </section>
  )
}
