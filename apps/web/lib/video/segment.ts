/**
 * The cut list — and the **only** module the video and generation sessions
 * share (V5, slice 1).
 *
 * ============================================================================
 * Read this before changing anything in here
 * ============================================================================
 *
 * Two sessions are building either side of one seam. This file is the seam.
 * The video pipeline owns the renderer, the schema and the screens; the
 * generation session owns whatever makes a clip. Neither needs to read the
 * other's code, and both import this.
 *
 * So the rules are narrow on purpose:
 *
 * 1. **Adding a field to `GeneratedSegment` is fine.** Renaming or removing
 *    one is not, and neither is making an optional field required — the other
 *    side's rows are already in the database by then.
 * 2. **`label` is not optional and never will be.** Non-negotiable 4 is "AI
 *    scenes are always labelled, in the UI and on the platform", and
 *    `renders_ai_scene_is_labelled` makes an unlabelled generated scene a
 *    failed insert. A generator that cannot name what it made cannot ship, and
 *    that refusal is the point rather than an inconvenience.
 * 3. **No imports.** Not `server-only`, not the Supabase client, not a
 *    constant from `lib/`. A client component renders these, the worker
 *    concatenates them and a test builds them by hand; anything imported here
 *    becomes a dependency of all three.
 *
 * ============================================================================
 * Why a discriminated union rather than a nullable clip field
 * ============================================================================
 *
 * The renderer walks the list and encodes each item. It must not care which
 * kind it got, and it must be *impossible* for it to half-care: a shape like
 * `{ assetId?: string; generatedPath?: string }` compiles with both set, with
 * neither set, and with the wrong one for the beat. The union makes those
 * three states unrepresentable, which is what lets the generated slot ship
 * before a single generator exists.
 */

/**
 * The four beats `lib/scripts/first-videos.ts` tells the script agent to
 * write, in order: "Four beats, labelled Hook, Setup, Payoff and Call to
 * action, in that order."
 *
 * Spelled exactly as the agent is told to spell them, because the aligner
 * matches on the label the model produced. A fifth beat is not a valid script
 * and a renamed one is a different prompt.
 */
export const BEAT_LABELS = ['Hook', 'Setup', 'Payoff', 'Call to action'] as const

export type BeatLabel = (typeof BEAT_LABELS)[number]

export function isBeatLabel(value: unknown): value is BeatLabel {
  return typeof value === 'string' && (BEAT_LABELS as readonly string[]).includes(value)
}

/** A window of the client's own footage. */
export interface SourceSegment {
  readonly kind: 'source'
  /** The `video_assets` row the window is cut from. */
  readonly assetId: string
  /** Seconds from the start of the source. */
  readonly startS: number
  readonly endS: number
  readonly beat: BeatLabel
  /**
   * The words this window contains, as the aligner found them.
   *
   * Carried so the caption burner does not have to re-read the whole
   * transcript, and so a reader of a stored cut list can see *why* this window
   * was chosen rather than taking the timestamps on trust.
   */
  readonly text: string
}

/**
 * A clip somebody generated.
 *
 * The generation session fills these in. Nothing in this session creates one,
 * and nothing here calls a generator — that choice is Vlad's and the adapter
 * is the other session's.
 */
export interface GeneratedSegment {
  readonly kind: 'generated'
  /** The generation session's own id for the clip, for its own audit trail. */
  readonly clipId: string
  /** Which generator made it, by name. Shown to the client. */
  readonly provider: string
  /** Where the clip file sits in our storage. Never a third-party URL. */
  readonly storagePath: string
  /**
   * A reference to the stored prompt — an id, not the prompt itself.
   *
   * A prompt is not a thing to render to a client (`jobs.error` carries the
   * same rule) and the cut list is read by the studio.
   */
  readonly promptRef: string
  readonly beat: BeatLabel
  readonly durationS: number
  /**
   * The label the client and the platform both see. **Required.**
   *
   * See rule 2 at the top of this file. The database agrees with it, so a
   * generator that leaves this blank fails at the insert rather than shipping
   * an unlabelled AI scene.
   */
  readonly label: string
}

