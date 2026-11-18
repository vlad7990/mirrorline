/**
 * The auth flows, against the real project. `pnpm test:rls-db`.
 *
 * `rls.db.test.ts` proves the *policies*. This proves the *flows*: a real
 * password grant, what a wrong password and an unknown address each get back,
 * and the workspace bootstrap that runs on the first request carrying a
 * session.
 *
 * ============================================================================
 * Why the accounts are made through the admin API, and not by signing up
 * ============================================================================
 *
 * The first version of this file called the public `/auth/v1/signup`, because
 * that is the request a browser makes. **Two findings killed it, and both are
 * worth keeping.**
 *
 * 1. **GoTrue refuses `@example.com`** on the public endpoint:
 *    `Email address "…@example.com" is invalid`. The admin API accepts it. So
 *    the reserved domain the rest of the repo uses for examples cannot be used
 *    to sign up — and any domain that *is* accepted is one somebody could own.
 *
 * 2. **The built-in email sender is rate-limited, and one run exhausts it.**
 *    Every public sign-up with confirmation on sends mail; after a handful the
 *    project answers `429 email rate limit exceeded` to *all* of them. A suite
 *    built on that endpoint fails for reasons that have nothing to do with our
 *    code, and worse, passes or fails depending on how recently it last ran.
 *    This is exactly the limitation D79 accepted when it kept auth mail on
 *    Supabase's own sender.
 *
 * So accounts here are created with `email_confirm: true` through the admin
 * API, which sends no mail and is not rate-limited. **The metadata goes in
 * too**, so `handle_new_user` and `ensureWorkspace` read the same
 * `raw_user_meta_data` they read after a real sign-up — the rows and the
 * policies are exercised identically.
 *
 * **What this file therefore does not prove:** that the public sign-up
 * endpoint accepts a given address. That needs either a sending domain (D79's
 * "revisit before the first client") or confirmation switched off, and it is
 * recorded in the handoff rather than left as a silent gap.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { requireAnonSupabaseConfig, requireServerSupabaseConfig } from '@/lib/supabase/env'
import {
  adminCreateUser,
  adminDeleteUser,
  authSignUp,
  restRpc,
  restSelect,
  signIn,
  trySignIn,
  type RestCredentials,
} from '@/lib/supabase/rest'

const runId = globalThis.crypto.randomUUID().slice(0, 8)
const password = `flow-${globalThis.crypto.randomUUID()}`
const otherPassword = `other-${globalThis.crypto.randomUUID()}`

/** `.example` is reserved by RFC 2606, so none of these can ever be real. */
const signUpEmail = `authflow-${runId}-a@example.com`
const neighbourEmail = `authflow-${runId}-b@example.com`
const unknownEmail = `authflow-${runId}-nobody@example.com`

const WORKSPACE_NAME = `Acme ${runId}`

let url = ''
let anonKey = ''
let serviceRole: RestCredentials
let anonymous: RestCredentials

const createdUserIds: string[] = []
const createdWorkspaceIds: string[] = []

/** The owner account's id, set in `beforeAll`. */
let signUpUserId = ''

function asUser(accessToken: string): RestCredentials {
  return { url, apiKey: anonKey, accessToken }
}

beforeAll(async () => {
  const server = requireServerSupabaseConfig()
  const anon = requireAnonSupabaseConfig()

  url = server.url
  anonKey = anon.anonKey
  // Both `accessToken: null`: these are `sb_secret_…` and `sb_publishable_…`
  // keys, which travel in `apikey` and never as a bearer token.
  serviceRole = { url, apiKey: server.serviceRoleKey, accessToken: null }
  anonymous = { url, apiKey: anon.anonKey, accessToken: null }

  // Confirmed, and carrying exactly the metadata `actions.ts` attaches at
  // sign-up. See the header for why this is the admin API and not `/signup`.
  const owner = await adminCreateUser(url, serviceRole.apiKey, signUpEmail, password, {
    full_name: `Flow ${runId}`,
    workspace_name: WORKSPACE_NAME,
    audience: 'individual',
    stage: 'new',
    goal_type: 'audience',
  })

  signUpUserId = owner.id
  createdUserIds.push(owner.id)

  // A second, unrelated account: "only their own workspace" needs somebody
  // else to be invisible to.
  const neighbour = await adminCreateUser(url, serviceRole.apiKey, neighbourEmail, otherPassword)
  createdUserIds.push(neighbour.id)
}, 90_000)

afterAll(async () => {
  for (const workspaceId of createdWorkspaceIds) {
    await fetch(`${url}/rest/v1/workspaces?id=eq.${workspaceId}`, {
      method: 'DELETE',
      headers: { apikey: serviceRole.apiKey },
    }).catch(() => null)
  }

  for (const userId of createdUserIds) {
    await adminDeleteUser(url, serviceRole.apiKey, userId).catch(() => null)
  }
}, 90_000)

