/**
 * Cut the three Geist faces down to the characters this product can render,
 * and write the result into `apps/web/app/fonts/`.
 *
 *     node scripts/subset-fonts.mjs
 *
 * **Run this after any `geist` bump**, because the files it writes are
 * committed: a subset generated from an older release would quietly keep
 * shipping the older outlines. The upstream files it reads are the ones
 * `geist/font/*` would have served, so the output differs from them in
 * coverage only.
 *
 * Why at all: the home page's Lighthouse number is bound by how many bytes
 * the simulated connection has to move, and the three faces were 183 KB of
 * the 573 KB it moved. Geist ships Cyrillic, Greek, IPA and a long tail of
 * symbols in every face.
 *
 * **Sans keeps Cyrillic and Greek; serif and mono do not.** That line is the
 * difference between trimming our own typography and trimming a client's
 * name. Sans is the face user-entered text renders in — a workspace name, a
 * handle, a hook — so anything it might have to draw stays in the file. The
 * serif is display headings we write, and the mono is machine readout:
 * figures, timings, ids, percentages. Latin covers both of those completely,
 * and keeping the wider coverage in sans costs 11 KB against the alternative.
 *
 * fontTools is fetched on demand by `uv`; nothing here is added to the
 * project's dependencies, and nothing runs at build time.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(repoRoot, 'apps/web/app/fonts')
const upstream = join(repoRoot, 'apps/web/node_modules/geist/dist/fonts')

/**
 * Latin, and everything we set in it: Latin-1 and both extended blocks, the
 * modifier letters, general punctuation (the em dash, the curly quotes and
 * the middle dot the copy is full of), super/subscripts, currency, letterlike
 * forms, arrows, the two maths signs that turn up in ratios, the dingbats
 * range the star and check marks come from, and the ligature block.
 */
const LATIN = [
  'U+0000-00FF',
  'U+0100-017F',
  'U+0180-024F',
  'U+02B0-02FF',
  'U+2000-206F',
  'U+2070-209F',
  'U+20A0-20BF',
  'U+2100-214F',
  'U+2190-21FF',
  'U+2212',
  'U+2215',
  'U+2600-26FF',
  'U+FB00-FB04',
  'U+FEFF',
  'U+FFFD',
].join(',')

/** What sans adds, so a name we did not write still has glyphs. */
const WIDE = [LATIN, 'U+0370-03FF', 'U+0400-04FF', 'U+0500-052F'].join(',')

const FACES = [
  { from: 'geist-sans/Geist-Variable.woff2', to: 'Geist-Variable.subset.woff2', unicodes: WIDE },
  {
    from: 'geist-serif/GeistSerif-Regular.woff2',
    to: 'GeistSerif-Regular.subset.woff2',
    unicodes: LATIN,
  },
  {
    from: 'geist-mono/GeistMono-Variable.woff2',
    to: 'GeistMono-Variable.subset.woff2',
    unicodes: LATIN,
  },
]

mkdirSync(outDir, { recursive: true })

for (const face of FACES) {
  const input = join(upstream, face.from)
  const output = join(outDir, face.to)

  execFileSync(
    'uv',
    [
      'run',
      '--quiet',
      '--with',
      'fonttools[woff]',
      'pyftsubset',
      input,
      `--unicodes=${face.unicodes}`,
      // Keep every OpenType feature: the kerning and the ligatures are what
      // make the subset render identically to the file it came from.
      '--layout-features=*',
      '--flavor=woff2',
      `--output-file=${output}`,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  )

  const before = statSync(input).size / 1024
  const after = statSync(output).size / 1024
  console.log(`${face.to}  ${before.toFixed(1)} KB -> ${after.toFixed(1)} KB`)
}

// The OFL requires the licence to travel with the files (D18).
copyFileSync(join(repoRoot, 'apps/web/node_modules/geist/LICENSE.txt'), join(outDir, 'LICENSE.txt'))
console.log('LICENSE.txt copied beside the subsets')
