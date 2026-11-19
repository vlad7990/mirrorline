import { describe, expect, test } from 'vitest'

import {
  buildExportPayload,
  EXPORT_TABLES,
  exportFileName,
  type ExportTable,
} from './export-payload'

/**
 * The export is read **as the user**, so RLS decides what comes out. These
 * tests cover the part RLS cannot: that the shape is honest about what it
 * contains, and that the one table the user is deliberately not allowed to
 * read never appears in the list at all.
 */

const EXPORTED_AT = new Date('2026-11-17T12:00:00.000Z')

const BASE = {
  exportedAt: EXPORTED_AT,
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'someone@example.org',
}

describe('EXPORT_TABLES', () => {
  test('never includes leads, which the user is not permitted to read', () => {
    // `rls_policies.sql`: "leads — deliberately no policy ... a lead is a
    // stranger who filled in the Niche Scan form, and it belongs to us rather
    // than to any workspace." Reading it as the user would return nothing, so
    // including it would put an always-empty key in somebody's export and
    // invite the conclusion that we hold no leads.
    expect(EXPORT_TABLES).not.toContain('leads')
  })

  test('lists each table once', () => {
    expect(new Set(EXPORT_TABLES).size).toBe(EXPORT_TABLES.length)
  })
})

describe('buildExportPayload', () => {
  test('carries every table through, in full', () => {
    const rows = {
      workspaces: [{ id: 'w1', name: 'Maya Coaching' }],
      goals: [{ id: 'g1', outcome_text: 'Fifty walk-ins a week' }],
    }

    const payload = buildExportPayload({ ...BASE, rows })

    expect(payload.tables.workspaces).toEqual(rows.workspaces)
    expect(payload.tables.goals).toEqual(rows.goals)
  })

  test('writes an empty array for a table with no rows rather than omitting it', () => {
    // A missing key reads as "we did not export this". An empty array reads as
    // "there was nothing here" — which is the true statement, and the one
    // somebody checking their own data needs.
    const payload = buildExportPayload({ ...BASE, rows: {} })

    for (const table of EXPORT_TABLES) {
      expect(payload.tables[table]).toEqual([])
    }
  })

  test('has a key for every exported table and no others', () => {
    const payload = buildExportPayload({ ...BASE, rows: {} })

    expect(Object.keys(payload.tables).sort()).toEqual([...EXPORT_TABLES].sort())
  })

  test('says who it was made for and when, in ISO', () => {
    const payload = buildExportPayload({ ...BASE, rows: {} })

    expect(payload.exportedAt).toBe('2026-11-17T12:00:00.000Z')
    expect(payload.exportedFor).toEqual({
      userId: BASE.userId,
      email: 'someone@example.org',
    })
  })

  test('accepts a null email without inventing one', () => {
    const payload = buildExportPayload({ ...BASE, email: null, rows: {} })

    expect(payload.exportedFor.email).toBeNull()
  })

  test('carries a note saying the export is what the user themselves can read', () => {
    // The export is deliberately not exhaustive — it is what RLS lets the
    // caller see. Shipping it without saying so would make it look like
    // everything we hold.
    const payload = buildExportPayload({ ...BASE, rows: {} })

    expect(payload.note).toMatch(/your own/i)
  })

  test('ignores a table it does not know about', () => {
    // A caller passing `leads` must not be able to smuggle it in through the
    // payload builder, whatever the query did.
    const rows = { leads: [{ id: 'l1' }] } as unknown as Partial<
      Record<ExportTable, readonly unknown[]>
    >

    const payload = buildExportPayload({ ...BASE, rows })

    expect(Object.keys(payload.tables)).not.toContain('leads')
  })
})

describe('exportFileName', () => {
  test('stamps the day, so two exports a week apart sort and read correctly', () => {
    expect(exportFileName(EXPORTED_AT)).toBe('mirrorline-export-2026-11-17.json')
  })

  test('pads single-digit months and days', () => {
    expect(exportFileName(new Date('2026-01-05T23:59:59.000Z'))).toBe(
      'mirrorline-export-2026-01-05.json',
    )
  })
})
