/**
 * The service-role client agents write with.
 *
 * `createSupabaseServerClient` is the *user's* client: it carries their
 * cookies and RLS decides what it can see, which is right for every read a
 * screen does. Agents are not users. `niche_reports`, `agent_runs` and
 * `trends` all revoke insert from `authenticated` (D96, and D115 for the two
 * new ones), because a row a client could write would be research nobody did
 * or a cost somebody typed.
 *
 * So agent writes need the service role, and that key must never be anywhere
 * near a browser. Two things keep that true:
 *
 * 1. **`server-only`**, imported for its side effect. A `'use client'` module
 *    that reached this file would fail the *build*, not a test — which is the
 *    earlier and louder of the two.
 * 2. `server-only.test.ts` already walks the import graph for the SDK
 *    chokepoint; this sits beside it under `lib/agents/` so the same sweep
 *    covers the directory agents live in.
 *
 * Not memoised. The client is cheap to construct and a module-level instance
 * would outlive a changed environment between tests — the same trap
 * `resetAnthropicClient` exists for next door.
 */

import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireServerSupabaseConfig } from '../supabase/env'

export function createAgentServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = requireServerSupabaseConfig()

  return createClient(url, serviceRoleKey, {
    auth: {
      // No session to persist and nothing to refresh: this client is one
      // request's worth of writes, not a signed-in person.
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
