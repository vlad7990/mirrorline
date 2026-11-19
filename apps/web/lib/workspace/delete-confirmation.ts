/**
 * The typed confirmation in front of `delete_workspace`.
 *
 * ============================================================================
 * Why this is its own module and not a `===` at the call site
 * ============================================================================
 *
 * `delete_workspace` cascades every table carrying a `workspace_id`, and when
 * the workspace was the user's last it deletes their `auth.users` row as well
 * (D80). There is no undo and no soft-delete anywhere behind it. The only
 * thing between a mis-aimed click and that is this comparison, so it is worth a
 * name, a file and seven tests — and it is checked **on the server too**, in
 * the action, because a disabled button is a courtesy rather than a control.
 *
 * ============================================================================
 * Trim the ends, forgive nothing else
 * ============================================================================
 *
 * Both sides are trimmed: trailing spaces come from double-clicking the name
 * to copy it, and refusing those teaches people the control is broken rather
 * than that their answer is wrong.
 *
 * Case is **not** forgiven, and neither is inner whitespace. The name is on
 * screen while they type it, so an exact match costs them nothing, and the one
 * property this control has to have is that it cannot be satisfied by
 * approximately the right thing. A blank expected name matches nothing at all —
 * `workspaces.name` is `not null` so it should never be blank, but if it ever
 * were, an empty box must not become consent.
 */

export function matchesWorkspaceName(workspaceName: string, typed: string): boolean {
  const expected = workspaceName.trim()
  if (expected.length === 0) return false

  return typed.trim() === expected
}
