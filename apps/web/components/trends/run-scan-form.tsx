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
 * ## This form starts a scan; it no longer waits for one (D119)
 *
 * It used to submit and sit there for the whole research run, which worked on
 * a laptop and could not work anywhere we deploy — six minutes against a
 * 300-second function ceiling, ending in a client-side exception after 237
 * seconds (D118). The action writes a job and returns now, so the submit is
 * fast and the **waiting has moved to `ScanProgress`**, which is where the
 * minutes are honestly reported and polled for.
 *
 * That split is why this component gained `isScanRunning`. `useActionState`'s
 * own pending flag covers the milliseconds of the enqueue and nothing more; it
 * cannot know a worker is busy. Without the prop the button would re-enable
 * itself the instant the job was written and invite a second press — which,
 * for a control that spends money, is the expensive kind of wrong.
 *
 * ## The outcomes live in two places now, deliberately
 *
 * This form reports only what the *press* did: it started, or it could not be
 * started. The scan's own ending — including the spend cap's refusal, which is
 * information and never an error (`18 §6`) — belongs to the job and is
 * rendered by `ScanProgress`. Reporting it here too would mean two components
 * narrating one event, free to disagree.
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
  /**
   * A worker is already scanning for this workspace, read from `jobs` on the
   * server (D119).
   *
   * Separate from `useActionState`'s pending flag because they answer different
   * questions: that one is "is the form mid-submit" (milliseconds), this one is
   * "is a scan in flight" (minutes). The button needs the second, and only the
   * server can know it — the scan is running in another process.
   *
   * Defaults to `false` so the form is usable in isolation, which is what
   * `scan-form.test.tsx` renders.
   */
  readonly isScanRunning?: boolean
}

export function RunScanForm({ defaultNiche, action, isScanRunning = false }: RunScanFormProps) {
  const [state, formAction, isSubmitting] = React.useActionState(action, IDLE_SCAN_STATE)

  const inputId = 'niche-to-scan'
  const messageId = `${inputId}-message`
  const isError = state.status === 'failed'

  /*
   * Only a failure is announced here, and the screenshot is why.
   *
   * On a successful enqueue this line read "Scanning Independent dog
   * trainers." directly above a banner reading "Scanning your niche… usually
   * about 5 minutes" — the same news twice, in two voices, which is the
   * duplication this component's header says it is avoiding. The banner is
   * the better of the two: it carries the duration, it survives a reload, and
   * it is driven by the job rather than by this form's memory of a submit.
   *
   * A failure has no such second home. `ScanProgress` renders a *job*, and a
   * job that was never written has nothing to render.
   */
  const hasMessage = isError && state.message !== ''

  // Either reason locks the control, and they overlap: the submit is in flight
  // for a moment, then the job is pending for minutes.
  const isBusy = isSubmitting || isScanRunning

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
            disabled={isBusy}
            aria-invalid={isError || undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={isBusy}>
          {/*
            "Scanning…" rather than "Researching…", matching the words
            `ScanProgress` uses directly below. Two labels for one activity
            reads as two activities.
          */}
          {isBusy ? 'Scanning…' : 'Run a scan'}
        </Button>
      </div>

      {/*
        Said before the click, not after it. The one number a reader needs here
        is how long to leave it alone.
      */}
      <p className="m-0 text-caption text-text-muted">
        The Trend Scout searches the open web and writes up what it finds. It takes about five
        minutes, and this page updates on its own when the report lands.
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
