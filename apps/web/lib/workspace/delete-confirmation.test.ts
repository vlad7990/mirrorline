import { describe, expect, test } from 'vitest'

import { matchesWorkspaceName } from './delete-confirmation'

/**
 * `delete_workspace` is the most destructive thing in the product: it cascades
 * every table carrying a `workspace_id` and, when it was the user's last
 * workspace, deletes their `auth.users` row too. The typed confirmation is the
 * only thing standing in front of it, so what counts as a match is worth
 * pinning down rather than leaving to a `===` somebody later "tidies".
 */

describe('matchesWorkspaceName', () => {
  test('accepts the name typed exactly', () => {
    expect(matchesWorkspaceName('Maya Coaching', 'Maya Coaching')).toBe(true)
  })

  test('accepts surrounding whitespace, which is a typing artefact not an answer', () => {
    // Trailing spaces come from double-clicking the name to copy it. Refusing
    // them teaches people that the control is broken, not that they are wrong.
    expect(matchesWorkspaceName('Maya Coaching', '  Maya Coaching  ')).toBe(true)
    expect(matchesWorkspaceName('  Maya Coaching  ', 'Maya Coaching')).toBe(true)
  })

  test('refuses a different case, because this is the last question before deletion', () => {
    // The name is on screen while they type it. Case-insensitivity would buy a
    // little convenience at the cost of the one property this control needs:
    // that it cannot be satisfied by approximately the right thing.
    expect(matchesWorkspaceName('Maya Coaching', 'maya coaching')).toBe(false)
  })

  test('refuses a prefix, a suffix and an inner substring', () => {
    expect(matchesWorkspaceName('Maya Coaching', 'Maya')).toBe(false)
    expect(matchesWorkspaceName('Maya Coaching', 'Coaching')).toBe(false)
    expect(matchesWorkspaceName('Maya Coaching', 'Maya Coaching Ltd')).toBe(false)
  })

  test('refuses collapsed inner whitespace', () => {
    // Only the ends are forgiven. "MayaCoaching" is a different name.
    expect(matchesWorkspaceName('Maya Coaching', 'MayaCoaching')).toBe(false)
  })

  test('refuses empty input against any name', () => {
    expect(matchesWorkspaceName('Maya Coaching', '')).toBe(false)
    expect(matchesWorkspaceName('Maya Coaching', '    ')).toBe(false)
  })

  test('refuses everything when the workspace name is itself blank', () => {
    // `workspaces.name` is `not null`, and `ensure_workspace_for_current_user`
    // raises on a blank one — so this cannot happen. If it ever does, an empty
    // expected name must not turn an empty box into consent.
    expect(matchesWorkspaceName('', '')).toBe(false)
    expect(matchesWorkspaceName('   ', '   ')).toBe(false)
  })
})
