/**
 * The render plan, and reading back what the engine did (V5, slice 1).
 *
 * Pure functions on both sides of the shell-out: the worker builds a plan here,
 * hands it to `render-short` as a file, and parses `summary.json` back through
 * here. No `server-only`, because the worker imports it — the same arrangement
 * `lib/jobs/types.ts` has.
 *
 * ============================================================================
 * The brand kit is mock and the rights record is real
 * ============================================================================
 *
 * `docs/plan/ENGINE_WIRING.md` already made this call for the local engine and
 * the reasoning holds unchanged: colours, fonts, caption style and word lists
 * come from `@mirrorline/mock` because the Brand kit screen (S9) will own them
 * later and there is no table for them yet. The **rights record is not mock** —
 * it carries the holder the client typed and the moment they confirmed it,
 * because that is the one field non-negotiable 1 turns on, and inventing it
 * would make the compliance gate's `rights-flag` rule a decoration.
 *
 * The `recordId` says where the confirmation came from. It is not a signed
 * document and does not pretend to be one.
 */

import { brandKit } from '@mirrorline/mock'

import { BEAT_LABELS, type BeatLabel, type Segment } from './segment'

/** One beat of the approved script, as the plan carries it. */
export interface PlanBeat {
  readonly label: BeatLabel
  readonly text: string
}

/** One word of the stored transcript, as `transcripts.words` holds it. */
export interface PlanWord {
  readonly text: string
  readonly start: number
  readonly end: number
}

export interface BrandForRenderRequest {
  /** From `video_assets.rights_holder`. Never invented. */
  readonly rightsHolder: string
  /** For the record id, so a brand file can be traced to one upload. */
  readonly assetId: string
  /** `client_profiles.brand_name`, when the client has told us (D131). */
  readonly brandName: string | null
  /** `rights_confirmed_at`, as an ISO date. */
  readonly confirmedOn: string
}

/** The `brand.json` shape `services/pipeline` validates with `parse_brand`. */
export function brandForRender(request: BrandForRenderRequest): Record<string, unknown> {
  return {
    // The client's own name when we have it, and our sample brand's label when
    // we do not — the same fallback the niche report's cover uses, and for the
    // same reason: a name we have beats no name.
    logoLabel: request.brandName?.trim() || brandKit.logoLabel,
    colors: brandKit.colors.map((colour) => ({
      id: colour.id,
      name: colour.name,
      hex: colour.hex,
    })),
    headingFont: brandKit.headingFont,
    bodyFont: brandKit.bodyFont,
    captionStyle:
      brandKit.captionStyles.find((style) => style.isSelected)?.id ?? 'bold-highlight',
    wordsAlways: [...brandKit.wordsAlways],
    wordsNever: [...brandKit.wordsNever],
    rights: {
      holder: request.rightsHolder,
      recordId: `upload-confirmation-${request.assetId}`,
      signedOn: request.confirmedOn.slice(0, 10),
    },
  }
}

export interface RenderPlanRequest {
  readonly sourcePath: string
  readonly outDir: string
  readonly title: string
  readonly hook: string
  readonly beats: readonly PlanBeat[]
  readonly words: readonly PlanWord[]
  readonly brand: Record<string, unknown>
}

/** The plan file `render-short` reads. One `JSON.stringify` away from disk. */
export function renderPlanFor(request: RenderPlanRequest): Record<string, unknown> {
  return {
    source: request.sourcePath,
    out: request.outDir,
    title: request.title,
    hook: request.hook,
    beats: request.beats.map((beat) => ({ label: beat.label, text: beat.text })),
    words: request.words,
    brand: request.brand,
  }
}

/**
 * The four beats of an approved idea, in script order, or null.
 *
 * **Null when a label is missing or unknown, rather than three beats.** The
 * script agent is told "four beats, labelled Hook, Setup, Payoff and Call to
 * action, in that order"; an idea that does not have them is one this renderer
 * cannot cut, and quietly rendering the three it recognised would produce a
 * video with no call to action that nobody asked for.
 */
