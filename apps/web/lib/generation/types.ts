/**
 * What a generator is asked for, and what it hands back.
 *
 * V4's "Generate with AI" (`docs/plan/AI_GENERATION_V4.md`, D137). One
 * interface, several providers, every output labelled.
 *
 * ============================================================================
 * No `server-only` here, and that is the point
 * ============================================================================
 *
 * The same split `lib/jobs/types.ts` makes, for the same reason: a panel that
 * renders the AI label and the provenance line needs these shapes, and a
 * `'use client'` module may import a type because a type is erased at compile
 * time. Everything that reads a key or opens a socket lives in `providers/*`,
 * which do import `server-only`, and `server-only.test.ts` asserts the
 * boundary over the real import graph.
 *
 * ============================================================================
 * This is not a `Segment`, deliberately
 * ============================================================================
 *
 * The VIDEO session owns the cut list and its discriminated union:
 *
 * ```ts
 * type Segment =
 *   | { kind: 'source';    assetId: string; startS: number; endS: number; beat: BeatLabel }
 *   | { kind: 'generated'; clipId: string;  provider: string; storagePath: string;
 *       promptRef: string; beat: BeatLabel }
 * ```
 *
 * Their plan says "the AI-GENERATION session produces `generated` segments",
 * and the worst way to honour that would be to declare a second union here
 * that drifts from theirs. So `GeneratedAsset` is the **generation-side
 * artefact** — bytes, provenance, cost — named for what produced it rather
 * than for where it ends up. Its fields were chosen so the eventual conversion
 * is a field rename in one small function, not a redesign:
 *
 * | `Segment` (theirs)  | `GeneratedAsset` (ours)                             |
 * | ------------------- | --------------------------------------------------- |
 * | `clipId`            | `id`                                                |
 * | `provider`          | `provenance.adapter`                                |
 * | `storagePath`       | `location` — a local path until their bucket exists  |
 * | `promptRef`         | `promptRef`                                         |
 * | `beat`              | `beat.label`                                        |
 *
 * That function is **not written yet**, because writing it would mean
 * declaring their type to write it against. It lands when their union lands in
 * code rather than in a plan.
 */

/** A clip to play under a voice-over, or a still. */
export type GenerationKind = 'clip' | 'image'

/**
 * The three the providers agree on, and the one parameter that moves the bill
 * most. 720p is the default — see `spend.ts` for the arithmetic behind that.
 */
export type Resolution = '480p' | '720p' | '1080p'

/** Vertical first, because every platform we post to is vertical. */
export type AspectRatio = '9:16' | '1:1' | '16:9'

/**
 * The client's own look, as words.
 *
 * **Words, not files.** A model handed a logo to reproduce produces a wrong
 * logo, and a wrong logo on a client's account is worse than no logo at all.
 * The real mark is composited by the renderer from the file the client gave
 * us, which is both the only legally clean way to do it and the VIDEO
 * session's job.
 */
export interface BrandKit {
  /** The client's name for themselves, never our account label (D131). */
  readonly brandName: string | null
  /** A plain description of the look: "muted sage and warm cream, soft light". */
  readonly look: string | null
  /** The caption treatment the renderer will burn, named so scenes leave room. */
  readonly captionStyle: string | null
  /** What this client has told us never to show. From `ClientProfile.avoid`. */
  readonly avoid: readonly string[]
}

/**
 * Which beat of which idea this fills.
 *
 * `label` is the script agent's own vocabulary — "Hook", "Setup", "Payoff",
 * "Call to action" (`SCRIPT_SYSTEM`, and `VideoBeat.label`). Typed as `string`
 * rather than a union of those four on purpose: the VIDEO session's plan names
 * a `BeatLabel` type that does not exist in code yet, and inventing our own
 * four-value union here is exactly the parallel type this module is avoiding.
 */
export interface BeatRef {
  readonly ideaTitle: string
  readonly label: string
}

/**
 * What a beat needs filling, in words, with no third-party media in it.
 *
 * ============================================================================
 * Read what this cannot express
 * ============================================================================
 *
 * There is no `referenceImages`, no `voiceReference`, no `sourceFrame`, no
 * `lipSync` and no `person`. Those are the features `grok-imagine-video-1.5`
 * is sold on, and they are absent because **non-negotiable 5** — "no
 * face-swaps; voice or likeness only with a stored consent record" — and we
 * hold no consent records.
 *
 * Leaving them out of the type is not the same as not using them. A field that
 * exists is a field somebody fills in eighteen months from now, in a hurry,
 * for a good reason. A field that does not exist has to be added in a diff
 * somebody reviews. Non-negotiable 1 gets the same treatment: with nowhere to
 * put a frame from somebody else's video, an adapter cannot be handed one —
 * the trick `20261123020000_jobs.sql` already plays by having no column for a
 * blob.
 */
