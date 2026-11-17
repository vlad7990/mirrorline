/**
 * The Supabase seed and the TypeScript definitions describe the same twelve
 * KPIs, or this fails.
 *
 * Two copies of a list is a drift waiting to happen, and this particular
 * drift would be quiet: a KPI renamed in the app but not in the seed shows the
 * old name on every dashboard built from the database, and nothing crashes.
 * The alternative — generating one from the other — needs a build step for
 * twelve rows that change about once a quarter. A test is the cheaper half of
 * that trade, as long as it checks the fields that carry meaning rather than
 * just the count.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { KPI_DEFINITIONS } from '@/components/kpi/sample-dashboard'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const SEED_PATH = path.join(REPO_ROOT, 'supabase', 'seed.sql')

interface SeedRow {
  readonly key: string
  readonly name: string
  readonly unit: string
  readonly formula: string
  readonly source: string
  readonly tier: string
}

function unquote(value: string | undefined): string {
  return (value ?? '').replaceAll("''", "'")
}

/**
 * Pull the tuples out of the seed's single `insert … values` statement.
 *
 * A six-field regex rather than a SQL parser: the file is written by hand from
 * one template, and a parser would be more code than the thing it checks. If
 * the seed ever grows a second statement or a different column order this
 * finds zero rows and the first assertion fails loudly — which is the right
 * outcome, because at that point the shape this test assumed is gone.
 */
function parseSeed(sql: string): readonly SeedRow[] {
  // Single-quoted SQL strings, with '' as the escape for a literal quote.
  const field = String.raw`'((?:[^']|'')*)'`
  const tuple = new RegExp(
    String.raw`\(\s*${field},\s*${field},\s*${field},\s*${field},\s*${field},\s*${field}\s*\)`,
    'g',
  )

  const rows: SeedRow[] = []
  for (const match of sql.matchAll(tuple)) {
    const [, key, name, unit, formula, source, tier] = match
    rows.push({
      key: unquote(key),
      name: unquote(name),
      unit: unquote(unit),
      formula: unquote(formula),
      source: unquote(source),
      tier: unquote(tier),
    })
  }
  return rows
}

const SEED_SQL = readFileSync(SEED_PATH, 'utf8')

/**
 * The statements, with the prose stripped.
 *
 * The first version of this test searched the whole file for `is_custom` and
 * failed on the comment explaining why custom KPIs are never seeded — a test
 * reading the documentation as if it were code. What the assertion is about
 * is what the database is told to do.
 */
const SEED_STATEMENTS = SEED_SQL.split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')

const SEED_ROWS = parseSeed(SEED_STATEMENTS)

describe('the kpi_definitions seed', () => {
  test('parses, so the rest of this file is checking something', () => {
    expect(SEED_ROWS.length).toBeGreaterThan(0)
  })

  test('holds exactly the KPIs the app defines', () => {
    const seeded = SEED_ROWS.map((row) => row.key).sort()
    const defined = KPI_DEFINITIONS.map((definition) => definition.key).sort()

    expect(seeded).toEqual(defined)
  })

  test('agrees with the app on every field that carries meaning', () => {
    for (const definition of KPI_DEFINITIONS) {
      const row = SEED_ROWS.find((candidate) => candidate.key === definition.key)

      expect(row, `no seed row for ${definition.key}`).toBeDefined()
      expect(row).toMatchObject({
        name: definition.name,
        unit: definition.unit,
        formula: definition.formula,
        source: definition.source,
        tier: definition.tier,
      })
    }
  })

  test('seeds no custom KPI', () => {
    // 15 §4: a workspace's own KPIs are created by the user and carry a
    // workspace_id. One arriving by seed would be a KPI every account sees
    // and none of them owns.
    expect(SEED_STATEMENTS).not.toMatch(/is_custom/)
    expect(KPI_DEFINITIONS.some((definition) => definition.isCustom)).toBe(false)
  })
})
