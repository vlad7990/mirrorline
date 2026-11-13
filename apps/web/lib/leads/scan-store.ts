/**
 * Where a Niche Scan request goes, and the webhook that is told about it.
 *
 * **An adapter, chosen at runtime from the environment.** Supabase when the
 * service keys exist, a git-ignored JSON file otherwise. CLAUDE.md is
 * explicit that Supabase is wired "only if keys exist in `.env.local`", and
 * the practical reason is that a preview deployment has no database: a lead
 * form that 500s on every preview is worse than one that writes to disk.
 *
 * **Nothing here sends an email.** `notifyN8n` posts to a webhook only when
 * `N8N_WEBHOOK_URL` is set, and nothing in this repo sets it. The back-office
 * flow that eventually delivers a scan lives in n8n, outside this app, and it
 * is a stub until someone configures it. Non-negotiable 11.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { NicheScanRequest, StoredNicheScanLead } from './niche-scan-lead'

const DATA_DIRECTORY = '.data'
const SCANS_FILE = 'niche-scans.json'

export type StoreKind = 'supabase' | 'file'

export interface StoreResult {
  readonly lead: StoredNicheScanLead
  /** Which adapter took it. Returned so the route can log it honestly. */
  readonly via: StoreKind
}

/** Both are required: a URL with no key cannot write anything. */
function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key }
}

/**
 * A readable id. `crypto.randomUUID` would do, but a prefixed, sortable id is
 * easier to quote in an email to a client than a bare UUID.
 */
function makeId(receivedAt: string): string {
  const stamp = receivedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `scan_${stamp}_${suffix}`
}

export async function storeNicheScan(request: NicheScanRequest, now: Date): Promise<StoreResult> {
  const receivedAt = now.toISOString()
  const lead: StoredNicheScanLead = { ...request, id: makeId(receivedAt), receivedAt }

  const config = supabaseConfig()
  if (config) {
    await insertIntoSupabase(lead, config)
    return { lead, via: 'supabase' }
  }

  await appendToFile(lead)
  return { lead, via: 'file' }
}

/**
 * A plain REST insert rather than `@supabase/supabase-js`.
 *
 * The dependency buys a client we would use for exactly one call, and every
 * dependency has to clear the licence allow-list. This is the documented
 * PostgREST endpoint and it is stable.
 */
async function insertIntoSupabase(
  lead: StoredNicheScanLead,
  config: { url: string; key: string },
): Promise<void> {
  const response = await fetch(`${config.url}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: lead.id,
      email: lead.email,
      niche: lead.niche,
      audience: lead.audience,
      stage: lead.stage,
      goal: lead.goal,
      handles: lead.handles,
      received_at: lead.receivedAt,
    }),
  })

  if (!response.ok) {
    // Thrown, not swallowed: the caller answers with an error rather than
    // telling someone their scan is on its way when nothing was written.
    throw new Error(`Supabase insert failed with ${response.status}`)
  }
}

async function appendToFile(lead: StoredNicheScanLead): Promise<void> {
  const directory = path.join(process.cwd(), DATA_DIRECTORY)
  const file = path.join(directory, SCANS_FILE)

  await mkdir(directory, { recursive: true })

  let existing: StoredNicheScanLead[] = []
  try {
    const raw = await readFile(file, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) existing = parsed as StoredNicheScanLead[]
  } catch {
    // No file yet, or one we cannot parse. Either way we start a new list
    // rather than losing the lead that is arriving right now.
  }

  await writeFile(file, `${JSON.stringify([...existing, lead], null, 2)}\n`, 'utf8')
}

/**
 * Tell n8n a scan was requested. A stub, by design.
 *
 * Returns whether anything was sent, so the route can say so rather than
 * implying a delivery that did not happen. A failure here is swallowed: the
 * lead is already stored, and losing the notification is recoverable where
 * losing the lead is not.
 */
export async function notifyN8n(lead: StoredNicheScanLead): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL
  if (!url) return false

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'niche_scan_requested', lead }),
    })
    return response.ok
  } catch {
    return false
  }
}
