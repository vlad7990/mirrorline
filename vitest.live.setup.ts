/**
 * Load `apps/web/.env.local` the way Next does, for the live runner only.
 *
 * Plain Vitest does not read `.env.local` into `process.env` — Vite only
 * exposes `VITE_`-prefixed variables, and to `import.meta.env` rather than to
 * `process.env`. Next.js loads the file for `next dev` and `next build`, which
 * is why the key works in the app and would not work here.
 *
 * So this reads the one file and sets what it finds. **It never overwrites an
 * existing value**, so a shell that already exported a key (or deliberately
 * exported an empty one) wins — the precedence Next itself uses, and the thing
 * that keeps `ANTHROPIC_API_KEY='' pnpm test:copilot-live` an honest way to
 * prove the runner refuses to run without a key.
 *
 * Only wired into `vitest.live.config.ts`. The hermetic suite must not gain a
 * way to find a key by accident; that is exactly the failure of 15 November.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ENV_LOCAL = fileURLToPath(new URL('./apps/web/.env.local', import.meta.url))

/**
 * `KEY=value` per line, `#` comments, optional surrounding quotes.
 *
 * Deliberately small rather than a dependency: the alternative is `dotenv` in
 * the root manifest for one file read in one opt-in script.
 */
function parseEnvFile(contents: string): Readonly<Record<string, string>> {
  const parsed: Record<string, string> = {}

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) continue

    const at = line.indexOf('=')
    if (at <= 0) continue

    const key = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim()
    parsed[key] = value.replace(/^(['"])(.*)\1$/, '$2')
  }

  return parsed
}

try {
  const parsed = parseEnvFile(readFileSync(ENV_LOCAL, 'utf8'))

  for (const [key, value] of Object.entries(parsed)) {
    // An exported value wins, including an exported empty one.
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
} catch {
  // Absent or unreadable is not an error here. The test's own `beforeAll`
  // reports a missing key in a sentence that says what to do about it, which
  // is more use than a stack trace from a file read.
}
