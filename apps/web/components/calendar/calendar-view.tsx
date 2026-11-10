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
  type Ref,
} from 'react'

import { PostPanel } from './post-panel'
import { WeekGrid } from './week-grid'

/* -------------------------------------------------------------------------- */
/* Everything the screen can read straight off the fixtures                    */
/* -------------------------------------------------------------------------- */

const FIRST_DAY = weekSchedule.days[0] ?? null
const TODAY_INDEX = weekSchedule.days.findIndex((day) => day.isToday)
const TOMORROW = TODAY_INDEX >= 0 ? (weekSchedule.days[TODAY_INDEX + 1] ?? null) : null

/** Tomorrow's chips back the batch bar; its counts come from this list. */
const TOMORROW_POSTS: readonly ScheduledPost[] = TOMORROW
  ? weekPosts.filter((post) => post.date === TOMORROW.date)
  : []

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

export function CalendarView() {
  const [overrides, setOverrides] = useState<StatusOverrides>({})
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

  const pendingTomorrow = useMemo(
    () => TOMORROW_POSTS.filter((post) => (overrides[post.id] ?? post.status) === 'needs-review'),
    [overrides],
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

  const selectedPost = selectedPostId ? (POST_BY_ID.get(selectedPostId) ?? null) : null

  const panel = selectedPost ? (
    <PostPanel
      key={selectedPost.id}
      post={selectedPost}
      status={statusOf(selectedPost)}
      dayLabel={DAY_LABEL_BY_DATE[selectedPost.date] ?? ''}
      onApprove={handleApprove}
      onSendBack={handleSendBack}
    />
  ) : (
    <p className="m-0 text-body text-text-muted">Choose a post on the calendar to review it.</p>
  )

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>
            Publisher agent · {PLATFORM_COUNT} platforms · {MIN_PER_DAY} to {MAX_PER_DAY} posts a
            day each
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
          <WeekGrid
            schedule={weekSchedule}
            highlightDate={TOMORROW?.date ?? null}
            statusOf={statusOf}
            selectedPostId={selectedPostId}
            onSelect={handleSelect}
          />
        </Card>

        <Card as="aside" aria-labelledby="selected-post-heading" className="hidden min-w-0 xl:block">
          <h2 id="selected-post-heading" className="sr-only">
            Selected post
          </h2>
          {panel}
        </Card>
      </div>

      <BatchBar
        readyCount={TOMORROW_POSTS.length}
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
  // rather than repeating a number from the mockup.
  let message = `Tomorrow is approved. The Publisher will post ${readyCount} videos on ${dayLabel}.`
  if (pendingCount > 0 && pendingCount === readyCount) {
    message = `Tomorrow: ${readyCount} posts ready. All ${pendingCount} need your eye.`
  } else if (pendingCount > 0) {
    message = `Tomorrow: ${readyCount} posts ready, ${pendingCount} need your eye.`
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
          <Button
            variant="primary"
            size="md"
            className="bg-accent text-ink hover:bg-accent/90"
            onClick={onApproveAll}
          >
            Approve all {pendingCount} for tomorrow
          </Button>
        ) : null}
        <Link
          href="/app/results"
          className="inline-flex min-h-11 items-center rounded-md px-4 text-label text-accent underline-offset-4 hover:underline"
        >
          See results
        </Link>
      </div>
    </Card>
  )
}
