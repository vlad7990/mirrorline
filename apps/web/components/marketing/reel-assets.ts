/**
 * Which cuts have a real 9:16 file behind them, and which are still a colour.
 *
 * `docs/plan/DESIGN_BACKLOG.md` names the landing page cut wall as the open
 * complaint: it is twelve coloured `<div>`s where reels belong. The fix needs
 * two halves — the plumbing to put footage in a frame, and the footage. This
 * module is the first half. It is the single place that answers "do we have a
 * reel for this cut yet", so the call site never has to guess and no frame can
 * claim to be a reel when the file is not there.
 *
 * The manifest is empty today. Higgsfield is on an unfunded account, so
 * nothing has been generated. Every lookup misses, every frame falls back to
 * its demo colour, and the wall renders exactly as it did before this file
 * existed. When credits land, generated stills and loops go in `public/reels/`
 * and get listed here, one line per cut.
 *
 * Two CLAUDE.md non-negotiables govern what may ever be listed:
 *   4. AI scenes are always labelled. Anything generated is marked `aiScene`
 *      on its frame, which the cut wall already reads from the schedule.
 *   7. Demo data is labelled "Sample data" on public pages. These are frames
 *      for a fictional client, not customer results, and the section that
 *      renders them carries that label.
 */

export interface ReelAsset {
  /** Served from `public/reels/`. Muted, looping, 9:16. */
  readonly videoSrc: string
  /** The first frame, shown before and instead of playback. */
  readonly posterSrc: string
}

/**
 * Cut id (`cut-01`…`cut-12`, from `@mirrorline/mock`) to its generated files.
 *
 * Empty while Higgsfield is unfunded — see the module note. A test asserts
 * that emptiness so the blocker is recorded in code and not only in a doc;
 * delete that expectation in the same commit that adds the first entry.
 */
export const REEL_MANIFEST: Readonly<Record<string, ReelAsset>> = {}

/**
 * The generated reel for a cut, or `null` when there is not one yet.
 *
 * The manifest is a parameter so the lookup stays a pure function the tests
 * can drive without touching the real list.
 */
export function reelAsset(
  cutId: string,
  manifest: Readonly<Record<string, ReelAsset>> = REEL_MANIFEST,
): ReelAsset | null {
  // `hasOwn` rather than a truthiness check: a cut called `toString` would
  // otherwise resolve to `Object.prototype.toString` and be treated as footage.
  if (!Object.hasOwn(manifest, cutId)) return null
  return manifest[cutId] ?? null
}