export function planBeatsFrom(value: unknown): readonly PlanBeat[] | null {
  if (!Array.isArray(value)) return null

  const byLabel = new Map<BeatLabel, string>()

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null
    const { label, text } = entry as { label?: unknown; text?: unknown }
    if (typeof label !== 'string' || typeof text !== 'string') return null

    const matched = BEAT_LABELS.find((known) => known.toLowerCase() === label.trim().toLowerCase())
    if (matched === undefined || text.trim() === '') return null
    byLabel.set(matched, text.trim())
  }

  if (byLabel.size !== BEAT_LABELS.length) return null

  // Returned in the canonical order rather than the stored order: the video
  // plays Hook, Setup, Payoff, Call to action, whatever order the jsonb is in.
  return BEAT_LABELS.map((label) => ({ label, text: byLabel.get(label) as string }))
}

/** What `summary.json` says, once it has been checked. */
export interface RenderSummary {
  readonly ok: boolean
  /** Present on a refusal: the sentence the client is shown. */
  readonly reason: string | null
  readonly shortPath: string | null
  readonly posterPath: string | null
  readonly durationS: number | null
  readonly bytes: number | null
  readonly segments: readonly Segment[]
  /**
   * How well each beat matched the footage, straight from the aligner.
   *
   * Carried for one reason: it is the measurement the first real client video
   * owes us. `docs/PROGRESS.md` says the aligner has never met real footage and
   * that a weak match must produce a number rather than a shrug — so the worker
   * logs these, and a run that looks wrong can be argued about with figures.
   */
  readonly coverage: readonly { readonly beat: string; readonly coverage: number }[]
  readonly complianceVerdict: string | null
  readonly complianceFindings: readonly string[]
  readonly encoderName: string | null
  readonly fontFamily: string | null
  readonly isBrandFont: boolean | null
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * Read `summary.json`, including the refusal shape.
 *
 * Returns null only when the file is not a summary at all. A summary saying
 * `ok: false` is a **successful read of a refusal** — the engine writes one on
 * purpose so the worker never has to parse stderr for the sentence a client
 * will see.
 *
 * `assetId` is passed in because the engine has no business knowing it: the
 * render leg sees a path, and the window it found belongs to an asset only
 * once it is back here.
 */
export function parseRenderSummary(value: unknown, assetId: string): RenderSummary | null {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  if (typeof raw.ok !== 'boolean') return null

  if (!raw.ok) {
    return {
      ok: false,
      reason: text(raw.reason) ?? 'The video could not be made from this footage.',
      shortPath: null,
      posterPath: null,
      durationS: null,
      bytes: null,
      segments: [],
      coverage: [],
      complianceVerdict: null,
      complianceFindings: [],
      encoderName: null,
      fontFamily: null,
      isBrandFont: null,
    }
  }

  const compliance = (raw.compliance ?? {}) as Record<string, unknown>
  const font = (raw.font ?? {}) as Record<string, unknown>
  const encoder = (raw.encoder ?? {}) as Record<string, unknown>

  const segments: Segment[] = []
  const coverage: { beat: string; coverage: number }[] = []
  for (const entry of Array.isArray(raw.segments) ? raw.segments : []) {
    if (typeof entry !== 'object' || entry === null) continue
    const part = entry as Record<string, unknown>
    const beat = BEAT_LABELS.find((label) => label === part.beat)
    const startS = finite(part.startS)
    const endS = finite(part.endS)
    if (beat === undefined || startS === null || endS === null || endS <= startS) continue

    const matched = finite((entry as Record<string, unknown>).coverage)
    if (matched !== null) coverage.push({ beat, coverage: matched })

    segments.push({
      kind: 'source',
      assetId,
      startS,
      endS,
      beat,
      text: typeof part.text === 'string' ? part.text : '',
    })
  }

  return {
    ok: true,
    reason: null,
    shortPath: text(raw.short),
    posterPath: text(raw.poster),
    durationS: finite(raw.durationS),
    bytes: finite(raw.bytes),
    segments,
    coverage,
    complianceVerdict: text(compliance.verdict),
    complianceFindings: Array.isArray(compliance.findings)
      ? compliance.findings.filter((finding): finding is string => typeof finding === 'string')
      : [],
    encoderName: text(encoder.name),
    fontFamily: text(font.family),
    isBrandFont: typeof font.isBrandFont === 'boolean' ? font.isBrandFont : null,
  }
}
