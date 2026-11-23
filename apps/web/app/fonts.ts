/**
 * The three faces, declared here rather than taken from `geist/font/*`.
 *
 * The package's own exports are three `localFont()` calls with no `preload`
 * option, so all three faces preload — 183 KB of `<link rel="preload"
 * as="font">`, which the browser fetches at **high** priority, ahead of
 * anything it has not been told to prioritise. Declaring them here buys two
 * things the package cannot give: which faces preload, and which characters
 * each one carries.
 *
 * The files are the subsets `scripts/subset-fonts.mjs` writes from the
 * package's own woff2 — same outlines, same metrics, same variable axis,
 * fewer scripts in the cmap. 183 KB becomes 124 KB. **Run that script after
 * any `geist` bump**, or the committed subsets keep shipping the old release.
 *
 * Everything else is copied from the package deliberately — the same variable
 * names, the same weights, the same fallback metrics — so nothing about how
 * the site *looks* changes. D25's three voices stand: Geist Sans for the
 * studio, Geist Serif for the public display type, Geist Mono for the
 * machine.
 */

import localFont from 'next/font/local'

/**
 * The body and UI face. Preloaded: the first screen of every page is set in
 * it — the hero eyebrow, the sub-headline and both buttons on the landing
 * page, and every word of the studio.
 */
export const geistSans = localFont({
  src: './fonts/Geist-Variable.subset.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  preload: true,
})

/**
 * The display face: the public site (D25), and one element per studio screen
 * since D122 — the page title.
 *
 * Preloaded, because it sets the one element the landing page opens on: the
 * `h1` is `.text-site-hero`, which is `var(--font-serif)`. Measured rather
 * than assumed — the computed `font-family` of the rendered `h1` at 412px is
 * `GeistSerifRegular`.
 *
 * `adjustFontFallback` is what holds CLS at 0 while it is in flight: Next
 * synthesises a Times New Roman with matching metrics, so the swap re-paints
 * the headline without moving anything under it.
 */
export const geistSerifRegular = localFont({
  src: './fonts/GeistSerif-Regular.subset.woff2',
  variable: '--font-geist-serif-regular',
  weight: '400',
  preload: true,
  fallback: ['Times New Roman', 'Times', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

/**
 * The machine's voice — and **not preloaded**, which is the point of this
 * file.
 *
 * 70 KB, the largest of the three, and nothing in the first screen of the
 * landing page is set in it: `.hero-inset` and `.hero-floats` are
 * `display: none` below 64rem, so on a phone the first mono character is
 * several screens down. Preloading it put 70 KB at high priority in front of
 * everything the first screen does need.
 *
 * Dropping the preload does not drop the font. The elements that use it are
 * in the initial DOM, so the browser still fetches it during layout — after
 * the things above it, at the priority a stylesheet-discovered font gets,
 * rather than ahead of them. Where it arrives late the reader sees the system
 * monospace for a moment, which is what `font-display: swap` is for, and why
 * the fallback list below is the package's own rather than a shorter one.
 */
export const geistMono = localFont({
  src: './fonts/GeistMono-Variable.subset.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
  fallback: [
    'ui-monospace',
    'SFMono-Regular',
    'Roboto Mono',
    'Menlo',
    'Monaco',
    'Liberation Mono',
    'DejaVu Sans Mono',
    'Courier New',
    'monospace',
  ],
})
