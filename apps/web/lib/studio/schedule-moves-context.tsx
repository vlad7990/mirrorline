'use client'

/**
 * Rescheduling a post: shown immediately, saved, and put back if the save
 * fails.
 *
 * ## Why these live above the calendar
 *
 * They were local state in `calendar-view.tsx`, which was right while the
 * calendar was the only thing that could reschedule anything. C3 added a
 * second: the co-pilot opens with ⌘K from anywhere under `/app/*`, and
 * approving a `move-post` proposal has to perform **the same reschedule the
 * drag performs** — 18 §2.3's whole point is that the co-pilot proposes and the
 * screen disposes, so a second implementation of the move would be a second
 * thing to keep honest.
 *
 * Lifting rather than duplicating also means approving a move while standing on
 * `/app/results` and then walking to `/app/calendar` shows the post where the
 * co-pilot said it would be.
 *
 * ## What the map is now, and what it used to be
 *
 * It used to be the whole truth: "nothing is persisted, and that is the
 * product". **It is now the optimistic layer over a real write** (B2.2).
 *
 * `movePost` records the move, so the chip lands under the pointer without
 * waiting for a round trip, then calls `movePostToSlot`. On success the server
 * data and the map agree and `applyMoves` is a no-op over it; on failure the
 * entry is **removed and the chip goes back where it was**, and the caller gets
 * a sentence to show.
 *
 * The entry is deliberately *not* cleared on success. The route revalidates, so
 * the next render already has the post in its new slot — and dropping the entry
 * before that render arrives would snap the chip back for a frame, which is the
 * one thing an optimistic update exists to prevent. Applying a move that
 * matches the data is idempotent, and a reload clears the map anyway.
 */

import * as React from 'react'

import { movePostToSlot } from '@/app/app/(studio)/calendar/actions'

import type { PostMove, ScheduleMoves } from './schedule-moves'

export type MoveOutcome =
  /** The post is already in exactly this slot. Nothing was sent. */
  | { readonly status: 'unchanged' }
  | { readonly status: 'saved' }
  | { readonly status: 'failed'; readonly message: string }

export interface ScheduleMovesValue {
  readonly moves: ScheduleMoves
  /**
   * Move a post, and say what happened.
   *
   * `unchanged` matters as much as the other two: a drop onto the day a post is
   * already in is not a move, and a confirmation for it would be the screen
   * claiming to have done something it did not — which is also what a second
   * press of the co-pilot's Approve would otherwise produce.
   */
  readonly movePost: (postId: string, move: PostMove) => Promise<MoveOutcome>
}

const ScheduleMovesContext = React.createContext<ScheduleMovesValue | null>(null)

function isSameMove(a: PostMove | undefined, b: PostMove): boolean {
  return a?.date === b.date && a?.time24 === b.time24
}

/**
 * The map with one post's move put back the way it was.
 *
 * Built by filtering rather than by copying and deleting, and from the *current*
 * map rather than from the one this move started with — another post may have
 * been moved while the server was answering, and rolling back to a snapshot
 * would undo that one too.
 */
function withRolledBack(
  current: ScheduleMoves,
  postId: string,
  previous: PostMove | undefined,
): ScheduleMoves {
  const others = Object.fromEntries(Object.entries(current).filter(([id]) => id !== postId))

  return previous === undefined ? others : { ...others, [postId]: previous }
}

export function ScheduleMovesProvider({ children }: { children: React.ReactNode }) {
  const [moves, setMoves] = React.useState<ScheduleMoves>({})

  /**
   * A ref beside the state, read synchronously by `movePost`.
   *
   * `movePost` has to answer "is this post already here?" before it awaits
   * anything, and `moves` inside a `useCallback` closure is the value from the
   * render that created it. The ref is the current one. Without it, two Approve
   * presses in the same tick would both send a write.
   */
  const latest = React.useRef<ScheduleMoves>(moves)

  const apply = React.useCallback((next: ScheduleMoves) => {
    latest.current = next
    setMoves(next)
  }, [])

  const movePost = React.useCallback(
    async (postId: string, move: PostMove): Promise<MoveOutcome> => {
      const before = latest.current[postId]
      if (isSameMove(before, move)) return { status: 'unchanged' }

      // Shown first. The write follows it rather than gating it.
      apply({ ...latest.current, [postId]: move })

      const result = await movePostToSlot(postId, move.date, move.time24)

      if (result.status === 'moved') return { status: 'saved' }

      apply(withRolledBack(latest.current, postId, before))
      return { status: 'failed', message: result.message }
    },
    [apply],
  )

  const value = React.useMemo<ScheduleMovesValue>(() => ({ moves, movePost }), [moves, movePost])

  return <ScheduleMovesContext.Provider value={value}>{children}</ScheduleMovesContext.Provider>
}

/**
 * The shared moves, or a throw.
 *
 * Throws rather than returning a no-op default. A co-pilot panel rendered
 * outside the provider would otherwise show an Approve button that quietly did
 * nothing — the exact failure 18 §2.3 is written to prevent, arriving by
 * accident instead of by design.
 */
export function useScheduleMoves(): ScheduleMovesValue {
  const value = React.useContext(ScheduleMovesContext)
  if (!value) {
    throw new Error('useScheduleMoves must be used inside a ScheduleMovesProvider')
  }
  return value
}
