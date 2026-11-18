'use client'

import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
} from '@mirrorline/ui'
import * as React from 'react'

import { deleteWorkspaceAction } from '@/app/app/(studio)/settings/actions'
import { IDLE_DELETE_STATE } from '@/app/app/(studio)/settings/delete-workspace-state'
import { matchesWorkspaceName } from '@/lib/workspace/delete-confirmation'

/**
 * "Delete this workspace" — and the export offered before it.
 *
 * ============================================================================
 * The export comes first, in the dialog, because the delete takes the account
 * ============================================================================
 *
 * `delete_workspace` cascades every table carrying a `workspace_id` and, when
 * this was the user's last workspace, deletes their `auth.users` row too (D80).
 * So after confirming they cannot sign back in to fetch anything — there is no
 * "download my data" page left to visit, and no account to visit it with.
 *
 * Offering the export on a different card would technically satisfy "an export
 * exists". Putting it **inside this dialog**, above the confirmation field, is
 * what makes it an offer: it is in front of them at the only moment the choice
 * is still theirs to make.
 *
 * ============================================================================
 * Why the workspace name is not on the card
 * ============================================================================
 *
 * The name lives in the dialog, which is closed until asked for. That is not a
 * layout preference: `/app/settings` is one of the captured screens
 * (`e2e/helpers/routes.ts`), and the e2e session's workspace is named
 * `E2E <runId>` — a new name every run. On the card it would make the settings
 * screenshot differ from itself on every comparison. In the dialog it is still
 * exactly where somebody needs it, and the reference PNGs stay stable.
 */

export interface DeleteWorkspaceCardProps {
  /**
   * The workspace to delete, or `null` when the viewer owns none — a member
   * rather than an owner, or a session with no workspace yet.
   */
  readonly workspace: { readonly id: string; readonly name: string } | null
}

export function DeleteWorkspaceCard({ workspace }: DeleteWorkspaceCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [typed, setTyped] = React.useState('')
  const [state, formAction, isDeleting] = React.useActionState(
    deleteWorkspaceAction,
    IDLE_DELETE_STATE,
  )
  const confirmationId = React.useId()

  // The same function the action re-runs on the server. Here it only decides
  // whether the button looks available; there it decides what happens.
  const canDelete = workspace !== null && matchesWorkspaceName(workspace.name, typed)

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    // A half-typed name must not survive a cancel: reopening the dialog should
    // ask the whole question again.
    if (!open) setTyped('')
  }

  return (
    <Card
      as="section"
      aria-labelledby="delete-workspace-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="delete-workspace-heading" className="m-0 font-heading text-subtitle text-text">
        Delete this workspace
      </h2>

      <p className="m-0 text-body text-text-muted">
        Removes the workspace and everything in it — videos, scripts, schedules, accounts and
        results. If this is your only workspace, your Mirrorline account goes with it. We offer you
        an export first, and this cannot be undone.
      </p>

      {/* Said before the attempt, not only after it fails. The rule exists
          because deleting would otherwise cascade away other members' access
          without telling them, and somebody reading this card should know the
          answer before they type a workspace name to find out. */}
      <p className="m-0 text-meta text-text-muted">
        A workspace with other members cannot be deleted. Remove them from the Team card first, or
        transfer ownership to one of them.
      </p>

      {workspace === null ? (
        <p className="m-0 text-meta text-text-muted">Only the owner of a workspace can delete it.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="tertiary"
            className="text-on-danger-soft dark:text-on-danger-soft"
            onClick={() => setIsOpen(true)}
          >
            Delete this workspace
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Delete {workspace?.name ?? 'this workspace'}?</DialogTitle>
          <DialogDescription>
            Everything in this workspace is removed and cannot be recovered. If it is your only
            workspace, your account is deleted too and you will not be able to sign back in.
          </DialogDescription>

          {/* The offer, before the field. See the note at the top of the file. */}
          <div className="flex flex-col gap-2 rounded-lg bg-surface-subtle p-4">
            <h3 className="m-0 font-heading text-label font-semibold text-text">
              Take your data with you first
            </h3>
            <p className="m-0 text-meta text-text-muted">
              A JSON file of the rows your account can read. This is your last chance to download
              it — afterwards there is no account to download it with.
            </p>
            <div>
              <Button asChild variant="secondary">
                {/* A plain anchor, not a Link: the response is a file download
                    rather than a route, so client navigation has nothing to
                    navigate to. `download` keeps the browser from rendering it. */}
                <a href="/api/export" download>
                  Export my data
                </a>
              </Button>
            </div>
          </div>

          <form action={formAction} className="flex flex-col gap-3">
            {state.status === 'error' && state.message !== null ? (
              <p
                role="alert"
                className="m-0 rounded-lg bg-danger-soft px-4 py-3 text-body text-on-danger-soft"
              >
                {state.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={confirmationId}>
                Type <span className="font-semibold text-text">{workspace?.name}</span> to confirm
              </Label>
              <Input
                id={confirmationId}
                name="confirmation"
                type="text"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={!canDelete || isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete this workspace'}
              </Button>
              <DialogClose asChild>
                <Button variant="secondary" disabled={isDeleting}>
                  Keep my workspace
                </Button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
