'use client'

import { Button, Input, Label } from '@mirrorline/ui'
import * as React from 'react'

import {
  IDLE_SCAN_STATE,
  type ScanActionResult,
} from '@/app/app/(studio)/trends/scan-form-state'

/**
 * Start a Niche Scan, from the screen that shows its result (V1, §2.5).
 *
 * **Its own client component so the page stays a server component.** `page.tsx`
 * reads the latest report on the server and renders the panel and the cards
 * from it; only the control that needs `useActionState` is a client, which is
 * the same split `TargetForm` makes on Goals.
 *
 * ## The wait is real, and the form says so
 *
 * This is not a save. A scan is a research run: the agent counts its tokens,
 * checks the month's spend, searches the open web up to twelve times and writes
 * a structured report. It takes **minutes**, not the moment a form usually
 * takes.
 *
 * So the button says what it is doing while it does it, and the caption says
 * roughly how long *before* anybody presses it. A progress bar would be a
 * fiction — one server action has no intermediate state to report from — and a
 * spinner with no number starts reading as a hang after about twenty seconds.
 *
 * ## Three outcomes, and only one of them is red
 *
 * `refused` is the spend cap declining, and it renders as information. Styling
 * it as an error would teach the reader that a working control is broken, and
 * `18 §6` wants the cap visible precisely so that it can be trusted. Only
 * `failed` is our fault, and only `failed` gets the error treatment.
 */

export interface RunScanFormProps {
  /**
   * What to put in the box: the niche this workspace already said it is in.
   * Pre-filled rather than empty because the overwhelmingly common scan is "my
   * own niche, again", and an empty box asks the client to retype something we
   * already know. Still editable, because scanning the niche *beside* yours is
   * the other reason to be on this screen.
   */
  readonly defaultNiche: string
  /**
   * The server action, handed in rather than imported — and that is a security
   * decision, not a style one.
   *
   * `server-only.test.ts` walks the static import graph and fails if any
   * `'use client'` module can reach the SDK chokepoint at any depth. Importing
   * `runNicheScanAction` here puts this component one hop from
   * `trends/actions.ts` → `runNicheScan` → `anthropic-client`, and the walker
   * sees that path. It caught exactly that the first time this form was wired.
   *
   * Next's `'use server'` boundary does mean the key could never actually reach
   * the bundle — the client gets a reference, not the module. But the fix for
   * that is **not** to teach the test about the boundary: a guard with an
   * exception carved into it stops being a signal you can read at a glance, and
   * the earlier decision to keep that assertion "exactly one, named" rather
   * than "at most two" was made for the same reason. The page is a server
   * component and may import whatever it likes, so it imports the action and
   * passes it down. The graph stays provably clean and the guard stays strict.
   *
   * Do not replace this prop with an import.
   */
  readonly action: (previous: ScanActionResult, formData: FormData) => Promise<ScanActionResult>
}

export function RunScanForm({ defaultNiche, action }: RunScanFormProps) {
  const [state, formAction, isScanning] = React.useActionState(action, IDLE_SCAN_STATE)

  const inputId = 'niche-to-scan'
  const messageId = `${inputId}-message`
  const hasMessage = state.status !== 'idle' && state.message !== ''
  const isError = state.status === 'failed'

  return (
    <form
      action={formAction}
      aria-label="Run a Niche Scan"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor={inputId}>Niche to research</Label>
          <Input
            id={inputId}
            name="niche"
            type="text"
            maxLength={120}
            defaultValue={defaultNiche}
            placeholder="e.g. independent dog trainers"
            disabled={isScanning}
            aria-invalid={isError || undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={isScanning}>
          {isScanning ? 'Researching…' : 'Run a scan'}
        </Button>
      </div>

      {/*
        Said before the click, not after it. The one number a reader needs here
        is how long to leave it alone.
      */}
      <p className="m-0 text-caption text-text-muted">
        The Trend Scout searches the open web and writes up what it finds. It takes a few minutes,
        and this page updates when the report lands.
      </p>

      {hasMessage ? (
        <p
          id={messageId}
          role="status"
          className={
            isError ? 'm-0 text-caption text-on-danger-soft' : 'm-0 text-caption text-text-muted'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
