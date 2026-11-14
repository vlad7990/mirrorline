'use client'

/**
 * "Move to…" — rescheduling without dragging.
 *
 * **This is the WCAG 2.5.7 path, and it is deliberately the better one.**
 * SC 2.5.7 (Dragging Movements, AA in 2.2) asks that anything operated by a
 * drag also work with a single pointer that does not drag. That is the floor.
 * This clears it and keeps going: a drag can only change the day, because the
 * grid has one cell per day and no finer target inside it, while this changes
 * the day *and* the time. Keyboard, screen reader and touch get the more
 * capable control, not the grudging equivalent.
 *
 * **The times offered are the ones that platform already posts in.** A free
 * text field would invent a scheduling engine we do not have — see
 * `lib/studio/schedule-moves.ts`. The Publisher posts in the slots the plan
 * bought, so those are the slots on the menu.
 *
 * **The platform is not on the menu either.** Moving a post between platform
 * rows is a publishing decision under different rules, not a scheduling one.
 * The drag refuses it and so does this.
 */

import type { ScheduledPost } from '@mirrorline/mock'
import { Button, Label, Select } from '@mirrorline/ui'
import { useId, useState } from 'react'

import type { PostMove } from '@/lib/studio/schedule-moves'

export interface MoveToMenuProps {
  post: ScheduledPost
  /** Every day column, in order, as {value: ISO date, label: "Tue 10"}. */
  days: readonly { readonly value: string; readonly label: string }[]
  /** The slots this platform posts in. */
  slots: readonly { readonly time24: string; readonly timeLabel: string }[]
  onMove: (postId: string, move: PostMove) => void
}

export function MoveToMenu({ post, days, slots, onMove }: MoveToMenuProps) {
  const headingId = useId()
  const dayFieldId = useId()
  const timeFieldId = useId()

  // Seeded from where the post is now, so the menu opens describing reality
  // rather than asking the reader to re-state it.
  const [date, setDate] = useState(post.date)
  const [time24, setTime24] = useState(post.time24)

  const isUnchanged = date === post.date && time24 === post.time24
  const chosenSlot = slots.find((slot) => slot.time24 === time24)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h3 id={headingId} className="m-0 text-label font-semibold text-text">
        Move to…
      </h3>

      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 basis-[120px] flex-col gap-1">
          <Label htmlFor={dayFieldId}>Day</Label>
          <Select
            id={dayFieldId}
            options={days.map((day) => ({ value: day.value, label: day.label }))}
            value={date}
            onValueChange={setDate}
          />
        </div>

        <div className="flex min-w-0 flex-1 basis-[120px] flex-col gap-1">
          <Label htmlFor={timeFieldId}>Time</Label>
          <Select
            id={timeFieldId}
            options={slots.map((slot) => ({ value: slot.time24, label: slot.timeLabel }))}
            value={time24}
            onValueChange={setTime24}
          />
        </div>
      </div>

      <Button
        variant="secondary"
        className="press"
        fullWidth
        // Disabled only when it would do nothing. Rescheduling a post to
        // where it already is would still fire a toast, and a confirmation of
        // something that did not happen is the kind of small lie that teaches
        // people to stop reading them.
        disabled={isUnchanged}
        onClick={() => {
          if (isUnchanged || !chosenSlot) return
          onMove(post.id, { date, time24, timeLabel: chosenSlot.timeLabel })
        }}
      >
        {isUnchanged ? 'Already there' : 'Move post'}
      </Button>
    </section>
  )
}
