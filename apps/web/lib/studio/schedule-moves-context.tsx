'use client'

/**
 * This session's reschedules, held above the calendar so two screens can share
 * them.
 *
 * ## Why they moved out of `calendar-view.tsx`
 *
 * They were local state there, which was right while the calendar was the only
 * thing that could reschedule anything. C3 adds a second: the co-pilot opens
 * with ⌘K from anywhere under `/app/*`, and approving a `move-post` proposal
 * has to perform **the same reschedule the drag performs** — 18 §2.3's whole
 * point is that the co-pilot proposes and the screen disposes, so a second
 * implementation of the move would be a second thing to keep honest.
 *
 * Lifting rather than duplicating also means approving a move while standing
 * on `/app/results` and then walking to `/app/calendar` shows the post where
 * the co-pilot said it would be. A panel that reported a move the grid had
 * never heard of would be the worst version of this feature.
 *
 * ## What it still does not do
 *
 * **Nothing is persisted.** The provider sits inside the studio layout, so the
 * moves live as long as the client-side navigation does and die on a reload —
 * exactly the lifetime the old local state had, and exactly what "Sample data,
 * not saved" promises. `weekSchedule` and `weekPosts` are module constants
 * from `@mirrorline/mock` and are never written to; every screen reads them
 * through `applyMoves`, which is a pure transform.
 */

import * as React from 'react'

import type { PostMove, ScheduleMoves } from './schedule-moves'

export interface ScheduleMovesValue {
  readonly moves: ScheduleMoves
  /**
   * Record a move. Returns `false` when the post is already in exactly this
   * slot, so a caller can stay quiet rather than announcing a change that did
   * not happen — which is what a second Approve press would otherwise do.
   */
  readonly movePost: (postId: string, move: PostMove) => boolean
}

const ScheduleMovesContext = React.createContext<ScheduleMovesValue | null>(null)

function isSameMove(a: PostMove | undefined, b: PostMove): boolean {
  return a?.date === b.date && a?.time24 === b.time24
}

export function ScheduleMovesProvider({ children }: { children: React.ReactNode }) {
  const [moves, setMoves] = React.useState<ScheduleMoves>({})

  /**
   * A ref beside the state, read synchronously by `movePost`.
   *
   * `movePost` has to answer "did this change anything?" to its caller
   * immediately, and `moves` inside a `useCallback` closure is the value from
   * the render that created it. The ref is the current one. Without it, two
   * Approve presses in the same tick would both report success.
   */
  const latest = React.useRef<ScheduleMoves>(moves)

  const movePost = React.useCallback((postId: string, move: PostMove): boolean => {
    if (isSameMove(latest.current[postId], move)) return false

    const next = { ...latest.current, [postId]: move }
    latest.current = next
    setMoves(next)
    return true
  }, [])

  const value = React.useMemo<ScheduleMovesValue>(() => ({ moves, movePost }), [moves, movePost])

  return <ScheduleMovesContext.Provider value={value}>{children}</ScheduleMovesContext.Provider>
}

/**
 * The shared moves, or a throw.
 *
 * Throws rather than returning a no-op default. A co-pilot panel rendered
 * outside the provider would otherwise show an Approve button that quietly
 * did nothing — the exact failure 18 §2.3 is written to prevent, arriving by
 * accident instead of by design.
 */
export function useScheduleMoves(): ScheduleMovesValue {
  const value = React.useContext(ScheduleMovesContext)
  if (!value) {
    throw new Error('useScheduleMoves must be used inside a ScheduleMovesProvider')
  }
  return value
}
