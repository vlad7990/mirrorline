/**
 * The accessibility proof.
 *
 * DESIGN.md "Do's": "Keep touch targets at 44px or larger and text contrast
 * at 4.5:1 or higher." This test computes WCAG 2.1 relative luminance from
 * the token hexes and asserts every foreground/background pair the design
 * system promises clears 4.5:1 — in light and in dark.
 *
 * If a pair here fails, the fix belongs in tokens.ts (and DESIGN.md), never
 * in this file's expectations.
 */

import { describe, expect, it } from 'vitest'

import { DARK_COLORS, LIGHT_COLORS } from '../tokens'

/* -------------------------------------------------------------------------- */
/* WCAG maths                                                                  */
/* -------------------------------------------------------------------------- */

const WCAG_AA_NORMAL_TEXT = 4.5

function parseHex(hex: string): readonly [number, number, number] {
  const cleaned = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Not a 6-digit hex colour: "${hex}"`)
  }
  const value = Number.parseInt(cleaned, 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff] as const
}

/** sRGB channel to linear light, per WCAG 2.1 "relative luminance". */
function toLinear(channel: number): number {
  const normalised = channel / 255
  return normalised <= 0.03928 ? normalised / 12.92 : Math.pow((normalised + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = parseHex(hex)
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

/* -------------------------------------------------------------------------- */
/* The promises                                                                */
/* -------------------------------------------------------------------------- */

type Palette = typeof LIGHT_COLORS | typeof DARK_COLORS
type TokenName = keyof typeof LIGHT_COLORS

interface Pair {
  foreground: TokenName
  background: TokenName
  /** Where it shows up, so a failure says what breaks. */
  where: string
}

/**
 * Every pair the system actually renders as text on a fill. The soft/on-soft
 * pairs are the status chips; the rest are body copy, buttons and the ink
 * panels.
 */
const PAIRS: readonly Pair[] = [
  { foreground: 'text', background: 'background', where: 'body copy on the page' },
  { foreground: 'text', background: 'surface', where: 'body copy in a card' },
  { foreground: 'text', background: 'surface-subtle', where: 'body copy in an inset block' },
  { foreground: 'text-muted', background: 'background', where: 'metadata on the page' },
  { foreground: 'text-muted', background: 'surface', where: 'metadata in a card' },
  { foreground: 'text-muted', background: 'surface-subtle', where: 'metadata in an inset block' },
  { foreground: 'on-primary', background: 'primary', where: 'the primary button label' },
  { foreground: 'on-ink', background: 'ink', where: 'the dark insight panel' },
  { foreground: 'on-accent-soft', background: 'accent-soft', where: 'the active nav item' },
  { foreground: 'on-success-soft', background: 'success-soft', where: 'the "Passed" chip' },
  { foreground: 'on-warning-soft', background: 'warning-soft', where: 'the "Needs review" chip' },
  { foreground: 'on-danger-soft', background: 'danger-soft', where: 'the "Blocked" chip' },
  { foreground: 'on-info-soft', background: 'info-soft', where: 'the "Scheduled" chip' },
  { foreground: 'on-neutral-soft', background: 'neutral-soft', where: 'the "Published" chip' },
]

const THEMES: ReadonlyArray<readonly [name: string, palette: Palette]> = [
  ['light', LIGHT_COLORS],
  ['dark', DARK_COLORS],
]

describe('WCAG contrast maths', () => {
  it('computes the documented ratios', () => {
    // Arrange + Act + Assert: black on white is the canonical 21:1.
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
  })

  it('is symmetric, so argument order never matters', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#767676'),
      10,
    )
  })

  it('throws on a malformed hex rather than scoring it', () => {
    expect(() => relativeLuminance('#12345')).toThrow(/hex colour/)
  })
})

describe.each(THEMES)('%s theme', (_themeName, palette) => {
  it.each(PAIRS)(
    '$foreground on $background ($where) clears 4.5:1',
    ({ foreground, background }) => {
      // Arrange
      const foregroundHex = palette[foreground]
      const backgroundHex = palette[background]

      // Act
      const ratio = contrastRatio(foregroundHex, backgroundHex)

      // Assert
      expect(
        ratio,
        `${foreground} (${foregroundHex}) on ${background} (${backgroundHex}) is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
    },
  )
})

describe('white text goes only where DESIGN.md allows it', () => {
  // DESIGN.md "Do's": "Keep white text only on primary (#C8401C) or ink;
  // never on the bright accent." These two tests are why that rule exists.
  it.each(THEMES)('%s: white on the bright accent would fail, so it is banned', (_n, palette) => {
    expect(contrastRatio(palette['on-primary'], palette.accent)).toBeLessThan(WCAG_AA_NORMAL_TEXT)
  })

  it.each(THEMES)('%s: white on ink passes', (_n, palette) => {
    expect(contrastRatio(palette['on-primary'], palette.ink)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })
})
