'use client'

/**
 * Dragging a chip to another day, on pointer events rather than HTML5 DnD.
 *
 * **Why not `draggable`.** The native API hands you a drag image you cannot
 * style, a `dataTransfer` contract that differs across browsers, and
 * `dragover` semantics that fight a horizontally scrolling container — and
 * this grid lives inside `.scroll-x`. Pointer events give one code path for
 * mouse and pen, a ghost we draw ourselves, and, the part that decided it,
 * behaviour a test can drive deterministically with `mouse.move`. PR A was
 * spent on a flaky suite; picking the testable mechanism is part of that fix
 * staying fixed.
 *
 * **Drag is for mouse and pen only, and the menu is not a consolation
 * prize.** On touch, a drag inside a horizontally scrolling table either
 * steals the scroll or is stolen by it, and the honest answer is not a longer
 * press delay — it is a control that does the same job without dragging.
 * "Move to…" in the post panel is that control, and it is the WCAG 2.5.7
 * (Dragging Movements) path for keyboard, screen reader and touch alike. It
 * does strictly more than the drag, too: the drag changes the day, the menu
 * changes the day *and* the time.
 *
 * **A drag must not swallow a click.** The chip is a button that opens the
 * post, and people nudge the mouse while clicking. Nothing happens until the
 * pointer has travelled `DRAG_THRESHOLD_PX`; under that it stays a click.
 * After a real drag the `click` the browser fires next is swallowed once, or
 * every drop would re-select the chip it just moved.
 */

import * as React from 'react'

/** The cell a chip can be dropped on. Platform is fixed; only the day moves. */
export interface DropTarget {
  readonly platform: string
  readonly date: string
}

/** What the ghost needs to draw itself, plus where the pointer is. */
export interface ChipDragState {
  readonly postId: string
  readonly title: string
  readonly timeLabel: string
  /** Viewport coordinates — the ghost is `position: fixed`. */
  readonly x: number
  readonly y: number
  /** The cell under the pointer, or null when it is not over a valid one. */
  readonly over: DropTarget | null
  /** Where the chip started, so a drop back home can be ignored. */
  readonly from: DropTarget
}

export interface ChipDragStart {
  readonly postId: string
  readonly title: string
  readonly timeLabel: string
  readonly platform: string
  readonly date: string
}

/** Far enough that it cannot be a shaky click, short enough to feel direct. */
const DRAG_THRESHOLD_PX = 6

/** Set by `week-grid.tsx` on each day cell: "instagram|2026-11-10". */
export const DROP_CELL_ATTRIBUTE = 'data-drop-cell'

function targetFromPoint(x: number, y: number): DropTarget | null {
  const element = document.elementFromPoint(x, y)
  const cell = element?.closest(`[${DROP_CELL_ATTRIBUTE}]`)
  const value = cell?.getAttribute(DROP_CELL_ATTRIBUTE)
  if (!value) return null

  const [platform, date] = value.split('|')
  if (!platform || !date) return null
  return { platform, date }
}

export interface UseChipDrag {
  /** Null unless a drag is really in progress, past the threshold. */
  readonly drag: ChipDragState | null
  /** Wire to the chip's `onPointerDown`. */
  readonly onChipPointerDown: (start: ChipDragStart, event: React.PointerEvent) => void
}

export function useChipDrag(onDrop: (postId: string, target: DropTarget) => void): UseChipDrag {
  const [drag, setDrag] = React.useState<ChipDragState | null>(null)

  // Everything the window listeners need, in a ref so they can be attached
  // once per drag rather than re-bound on every pointermove.
  const pending = React.useRef<{
    start: ChipDragStart
    originX: number
    originY: number
    active: boolean
  } | null>(null)

  // `onDrop` is rebuilt on every render of the view; the listeners have to
  // call the current one without being torn down and re-attached mid-drag.
  const onDropRef = React.useRef(onDrop)
  React.useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  const onChipPointerDown = React.useCallback((start: ChipDragStart, event: React.PointerEvent) => {
    // Touch keeps the scroll it expects; mouse and pen can drag. Everything
    // else uses the menu — see the header.
    if (event.pointerType === 'touch') return
    // Secondary buttons open context menus; they are not a drag.
    if (event.button !== 0) return

    pending.current = { start, originX: event.clientX, originY: event.clientY, active: false }

    const swallowClickOnce = () => {
      window.addEventListener(
        'click',
        (click) => {
          click.stopPropagation()
          click.preventDefault()
        },
        { capture: true, once: true },
      )
    }

    const finish = (committed: boolean) => {
      const current = pending.current
      pending.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)

      if (current?.active) swallowClickOnce()

      setDrag((state) => {
        if (committed && state?.over && current) {
          // Dropping a chip back where it started is a cancelled drag, not a
          // move — announcing one would be a lie the toast tells.
          const movedDay = state.over.date !== current.start.date
          const sameRow = state.over.platform === current.start.platform
          if (sameRow && movedDay) onDropRef.current(current.start.postId, state.over)
        }
        return null
      })
    }

    const onMove = (move: PointerEvent) => {
      const current = pending.current
      if (!current) return

      if (!current.active) {
        const far =
          Math.abs(move.clientX - current.originX) > DRAG_THRESHOLD_PX ||
          Math.abs(move.clientY - current.originY) > DRAG_THRESHOLD_PX
        if (!far) return
        current.active = true
      }

      move.preventDefault()
      const over = targetFromPoint(move.clientX, move.clientY)
      setDrag({
        postId: current.start.postId,
        title: current.start.title,
        timeLabel: current.start.timeLabel,
        x: move.clientX,
        y: move.clientY,
        // Only the chip's own platform row can take it. A cell on another row
        // reads as "no", which is what `over: null` draws.
        over: over && over.platform === current.start.platform ? over : null,
        from: { platform: current.start.platform, date: current.start.date },
      })
    }

    const onUp = () => finish(true)
    const onKey = (key: KeyboardEvent) => {
      if (key.key === 'Escape') finish(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
  }, [])

  return { drag, onChipPointerDown }
}
