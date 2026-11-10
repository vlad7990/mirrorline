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
import { AiLabel, Button, Label, StatusChip, Switch, Textarea } from '@mirrorline/ui'
import { useId, useState } from 'react'

/** Statuses that are already settled; approving them again would say nothing. */
const SETTLED_STATUSES: readonly PostStatus[] = ['approved', 'published', 'published-private']

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
}

export function PostPanel({ post, status, dayLabel, onApprove, onSendBack }: PostPanelProps) {
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
          {dayLabel} · {post.timeLabel} · {post.platformLabel}
        </span>
        <StatusChip status={status} />
      </div>

      <div
        className="relative mx-auto flex aspect-[9/16] w-[180px] max-w-full flex-col justify-end rounded-lg p-3.5"
        style={{ backgroundColor: post.thumbnailColor }}
      >
        {isAiLocked ? <AiLabel className="absolute right-2.5 top-2.5" /> : null}
        <span className="font-heading text-overlay-caption text-on-primary">{post.title}</span>
      </div>

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
        <Switch
          id={aiSwitchId}
          checked={isAiLocked ? true : isAiLabelOn}
          onCheckedChange={isAiLocked ? undefined : setAiLabelOn}
          disabled={isAiLocked}
          aria-describedby={isAiLocked ? aiNoteId : undefined}
        />
      </div>
      {isAiLocked ? (
        <p id={aiNoteId} className="m-0 text-caption font-normal text-text-muted">
          Locked on: this post has AI scenes. We label them in the app and on the platform, so it
          cannot be turned off.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={() => onSendBack(post.id)}>
          Send back
        </Button>
        <Button
          variant="primary"
          size="md"
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
