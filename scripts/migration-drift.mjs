/**
 * Does production have every migration this tree carries? (docs/DECISIONS.md D104)
 *
 * ============================================================================
 * Why this exists
 * ============================================================================
 *
 * Migrations are applied **before** the merge, by a manual dispatch of
 * `migrate-production.yml`. That order is what keeps the schema ahead of the
 * code — and it rests entirely on somebody remembering to do it, because
 * nothing applies migrations automatically any more.
 *
 * So this is the check that notices when it did not happen. It reads
 * `supabase migration list --linked` and fails if a migration exists in the
 * repo and not on the remote. Read-only: it compares, and never applies.
 *
 * A forgotten migration then shows up as a red check on `main` within a minute
 * of the merge, rather than as an application error whenever the first request
 * reaches the missing column.
 *
 * ============================================================================
 * What it reads, and why the parser is lenient
 * ============================================================================
 *
 * `migration list` prints a three-column table — local version, remote
 * version, timestamp — with box-drawing separators on current CLIs and ASCII
 * pipes on older ones. A row with a local version and no remote one is a
 * migration that has not been applied.
 *
 * Both separators are accepted, and a JSON array is too, in case the command is
 * ever given `--output json`. The alternative — pinning to one exact table
 * shape — turns a cosmetic CLI change into a gate that finds no rows and
 * passes, and a safety check that cannot tell silence from success is worth
 * less than no check at all. Which is why no rows is a **failure** here.
 *
 * **The reverse direction is reported, not failed.** A version on the remote
 * that this tree does not have is usually a migration applied from a branch
 * that has not merged yet — exactly what the documented order produces between
 * the dispatch and the merge. Failing on it would make the correct procedure
 * look broken.
 */

const VERSION = /^\d{14}$/

/**
 * One row per migration, from either output shape.
 *
 * Returns `{ local, remote }` with `null` for an absent side.
 */
export function parseMigrationList(output) {
  const text = String(output ?? '').trim()
  if (text === '') return []

  if (text.startsWith('[') || text.startsWith('{')) return parseJson(text)

  return text
    .split('\n')
    .map(toRow)
    .filter((row) => row !== null)
}

function parseJson(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed]

  return rows
    .map((row) => ({
      local: version(row?.local ?? row?.Local),
      remote: version(row?.remote ?? row?.Remote),
    }))
    .filter((row) => row.local !== null || row.remote !== null)
}

function toRow(line) {
  // Box-drawing or ASCII; a header or divider row yields no version in either
  // column and falls out below.
  const cells = line.split(/[│|]/)
  if (cells.length < 2) return null

  const local = version(cells[0])
  const remote = version(cells[1])
  if (local === null && remote === null) return null

  return { local, remote }
}

/**
 * A 14-digit version, or null for a header, a divider, or an empty cell.
 *
 * **The backticks are not decoration, they are the format.** Current CLIs print
 * every cell as `` `20261113120000` ``, and the first version of this matched
 * `/^\d{14}$/` against the cell as-is — so a perfectly readable table parsed as
 * zero rows and the check failed on its first real run. Stripped rather than
 * matched around, so a future CLI that drops them keeps working.
 */
function version(cell) {
  const trimmed = String(cell ?? '')
    .replace(/`/g, '')
    .trim()
  return VERSION.test(trimmed) ? trimmed : null
}

/** The versions this tree has and the remote does not. */
export function findUnapplied(rows) {
  return rows.filter((row) => row.local !== null && row.remote === null).map((row) => row.local)
}

/** The versions the remote has and this tree does not. */
export function findRemoteOnly(rows) {
  return rows.filter((row) => row.remote !== null && row.local === null).map((row) => row.remote)
}

function read(stream) {
  return new Promise((resolve, reject) => {
    let text = ''
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      text += chunk
    })
    stream.on('end', () => resolve(text))
    stream.on('error', reject)
  })
}

async function main() {
  const output = await read(process.stdin)
  const rows = parseMigrationList(output)

  // No rows at all means the parse found nothing to compare, which is not the
  // same as agreement. Fail, and show what arrived: see the note on leniency.
  if (rows.length === 0) {
    console.error(
      [
        'migration-drift: no migration rows found in the input.',
        '',
        'Either `supabase migration list --linked` printed nothing, or its output no',
        'longer looks like a table this can read. Both are failures rather than a',
        'pass, because a check that cannot see the schema cannot vouch for it.',
        '',
        'What arrived on stdin:',
        output.trim() === '' ? '  (empty)' : output.trim(),
        '',
      ].join('\n'),
    )
    process.exitCode = 1
    return
  }

  const unapplied = findUnapplied(rows)
  const remoteOnly = findRemoteOnly(rows)

  if (remoteOnly.length > 0) {
    console.log(
      `migration-drift: ${remoteOnly.length} migration(s) on production are not in this tree — ${remoteOnly.join(', ')}. Expected between a dispatch and its merge; not a failure.`,
    )
  }

  if (unapplied.length === 0) {
    console.log(`migration-drift: production has all ${rows.length} migration(s) in this tree. OK`)
    return
  }

  console.error('migration-drift: production is missing migration(s) this tree has.\n')
  for (const name of unapplied) console.error(`  ${name}`)
  console.error(
    [
      '',
      'Production tracks main (D85), so the code for these is deploying — or',
      'deployed — against a schema without them. The order in D104 is migrate first,',
      'then merge, and this is what it looks like when that was missed.',
      '',
      'To fix it now: Actions → Migrate production → Run workflow, ref `main`.',
      'Then re-run this check.',
      '',
    ].join('\n'),
  )
  process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) main()
