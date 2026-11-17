/**
 * Milo, drawn. One component, two shapes, five states.
 *
 * No `'use client'`: this renders an `<img>` and some class names, and
 * nothing here needs an event or a hook. The state arrives as a prop from
 * whichever client component is holding the co-pilot's stream, so the mascot
 * can appear on a server-rendered page — `/about`, the onboarding welcome —
 * without dragging a bundle along for the ride.
 *
 * ## Why `<img>` and not `next/image`
 *
 * These are fixed-size, already the right dimensions, and already WebP. The
 * optimiser's job — pick a format, pick a size, serve it from a CDN route —
 * is work that has been done at build time by `scripts/mascot-assets.mjs`,
 * and routing a 2 KB file through `/_next/image` would make it slower and
 * add a server round trip to the first paint of every public page.
 *
 * ## The motion lives in CSS, and so does its absence
 *
 * The state is a `data-milo-state` attribute and `globals.css` decides what
 * that looks like, all of it inside the `prefers-reduced-motion:
 * no-preference` block the rest of the site already uses. So stillness is the
 * default and the animation is the exception, rather than an animation with
 * an off switch somebody has to remember to wire up.
 *
 * ## The seam a Rive file replaces
 *
 * Everything above the line is `MiloState` in, a picture out. A Rive runtime
 * swapped in here reads the same five state names from the same
 * `miloStateFor`, and `lib/copilot` never learns that anything changed.
 */

import { cn } from '@mirrorline/ui'

import {
  MILO_ART,
  MILO_AVATAR_SIZES,
  type MiloAvatarSize,
  type MiloState,
} from '@/lib/mascot/milo'

/** Where Milo is being drawn, which decides the crop and the loading rule. */
export type MiloShape = 'avatar' | 'full'

export interface MiloAvatarProps {
  readonly state: MiloState
  /**
   * `avatar` is head and shoulders — the launcher at 56px, a panel header at
   * 32px. `full` is the whole character, and the brief restricts it to the
   * chat empty state, the onboarding welcome and `/about`.
   */
  readonly shape?: MiloShape
  /** The rendered size in CSS pixels. The asset is picked at twice it. */
  readonly size?: number
  /**
   * Let CSS decide the size, and let the browser pick the file.
   *
   * The launcher is 72px on a phone, 88px on a tablet and 112px from 1024px
   * up — three sizes no single `size` number can express. In this mode the
   * element carries all three assets as a `srcset` and the caller's CSS sets
   * the box, so a phone fetches the 64px file where a desktop fetches the
   * 224px one and nothing is ever drawn below its own resolution.
   *
   * `width`/`height` stay at the largest, which is what keeps the box square
   * and CLS at 0 before the file lands.
   */
  readonly responsive?: boolean
  readonly className?: string
}

/**
 * What the launcher occupies at each breakpoint, for the browser to choose a
 * file from. Mirrors the three widths in `globals.css`; a disagreement costs
 * sharpness rather than layout, which is why the CSS is the one that decides.
 */
const LAUNCHER_SIZES = '(min-width: 1024px) 112px, (min-width: 640px) 88px, 72px'

/** The default where a caller gives no size: a panel header's Milo. */
export const MILO_AVATAR_DEFAULT = 56

/** The largest the launcher ever draws, and the box it reserves. */
export const MILO_LAUNCHER_MAX = 112

/** A ~180px display for the full body, from the 360px asset. */
export const MILO_FULL_DEFAULT = 180

/**
 * The asset width for a display width: twice it, snapped to what was built.
 *
 * Snapping up rather than down, because a 64px asset stretched to 56px is
 * visibly soft and the larger file is 4 KB.
 */
function avatarAssetFor(size: number): MiloAvatarSize {
  return size * 2 > 64 ? 112 : 64
}

export function MiloAvatar({
  state,
  shape = 'avatar',
  size,
  responsive = false,
  className,
}: MiloAvatarProps) {
  const art = MILO_ART[state]
  const isFull = shape === 'full'
  const rendered = size ?? (isFull ? MILO_FULL_DEFAULT : MILO_AVATAR_DEFAULT)

  const source = isFull ? art.full : art.avatars[avatarAssetFor(rendered)]

  // Every avatar width, described by its real pixel width, so the browser can
  // weigh them against the CSS box and the screen's density itself. Only in
  // `responsive` mode: everywhere else the size is known and one file is the
  // honest answer.
  const srcSet = responsive
    ? MILO_AVATAR_SIZES.map((width) => `${art.avatars[width]} ${width}w`).join(', ')
    : undefined

  return (
    /* The format, the size and the compression are decided at build time by
       scripts/mascot-assets.mjs, so the optimiser has nothing left to do, and
       routing a 2 KB WebP through /_next/image would add a server round trip
       to the first paint of every public page to save nothing. The same
       reasoning the frame strips on /how-it-works and /product already carry.
       The directive has to be the last line of the comment: it disables the
       line after the one it ends on, not after the one it starts on. */
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src={source}
      srcSet={srcSet}
      sizes={responsive ? LAUNCHER_SIZES : undefined}
      alt={art.alt}
      width={responsive ? MILO_LAUNCHER_MAX : rendered}
      height={isFull ? undefined : responsive ? MILO_LAUNCHER_MAX : rendered}
      // The full body is never above the fold: it is inside a panel that has
      // to be opened, an onboarding step, or far down /about. The avatar on
      // the launcher is the only mascot a first paint fetches.
      loading={isFull ? 'lazy' : 'eager'}
      decoding="async"
      draggable={false}
      data-milo-state={state}
      // Marks the four states still drawn from the concept render. Read by
      // nothing at runtime and deliberately visible in the DOM: it is how a
      // placeholder is told apart from finished art by anyone inspecting a
      // preview, without putting the word in front of a visitor.
      data-milo-placeholder={art.isPlaceholder ? 'true' : undefined}
      className={cn(
        'milo select-none object-cover',
        // The renders are opaque, on the ink field they were lit for, so the
        // badge *is* the artwork's background rather than a shape laid over
        // it. Rounded in CSS so it stays crisp at any size and costs nothing
        // in the file. See the header of `scripts/mascot-assets.mjs` for why
        // there is no transparent cut-out.
        isFull ? 'milo--full rounded-xl' : 'milo--avatar rounded-[25%]',
        className,
      )}
      style={isFull ? { width: rendered, height: 'auto' } : undefined}
    />
  )
}
