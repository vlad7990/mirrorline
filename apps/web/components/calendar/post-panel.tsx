'use client'

/**
 * The selected post: preview, caption, link and hashtags, the AI label switch
 * and the two decisions.
 *
 * CLAUDE.md non-negotiable 4 — "AI labels: AI scenes are always labelled, in
 * the UI and on the platform" — is enforced here: when the post has AI scenes
 * the switch is checked, disabled, and explained in words. There is no code
 * path that turns it off.
 */

import type { PostStatus, ScheduledPost } from '@mirrorline/mock'
import { workspace } from '@mirrorline/mock'
import { AiLabel, Button, Label, StatusChip, Switch, Textarea, ViewerPanel } from '@mirrorline/ui'
import { useId, useState } from 'react'

import type { PostMove } from '@/lib/studio/schedule-moves'

import { MoveToMenu } from './move-to-menu'

/** Statuses that are already settled; approving them again would say nothing. */
const SETTLED_STATUSES: readonly PostStatus[] = ['approved', 'published', 'published-private']

/**
 * The "locked" look the `disabled` attribute used to give us, now keyed off
 * `aria-disabled` so the control keeps its place in the tab order.
 */
const LOCKED_SWITCH_CLASSES = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-55'

/** The hashtags come from the workspace niche, not from a literal. */
function hashtagsFor(): string {
  return [workspace.niche, ...workspace.nearbyNiches]
    .slice(0, 2)
    .map((word) => `#${word.toLowerCase().replace(/\s+/g, '')}`)
    .join(' ')
}

export interface PostPanelProps {
  post: ScheduledPost
  status: PostStatus
  /** "Tue 10", from the calendar day the post sits on. */
  dayLabel: string
  onApprove: (postId: string) => void
  onSendBack: (postId: string) => void
  /** Every day column, for the "Move to…" menu. */
  days: readonly { readonly value: string; readonly label: string }[]
  /** The slots this post's platform uses. */
  slots: readonly { readonly time24: string; readonly timeLabel: string }[]
  onMove: (postId: string, move: PostMove) => void
}

export function PostPanel({
  post,
  status,
  dayLabel,
  onApprove,
  onSendBack,
  days,
  slots,
  onMove,
}: PostPanelProps) {
  const captionId = useId()
  const aiSwitchId = useId()
  const aiNoteId = useId()

  // AI scenes force the label on. Only a post without them has a choice.
  const isAiLocked = post.hasAiScenes
  const [isAiLabelOn, setAiLabelOn] = useState(false)
  const [caption, setCaption] = useState(`${post.title}\nBook a free call, link in bio.`)

  const isSettled = SETTLED_STATUSES.includes(status)

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta text-text-muted">
          {/* The day and the platform are names; the slot time is the
              Publisher's, so only it goes mono. */}
          {dayLabel} · <span className="machine">{post.timeLabel}</span> · {post.platformLabel}
        </span>
        <StatusChip status={status} />
      </div>

      {/* DESIGN.md "Colors — Viewer": the approvals queue sits on the lightbox,
          "the same near-black in both themes", so whoever approves this post
          judges the same frame whichever theme they happen to be using. */}
      <ViewerPanel className="items-center">
        <div
          className="relative flex aspect-[9/16] w-[170px] max-w-full flex-col justify-end rounded-thumb p-3.5"
          style={{ backgroundColor: post.thumbnailColor }}
        >
          {isAiLocked ? <AiLabel className="absolute right-2.5 top-2.5" /> : null}
          <span className="font-heading text-overlay-caption text-on-primary">{post.title}</span>
        </div>
      </ViewerPanel>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={captionId}>Caption</Label>
        <Textarea
          id={captionId}
          rows={3}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>

      <p className="m-0 text-meta text-on-neutral-soft">
        Link: {workspace.goalLink} · {hashtagsFor()}
      </p>

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2.5">
        <Label htmlFor={aiSwitchId} className="font-normal">
          AI label on platform
        </Label>
        {/* SC 3.3.2 / 4.1.2: `aria-disabled` rather than `disabled`. A disabled
            switch leaves the tab order, so a keyboard-only person never landed
            on it and never heard why it cannot move. This one still takes
            focus, still reads its explanation, and still cannot be toggled:
            `checked` is pinned true and the handler is a no-op. */}
        <Switch
          id={aiSwitchId}
          checked={isAiLocked ? true : isAiLabelOn}
          onCheckedChange={(next) => {
            if (isAiLocked) return
            setAiLabelOn(next)
          }}
          aria-disabled={isAiLocked || undefined}
          className={isAiLocked ? LOCKED_SWITCH_CLASSES : undefined}
          aria-describedby={isAiLocked ? aiNoteId : undefined}
        />
      </div>
      {isAiLocked ? (
        <p id={aiNoteId} className="m-0 text-caption font-normal text-text-muted">
          Locked on: this post has AI scenes. We label them in the app and on the platform, so it
          cannot be turned off.
        </p>
      ) : null}

      {/* The no-drag path, above the two decisions because rescheduling is a
          question you answer before approving, not after. */}
      <MoveToMenu post={post} days={days} slots={slots} onMove={onMove} />

      {/* DESIGN.md "Motion — Press": the two decisions dip 3% on :active, on
          fine pointers only, dropped under prefers-reduced-motion. */}
      <div className="flex gap-2">
        <Button variant="secondary" className="press" fullWidth onClick={() => onSendBack(post.id)}>
          Send back
        </Button>
        <Button
          variant="primary"
          size="md"
          className="press"
          fullWidth
          disabled={isSettled}
          onClick={() => onApprove(post.id)}
        >
          Approve
        </Button>
      </div>
    </div>
  )
}
