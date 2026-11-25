'use client'

/**
 * What one generation came back as: the asset, the label, the provenance.
 *
 * ============================================================================
 * Four outcomes, four panels, and none of them is an error state
 * ============================================================================
 *
 * `refused` and `capped` are controls working. `EngineSummary.adapters` exists
 * because "a run backed by a script sidecar must never read like a run backed
 * by a model", and the same rule applies one step further out: a cap that
 * refused must not read like a server that broke. So the refusal panels carry
 * the rule, the reason the log holds, and **$0.0000** — the figure is the whole
 * point, because a refusal that cost nothing is the thing worth seeing.
 *
 * ============================================================================
 * The three claims this panel is careful about
 * ============================================================================
 *
 * 1. **The AI label is the asset's own.** `GeneratedAsset.label` is the literal
 *    `'AI-generated'`, and this renders that field rather than a string of its
 *    own, so the badge and the asset cannot disagree. Non-negotiable 4 is not a
 *    default.
 * 2. **"Sample data" when the fixture answered** (non-negotiable 7), drawn by
 *    the one component that draws those words.
 * 3. **"not stated" for a null watermark.** `providerWatermark` is three-valued
 *    and `null` is the honest answer for xAI media today: their AUP forbids
 *    stripping embedded provenance, which implies something is there, while
 *    their watermarking documentation covers only text and audio. So the line
 *    says we label it ourselves rather than claiming a watermark we cannot
 *    evidence — the same reasoning as `VideoIdea.originality`'s null.
 */

import { AiLabel } from '@mirrorline/ui'

import type { GenerateActionResult } from '@/app/app/dev/generate/generate-form-state'
import { SampleDataLabel } from '@/components/marketing/primitives'
import type { GeneratedAsset, Provenance } from '@/lib/generation/types'

/** Dollars at four places, because a 480p second costs two cents. */
function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

function watermarkWords(stated: boolean | null): string {
  if (stated === null) return 'not stated — we label it ourselves'
  return stated ? 'the provider says it embedded one' : 'the provider says it embedded none'
}

interface RowProps {
  readonly label: string
  readonly value: string
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-1.5">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="font-mono text-caption text-text">{value}</dd>
    </div>
  )
}

interface ProvenanceListProps {
  readonly provenance: Provenance
  readonly extra?: readonly RowProps[]
}

/**
 * The provenance line, as a list rather than a sentence.
 *
 * A sentence reads better and is worse here: these are the figures somebody
 * reconciles against an invoice, and a label beside each value is what makes
 * "$0.0855" legible as a billed cost rather than as a projection.
 */
function ProvenanceList({ provenance, extra = [] }: ProvenanceListProps) {
  return (
    <dl className="divide-y divide-border-subtle border-y border-border-subtle">
      <Row label="Adapter" value={provenance.adapter} />
      <Row label="Model" value={provenance.model} />
      <Row label="Billed" value={usd(provenance.usd)} />
      <Row label="Requested at" value={provenance.requestedAt} />
      <Row label="Provider request" value={provenance.providerRequestId ?? 'none returned'} />
      <Row label="Watermark" value={watermarkWords(provenance.providerWatermark)} />
      {extra.map((row) => (
        <Row key={row.label} label={row.label} value={row.value} />
      ))}
    </dl>
  )
}

interface PreviewProps {
  readonly asset: GeneratedAsset
  readonly url: string | null
}

/**
 * The bytes, when there are bytes.
 *
 * `url` is null for a sample and for any location this app will not serve, and
 * the panel says so rather than rendering a broken element. A placeholder image
 * would be the wrong kindness: a harmless-looking stub is exactly what travels
 * furthest before anybody notices, which is `canned.ts`'s own argument for why
 * its location is a URI nothing can open.
 */
