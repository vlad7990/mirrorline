/**
 * `GET /api/export` — your rows, read as you.
 *
 * ============================================================================
 * Why a route handler rather than a server action
 * ============================================================================
 *
 * The result is a **file**, and a server action cannot send one: it returns a
 * serialisable value to the client, which would mean assembling the JSON in the
 * browser and building a blob download by hand. A route handler can set
 * `Content-Disposition` and let the browser do what it already knows how to do.
 *
 * ============================================================================
 * Why every table is queried separately
 * ============================================================================
 *
 * One nested PostgREST select would be fewer round trips, and it would also
 * bind the export's shape to the foreign keys between these tables — so adding
 * a join or renaming a relationship would quietly change what somebody's export
 * contains. Twelve flat selects say exactly what they fetch, and each is
 * independently governed by its own policy.
 *
 * They run concurrently, so the cost is one round trip's latency rather than
 * twelve.
 *
 * ============================================================================
 * A failed table is empty, not fatal
 * ============================================================================
 *
 * `buildExportPayload` turns a missing table into `[]`. That is deliberate: a
 * single table erroring should not deny somebody the other eleven, which is the
 * difference between a partial export and no export at all. The `note` in the
 * payload says it holds "the rows your own account can read", which stays true
 * either way.
 *
 * It does mean a broken policy looks like an empty table. The thing that
 * distinguishes those is `rls.db.test.ts`, which asserts what each policy
 * returns — not this handler, which has no way to tell them apart.
 */

import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import {
  buildExportPayload,
  EXPORT_TABLES,
  exportFileName,
  type ExportTable,
} from '@/lib/workspace/export-payload'

export async function GET() {
  const supabase = await createSupabaseServerClient()

  // `getUser()`, not `getSession()` — the token is verified rather than
  // believed. See the note in `server-client.ts`.
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (user === null) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const results = await Promise.all(
    EXPORT_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*')
      return [table, error === null && data !== null ? data : []] as const
    }),
  )

  const rows: Partial<Record<ExportTable, readonly unknown[]>> = Object.fromEntries(results)

  const exportedAt = new Date()
  const payload = buildExportPayload({
    exportedAt,
    userId: user.id,
    email: user.email ?? null,
    rows,
  })

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFileName(exportedAt)}"`,
      // Somebody else's export must never come out of a shared cache, and a
      // stale one is worse than a slow one.
      'cache-control': 'no-store, max-age=0',
    },
  })
}