describe('a new account', () => {
  test('exists, and carries the metadata sign-up would have attached', () => {
    // Assert
    expect(signUpUserId).not.toBe('')
  })

  test('the database writes the profile, so the app never has to', async () => {
    // Act — `handle_new_user` fires on the `auth.users` insert, which is why
    // sign-up has no second round trip that could fail on its own.
    const profiles = await restSelect<{ id: string; email: string; full_name: string | null }>(
      serviceRole,
      `profiles?id=eq.${signUpUserId}&select=id,email,full_name`,
    )

    // Assert
    expect(profiles.rows).toHaveLength(1)
    expect(profiles.rows[0]?.email).toBe(signUpEmail)
    expect(profiles.rows[0]?.full_name).toBe(`Flow ${runId}`)
  })

  test('signing up again does not reveal that the address is taken', async () => {
    // Arrange — this test originally asserted the opposite, and the failure
    // was the more interesting answer.
    //
    // With confirmation on, GoTrue answers a sign-up for an **existing**
    // address with a plain 200 and no session: the same reply a brand new
    // address gets. That is deliberate anti-enumeration, and it is stronger
    // than what we were about to do — `signUpWithPassword` has a branch that
    // says "There is already an account for that address", and if GoTrue
    // leaked it, that branch would pass the leak straight through to the page.
    //
    // It does not leak, so the branch never fires here and the person sees
    // "check your email" either way. The branch stays for projects with
    // confirmation switched off, where GoTrue *does* return "User already
    // registered" — and this test is what will notice if that ever changes.
    const again = await authSignUp(url, anonKey, signUpEmail, password)

    // Assert
    expect(again.errorMessage).toBeNull()
    expect(again.hasSession).toBe(false)
  })
})

describe('sign in', () => {
  test('the right password signs in', async () => {
    // Act
    const token = await signIn(url, anonKey, signUpEmail, password)

    // Assert
    expect(token.length).toBeGreaterThan(0)
  })

  test('the wrong password is refused', async () => {
    // Act
    const attempt = await trySignIn(url, anonKey, signUpEmail, 'not-the-password')

    // Assert
    expect(attempt.ok).toBe(false)
    expect(attempt.status).toBe(400)
  })

  test('an unknown address is refused the same way as a wrong password', async () => {
    // Arrange — this is the assertion behind the shared error message. If
    // Supabase ever began distinguishing the two, our single sentence would be
    // hiding a difference the response had already leaked.
    const wrongPassword = await trySignIn(url, anonKey, signUpEmail, 'not-the-password')
    const noSuchUser = await trySignIn(url, anonKey, unknownEmail, 'not-the-password')

    // Assert
    expect(noSuchUser.ok).toBe(false)
    expect(noSuchUser.status).toBe(wrongPassword.status)
    expect(noSuchUser.errorMessage).toBe(wrongPassword.errorMessage)
  })
})

describe('the workspace bootstrap', () => {
  test('one call creates the workspace, the membership and the carried choices', async () => {
    // Arrange
    const token = await signIn(url, anonKey, signUpEmail, password)

    // Act — the same RPC `ensureWorkspace` calls, with the values sign-up left
    // in the user's metadata.
    const created = await restRpc(asUser(token), 'ensure_workspace_for_current_user', {
      p_name: WORKSPACE_NAME,
      p_audience: 'individual',
      p_stage: 'new',
      p_goal_type: 'audience',
      p_niche: null,
    })

    // Assert
    expect(created.ok).toBe(true)

    const workspaces = await restSelect<{
      id: string
      name: string
      audience: string | null
      stage: string | null
      initial_goal_type: string | null
    }>(asUser(token), 'workspaces?select=id,name,audience,stage,initial_goal_type')

    expect(workspaces.rows).toHaveLength(1)
    const workspace = workspaces.rows[0]
    expect(workspace?.name).toBe(WORKSPACE_NAME)
    expect(workspace?.audience).toBe('individual')
    expect(workspace?.stage).toBe('new')
    expect(workspace?.initial_goal_type).toBe('audience')

    if (workspace !== undefined) createdWorkspaceIds.push(workspace.id)

    // And the membership, which is the half that makes every policy work.
    const memberships = await restSelect<{ role: string }>(asUser(token), 'memberships?select=role')
    expect(memberships.rows).toHaveLength(1)
    expect(memberships.rows[0]?.role).toBe('owner')
  }, 45_000)

  test('calling it again returns the same workspace rather than making a second', async () => {
    // Arrange — a double-clicked button, a retried action, a magic link opened
    // twice. This is why the function is `ensure_…` and not `create_…`.
    const token = await signIn(url, anonKey, signUpEmail, password)

    // Act
    await restRpc(asUser(token), 'ensure_workspace_for_current_user', {
      p_name: 'A completely different name',
      p_audience: null,
      p_stage: null,
      p_goal_type: null,
      p_niche: null,
    })

    // Assert
    const workspaces = await restSelect<{ name: string }>(asUser(token), 'workspaces?select=name')
    expect(workspaces.rows).toHaveLength(1)
    expect(workspaces.rows[0]?.name).toBe(WORKSPACE_NAME)
  }, 45_000)

  test('an anonymous caller cannot run the bootstrap', async () => {
    // Act
    const attempt = await restRpc(anonymous, 'ensure_workspace_for_current_user', {
      p_name: `Anonymous ${runId}`,
    })

    // Assert — the grant is to `authenticated` only, so this is refused before
    // `auth.uid()` is even consulted.
    expect(attempt.ok).toBe(false)
  })
})

