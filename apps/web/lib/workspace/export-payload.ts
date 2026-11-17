/**
 * The shape of "Export my data", and the list of tables it covers.
 *
 * ============================================================================
 * Read as the user, which is the whole design
 * ============================================================================
 *
 * Every query behind this runs through `createSupabaseServerClient()` on the
 * caller's own session, so **RLS decides what comes out** rather than a
 * hand-maintained filter. That matters twice over: the export cannot
 * accidentally include a co-member's private row, and it cannot drift away
 * from the policies — if `rls.db.test.ts` passes, this is correct by
 * construction.
 *
 * The service-role key would have made this one query with no joins to think
 * about, and it would have been the wrong tool: an export that can read
 * everything has to be *trusted* to filter, and nothing here deserves that
 * trust (D86).
 *
 * ============================================================================
 * `leads` is absent on purpose
 * ============================================================================
 *
 * `rls_policies.sql` puts RLS on `leads` with **no policy at all**, and says
 * why: "a lead is a stranger who filled in the Niche Scan form, and it belongs
 * to us rather than to any workspace." Reading it as the user returns nothing,
 * so listing it here would add a permanently empty key to everybody's export —
 * which reads as "Mirrorline holds no leads" rather than "this is not yours".
 * Leaving it out says the true thing by saying nothing.
 */

export const EXPORT_TABLES = [
  'profiles',
  'memberships',
  'workspaces',
  'social_accounts',
  'goals',
  'objectives',
  'key_results',
  'kpi_definitions',
  'metric_snapshots',
  'ledger_weekly',
  'alerts',
  'trends',
] as const

export type ExportTable = (typeof EXPORT_TABLES)[number]

export interface ExportPayload {
  /** ISO-8601. The moment the rows were read, not the moment of the request. */
  readonly exportedAt: string
  readonly exportedFor: {
    readonly userId: string
    readonly email: string | null
  }
  readonly note: string
  readonly tables: Readonly<Record<ExportTable, readonly unknown[]>>
}

export interface BuildExportPayloadInput {
  readonly exportedAt: Date
  readonly userId: string
  readonly email: string | null
  readonly rows: Partial<Record<ExportTable, readonly unknown[]>>
}

/**
 * Said in the file, because the file outlives the page that offered it.
 *
 * Somebody opening this JSON a year from now has no screen to read, and the
 * most likely wrong conclusion — that this is everything Mirrorline holds — is
 * the one worth heading off in the artefact itself.
 */
const NOTE =
  'This export contains the rows your own account can read, exactly as the ' +
  'database returns them to you. Anything belonging to another workspace, or ' +
  'to Mirrorline rather than to you, is not included.'

export function buildExportPayload(input: BuildExportPayloadInput): ExportPayload {
  // Built from `EXPORT_TABLES` rather than from the keys of `rows`, so the
  // payload's shape is decided here and not by whatever the queries happened
  // to return. A table that failed, returned nothing, or was never asked for
  // all land the same way: present, and empty.
  const tables = Object.fromEntries(
    EXPORT_TABLES.map((table) => [table, input.rows[table] ?? []]),
  ) as Record<ExportTable, readonly unknown[]>

  return {
    exportedAt: input.exportedAt.toISOString(),
    exportedFor: { userId: input.userId, email: input.email },
    note: NOTE,
    tables,
  }
}

/**
 * `mirrorline-export-2026-11-17.json`.
 *
 * Dated in UTC from the ISO string rather than with `toLocaleDateString`, so
 * the name does not depend on the server's timezone — two exports taken a
 * minute apart either side of midnight should not disagree about the day by
 * accident of where the process is running.
 */
export function exportFileName(exportedAt: Date): string {
  const day = exportedAt.toISOString().slice(0, 10)
  return `mirrorline-export-${day}.json`
}
