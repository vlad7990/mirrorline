/**
 * Reading the Voice and Facts profile, as the signed-in user.
 *
 * The agent's read is a **separate module** (`lib/agents/read-client-profile`)
 * rather than a second function here, and the reason is mechanical: this file
 * imports `createSupabaseServerClient`, which imports `next/headers`, which
 * exists only inside a request. The scan runs in the worker — a plain Node
 * container — so a shared module would drag `next/headers` into a bundle that
 * cannot have it. Keeping them apart also keeps a service-role read off a page
 * by accident.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { EMPTY_PROFILE, parseClientProfile, type ClientProfile } from './client-profile'

const COLUMNS = 'service_area, method, avoid, services, handles'

/**
 * The profile as the signed-in user, or `EMPTY_PROFILE`.
 *
 * **Empty rather than null on failure, and deliberately so.** Unlike the niche
 * report, nothing here claims research happened: an absent profile and an
 * unreadable one both mean "we can tell the agent nothing about this
 * business", and the screen's answer to each is the same form. A three-state
 * read would be ceremony with no branch behind it.
 */
export async function readClientProfile(): Promise<ClientProfile> {
  const supabase = await createSupabaseServerClient()

  const result = await supabase.from('client_profiles').select(COLUMNS).limit(1)

  if (result.error) {
    console.error('[client-profile] could not read the profile', result.error.message)
    return EMPTY_PROFILE
  }

  return parseClientProfile((result.data ?? [])[0] ?? null)
}

