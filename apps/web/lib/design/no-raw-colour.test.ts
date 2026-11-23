/**
 * Colour lives in `theme.css`, and this is the gate that keeps it there (D122).
 *
 * The brand restyle is only durable if the next screen is built from tokens
 * too. A single `#1a1f27` in a studio component is not a bug on the day it is
 * written — it is a bug three months later, when the ink goes half a step
 * warmer in one place and the sidebar stops matching the site.
 *
 * ## What counts as a raw colour
 *
 * A hex literal (`#1a1f27`, `#fff`) or a functional colour (`rgb()`, `rgba()`,
 * `hsl()`) anywhere in the scanned files, including inside Tailwind's
 * arbitrary-value brackets — `shadow-[0_10px_30px_rgba(0,0,0,.65)]` is exactly
 * how the three that existed got in. Token references
 * (`var(--color-ink-900)`), token-named utilities (`bg-ink-900`,
 * `text-gold-bright`, `shadow-panel`) and opacity modifiers (`bg-ink-900/95`)
 * all say the same thing without pinning a value.
 *
 * ## What it scans
 *
 * The studio: its routes and its two chrome folders. `packages/ui` is
 * deliberately **not** scanned — `theme.css` and the primitives live there,
 * and a token has to be written down somewhere.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

const WEB_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** The three the brief names: the routes and the two chrome folders. */
const SCANNED = ['app/app', 'components/studio', 'components/shell']

const SOURCE = /\.(ts|tsx|css)$/

/** `#abc`, `#1a1f27`, `#1a1f27ff`. */
const HEX = /#[0-9a-fA-F]{3,8}\b/
/** `rgb(…)`, `rgba(…)`, `hsl(…)`, `hsla(…)`. */
const FUNCTIONAL = /\b(rgba?|hsla?)\(/

function sourceFiles(directory: string): readonly string[] {
  const absolute = join(WEB_ROOT, directory)
  const found: string[] = []

  for (const entry of readdirSync(absolute)) {
    const path = join(absolute, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(join(directory, entry)))
      continue
    }
    if (SOURCE.test(entry)) found.push(path)
  }

  return found
}

describe('the studio takes its colour from theme.css', () => {
  test('scans the folders it claims to, so a green run means something', () => {
    // A path typo would make every assertion below pass over nothing.
    for (const directory of SCANNED) {
      expect(sourceFiles(directory).length, `${directory} has no source files`).toBeGreaterThan(0)
    }
  })

  test.each(SCANNED)('%s holds no raw hex or rgb() colour', (directory) => {
    const offenders: string[] = []

    for (const path of sourceFiles(directory)) {
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!HEX.test(line) && !FUNCTIONAL.test(line)) return
          offenders.push(`${relative(WEB_ROOT, path)}:${index + 1}  ${line.trim()}`)
        })
    }

    expect(
      offenders,
      `Colour belongs in packages/ui/src/styles/theme.css (D122). Use a token:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
