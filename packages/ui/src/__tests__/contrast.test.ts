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

import { DARK_COLORS, LIGHT_COLORS, SITE_COLORS } from '../tokens'

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
  {
    foreground: 'on-primary',
    background: 'primary-hover',
    where: 'the primary button label, hovered',
  },
  { foreground: 'on-ink', background: 'ink', where: 'the dark insight panel' },
  // The lightbox. Same hexes in both themes, so this pair is asserted twice on
  // purpose: the duplicate is the proof it did not drift in one of them.
  { foreground: 'on-viewer', background: 'viewer', where: 'captions on the 9:16 viewer' },
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

/* -------------------------------------------------------------------------- */
/* The public site — gold and ink                                              */
/* -------------------------------------------------------------------------- */

type SiteToken = keyof typeof SITE_COLORS

interface SitePair {
  foreground: SiteToken
  background: SiteToken
  where: string
}

/**
 * The site's own pairs (D25). Separate from the themes above because the site
 * is not a theme: it alternates ink and snow bands section by section, so a
 * foreground has to clear every band it can land on, not just one.
 *
 * Two of these are the reason the handoff's palette was corrected rather than
 * copied — see the token notes in theme.css:
 *   * `on-ink-faint` was #7A8089 and scored 4.16:1 on `ink-700`.
 *   * `gold-text` replaces #A6842F, which scored 3.26:1 on `snow`.
 * Both now clear 4.5:1 on the worst surface they sit on, and these rows are
 * what stop either slipping back.
 */
const SITE_PAIRS: readonly SitePair[] = [
  { foreground: 'on-ink-900', background: 'ink-900', where: 'body copy on the ink band' },
  { foreground: 'on-ink-900', background: 'ink-800', where: 'body copy on the ink-alt band' },
  { foreground: 'on-ink-900', background: 'ink-700', where: 'body copy in a dark card' },
  { foreground: 'on-ink-muted', background: 'ink-900', where: 'sub-copy on the ink band' },
  { foreground: 'on-ink-muted', background: 'ink-700', where: 'sub-copy in a dark card' },
  { foreground: 'on-ink-faint', background: 'ink-900', where: 'the faintest text on ink' },
  { foreground: 'on-ink-faint', background: 'ink-800', where: 'the faintest text on ink-alt' },
  { foreground: 'on-ink-faint', background: 'ink-700', where: 'the faintest text in a dark card' },
  { foreground: 'gold-bright', background: 'ink-900', where: 'the eyebrow on ink' },
  { foreground: 'gold-bright', background: 'ink-700', where: 'the eyebrow in a dark card' },
  { foreground: 'gold', background: 'ink-900', where: 'gold body text on ink' },
  { foreground: 'on-snow', background: 'snow', where: 'body copy on the snow band' },
  { foreground: 'on-snow', background: 'white', where: 'body copy on the white band' },
  { foreground: 'on-snow-muted', background: 'snow', where: 'sub-copy on snow' },
  { foreground: 'on-snow-faint', background: 'snow', where: 'the faintest text on snow' },
  { foreground: 'gold-text', background: 'snow', where: 'the eyebrow on snow' },
  { foreground: 'gold-text', background: 'white', where: 'the eyebrow on white' },
  { foreground: 'gold-text', background: 'snow-deep', where: 'the eyebrow on a snow inset' },
  // The gold button is the one primary action on the site. Its label is ink.
  { foreground: 'ink-900', background: 'gold-bright', where: 'the gold button label' },
  { foreground: 'ink-900', background: 'gold', where: 'the gold button label, deeper fill' },
  { foreground: 'site-positive', background: 'ink-900', where: 'a passed check on ink' },
  { foreground: 'site-negative', background: 'ink-900', where: 'a blocked note on ink' },
  { foreground: 'site-info', background: 'ink-900', where: 'an info note on ink' },
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

describe('the public site, gold and ink', () => {
  it.each(SITE_PAIRS)(
    '$foreground on $background ($where) clears 4.5:1',
    ({ foreground, background }) => {
      // Arrange
      const foregroundHex = SITE_COLORS[foreground]
      const backgroundHex = SITE_COLORS[background]

      // Act
      const ratio = contrastRatio(foregroundHex, backgroundHex)

      // Assert
      expect(
        ratio,
        `${foreground} (${foregroundHex}) on ${background} (${backgroundHex}) is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
    },
  )

  // The display gradient is the one place the handoff's own gold survives on
  // a light band. It is allowed there because those headlines are 44px and
  // up, where WCAG's bar is 3:1 — and it is NOT allowed anywhere smaller,
  // which is what --color-gold-text exists for.
  it('keeps the display gold above the large-text bar on snow, but below the normal one', () => {
    const ratio = contrastRatio(SITE_COLORS['gold-deep'], SITE_COLORS.snow)

    expect(ratio, `gold-deep on snow is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    // If this ever clears 4.5 the correction is no longer needed and the
    // second gold can be retired. Until then, the two are not interchangeable.
    expect(ratio).toBeLessThan(WCAG_AA_NORMAL_TEXT)
  })

  it('states why the handoff values were corrected', () => {
    // The exact pairs that failed, kept as a record. If someone re-introduces
    // the handoff hexes verbatim, these say what goes wrong and where.
    expect(contrastRatio('#7A8089', SITE_COLORS['ink-700'])).toBeLessThan(WCAG_AA_NORMAL_TEXT)
    expect(contrastRatio('#A6842F', SITE_COLORS.snow)).toBeLessThan(WCAG_AA_NORMAL_TEXT)
  })
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

  it.each(THEMES)('%s: white on the viewer passes', (_n, palette) => {
    expect(contrastRatio(palette['on-primary'], palette.viewer)).toBeGreaterThanOrEqual(
      WCAG_AA_NORMAL_TEXT,
    )
  })
})

describe('the viewer surface is a lightbox, not a theme surface', () => {
  // DESIGN.md "Colors": 9:16 video always sits on `viewer`, in both themes, so
  // a cut looks the same to whoever approves it.
  it('does not change between light and dark', () => {
    expect(DARK_COLORS.viewer).toBe(LIGHT_COLORS.viewer)
    expect(DARK_COLORS['on-viewer']).toBe(LIGHT_COLORS['on-viewer'])
  })

  it.each(THEMES)('%s: is a genuinely dark panel, not a dim surface', (_n, palette) => {
    // Anything lighter than this stops reading as a lightbox and starts
    // competing with the footage.
    expect(relativeLuminance(palette.viewer)).toBeLessThan(0.01)
  })

  it.each(THEMES)('%s: is distinct from ink, which is the emphasis panel', (_n, palette) => {
    expect(palette.viewer).not.toBe(palette.ink)
  })
})
