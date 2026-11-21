'use client'

/**
 * S6 · Calendar and approvals.
 *
 * ============================================================================
 * The week is a prop now, not a module constant (B2.2)
 * ============================================================================
 *
 * It used to be `weekSchedule` and `weekPosts` from `@mirrorline/mock`, read at
 * module scope — so everything derived from them (the first day, tomorrow, the
 * platform count, the day options) could be a module constant too. The week is
 * now `scheduled_posts` for the signed-in workspace, fetched by
 * `read-week-schedule.ts` in the route and handed down.
 *
 * Every one of those derived values therefore moved inside the component and
 * became a `useMemo`. That is not ceremony: a module constant computed from
 * props is computed once per *process*, so the second workspace to render on a
 * warm server would have been shown the first one's week.
 *
 * Statuses are still the one piece of state this screen owns, and still
 * session-only — approving a post is a later write, not this one. Every update
 * replaces the map rather than editing it.
 */

import type { PostStatus, ScheduledPost, WeekSchedule } from '@mirrorline/mock'
import {
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogTitle,
  Drawer,
  Eyebrow,
  SegmentedControl,
  Toast,
} from '@mirrorline/ui'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'

import { useIsWide } from '@/lib/motion/use-is-wide'
import { useScheduleMoves } from '@/lib/studio/schedule-moves-context'
import {
  applyMoves,
  movedPost,
  movedWeekPosts,
  type PostMove,
  timeSlotsFor,
} from '@/lib/studio/schedule-moves'

import { PostPanel } from './post-panel'
import { type DropTarget, useChipDrag } from './use-chip-drag'
import { WeekGrid } from './week-grid'

/* -------------------------------------------------------------------------- */
/* Constants that do not depend on the week                                    */
/* -------------------------------------------------------------------------- */

/** The panel opens on the second chip of tomorrow's first platform row. */
const DEFAULT_SELECTION_INDEX = 1

const APPROVAL_MODES = [
  { value: 'each', label: 'Approve each post' },
  { value: 'auto', label: 'Auto-approve after 24h' },
] as const

const DEFAULT_MODE = APPROVAL_MODES[0].value

const MODE_NOTES: Readonly<Record<string, string>> = {
  each: 'Nothing goes out until you approve it.',
  auto: 'Posts go out 24 hours after we show them to you, unless you object.',
}

/** How long a confirmation stays on screen. */
const TOAST_MS = 4000
/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type StatusOverrides = Readonly<Record<string, PostStatus>>

interface ToastState {
  readonly title: string
  readonly description: string
}

/* -------------------------------------------------------------------------- */
/* View                                                                        */
/* -------------------------------------------------------------------------- */

export interface CalendarViewProps {
  /** This workspace's week, built from `scheduled_posts` by the route. */
  readonly schedule: WeekSchedule
  /** The same posts, flat — the panel and the counters index by them. */
  readonly posts: readonly ScheduledPost[]
}

