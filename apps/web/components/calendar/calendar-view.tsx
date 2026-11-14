'use client'

/**
 * S6 · Calendar and approvals.
 *
 * Holds the one piece of state this screen owns: the statuses a person has
 * changed in this session. Every update replaces the map rather than editing
 * it, so the posts coming out of @mirrorline/mock are never touched.
 */

import type { PostStatus, ScheduledPost } from '@mirrorline/mock'
import { weekPosts, weekSchedule } from '@mirrorline/mock'
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
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from 'react'

import {
  applyMoves,
  movedPost,
  movedWeekPosts,
  type PostMove,
  type ScheduleMoves,
  timeSlotsFor,
} from '@/lib/studio/schedule-moves'

import { PostPanel } from './post-panel'
import { type DropTarget, useChipDrag } from './use-chip-drag'
import { WeekGrid } from './week-grid'

/* -------------------------------------------------------------------------- */
/* Everything the screen can read straight off the fixtures                    */
/* -------------------------------------------------------------------------- */

const FIRST_DAY = weekSchedule.days[0] ?? null
const TODAY_INDEX = weekSchedule.days.findIndex((day) => day.isToday)
const TOMORROW = TODAY_INDEX >= 0 ? (weekSchedule.days[TODAY_INDEX + 1] ?? null) : null

// Tomorrow's chips back the batch bar. The list used to be a module constant;
// it is now derived per render, because a post dragged on or off tomorrow
// changes who is waiting for approval and the bar has to say so.

/** The mockup opens on the second chip of tomorrow's first platform row. */
const DEFAULT_SELECTION_INDEX = 1
const TOMORROW_FIRST_ROW: readonly ScheduledPost[] = TOMORROW
  ? (weekSchedule.rows[0]?.cells.find((cell) => cell.date === TOMORROW.date)?.posts ?? [])
  : []
const DEFAULT_POST_ID =
  TOMORROW_FIRST_ROW[DEFAULT_SELECTION_INDEX]?.id ??
  TOMORROW_FIRST_ROW[0]?.id ??
  weekPosts[0]?.id ??
  null

const POST_BY_ID: ReadonlyMap<string, ScheduledPost> = new Map(
  weekPosts.map((post) => [post.id, post]),
)
const DAY_LABEL_BY_DATE: Readonly<Record<string, string>> = Object.fromEntries(
  weekSchedule.days.map((day) => [day.date, `${day.dayLabel} ${day.dayOfMonth}`]),
)

const PLATFORM_COUNT = weekSchedule.rows.length
const CELL_COUNTS = weekSchedule.rows.flatMap((row) => row.cells.map((cell) => cell.posts.length))
const MIN_PER_DAY = CELL_COUNTS.length > 0 ? Math.min(...CELL_COUNTS) : 0
const MAX_PER_DAY = CELL_COUNTS.length > 0 ? Math.max(...CELL_COUNTS) : 0

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
/** The inline aside appears at this width; below it the drawer takes over. */
const WIDE_QUERY = '(min-width: 1280px)'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type StatusOverrides = Readonly<Record<string, PostStatus>>

interface ToastState {
  readonly title: string
  readonly description: string
}

function useIsWide(): boolean {
  const subscribe = useMemo(
    () => (onChange: () => void) => {
      const list = window.matchMedia(WIDE_QUERY)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    // The server has no viewport; start narrow and let hydration correct it.
    () => false,
  )
}

/* -------------------------------------------------------------------------- */
/* View                                                                        */
/* -------------------------------------------------------------------------- */

/** The days, in grid order, for the "Move to…" menu. */
const DAY_OPTIONS = weekSchedule.days.map((day) => ({
  value: day.date,
  label: `${day.dayLabel} ${day.dayOfMonth}`,
}))

export function CalendarView() {
  const [overrides, setOverrides] = useState<StatusOverrides>({})
  /**
   * Reschedules made in this session, keyed by post. Held beside the status
   * overrides and for the same reason: `weekSchedule` is a module constant,
   * so editing it would follow the reader to every other screen and survive a
   * navigation — which is exactly what "not saved" promises it will not do.
   */
  const [moves, setMoves] = useState<ScheduleMoves>({})
  const [selectedPostId, setSelectedPostId] = useState<string | null>(DEFAULT_POST_ID)
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

  /** The week as the grid should draw it, with this session's moves applied. */
  const schedule = useMemo(() => applyMoves(weekSchedule, moves), [moves])
  const posts = useMemo(() => movedWeekPosts(weekPosts, moves), [moves])

  /**
   * One place both paths land, so the drag and the menu cannot drift apart —
   * same state change, same confirmation, same wording about saving.
   */
  const handleMove = useCallback((postId: string, move: PostMove) => {
    setMoves((previous) => ({ ...previous, [postId]: move }))
    setToast({
      title: `Moved to ${DAY_LABEL_BY_DATE[move.date] ?? 'another day'}, ${move.timeLabel}`,
      description: 'Sample data, not saved. Nothing has been rescheduled on your accounts.',
    })
  }, [])

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
    () => (TOMORROW ? posts.filter((post) => post.date === TOMORROW.date) : []),
    [posts],
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
      description: `They go out on ${TOMORROW ? (DAY_LABEL_BY_DATE[TOMORROW.date] ?? 'their day') : 'their day'}.`,
    })
    setApproveAllCount((previous) => previous + 1)
  }, [pendingTomorrow])

  // Read through the moves, or the panel would keep describing the day the
  // post was on before it was dragged.
  const selectedBase = selectedPostId ? (POST_BY_ID.get(selectedPostId) ?? null) : null
  const selectedPost = selectedBase ? movedPost(selectedBase, moves) : null

  const panel = selectedPost ? (
    <PostPanel
      key={selectedPost.id}
      post={selectedPost}
      status={statusOf(selectedPost)}
      dayLabel={DAY_LABEL_BY_DATE[selectedPost.date] ?? ''}
      onApprove={handleApprove}
      onSendBack={handleSendBack}
      days={DAY_OPTIONS}
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
            Publisher agent · <span className="machine">{PLATFORM_COUNT}</span> platforms ·{' '}
            <span className="machine">
              {MIN_PER_DAY} to {MAX_PER_DAY}
            </span>{' '}
            posts a day each
          </Eyebrow>
          <h1 className="m-0 font-heading text-headline text-text">
            {FIRST_DAY ? `Week of ${FIRST_DAY.dayOfMonth} ${FIRST_DAY.monthLabel}` : 'This week'}
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
          {/* Non-negotiable 7: demo data is labelled where it is shown. It
              says "not saved" rather than only "sample", because the thing a
              reader is about to do here is move a post — and a drag that
              appears to work and is gone on reload is the dishonest part. */}
          <p className="m-0 mb-2.5 text-caption text-text-muted">
            Drag a post to another day, or use <strong className="font-semibold">Move to…</strong>{' '}
            on the right. Sample data, not saved.
          </p>
          <WeekGrid
            schedule={schedule}
            highlightDate={TOMORROW?.date ?? null}
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
        dayLabel={TOMORROW ? (DAY_LABEL_BY_DATE[TOMORROW.date] ?? '') : ''}
        messageRef={batchMessageRef}
        onApproveAll={handleApproveAll}
      />

      {/* Below xl the same panel arrives as a focus-trapped, Escape-closable drawer. */}
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