function Preview({ asset, url }: PreviewProps) {
  if (url === null) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-strong bg-surface-subtle p-6">
        {/*
          The badge is here as well, and that is non-negotiable 4 rather than
          decoration: "AI scenes are always labelled, in the UI". With no media
          to sit on, the badge has nowhere to go — and the asset would then be
          labelled only by a row in a provenance list, which is a weaker claim
          than the rule asks for. So it moves into the empty state.
        */}
        {/*
          Ringed, because `AiLabel` is a fixed white-on-ink badge by design —
          "the badge sits on a video thumbnail, which stays one of the dark demo
          colours in both themes". On this light empty surface white-on-light
          needs an edge to be seen, and a border is the smallest change that
          gives it one without touching the component.
        */}
        <AiLabel className="ring-1 ring-border-strong">{asset.label}</AiLabel>
        <p className="max-w-prose text-center text-caption text-text-muted">
          No bytes to show. A sample scene has none, and a location this app will not serve is never
          handed to the browser.
        </p>
      </div>
    )
  }

  return (
    <div className="relative inline-block max-w-full overflow-hidden rounded-md bg-ink">
      {asset.kind === 'clip' ? (
        <video
          src={url}
          controls
          muted
          playsInline
          // Bounded by height rather than by a column width: a 9:16 clip is
          // 720×1280 and would otherwise be taller than the viewport.
          className="block max-h-[420px] w-auto max-w-full"
        />
      ) : (
        // A route-served local file, not a static asset. `next/image` would
        // want a loader and a configured domain for bytes that live in a temp
        // directory, and would try to optimise an image we generated seconds
        // ago and will not serve again.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="block max-h-[420px] w-auto max-w-full" />
      )}

      {/* On the media, where DESIGN.md puts it: "a small white badge reading
          'AI scene' on any thumbnail or preview with AI-generated footage." */}
      <span className="absolute left-2 top-2">
        <AiLabel>{asset.label}</AiLabel>
      </span>
    </div>
  )
}

interface RefusalProps {
  readonly heading: string
  readonly message: string
  readonly reason: string
  readonly rule: string | null
  readonly spent: string
}

function Refusal({ heading, message, reason, rule, spent }: RefusalProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-h4 text-text">{heading}</h3>
        <p className="max-w-prose text-body text-text">{message}</p>
      </div>

      <dl className="divide-y divide-border-subtle border-y border-border-subtle">
        {rule === null ? null : <Row label="Rule" value={rule} />}
        <Row label="Spent" value={spent} />
        {/* What the ledger holds, shown because this screen is for us. It names
            the rule and never the prompt — `agent_runs.reason`'s own rule. */}
        <Row label="Logged as" value={reason} />
      </dl>
    </div>
  )
}

export interface GeneratedAssetPanelProps {
  readonly result: GenerateActionResult
}

export function GeneratedAssetPanel({ result }: GeneratedAssetPanelProps) {
  if (result.status === 'idle') return null

  if (result.status === 'failed') {
    return (
      <div className="space-y-2">
        <h3 className="text-h4 text-text">That did not run</h3>
        <p className="max-w-prose text-body text-text">{result.message}</p>
      </div>
    )
  }

  const { outcome } = result
  if (outcome === null) return null

  if (outcome.status === 'refused') {
    return (
      <Refusal
        heading={
          outcome.provenance === null ? 'We turned that down' : 'The generator turned that down'
        }
        message={outcome.message}
        reason={outcome.reason}
        rule={result.safetyRule}
        // The number that matters. Our own filter refuses before any call, so
        // the refusal is free — and a screen that did not say so would leave
        // somebody assuming it had been paid for.
        spent={
          outcome.provenance === null
            ? '$0.0000 — nothing was called'
            : usd(outcome.provenance.usd)
        }
      />
    )
  }

  if (outcome.status === 'capped') {
    return (
      <Refusal
        heading="The spend cap stopped that"
        message={outcome.message}
        reason={outcome.reason}
        rule={null}
        spent="$0.0000 — the cap reads the month before the call is made"
      />
    )
  }

  if (outcome.status === 'failed') {
    return (
      <Refusal
        heading="That did not come back"
        message={outcome.message}
        reason={outcome.reason}
        rule={null}
        spent={
          outcome.provenance === null
            ? '$0.0000 recorded — a provider that charged for a failed render is a dispute, not a figure we can compute'
            : usd(outcome.provenance.usd)
        }
      />
    )
  }

  const { asset } = outcome

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h4 text-text">
          {asset.kind === 'clip' ? 'Scene' : 'Still'} for the {asset.beat.label.toLowerCase()}
        </h3>
        {result.isSample ? <SampleDataLabel /> : null}
      </div>

      <Preview asset={asset} url={result.assetUrl} />

      <ProvenanceList
        provenance={asset.provenance}
        extra={[
          { label: 'Size', value: `${asset.width}×${asset.height}` },
          { label: 'Length', value: asset.seconds === null ? 'a still' : `${asset.seconds}s` },
          // The handle, not the prompt. `18 §3.3`: the client's text does not
          // belong in a log, and a reference lets two assets be recognised as
          // coming from one prompt without storing the sentence.
          { label: 'Prompt reference', value: asset.promptRef },
          { label: 'Label', value: asset.label },
        ]}
      />
    </div>
  )
}
