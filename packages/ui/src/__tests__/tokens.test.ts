/**
 * Token drift guard.
 *
 * tokens.ts is the source of truth for TypeScript; styles/theme.css is the
 * source of truth for Tailwind. They carry the same values, and nothing stops
 * one from being edited without the other — except this test.
 *
 * It parses theme.css and asserts:
 *  - every LIGHT_COLORS entry exists as `--color-<name>: <value>` in @theme
 *  - every DARK_COLORS entry that differs from light is overridden in `.dark`
 *  - every DARK_COLORS entry that matches light is NOT overridden, because a
 *    redundant override is exactly the drift this guard exists to catch
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

import { DARK_COLORS, LIGHT_COLORS } from '../tokens'

const HERE = dirname(fileURLToPath(import.meta.url))
const THEME_CSS = resolve(HERE, '../styles/theme.css')

/**
 * Returns the body of the block that starts at `opener`, matching braces so a
 * nested rule (a @media, a @keyframes) cannot end the block early.
 */
function blockBody(css: string, opener: string): string {
  const start = css.indexOf(opener)
  if (start === -1) throw new Error(`theme.css has no "${opener}" block`)

  let depth = 0
  for (let index = start + opener.length - 1; index < css.length; index += 1) {
    const char = css[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return css.slice(start + opener.length, index)
    }
  }
  throw new Error(`theme.css has an unterminated "${opener}" block`)
}

/** Pulls every `--color-x: y;` declaration out of a block, lower-cased. */
function colorDeclarations(block: string): Map<string, string> {
  const found = new Map<string, string>()
  const pattern = /--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi

  for (const match of block.matchAll(pattern)) {
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    found.set(name.toLowerCase(), value.trim().toLowerCase())
  }
  return found
}

let themeColors: Map<string, string>
let darkColors: Map<string, string>

beforeAll(() => {
  const css = readFileSync(THEME_CSS, 'utf8')
  themeColors = colorDeclarations(blockBody(css, '@theme {'))
  darkColors = colorDeclarations(blockBody(css, '.dark {'))
})

const LIGHT_ENTRIES = Object.entries(LIGHT_COLORS)
const DARK_ENTRIES = Object.entries(DARK_COLORS)

const CHANGED_IN_DARK = DARK_ENTRIES.filter(
  ([name, value]) => LIGHT_COLORS[name as keyof typeof LIGHT_COLORS] !== value,
)
const UNCHANGED_IN_DARK = DARK_ENTRIES.filter(
  ([name, value]) => LIGHT_COLORS[name as keyof typeof LIGHT_COLORS] === value,
)

/** The thumbnail palette sits outside the theme and must still be exposed. */
const DEMO_CSS_NAMES = [
  'demo-teal',
  'demo-teal-deep',
  'demo-teal-slate',
  'demo-warm-earth',
  'demo-sand',
] as const

describe('theme.css matches tokens.ts (light)', () => {
  it.each(LIGHT_ENTRIES)('--color-%s is declared in @theme', (name) => {
    expect(themeColors.has(name)).toBe(true)
  })

  it.each(LIGHT_ENTRIES)('--color-%s is %s', (name, value) => {
    expect(themeColors.get(name)).toBe(value.toLowerCase())
  })
})

describe('theme.css matches tokens.ts (dark)', () => {
  it('has overrides to check', () => {
    // A guard on the guard: an empty list would make every case below vacuous.
    expect(CHANGED_IN_DARK.length).toBeGreaterThan(0)
  })

  it.each(CHANGED_IN_DARK)('--color-%s is overridden to %s in .dark', (name, value) => {
    expect(darkColors.get(name)).toBe(value.toLowerCase())
  })

  it.each(UNCHANGED_IN_DARK)('--color-%s is left alone in .dark', (name) => {
    expect(darkColors.has(name)).toBe(false)
  })
})

describe('theme.css declares nothing tokens.ts does not know about', () => {
  it('has no stray --color-* in .dark', () => {
    const known = new Set(Object.keys(DARK_COLORS))
    const stray = [...darkColors.keys()].filter((name) => !known.has(name))
    expect(stray).toEqual([])
  })

  it.each(DEMO_CSS_NAMES)('exposes --color-%s for the thumbnails', (name) => {
    // DESIGN.md scopes these to "inside thumbnails only", so they are not in
    // LIGHT_COLORS and never follow the theme.
    expect(themeColors.has(name)).toBe(true)
  })
})
