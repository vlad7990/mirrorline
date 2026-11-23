/**
 * The Voice and Facts profile, read with the service-role key.
 *
 * Its own module, and that is not tidiness. The page-side reader
 * (`lib/workspace/read-client-profile.ts`) imports
 * `createSupabaseServerClient`, which imports `next/headers` — a module that
 * exists only inside a request. The scan runs in `services/worker`, a plain
 * Node container with no request and no Next runtime, and it reaches this file
 * through `scan.ts`. One module holding both readers would drag
 * `next/headers` into the worker's bundle, where it fails at import time
 * rather than at the call.
 *
 * The workspace id is a parameter because the worker has no session to infer
 * one from. It has a job, and the id came off the job row it claimed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { EMPTY_PROFILE, parseClientProfile, type ClientProfile } from '../workspace/client-profile'

export async function readClientProfileForAgent(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<ClientProfile> {
  const result = await supabase
    .from('client_profiles')
    .select('service_area, method, avoid, services, handles')
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (result.error) {
    // Not fatal. A scan with no profile is a worse scan, not a failed one, and
    // failing the run would turn an optional form into a gate on the product.
    console.error('[client-profile] agent read failed', result.error.message)
    return EMPTY_PROFILE
  }

  return parseClientProfile((result.data ?? [])[0] ?? null)
}
