'use client'

/**
 * Footage inside a 9:16 frame, playing only while it is on screen.
 *
 * This is the layer that turns `VideoThumb` from a coloured block into an
 * actual reel. It is deliberately the only client component in the video
 * module: `VideoThumb`, `VideoCard` and the rest stay server-rendered, and a
 * page pays for this JS only on the frames that really have a file.
 *
 * Why in-view playback rather than autoplay-everything: a wall of twelve
 * looping videos all decoding at once is the single easiest way to make a
 * landing page feel broken on a phone. An `IntersectionObserver` keeps at most
 * the visible row decoding, and `preload="none"` means nothing is fetched
 * until a frame approaches the viewport.
 *
 * Why hover is not the trigger: there is no hover on a phone, and the cut wall
 * is the one section a phone visitor is most likely to scroll through.
 *
 * Accessibility: the frame is decorative. The hook is already real text burned
 * into the caption and repeated below the frame, so the video carries no
 * information of its own and is hidden from assistive technology rather than
 * described twice. Under `prefers-reduced-motion: reduce` it never plays — the
 * poster stands in, which is what that preference asks for.
 */

import * as React from 'react'

import { cn } from '../cn'

export interface ReelMediaProps {
  /** A muted, looping, 9:16 file under `public/reels/`. */
  readonly videoSrc: string
  /** Its first frame. Shown before playback, and instead of it under reduced motion. */
  readonly posterSrc: string
  readonly className?: string
}

/**
 * Play once half the frame is on screen. Half rather than any sliver, so a
 * frame peeking in at the bottom of the fold does not start and immediately
 * stop as the reader keeps scrolling.
 */
const PLAY_THRESHOLD = 0.5

/** Matches the token layer's reduced-motion branch in `theme.css`. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function ReelMedia({ videoSrc, posterSrc, className }: ReelMediaProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Honouring the preference by never starting, rather than by starting and
    // pausing, so no frame of motion plays for a reader who asked for none.
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Autoplay can still be refused (a battery-saver mode, a browser
            // policy). The poster is already showing, so a rejection needs no
            // handling beyond not surfacing as an unhandled rejection.
            void video.play().catch(() => undefined)
          } else {
            video.pause()
          }
        }
      },
      { threshold: PLAY_THRESHOLD },
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      // Decorative: the hook is real text elsewhere in the card.
      aria-hidden="true"
      tabIndex={-1}
      // `muted` and `playsInline` are both required for inline autoplay on
      // iOS; without either, Safari takes the video fullscreen or refuses.
      muted
      playsInline
      loop
      disablePictureInPicture
      preload="none"
      poster={posterSrc}
      src={videoSrc}
      className={cn('absolute inset-0 h-full w-full object-cover', className)}
    />
  )
}
