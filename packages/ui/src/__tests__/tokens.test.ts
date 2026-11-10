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

import {
  DARK_COLORS,
  DURATION,
  EASING,
  FONTS,
  LIGHT_COLORS,
  RADIUS,
  STAGGER_STEP,
} from '../tokens'

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

/**
 * Pulls every `--<prefix>-x: y;` declaration out of a block, lower-cased.
 * `[^;]+` is deliberate: easing curves and font stacks carry commas and
 * parentheses, and all of that belongs to the value.
 */
function declarations(block: string, prefix: string): Map<string, string> {
  const found = new Map<string, string>()
  const pattern = new RegExp(`--${prefix}-([a-z0-9-]+)\\s*:\\s*([^;]+);`, 'gi')

  for (const match of block.matchAll(pattern)) {
    const name = match[1]
    const value = match[2]
    if (name === undefined || value === undefined) continue
    found.set(name.toLowerCase(), value.trim().toLowerCase())
  }
  return found
}

let themeBlock: string
let themeColors: Map<string, string>
let darkColors: Map<string, string>

beforeAll(() => {
  const css = readFileSync(THEME_CSS, 'utf8')
  themeBlock = blockBody(css, '@theme {')
  themeColors = declarations(themeBlock, 'color')
  darkColors = declarations(blockBody(css, '.dark {'), 'color')
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

/* -------------------------------------------------------------------------- */
/* The non-colour categories                                                   */
/* -------------------------------------------------------------------------- */

/** `full` is Tailwind's own `rounded-full`; theme.css only names the rest. */
const RADIUS_IN_CSS = ['sm', 'thumb', 'md', 'lg', 'xl'] as const

describe('theme.css matches tokens.ts (shape)', () => {
  it.each(RADIUS_IN_CSS)('--radius-%s matches RADIUS', (name) => {
    expect(declarations(themeBlock, 'radius').get(name)).toBe(RADIUS[name])
  })

  it('leaves `full` to Tailwind rather than redeclaring it', () => {
    expect(RADIUS.full).toBe('9999px')
    expect(declarations(themeBlock, 'radius').has('full')).toBe(false)
  })
})

describe('theme.css matches tokens.ts (the two voices)', () => {
  it('points --font-sans at Geist', () => {
    const value = declarations(themeBlock, 'font').get('sans')
    expect(value).toContain(`'${FONTS.sans.toLowerCase()}'`)
  })

  it('points --font-mono at Geist Mono', () => {
    const value = declarations(themeBlock, 'font').get('mono')
    expect(value).toContain(`'${FONTS.mono.toLowerCase()}'`)
  })

  it.each(['heading', 'body'])('keeps --font-%s, which consumers still use', (name) => {
    expect(declarations(themeBlock, 'font').has(name)).toBe(true)
  })

  it.each(['metric', 'mono'])('declares --text-%s for the machine voice', (name) => {
    expect(declarations(themeBlock, 'text').has(name)).toBe(true)
  })
})

describe('theme.css matches tokens.ts (motion)', () => {
  it.each(Object.entries(EASING))('--ease-%s is %s', (name, value) => {
    expect(declarations(themeBlock, 'ease').get(name)).toBe(value.toLowerCase())
  })

  it.each(Object.entries(DURATION))('--duration-%s is %s', (name, value) => {
    expect(declarations(themeBlock, 'duration').get(name)).toBe(value.toLowerCase())
  })

  it('declares the stagger step', () => {
    expect(declarations(themeBlock, 'stagger').get('step')).toBe(STAGGER_STEP)
  })

  it('declares no UI duration over 300ms', () => {
    // DESIGN.md "Motion": an interface that takes longer than 300ms to answer
    // stops feeling like an instrument.
    for (const value of Object.values(DURATION)) {
      expect(Number.parseFloat(value)).toBeLessThanOrEqual(300)
    }
  })

  it('pairs every enter duration with a faster exit', () => {
    // Emil Kowalski's rule: you have already decided to leave, so the exit
    // must not make you wait. ~65% of the enter.
    for (const name of ['press', 'tooltip', 'dropdown', 'modal'] as const) {
      const enter = Number.parseFloat(DURATION[name])
      const exit = Number.parseFloat(DURATION[`${name}-exit`])
      expect(exit).toBeLessThan(enter)
      expect(exit / enter).toBeGreaterThanOrEqual(0.55)
    }
  })

  it('never uses ease-in on UI', () => {
    // ease-in starts slow, which reads as lag. The easing scale has no entry
    // for it, and theme.css must not reintroduce one.
    expect(Object.keys(EASING)).not.toContain('in')
    expect(declarations(themeBlock, 'ease').has('in')).toBe(false)
  })
})
