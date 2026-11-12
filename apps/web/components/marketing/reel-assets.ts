/**
 * Which cuts have a real 9:16 file behind them, and which are still a colour.
 *
 * `docs/plan/DESIGN_BACKLOG.md` named the landing page cut wall as the open
 * complaint: it was twelve coloured `<div>`s where reels belong. The fix needed
 * two halves — the plumbing to put footage in a frame, and the footage. This
 * module is the join between them. It is the single place that answers "do we
 * have something for this cut yet", so the call site never has to guess and no
 * frame can claim to be footage when the file is not there.
 *
 * **All twelve cuts carry a generated still and a five-second loop** (D28,
 * D29). `videoSrc` stays optional anyway: a still is a legitimate end state,
 * not a half-finished video, and a cut with only a poster renders as a plain
 * image with no client JS at all. A cut with a `videoSrc` plays while it is
 * in view and holds the poster otherwise.
 *
 * Two CLAUDE.md non-negotiables govern what may ever be listed:
 *   4. AI scenes are always labelled. Every file here is generated, so the
 *      section that renders them says so in its own words — see `CutWall`.
 *      The per-frame `aiScene` badge keeps meaning what it means inside the
 *      product, which is a property of the fictional client's schedule.
 *   7. Demo data is labelled "Sample data" on public pages. These are frames
 *      for a fictional client, not customer results.
 */

export interface ReelAsset {
  /**
   * The still, served from `public/reels/`. Always present: a frame with no
   * image is not an entry, it is an absence, and `reelAsset` returns null.
   */
  readonly posterSrc: string
  /**
   * A muted, looping, 9:16 file, when the cut has one.
   *
   * Optional because a generated still is a legitimate end state, not a
   * half-finished video. Twelve looping files decoding at once is the easiest
   * way to make a landing page feel broken on a phone, and a still costs no
   * JavaScript. Where a cut has one, `ReelMedia` plays it in view.
   */
  readonly videoSrc?: string
}

/**
 * Cut id (`cut-01`…`cut-12`, from `@mirrorline/mock`) to its generated files.
 *
 * Generated 2026-11-12 with Nano Banana Pro from a single reference portrait,
 * so the same fictional presenter appears in every frame. That constraint is
 * the point rather than a nicety: these are twelve cuts of **one** 52-minute
 * episode, so the room, the light and the sweater do not change between them.
 * A set where the wardrobe drifted would quietly contradict the claim the
 * section makes.
 *
 * A test asserts that every file listed here exists on disk, so an entry can
 * never outlive its asset.
 */
export const REEL_MANIFEST: Readonly<Record<string, ReelAsset>> = {
  'cut-01': { posterSrc: '/reels/cut-01.webp', videoSrc: '/reels/cut-01.mp4' },
  'cut-02': { posterSrc: '/reels/cut-02.webp', videoSrc: '/reels/cut-02.mp4' },
  'cut-03': { posterSrc: '/reels/cut-03.webp', videoSrc: '/reels/cut-03.mp4' },
  'cut-04': { posterSrc: '/reels/cut-04.webp', videoSrc: '/reels/cut-04.mp4' },
  'cut-05': { posterSrc: '/reels/cut-05.webp', videoSrc: '/reels/cut-05.mp4' },
  'cut-06': { posterSrc: '/reels/cut-06.webp', videoSrc: '/reels/cut-06.mp4' },
  'cut-07': { posterSrc: '/reels/cut-07.webp', videoSrc: '/reels/cut-07.mp4' },
  'cut-08': { posterSrc: '/reels/cut-08.webp', videoSrc: '/reels/cut-08.mp4' },
  'cut-09': { posterSrc: '/reels/cut-09.webp', videoSrc: '/reels/cut-09.mp4' },
  'cut-10': { posterSrc: '/reels/cut-10.webp', videoSrc: '/reels/cut-10.mp4' },
  'cut-11': { posterSrc: '/reels/cut-11.webp', videoSrc: '/reels/cut-11.mp4' },
  'cut-12': { posterSrc: '/reels/cut-12.webp', videoSrc: '/reels/cut-12.mp4' },
}

/**
 * The generated asset for a cut, or `null` when there is not one yet.
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