export interface GenerationRequest {
  readonly workspaceId: string
  readonly beat: BeatRef
  /**
   * The scene, described. Written by the script agent from the client's own
   * profile and our own research — never a sentence lifted from a source
   * example, which `video-idea.ts` already enforces at sentence level.
   */
  readonly prompt: string
  readonly brand: BrandKit
  readonly kind: GenerationKind
  readonly aspectRatio: AspectRatio
  /** Clips only. Bounded by `MAX_CLIP_SECONDS`, not by the provider's maximum. */
  readonly seconds?: number
  readonly resolution: Resolution
}

/**
 * Which implementation answered, what it cost, and what it claims about
 * provenance.
 *
 * Carried into the UI rather than kept in a log, and that is a decision this
 * codebase has already made twice. `EngineSummary.adapters` exists because "a
 * run backed by a script sidecar must never read like a run backed by a
 * model". `VideoIdea.originality` is nullable because an absent verdict must
 * never read as a clean one. Same rule, third application.
 */
export interface Provenance {
  /** `'xai'`, `'canned'`, … — becomes `Segment.provider`. */
  readonly adapter: string
  /** The real model id, resolved, not an alias: `'grok-imagine-video-1.5-lite'`. */
  readonly model: string
  /** ISO-8601 UTC, as every other timestamp in this codebase travels. */
  readonly requestedAt: string
  /**
   * What it cost, in dollars.
   *
   * On a finished asset this is **what was billed**, computed from the seconds
   * and resolution the provider actually returned — not the projection the cap
   * was checked against. Per-second billing means a 5-second request can come
   * back 4.8 seconds long, and a ledger that recorded the guess would drift
   * from the invoice in the direction that is hardest to notice.
   */
  readonly usd: number
  /** The provider's own job id, so a dispute has something to point at. */
  readonly providerRequestId: string | null
  /**
   * Whether the provider says it embedded a watermark or provenance metadata.
   *
   * **Three-valued, and the third value is the honest one.** `null` means the
   * provider did not say. For xAI media that is the true answer today: the
   * AUP forbids "stripping, altering or circumventing embedded provenance
   * metadata or watermarks", which implies something is embedded, while the
   * watermarking documentation covers only text (SynthID Text) and audio and
   * says nothing at all about images or video.
   *
   * So the UI reads "we label this ourselves" rather than claiming a watermark
   * we cannot evidence. `false` would be a claim we have not earned either —
   * the same reasoning as `VideoIdea.originality`'s `null`: not checked must
   * never render as checked and clean.
   */
  readonly providerWatermark: boolean | null
}

/**
 * A labelled asset, with the label as a literal rather than a parameter.
 *
 * `source` and `label` have no legitimate second value. **Non-negotiable 4 is
 * not a default** — `scheduled_posts.has_ai_scenes` is a stored column with no
 * `UPDATE` grant to `authenticated` precisely so the claim "this post has no
 * AI scenes" cannot be made about a post that does, and
 * `components/calendar/post-panel.tsx` locks the toggle on. Typing these as
 * literals means an asset from this module cannot be constructed unlabelled.
 */
export interface GeneratedAsset {
  /** Ours, stable, and the thing `Segment.clipId` will be. */
  readonly id: string
  readonly kind: GenerationKind
  /**
   * Where the bytes are. A path on disk in slice 1; becomes
   * `Segment.storagePath` once the VIDEO session's bucket and its RLS review
   * land. No bucket exists in the tree today and `20261123020000_jobs.sql` is
   * explicit that adding one is "its own review".
   */
  readonly location: string
  readonly width: number
  readonly height: number
  /** Null for a still. */
  readonly seconds: number | null
  /** The script beat this fills, so the renderer knows where it goes. */
  readonly beat: BeatRef
  /**
   * A stable handle for the prompt, **not the prompt**.
   *
   * `18 §3.3` and `agent_runs.reason`'s own comment: questions are not logged
   * with identifiers, and "the client's text does not" belong in the log. A
   * reference lets two assets be recognised as coming from one prompt, and
   * lets a support conversation point at one, without storing the sentence
   * next to a workspace id. Becomes `Segment.promptRef`.
   */
  readonly promptRef: string
  /** Always `'ai-scene'` — the vocabulary `remake-plans.ts` already renders. */
  readonly source: 'ai-scene'
  /** The words the UI badge and the platform caption both use. */
  readonly label: 'AI-generated'
  readonly provenance: Provenance
}

/**
 * How a generation ended, with a refusal that is not a failure.
 *
 * Four states rather than two, and the distinction is the one
 * `lib/jobs/types.ts` argues for at length: *"a scan the cap refused is not an
 * error, and rendering it as one would teach the reader to distrust a control
 * that is working exactly as asked."*
 *
 * - `refused` — a rule said no. Ours (`safety.ts`) or the provider's
 *   moderation. **Never retried**: the answer will not change, and a retry is
 *   money spent to be told the same thing.
 * - `capped` — the spend ceiling said no, *before* any call was made. Costs
 *   nothing, and is still logged, because the schema's own comment is that "a
 *   cap that is working looks identical to a feature nobody used" if refusals
 *   leave no row.
 * - `failed` — genuinely ours or the network's. This is the only one worth
 *   trying again.
 *
 * Both refusal shapes carry two strings for the reason `SpendDecision` does:
 * `reason` for the log, `message` for the person reading the screen.
 */