export type Segment = SourceSegment | GeneratedSegment

export function isGeneratedSegment(segment: Segment): segment is GeneratedSegment {
  return segment.kind === 'generated'
}

/** What `renders.ai_scenes` holds: one entry per generated segment. */
export interface AiScene {
  readonly clipId: string
  readonly provider: string
  readonly promptRef: string
  readonly beat: BeatLabel
  readonly label: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * One segment out of jsonb, or null.
 *
 * **Null rather than a partial segment.** `renders.segments` is jsonb and
 * therefore anything at all; a half-parsed source window would be an encode
 * against a start time nobody set, which produces a video rather than an
 * error — the worst of the two outcomes.
 */
export function parseSegment(value: unknown): Segment | null {
  if (!isRecord(value)) return null
  if (!isBeatLabel(value.beat)) return null

  if (value.kind === 'source') {
    const assetId = text(value.assetId)
    const startS = finite(value.startS)
    const endS = finite(value.endS)

    if (assetId === null || startS === null || endS === null) return null
    // A zero-length or reversed window is not a shorter clip, it is a filter
    // graph that fails at render time with something unreadable.
    if (startS < 0 || endS <= startS) return null

    return {
      kind: 'source',
      assetId,
      startS,
      endS,
      beat: value.beat,
      text: typeof value.text === 'string' ? value.text : '',
    }
  }

  if (value.kind === 'generated') {
    const clipId = text(value.clipId)
    const provider = text(value.provider)
    const storagePath = text(value.storagePath)
    const promptRef = text(value.promptRef)
    const durationS = finite(value.durationS)
    const label = text(value.label)

    if (
      clipId === null ||
      provider === null ||
      storagePath === null ||
      promptRef === null ||
      durationS === null ||
      durationS <= 0 ||
      // Rule 2. A generated segment with no label does not become an unlabelled
      // segment here — it stops being a segment.
      label === null
    ) {
      return null
    }

    return {
      kind: 'generated',
      clipId,
      provider,
      storagePath,
      promptRef,
      beat: value.beat,
      durationS,
      label,
    }
  }

  return null
}

/**
 * A whole cut list out of jsonb.
 *
 * **Empty rather than partial when any segment fails.** A render missing its
 * third beat is not a shorter video, it is the wrong video — and the caller
 * (the worker, or the studio) can say "this cut list could not be read", which
 * is true, instead of playing three beats as though that were the script.
 */
export function parseSegments(value: unknown): readonly Segment[] {
  if (!Array.isArray(value)) return []

  const parsed = value.map(parseSegment)
  if (parsed.some((segment) => segment === null)) return []

  return parsed as readonly Segment[]
}

/** Seconds of finished video the list adds up to. */
export function totalDurationS(segments: readonly Segment[]): number {
  return segments.reduce(
    (total, segment) =>
      total + (segment.kind === 'source' ? segment.endS - segment.startS : segment.durationS),
    0,
  )
}

/** The `ai_scenes` value for this cut list. `[]` when nothing was generated. */
export function aiScenesOf(segments: readonly Segment[]): readonly AiScene[] {
  return segments.filter(isGeneratedSegment).map((segment) => ({
    clipId: segment.clipId,
    provider: segment.provider,
    promptRef: segment.promptRef,
    beat: segment.beat,
    label: segment.label,
  }))
}

/**
 * The label this render must carry, or null when it carries no generated
 * scene.
 *
 * One sentence for the whole video rather than one per scene: the client sees
 * a video, and the platforms want a disclosure on the post. Where several
 * scenes were generated by different providers, all of them are named — a
 * label that mentions one of two generators is a label that is partly false.
 */
export function aiLabelFor(segments: readonly Segment[]): string | null {
  const scenes = aiScenesOf(segments)
  if (scenes.length === 0) return null

  const providers = [...new Set(scenes.map((scene) => scene.provider))].sort()
  const scenesWord = scenes.length === 1 ? 'scene' : 'scenes'

  return `${scenes.length} AI-generated ${scenesWord} (${providers.join(', ')})`
}
