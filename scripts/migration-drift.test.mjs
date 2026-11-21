/**
 * The drift check's own tests.
 *
 * The failure this gate exists to prevent is a silent pass: output it cannot
 * read, parsed as "no migrations, nothing missing, green". So the cases below
 * are weighted towards the shapes that would produce an empty parse — a header,
 * a divider, an unexpected separator, a CLI message instead of a table — and
 * each asserts that nothing is mistaken for agreement.
 */

import { describe, expect, test } from 'vitest'

import { findRemoteOnly, findUnapplied, parseMigrationList } from './migration-drift.mjs'

/** What current CLIs print: box-drawing separators, right-aligned headers. */
const IN_SYNC = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
    20261113120000 │ 20261113120000 │ 2026-11-13 12:00:00
    20261119080000 │ 20261119080000 │ 2026-11-19 08:00:00
`

/** One migration in the tree that the remote has never seen. */
const ONE_PENDING = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
    20261113120000 │ 20261113120000 │ 2026-11-13 12:00:00
    20261119080000 │                │ 2026-11-19 08:00:00
`

/** Older CLIs, ASCII pipes. */
const ASCII_PIPES = `
   Local          | Remote         | Time (UTC)
  ----------------|----------------|--------------------
   20261113120000 | 20261113120000 | 2026-11-13 12:00:00
   20261119080000 |                | 2026-11-19 08:00:00
`

/**
 * **What the CLI actually prints**, copied verbatim out of the first real run
 * (GitHub run 44871564148, 21 November).
 *
 * Every cell is wrapped in **backticks**, and the separator is an ASCII pipe
 * rather than the box-drawing character. The fixtures above were written from
 * memory of the format instead of captured from a real invocation, so all
 * fifteen of them passed against a shape `supabase migration list` does not
 * produce — and the check failed on its first contact with production, reading
 * zero rows out of six perfectly good ones.
 *
 * This constant is the regression test for that, and the reason it is pasted
 * rather than tidied: a fixture that has been through somebody's idea of what
 * the output looks like is the bug, not the test.
 */
const REAL_OUTPUT = `
Local            | Remote           | Time (UTC)
  ------------------|------------------|-----------------------
   \`20261113120000\` | \`20261113120000\` | \`2026-11-13 12:00:00\`
   \`20261116230000\` | \`20261116230000\` | \`2026-11-16 23:00:00\`
   \`20261116230100\` | \`20261116230100\` | \`2026-11-16 23:01:00\`
   \`20261117180000\` | \`20261117180000\` | \`2026-11-17 18:00:00\`
   \`20261118100000\` | \`20261118100000\` | \`2026-11-18 10:00:00\`
   \`20261118110000\` | \`20261118110000\` | \`2026-11-18 11:00:00\`
`

/** The same shape, with one migration not applied anywhere yet. */
const REAL_OUTPUT_PENDING = `
Local            | Remote           | Time (UTC)
  ------------------|------------------|-----------------------
   \`20261113120000\` | \`20261113120000\` | \`2026-11-13 12:00:00\`
   \`20261119030000\` |                  | \`2026-11-19 03:00:00\`
`

describe('parseMigrationList, on output captured from a real run', () => {
  test('reads all six rows the CLI actually printed', () => {
    expect(parseMigrationList(REAL_OUTPUT)).toEqual([
      { local: '20261113120000', remote: '20261113120000' },
      { local: '20261116230000', remote: '20261116230000' },
      { local: '20261116230100', remote: '20261116230100' },
      { local: '20261117180000', remote: '20261117180000' },
      { local: '20261118100000', remote: '20261118100000' },
      { local: '20261118110000', remote: '20261118110000' },
    ])
  })

  test('calls that in sync rather than failing — the bug was reading zero rows', () => {
    const rows = parseMigrationList(REAL_OUTPUT)
    expect(rows).toHaveLength(6)
    expect(findUnapplied(rows)).toEqual([])
    expect(findRemoteOnly(rows)).toEqual([])
  })

  test('still spots a pending migration through the backticks', () => {
    const rows = parseMigrationList(REAL_OUTPUT_PENDING)
    expect(findUnapplied(rows)).toEqual(['20261119030000'])
  })
})

