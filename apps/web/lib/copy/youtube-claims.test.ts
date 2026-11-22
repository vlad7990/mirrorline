/**
 * Wherever we claim to post to YouTube, we say that uploads stay private.
 *
 * `banned-phrases.test.ts` sweeps for claims we must **not** make. This is
 * the inverse, and it needed its own file rather than a pattern in that one:
 * a *required* caveat expressed as a banned phrase would invert the meaning
 * of the module it lived in.
 *
 * ## Why this exists
 *
 * Vlad confirmed on 16 November that our YouTube app does **not** hold an
 * approved upload scope. The site had said the awkward thing about TikTok in
 * six places and nothing about YouTube anywhere — not because anyone decided
 * YouTube was different, but because TikTok's limit was known when the copy
 * was written and YouTube's had not been asked about yet.
 *
 * That is the failure this guards. Not a wrong sentence, which review
 * catches, but a **true sentence that is silent about an identical limit on
 * the platform standing next to it**. The TikTok caveat made the omission
 * look deliberate, which is worse than having said nothing about either.
 *
 * ## What it checks
 *
 * A file "claims to post to YouTube" when it names YouTube *and* a publishing
 * verb. Such a file must also carry the caveat. Files that mention YouTube
 * for another reason — the Niche Scan's sources, a platform filter, an upload
 * target — are listed below **with a reason each**, so the allowlist cannot
 * quietly become the place awkward files go.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

/** Roots holding shipped copy, relative to this file. */
const ROOTS = ['../../components', '../../app', '..']

/**
 * Files that name YouTube without claiming we publish there.
 *
 * Each needs a reason. "It was failing" is not one — a file that makes the
 * claim takes the caveat, and a file that does not belongs here with the
 * sentence saying why.
 */
const NOT_A_POSTING_CLAIM: Readonly<Record<string, string>> = {
  'trends/trend-filters.ts':
    'A platform filter on the Niche Scan. It names the platform and claims nothing about publishing.',
  'trends/trend-filter-bar.tsx': 'Renders that filter, and carries no claim of its own either.',
  'upload/upload-data.ts':
    'Where a long video can come *from*. That is the opposite direction to publishing.',
  'marketing/hero-upload.tsx':
    'The hero upload control. YouTube is a source of footage here, never a destination.',
  'copy/platform-limits.ts':
    'Defines the caveat itself, so it cannot sensibly be required to quote its own output.',
  'workspace/week-schedule.ts':
    'Holds the platform label map — "youtube" to "YouTube Shorts" — and builds the calendar grid from it. It names the platform in a lookup table and promises nothing: the caveat belongs to copy that claims a post will go out, not to the row header a post sits in.',
  'workspace/week-schedule.test.ts': 'Tests that label map, and has to quote it to do so.',
  'copy/youtube-claims.test.ts': 'This file, which names the claim in order to search for it.',
  'niche-scan/report.test.ts':
    'Quotes "YouTube Data API search" because that is one of the Niche Scan\'s allowed sources (12 §1), and uses the word "post" because the thing it validates is a link to one. A source we read a format *from* is the opposite direction to a destination we publish *to* — the same reason trend-filters.ts is here.',
  'copy/platform-limits.test.ts': 'Tests the caveat, so it quotes both halves on purpose.',
  'app/(marketing)/pricing/page.tsx':
    'Names YouTube only in its own doc comment. The rendered page carries the caveat through <LongFormAddon />, and the test below checks that rather than taking it on trust.',
}

/** Naming YouTube. */
const NAMES_YOUTUBE = /YouTube/
/** Claiming we put something on it. */
const POSTING_VERB =
  /\b(post|posts|posting|posted|publish|publishes|publishing|upload|uploads|uploaded)\b/i
/** The caveat, in any shape the site legitimately uses — literal or constant. */
const CARRIES_CAVEAT =
  /(stay private|PRIVATE_UNTIL_APPROVED|privateUntilApproved|approved our app|approves our app)/

function walk(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })
}

function shippedFiles(): readonly string[] {
  return ROOTS.flatMap((root) => walk(join(__dirname, root)))
}

function relativePath(path: string): string {
  const marker = '/apps/web/'
  const at = path.indexOf(marker)
  return at === -1 ? path : path.slice(at + marker.length)
}

describe('every YouTube posting claim carries its caveat', () => {
  test('the sweep reaches real files, so a pass means something', () => {
    // D55's theme-key typo, remembered: a sweep that reads nothing passes
    // exactly like a sweep that reads everything.
    const files = shippedFiles()

    expect(files.length).toBeGreaterThan(100)
    expect(files.some((file) => file.endsWith('week-grid.tsx'))).toBe(true)
  })

  test('no file claims to publish to YouTube without saying uploads stay private', () => {
    const offenders: string[] = []

    for (const path of shippedFiles()) {
      const source = readFileSync(path, 'utf8')
      if (!NAMES_YOUTUBE.test(source) || !POSTING_VERB.test(source)) continue
      if (CARRIES_CAVEAT.test(source)) continue

      const relative = relativePath(path)
      if (Object.keys(NOT_A_POSTING_CLAIM).some((key) => relative.endsWith(key))) continue

      offenders.push(relative)
    }

    expect(offenders).toEqual([])
  })

  test('/pricing is excused because it renders the card, and that is verified', () => {
    // The one allowlist entry that rests on composition rather than on the
    // file saying nothing. An excuse of the form "some component it renders
    // carries the claim" would wave through any page, so it is checked: if
    // the add-on card is ever removed from /pricing, the reason stops being
    // true and this goes red rather than the sweep going quiet.
    const page = readFileSync(
      join(__dirname, '../../app/(marketing)/pricing/page.tsx'),
      'utf8',
    )

    expect(page).toContain('LongFormAddon')
    expect(page).toContain('<LongFormAddon />')
  })

  test('every allowlisted file still exists and still carries a real reason', () => {
    // The allowlist rots in two directions: a file that gets deleted, and a
    // reason that decays into a shrug.
    const files = shippedFiles()

    for (const [key, reason] of Object.entries(NOT_A_POSTING_CLAIM)) {
      expect(reason.length, `${key} needs a real reason`).toBeGreaterThan(20)
      expect(
        files.some((file) => file.endsWith(key)),
        `${key} is allowlisted but no longer exists`,
      ).toBe(true)
    }
  })
})