export type GenerationOutcome =
  | { readonly status: 'ok'; readonly asset: GeneratedAsset }
  | {
      readonly status: 'refused'
      /** Which rule, in words, for the log. Never the prompt. */
      readonly reason: string
      /** What the client is told, in our voice. */
      readonly message: string
      /** Present when a provider refused; null when our own filter did. */
      readonly provenance: Provenance | null
    }
  | {
      readonly status: 'capped'
      readonly reason: string
      readonly message: string
    }
  | {
      readonly status: 'failed'
      readonly reason: string
      readonly message: string
      readonly provenance: Provenance | null
    }

/**
 * The environment, as much of it as this reads.
 *
 * Re-exported from the co-pilot rather than redeclared: one definition of "an
 * environment" across the app, and the comment explaining why it is not
 * `NodeJS.ProcessEnv` only has to exist once.
 */
export type { EnvLike } from '../copilot/spend'

/**
 * What one adapter must do, and the three things it must not.
 *
 * Modelled on `lib/agents/anthropic-client.ts`, whose header says the useful
 * part out loud: *"It does not decide whether to call. The cap and the
 * sample-mode decision stay with the callers… This hands out a client and
 * answers one question — is there a key."*
 *
 * So an adapter:
 * - does **not** decide whether to call. `generate` is reached only after
 *   `safety.ts` has passed the prompt and `spend.ts` has allowed the spend.
 * - does **not** throw to signal a refusal. A refusal is a return value, which
 *   is what lets the studio render it as the working control it is.
 * - does **not** price other adapters' work. `projectUsd` is per-adapter
 *   because per-second pricing by resolution varies between providers by a
 *   factor of twelve, and one shared formula would be a cap that is soft by
 *   whichever provider it was not written for. The *decision* still lives in
 *   one place (`spend.ts`), which reads this number and compares it.
 */
export interface GenerationAdapter {
  /** The name that reaches the UI as `Provenance.adapter`. */
  readonly name: string
  readonly models: Readonly<Record<GenerationKind, string>>
  /** Is there a key. The adapter answers; the caller decides what that means. */
  hasKey(env?: Readonly<Record<string, string | undefined>>): boolean
  /** What this request would cost at worst, before it is made. */
  projectUsd(request: GenerationRequest): number
  generate(request: GenerationRequest): Promise<GenerationOutcome>
}

/**
 * The longest clip this product will ask for, whatever a provider allows.
 *
 * Both xAI clip models accept 1–15 seconds. We ask for at most six, because a
 * B-roll shot under a voice-over runs three to five and the per-second bill is
 * linear: the ceiling that matters is the one that stops a typo costing
 * fifteen seconds of 1080p. `spend.ts`'s per-request ceiling makes the same
 * point in dollars; this one makes it in seconds, which is the unit the
 * mistake is made in.
 */
export const MAX_CLIP_SECONDS = 6

/** What a clip is asked for when nobody says. */
export const DEFAULT_CLIP_SECONDS = 5

/** The short edge each resolution names, in pixels. */
const SHORT_EDGE: Readonly<Record<Resolution, number>> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
}

/** How many short edges make the long one, per shape. */
const LONG_OVER_SHORT: Readonly<Record<AspectRatio, number>> = {
  '9:16': 16 / 9,
  '1:1': 1,
  '16:9': 16 / 9,
}

/**
 * The pixel size a resolution and a shape come to.
 *
 * Lives here, with the two unions it reads, rather than in each adapter —
 * every provider will need the same answer and two of them would eventually
 * disagree about what "720p, 9:16" means. The resolution names the **short**
 * edge, which is why 9:16 at 720p is 720×1280 and not 405×720: a vertical clip
 * described as 720p is 720 wide, and a renderer handed 405 pixels of width
 * would be upscaling before it started.
 *
 * Rounded to even numbers because H.264 chroma subsampling requires it, and an
 * odd dimension is the kind of thing ffmpeg refuses several steps later with a
 * message about nothing in particular.
 */
export function dimensionsFor(
  aspectRatio: AspectRatio,
  resolution: Resolution,
): { readonly width: number; readonly height: number } {
  const short = SHORT_EDGE[resolution] ?? SHORT_EDGE['720p']
  const ratio = LONG_OVER_SHORT[aspectRatio] ?? 1
  const long = Math.round((short * ratio) / 2) * 2

  return aspectRatio === '16:9'
    ? { width: long, height: short }
    : { width: short, height: long }
}