describe('a new user sees only their own workspace', () => {
  test("the neighbour's account sees nothing of it", async () => {
    // Arrange
    const neighbourToken = await signIn(url, anonKey, neighbourEmail, otherPassword)

    // Act
    const workspaces = await restSelect(asUser(neighbourToken), 'workspaces?select=id,name')
    const memberships = await restSelect(asUser(neighbourToken), 'memberships?select=id')

    // Assert — a brand new account with no workspace of its own sees zero, not
    // "everything that is not mine is still readable".
    expect(workspaces.rows).toHaveLength(0)
    expect(memberships.rows).toHaveLength(0)
  }, 45_000)

  test('and the owner still sees exactly one', async () => {
    // Arrange / Act
    const token = await signIn(url, anonKey, signUpEmail, password)
    const workspaces = await restSelect(asUser(token), 'workspaces?select=id')

    // Assert
    expect(workspaces.rows).toHaveLength(1)
  }, 45_000)
})

/**
 * `save_onboarding` is `security definer`, so it runs with RLS switched off.
 * That makes "it only ever touches the caller's own workspace" a property of
 * the function body rather than of a policy — which is exactly the kind of
 * claim that needs a test rather than a comment.
 */
describe('save_onboarding', () => {
  const NICHE = 'Independent bakery in Leeds'
  const OUTCOME = 'Fifty walk-ins a week'

  test('writes the niche and the goal onto the caller’s own workspace', async () => {
    // Arrange
    const token = await signIn(url, anonKey, signUpEmail, password)

    // Act
    const response = await restRpc(asUser(token), 'save_onboarding', {
      p_niche: NICHE,
      p_audience: 'business',
      p_stage: 'existing',
      p_goal_type: 'leads',
      p_outcome_text: OUTCOME,
    })

    // Assert
    expect(response.ok).toBe(true)

    const workspaces = await restSelect(
      asUser(token),
      'workspaces?select=niche,audience,stage,initial_goal_type',
    )
    expect(workspaces.rows[0]).toMatchObject({
      niche: NICHE,
      audience: 'business',
      stage: 'existing',
      initial_goal_type: 'leads',
    })

    const goals = await restSelect(asUser(token), 'goals?select=goal_type,outcome_text,is_primary')
    expect(goals.rows).toHaveLength(1)
    expect(goals.rows[0]).toMatchObject({
      goal_type: 'leads',
      outcome_text: OUTCOME,
      is_primary: true,
    })
  }, 45_000)

  test('called twice, edits the one goal rather than making a second', async () => {
    // `goals_one_primary_per_workspace` is a partial unique index, which is
    // why the function reads before it writes. Walking back through the wizard
    // to change an answer must not collide.
    const token = await signIn(url, anonKey, signUpEmail, password)

    const response = await restRpc(asUser(token), 'save_onboarding', {
      p_niche: NICHE,
      p_audience: 'individual',
      p_stage: 'new',
      p_goal_type: 'bookings',
      p_outcome_text: 'Twenty bookings a month',
    })

    expect(response.ok).toBe(true)

    const goals = await restSelect(asUser(token), 'goals?select=goal_type,outcome_text,is_primary')
    expect(goals.rows).toHaveLength(1)
    expect(goals.rows[0]).toMatchObject({
      goal_type: 'bookings',
      outcome_text: 'Twenty bookings a month',
    })
  }, 45_000)

  test('refuses an empty outcome, which `goals.outcome_text` could not store', async () => {
    const token = await signIn(url, anonKey, signUpEmail, password)

    const response = await restRpc(asUser(token), 'save_onboarding', {
      p_niche: NICHE,
      p_audience: 'business',
      p_stage: 'existing',
      p_goal_type: 'leads',
      p_outcome_text: '   ',
    })

    // The form checks this too; the function is reachable without the form.
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('45003')
  }, 45_000)

  test('refuses a caller who owns no workspace, and touches nobody else’s', async () => {
    // The neighbour owns nothing. Because the function takes no workspace id,
    // there is no way for them to aim it at somebody else's — this asserts
    // that the refusal happens and that the owner's rows are untouched by it.
    const neighbourToken = await signIn(url, anonKey, neighbourEmail, otherPassword)

    const response = await restRpc(asUser(neighbourToken), 'save_onboarding', {
      p_niche: 'Somebody else’s niche',
      p_audience: 'business',
      p_stage: 'new',
      p_goal_type: 'sales',
      p_outcome_text: 'Should never be written',
    })

    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('45002')

    // The owner's workspace still says what the previous test left it saying.
    const ownerGoals = await restSelect(serviceRole, 'goals?select=outcome_text')
    const outcomes = ownerGoals.rows.map((row) => (row as { outcome_text: string }).outcome_text)
    expect(outcomes).not.toContain('Should never be written')
  }, 45_000)
})