export function CalendarView({ schedule: weekSchedule, posts: weekPosts }: CalendarViewProps) {
  const [overrides, setOverrides] = useState<StatusOverrides>({})
  /**
   * Reschedules made in this session, keyed by post.
   *
   * **Held in the studio layout rather than here**, since C3. They were local
   * state while the calendar was the only thing that could reschedule
   * anything; the co-pilot's Approve is the second, and it has to perform the
   * same move rather than a second copy of it (18 §2.3). The lifetime is
   * unchanged — a client-side navigation keeps them, a reload does not, which
   * is what "not saved" promises.
   */
  const { moves, movePost } = useScheduleMoves()

  /* ---------------------------------------------------------------------- */
  /* Read off the week, which is now a prop                                 */
  /* ---------------------------------------------------------------------- */

  const firstDay = weekSchedule.days[0] ?? null

  /**
   * Tomorrow, which the batch bar and the grid's highlight both need.
   *
   * Null when no day is today — which happens when the workspace has no time
   * zone captured (D97), because nothing is highlighted on a guess. The bar
   * then has nothing to approve, which is the honest degradation.
   */
  const tomorrow = useMemo(() => {
    const todayIndex = weekSchedule.days.findIndex((day) => day.isToday)
    return todayIndex >= 0 ? (weekSchedule.days[todayIndex + 1] ?? null) : null
  }, [weekSchedule])

  const defaultPostId = useMemo(() => {
    const firstRowTomorrow = tomorrow
      ? (weekSchedule.rows[0]?.cells.find((cell) => cell.date === tomorrow.date)?.posts ?? [])
      : []

    return (
      firstRowTomorrow[DEFAULT_SELECTION_INDEX]?.id ??
      firstRowTomorrow[0]?.id ??
      weekPosts[0]?.id ??
      null
    )
  }, [tomorrow, weekPosts, weekSchedule])

  const postById = useMemo<ReadonlyMap<string, ScheduledPost>>(
    () => new Map(weekPosts.map((post) => [post.id, post])),
    [weekPosts],
  )

  const dayLabelByDate = useMemo<Readonly<Record<string, string>>>(
    () =>
      Object.fromEntries(
        weekSchedule.days.map((day) => [day.date, `${day.dayLabel} ${day.dayOfMonth}`]),
      ),
    [weekSchedule],
  )

  /** The days, in grid order, for the "Move to…" menu. */
  const dayOptions = useMemo(
    () =>
      weekSchedule.days.map((day) => ({
        value: day.date,
        label: `${day.dayLabel} ${day.dayOfMonth}`,
      })),
    [weekSchedule],
  )

  const platformCount = weekSchedule.rows.length

  /** Measured off the grid rather than asserted, so the eyebrow cannot lie. */
  const { minPerDay, maxPerDay } = useMemo(() => {
    const counts = weekSchedule.rows.flatMap((row) => row.cells.map((cell) => cell.posts.length))
    return {
      minPerDay: counts.length > 0 ? Math.min(...counts) : 0,
      maxPerDay: counts.length > 0 ? Math.max(...counts) : 0,
    }
  }, [weekSchedule])

  const [selectedPostId, setSelectedPostId] = useState<string | null>(defaultPostId)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [mode, setMode] = useState<string>(DEFAULT_MODE)
  const [toast, setToast] = useState<ToastState | null>(null)

  /** Counts batch approvals rather than holding a boolean, so each one fires. */
  const [approveAllCount, setApproveAllCount] = useState(0)
  const batchMessageRef = useRef<HTMLParagraphElement>(null)

  const isWide = useIsWide()

  // SC 2.4.3: once nothing is pending the "Approve all" button unmounts, and
  // focus would land on <body>. The batch bar's own sentence is the thing that
  // just changed, so focus moves there and it gets read out.
  useEffect(() => {
    if (approveAllCount === 0) return
    batchMessageRef.current?.focus()
  }, [approveAllCount])

  const statusOf = useCallback(
    (post: ScheduledPost): PostStatus => overrides[post.id] ?? post.status,
    [overrides],
  )

  const handleSelect = useCallback(
    (postId: string) => {
      setSelectedPostId(postId)
      if (!isWide) setDrawerOpen(true)
    },
    [isWide],
  )

  const handleApprove = useCallback((postId: string) => {
    setOverrides((previous) => ({ ...previous, [postId]: 'approved' }))
    setToast({ title: 'Approved', description: 'The Publisher agent will post it at its time.' })
  }, [])

  const handleSendBack = useCallback((postId: string) => {
    setOverrides((previous) => ({ ...previous, [postId]: 'needs-review' }))
    setToast({ title: 'Sent back', description: 'It stays in needs review until you approve it.' })
  }, [])

  /**
   * The week as the grid should draw it, with any in-flight move applied.
   *
   * `weekSchedule` is in the deps because it is a prop now. The route
   * revalidates after a move, so a list of `[moves]` alone would redraw from
   * the week this component first rendered with — the chip would appear to
   * move, then the server's answer would arrive and be ignored.
   */
  const schedule = useMemo(() => applyMoves(weekSchedule, moves), [moves, weekSchedule])
  const posts = useMemo(() => movedWeekPosts(weekPosts, moves), [moves, weekPosts])

  /**
   * One place both paths land, so the drag and the menu cannot drift apart —
   * same write, same confirmation, same wording.
   */
  const handleMove = useCallback(
    async (postId: string, move: PostMove) => {
      // Three outcomes, and each gets what it deserves. `unchanged` is a drop
      // onto the day a post is already in: not a move, and a toast for it
      // would be the screen claiming to have done something it did not.
      const outcome = await movePost(postId, move)

      if (outcome.status === 'unchanged') return

      if (outcome.status === 'failed') {
        // The chip has already snapped back by the time this renders — the
        // provider rolled the move back before resolving. So the toast says
        // what is true rather than apologising for something still on screen.
        setToast({ title: 'Not moved', description: outcome.message })
        return
      }

      setToast({
        title: `Moved to ${dayLabelByDate[move.date] ?? 'another day'}, ${move.timeLabel}`,
        description: 'Saved to your schedule. Nothing has been published.',
      })
    },
    [dayLabelByDate, movePost],
  )

  /**
   * A drop changes the day and keeps the time, because a day column has no
   * finer target inside it. Inventing a time from the drop's y position would
   * be a number the reader did not choose.
   */
  const handleDrop = useCallback(
    (postId: string, target: DropTarget) => {
      const post = posts.find((candidate) => candidate.id === postId)
      if (!post) return
      handleMove(postId, { date: target.date, time24: post.time24, timeLabel: post.timeLabel })
    },
    [handleMove, posts],
  )

  const { drag, onChipPointerDown } = useChipDrag(handleDrop)

  /** Tomorrow's set changes when a post is moved on or off that day. */
  const tomorrowPosts = useMemo(
    () => (tomorrow ? posts.filter((post) => post.date === tomorrow.date) : []),
    [posts, tomorrow],
  )

  const pendingTomorrow = useMemo(
    () => tomorrowPosts.filter((post) => (overrides[post.id] ?? post.status) === 'needs-review'),
    [overrides, tomorrowPosts],
  )

  const handleApproveAll = useCallback(() => {
    const ids = pendingTomorrow.map((post) => post.id)
    if (ids.length === 0) return
    setOverrides((previous) => ({
      ...previous,
      ...Object.fromEntries(ids.map((id) => [id, 'approved' as const])),
    }))
    setToast({
      title: `Approved ${ids.length} posts`,
      description: `They go out on ${tomorrow ? (dayLabelByDate[tomorrow.date] ?? 'their day') : 'their day'}.`,
    })
    setApproveAllCount((previous) => previous + 1)
  }, [dayLabelByDate, pendingTomorrow, tomorrow])

  // Read through the moves, or the panel would keep describing the day the
  // post was on before it was dragged.
  const selectedBase = selectedPostId ? (postById.get(selectedPostId) ?? null) : null
  const selectedPost = selectedBase ? movedPost(selectedBase, moves) : null

  const panel = selectedPost ? (
    <PostPanel
      key={selectedPost.id}
      post={selectedPost}
      status={statusOf(selectedPost)}
      dayLabel={dayLabelByDate[selectedPost.date] ?? ''}
      onApprove={handleApprove}
      onSendBack={handleSendBack}
      days={dayOptions}
      slots={timeSlotsFor(weekSchedule, selectedPost.platform)}
      onMove={handleMove}
    />
  ) : (
    <p className="m-0 text-body text-text-muted">Choose a post on the calendar to review it.</p>
  )

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>
            {/* Counts read off the grid itself, so they are measured. */}
            Publisher agent · <span className="machine">{platformCount}</span> platforms ·{' '}
            <span className="machine">
              {minPerDay} to {maxPerDay}
            </span>{' '}
            posts a day each
          </Eyebrow>
          <h1 className="m-0 font-heading text-headline text-text">
            {firstDay ? `Week of ${firstDay.dayOfMonth} ${firstDay.monthLabel}` : 'This week'}
          </h1>
        </div>
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          <SegmentedControl
            label="Approval mode"
            items={APPROVAL_MODES.map((item) => ({ value: item.value, label: item.label }))}
            value={mode}
            onValueChange={setMode}
            // At 390px the two labels do not fit on one line; wrapping keeps
            // the page from scrolling sideways.
            className="max-w-full flex-wrap"
          />
          <p className="m-0 max-w-[46ch] text-meta text-text-muted lg:text-right">
            {MODE_NOTES[mode] ?? ''}
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <Card as="section" aria-labelledby="week-grid-heading" padding="sm" className="min-w-0">
          <h2 id="week-grid-heading" className="sr-only">
            Posts this week, by platform
          </h2>
          {/* "Sample data, not saved" was here until B2.2, and it has been
              removed because it stopped being true: these are this workspace's
              own posts, and a move is written to `scheduled_posts`. Leaving it
              would be the mirror of the dishonesty it was added to prevent —
              telling somebody their change was not saved when it was.

              Non-negotiable 7 is unaffected: it requires demo data to be
              labelled, and there is none left on this screen. The sentence
              still says what a move does *not* do, because the Publisher does
              not exist yet and "rescheduled" could be read as "reposted". */}
          <p className="m-0 mb-2.5 text-caption text-text-muted">
            Drag a post to another day, or use <strong className="font-semibold">Move to…</strong>{' '}
            on the right. Changing a time here changes the schedule, not anything already
            published.
          </p>
          <WeekGrid
            schedule={schedule}
            highlightDate={tomorrow?.date ?? null}
            statusOf={statusOf}
            selectedPostId={selectedPostId}
            onSelect={handleSelect}
            drag={drag}
            onChipPointerDown={onChipPointerDown}
          />
        </Card>

        <Card as="aside" aria-labelledby="selected-post-heading" className="hidden min-w-0 xl:block">
          <h2 id="selected-post-heading" className="sr-only">
            Selected post
          </h2>
          {panel}
        </Card>
      </div>

      {/* The ghost. `fixed` and `pointer-events-none`, so it never becomes
          the element under the pointer and steals its own drop target. */}
      {drag ? (
        <div
          aria-hidden="true"
          data-drag-ghost="true"
          className="pointer-events-none fixed z-50 w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-ink bg-surface p-1 opacity-90 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
          style={{ left: drag.x, top: drag.y }}
        >
          <span className="machine block text-[11px] font-bold leading-tight text-text">
            {drag.timeLabel}
          </span>
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-text">
            {drag.title}
          </span>
          <span className="mt-0.5 block text-[9px] leading-tight text-text-muted">
            {drag.over ? 'Drop to move' : 'Drop on a day in this row'}
          </span>
        </div>
      ) : null}

      <BatchBar
        readyCount={tomorrowPosts.length}
        pendingCount={pendingTomorrow.length}
        dayLabel={tomorrow ? (dayLabelByDate[tomorrow.date] ?? '') : ''}
        messageRef={batchMessageRef}
        onApproveAll={handleApproveAll}
      />

      {/* Below xl the same panel arrives as a focus-trapped, Escape-closable
          drawer. The aside above is `hidden xl:block` — CSS — so this `open`
          expression is the whole of this route's exposure to viewport width,
          and `isDrawerOpen` starts `false`, so the first render is the same
          tree at 390 as at 1440. That is the short form of why React #418
          cannot be width-specific here; the long form is in
          `lib/motion/use-is-wide.ts`, and the history is D55 and D63. */}
      <Dialog open={!isWide && isDrawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer>
          <DialogTitle>Selected post</DialogTitle>
          <DialogDescription className="sr-only">
            Review this post, edit its caption, then approve it or send it back.
          </DialogDescription>
          {panel}
        </Drawer>
      </Dialog>

      <Toast
        open={toast !== null}
        title={toast?.title ?? ''}
        description={toast?.description}
        durationMs={TOAST_MS}
        onDismiss={() => setToast(null)}
        // A fixed element wider than the viewport would scroll the page.
        className="max-w-[calc(100vw-32px)]"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Batch bar                                                                   */
/* -------------------------------------------------------------------------- */

interface BatchBarProps {
  /** Everything scheduled for tomorrow. */
  readyCount: number
  /** How many of those still wait for a person. */
  pendingCount: number
  dayLabel: string
  /** Takes focus when the batch button disappears from under the keyboard. */
  messageRef: Ref<HTMLParagraphElement>
  onApproveAll: () => void
}

/** DESIGN.md "Ink": the batch-approval bar is one of the screen's dark panels. */
function BatchBar({
  readyCount,
  pendingCount,
  dayLabel,
  messageRef,
  onApproveAll,
}: BatchBarProps) {
  // The counts come from tomorrow's chips, so the sentence changes with them
  // rather than repeating a number from the mockup. The counts themselves are
  // the Publisher's tally and go mono; the sentence around them is the studio
  // talking, so it stays in Geist — DESIGN.md "Typography — two voices".
  const ready = <span className="machine">{readyCount}</span>
  const pending = <span className="machine">{pendingCount}</span>

  let message: ReactNode = (
    <>
      Tomorrow is approved. The Publisher will post {ready} videos on {dayLabel}.
    </>
  )
  if (pendingCount > 0 && pendingCount === readyCount) {
    message = (
      <>
        Tomorrow: {ready} posts ready. All {pending} need your eye.
      </>
    )
  } else if (pendingCount > 0) {
    message = (
      <>
        Tomorrow: {ready} posts ready, {pending} need your eye.
      </>
    )
  }

  return (
    <Card
      as="section"
      aria-label="Tomorrow's approvals"
      tone="ink"
      padding="none"
      className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3.5"
    >
      <p ref={messageRef} tabIndex={-1} className="m-0 text-body">
        {message}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        {pendingCount > 0 ? (
          // A button label is the studio talking, so the count inside it stays
          // in Geist even though the same figure goes mono in the sentence.
          <Button
            variant="primary"
            size="md"
            className="press bg-accent text-ink hover:bg-accent/90"
            onClick={onApproveAll}
          >
            Approve all {pendingCount} for tomorrow
          </Button>
        ) : null}
        <Link
          href="/app/results"
          className="press inline-flex min-h-11 items-center rounded-md px-4 text-label text-accent underline-offset-4 hover:underline"
        >
          See results
        </Link>
      </div>
    </Card>
  )
}
