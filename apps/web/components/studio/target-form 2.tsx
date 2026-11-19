'use client'

import { Button, Input, Label } from '@mirrorline/ui'
import * as React from 'react'

import { proposeTarget } from '@/app/app/(studio)/goals/actions'
import { IDLE_TARGET_STATE } from '@/app/app/(studio)/goals/target-form-state'

/**
 * The one editable number on the Goals screen.
 *
 * **Its own client component so `GoalsBoard` can stay a server component.**
 * The board is rendered by both `/app/goals` and `/app/results` and takes the
 * cascade read from the database; making the whole board a client component to
 * get `useActionState` would have pushed that read up into both pages and
 * invited them to drift. Only the part that needs interactivity is a client.
 *
 * One action serves every key result on the screen, so the returned state
 * carries the id it belongs to — otherwise a message about one target would
 * appear under all of them.
 */

export interface TargetFormProps {
  readonly keyResultId: string
  readonly target: number
  readonly basis: string
}

export function TargetForm({ keyResultId, target, basis }: TargetFormProps) {
  const [state, formAction, isSaving] = React.useActionState(proposeTarget, IDLE_TARGET_STATE)
  const inputId = `target-${keyResultId}`
  const messageId = `${inputId}-message`

  const isMine = state.keyResultId === keyResultId
  const message = isMine ? state.message : null
  const isError = isMine && state.status === 'error'

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="keyResultId" value={keyResultId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Target</Label>
          <Input
            id={inputId}
            name="target"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={target}
            aria-invalid={isError || undefined}
            aria-describedby={message !== null ? messageId : undefined}
            className="machine w-32"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Propose a new target'}
        </Button>
      </div>

      {/* 15 §1: a proposal, with its origin stated. Never "guaranteed". */}
      <p className="m-0 text-caption text-text-muted">
        Proposed from your {basis}. It is a proposal you can change, not a promise we have made.
      </p>

      {message !== null ? (
        <p
          id={messageId}
          role="status"
          className={
            isError ? 'm-0 text-caption text-on-danger-soft' : 'm-0 text-caption text-text-muted'
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
