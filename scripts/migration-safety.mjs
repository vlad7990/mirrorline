/**
 * Expand/contract gate for `supabase/migrations/` (docs/DECISIONS.md D93, D104).
 *
 * ============================================================================
 * Why a script and not a review checklist
 * ============================================================================
 *
 * Production tracks `main` (D85) and migrations are applied **before** the
 * merge, by a manual dispatch (D104). That order is deliberate, and it means
 * there is always a window in which **production runs the old code against the
 * new schema** — from the moment the migration is applied until the pull
 * request is merged and deployed. A Vercel rollback afterwards reopens the same
 * window, because it moves the code back and nothing moves the schema back.
 *
 * One direction, then, but a guaranteed one: the schema is ahead of the code by
 * design. That is survivable **only if every migration is additive**. Add a
 * column, ship code that writes it, backfill, then drop the old one in a later
 * PR once nothing reads it. That is expand/contract, and a checklist item is
 * not enough: the one time it is forgotten is the one time it is 2am.
 *
 * **And it is the half that cannot be undone.** Reverting a commit un-deploys
 * code; nothing un-applies a migration. A dropped column on a database holding
 * real rows is gone — which is why this runs on the branch in `ci.yml` and
 * again on the ref being migrated in `migrate-production.yml`.
 *
 * ============================================================================
 * The escape hatch, and why it is a comment rather than a flag
 * ============================================================================
 *
 * A contract migration is legitimate — eventually you *do* drop the column. So
 * the rule is not "never", it is "say so, in the file, on purpose":
 *
 *     -- contract-migration: approved
 *
 * In the migration itself, where the next reader sees it, rather than in a CI
 * variable or a commit message that no longer travels with the SQL. A marker
 * that lives in the file is one somebody has to open the file to add.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

/** The marker that says a destructive statement was a decision, not an accident. */
export const CONTRACT_MARKER = '-- contract-migration: approved'

/**
 * Statements that can break code already running against this schema.
 *
 * Deliberately narrow. `drop policy` and `drop function` are **not** here:
 * `create or replace function` is how every RPC in this repo is revised, and a
 * policy is replaced rather than outgrown. The list is about shapes the app
 * reads — tables, columns and their types.
 */
const DESTRUCTIVE_PATTERNS = [
  { name: 'drop table', pattern: /\bdrop\s+table\b/i },
  { name: 'drop column', pattern: /\bdrop\s+column\b/i },
  { name: 'drop view', pattern: /\bdrop\s+view\b/i },
  { name: 'rename to', pattern: /\brename\s+to\b/i },
  { name: 'rename column', pattern: /\brename\s+column\b/i },
  { name: 'alter column … type', pattern: /\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b/i },
  { name: 'set not null', pattern: /\balter\s+column\s+\S+\s+set\s+not\s+null\b/i },
]

/**
 * Strip comments before scanning, so prose *about* dropping a column is not a
 * finding — but the marker check runs on the raw text, because the marker is
 * itself a comment.
 */
function withoutComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      const at = line.indexOf('--')
      return at === -1 ? line : line.slice(0, at)
    })
    .join('\n')
}

/** Every destructive statement in one migration's SQL, by name. */
export function findDestructive(sql) {
  const code = withoutComments(sql)
  return DESTRUCTIVE_PATTERNS.filter(({ pattern }) => pattern.test(code)).map(({ name }) => name)
}

export function isContractApproved(sql) {
  return sql.toLowerCase().includes(CONTRACT_MARKER)
}

/** One finding per migration that is destructive and unmarked. */
export function auditMigrations(files) {
  return files.flatMap(({ name, sql }) => {
    const destructive = findDestructive(sql)
    if (destructive.length === 0 || isContractApproved(sql)) return []
    return [{ name, destructive }]
  })
}

function readMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8') }))
}

function main() {
  const files = readMigrations()
  const findings = auditMigrations(files)

  if (findings.length === 0) {
    console.log(`migration-safety: ${files.length} migration(s) are additive. OK`)
    return
  }

  console.error('migration-safety: destructive migration(s) with no contract marker.\n')
  for (const { name, destructive } of findings) {
    console.error(`  ${name}`)
    for (const statement of destructive) console.error(`    - ${statement}`)
  }
  console.error(
    [
      '',
      'Production tracks main and migrations are applied before the merge (D104),',
      'so between the apply and the merge production runs old code against the new',
      'schema — and after a rollback, the same again. Only additive migrations',
      'survive that, and nothing un-applies a migration.',
      '',
      'Split it: add the new shape now, move the code, drop the old shape in a later',
      'PR once nothing reads it.',
      '',
      `If this really is that later PR, say so in the migration itself:\n    ${CONTRACT_MARKER}`,
      '',
    ].join('\n'),
  )
  process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) main()