describe('parseMigrationList', () => {
  test('reads a table where every migration is applied', () => {
    expect(parseMigrationList(IN_SYNC)).toEqual([
      { local: '20261113120000', remote: '20261113120000' },
      { local: '20261119080000', remote: '20261119080000' },
    ])
  })

  test('reads a missing remote as null rather than as a version', () => {
    expect(parseMigrationList(ONE_PENDING)).toEqual([
      { local: '20261113120000', remote: '20261113120000' },
      { local: '20261119080000', remote: null },
    ])
  })

  test('reads the ASCII-pipe table older CLIs print', () => {
    expect(parseMigrationList(ASCII_PIPES)).toEqual([
      { local: '20261113120000', remote: '20261113120000' },
      { local: '20261119080000', remote: null },
    ])
  })

  test('reads a remote-only migration, which is the dispatch-before-merge window', () => {
    const output = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
                   │ 20261121000000 │ 2026-11-21 00:00:00
`
    expect(parseMigrationList(output)).toEqual([{ local: null, remote: '20261121000000' }])
  })

  test('keeps the header and the divider out of the rows', () => {
    const rows = parseMigrationList(IN_SYNC)
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.local !== 'LOCAL')).toBe(true)
  })

  test('reads --output json, if the command is ever given it', () => {
    const output =
      '[{"local":"20261113120000","remote":"20261113120000"},{"local":"20261119080000","remote":""}]'
    expect(parseMigrationList(output)).toEqual([
      { local: '20261113120000', remote: '20261113120000' },
      { local: '20261119080000', remote: null },
    ])
  })

  test('finds nothing in empty output, so the caller fails rather than passes', () => {
    expect(parseMigrationList('')).toEqual([])
    expect(parseMigrationList('   \n  \n')).toEqual([])
    expect(parseMigrationList(null)).toEqual([])
  })

  test('finds nothing in a CLI message, which is also not agreement', () => {
    expect(parseMigrationList('Remote database is up to date.')).toEqual([])
    expect(parseMigrationList('Cannot find project ref. Have you run supabase link?')).toEqual([])
  })

  test('does not mistake a version in prose for a row', () => {
    expect(parseMigrationList('Applying migration 20261119080000_scheduled_posts.sql...')).toEqual(
      [],
    )
  })
})

describe('findUnapplied', () => {
  test('names the migration the remote is missing', () => {
    expect(findUnapplied(parseMigrationList(ONE_PENDING))).toEqual(['20261119080000'])
  })

  test('is empty when local and remote agree', () => {
    expect(findUnapplied(parseMigrationList(IN_SYNC))).toEqual([])
  })

  test('names every missing migration, not just the first', () => {
    const output = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
    20261119080000 │                │ 2026-11-19 08:00:00
    20261120090000 │                │ 2026-11-20 09:00:00
`
    expect(findUnapplied(parseMigrationList(output))).toEqual(['20261119080000', '20261120090000'])
  })

  test('ignores a remote-only row, which is the other direction', () => {
    const output = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
                   │ 20261121000000 │ 2026-11-21 00:00:00
`
    expect(findUnapplied(parseMigrationList(output))).toEqual([])
  })
})

describe('findRemoteOnly', () => {
  test('names a migration production has that the tree does not', () => {
    const output = `
        LOCAL      │     REMOTE     │     TIME (UTC)
  ─────────────────┼────────────────┼─────────────────────
    20261113120000 │ 20261113120000 │ 2026-11-13 12:00:00
                   │ 20261121000000 │ 2026-11-21 00:00:00
`
    expect(findRemoteOnly(parseMigrationList(output))).toEqual(['20261121000000'])
  })

  test('is empty when local and remote agree', () => {
    expect(findRemoteOnly(parseMigrationList(IN_SYNC))).toEqual([])
  })
})
