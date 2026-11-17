/**
 * The TypeScript and the built assets agree, and keep agreeing.
 *
 * `milo.ts` restates what `scripts/mascot-assets.mjs` wrote into
 * `public/mascot/manifest.json`, so that a client component gets a typed
 * state union instead of a JSON blob shipped to the browser. Restating is
 * only safe if a disagreement is loud, and this is where it is made loud.
 *
 * The case that matters is the quiet one. Four of the five states are drawn
 * from the concept render today. When Vlad's `milo-thinking.png` lands, the
 * build will pick it up and flip `isPlaceholder` in the manifest — and if
 * `milo.ts` still says `true`, the app will go on calling finished art a
 * placeholder, which is the failure a flag is supposed to prevent. The
 * reverse is worse: a flag flipped by hand with no render behind it.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { MILO_ART, MILO_AVATAR_SIZES, MILO_COPY, MILO_STATES, miloStateFor } from './milo'
import { findBannedClaims } from '@/lib/copy/banned-phrases'

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public')

interface ManifestEntry {
  readonly state: string
  readonly isPlaceholder: boolean
  readonly full: string
  readonly avatars: Readonly<Record<string, string>>
}

const manifest: { readonly states: readonly ManifestEntry[] } = JSON.parse(
  readFileSync(path.join(PUBLIC_DIR, 'mascot/manifest.json'), 'utf8'),
)

function entryFor(state: string): ManifestEntry {
  const found = manifest.states.find((candidate) => candidate.state === state)
  if (!found) throw new Error(`the build produced nothing for "${state}"`)
  return found
}

describe('the build and the module describe the same five states', () => {
  test('neither side has a state the other does not', () => {
    expect(manifest.states.map((entry) => entry.state)).toEqual([...MILO_STATES])
  })

  test('every path in the module is a file the build actually wrote', () => {
    for (const state of MILO_STATES) {
      const art = MILO_ART[state]
      const files = [art.full, ...MILO_AVATAR_SIZES.map((size) => art.avatars[size])]

      for (const href of files) {
        // The paths are browser paths, so the leading slash has to come off
        // before they are a thing on disk. A 404 on a mascot is silent: the
        // alt text renders and nobody notices the character is missing.
        expect(existsSync(path.join(PUBLIC_DIR, href.slice(1))), href).toBe(true)
      }
    }
  })

  test('the module names the same files the manifest does', () => {
    for (const state of MILO_STATES) {
      const entry = entryFor(state)
      const art = MILO_ART[state]

      expect(art.full, state).toBe(`/mascot/${entry.full}`)
      for (const size of MILO_AVATAR_SIZES) {
        expect(art.avatars[size], `${state} at ${size}`).toBe(
          `/mascot/${entry.avatars[String(size)]}`,
        )
      }
    }
  })

  test('a placeholder is marked as one, on both sides', () => {
    for (const state of MILO_STATES) {
      // The whole point of the flag. If this fails after a render lands, the
      // fix is to flip `isPlaceholder` in `milo.ts` — not to edit the test.
      expect(MILO_ART[state].isPlaceholder, state).toBe(entryFor(state).isPlaceholder)
    }
  })

  test('greeting is the one state with art of its own', () => {
    // Recorded so that the day this stops being true is the day somebody has
    // to come and read the sentence above.
    expect(MILO_ART.greeting.isPlaceholder).toBe(false)
    expect(MILO_STATES.filter((state) => MILO_ART[state].isPlaceholder)).toEqual([
      'idle',
      'thinking',
      'answering',
      'declined',
    ])
  })
})

describe('what a screen reader is told', () => {
  test('every state has alt text naming the character and what it is doing', () => {
    for (const state of MILO_STATES) {
      const { alt } = MILO_ART[state]
      expect(alt, state).toContain('Milo')
      // Never the filename, and never our build's business.
      expect(alt, state).not.toMatch(/\.webp|placeholder|concept/i)
    }
  })

  test('no two states describe themselves identically, except the resting one', () => {
    // `idle` is the plain description; the other four say what is happening.
    // Two states sharing a sentence would mean a change nobody can hear.
    const described = MILO_STATES.filter((state) => state !== 'idle').map(
      (state) => MILO_ART[state].alt,
    )
    expect(new Set(described).size).toBe(described.length)
  })
})

describe('the state is a view of the co-pilot’s events', () => {
  test('a stream runs thinking, then answering, then back to rest', () => {
    expect(miloStateFor({ type: 'meta', mode: 'sample', notice: null })).toBe('thinking')
    expect(miloStateFor({ type: 'delta', text: 'The Growth plan' })).toBe('answering')
    expect(
      miloStateFor({
        type: 'done',
        answer: {
          surface: 'site',
          mode: 'sample',
          text: 'The Growth plan includes twenty posts a month.',
          citations: [],
          proposals: [],
          refusal: null,
          handoff: null,
        },
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
        spendSummary: null,
      }),
    ).toBe('idle')
  })

  test('citations and proposals change nothing, so answering does not flicker', () => {
    // These arrive in the middle of an answer. A mascot that dropped to idle
    // on every citation chip would strobe through a cited reply.
    expect(miloStateFor({ type: 'citation', citation: { label: 'Plans', href: '/pricing' } })).toBe(
      null,
    )
    expect(
      miloStateFor({
        type: 'proposal',
        proposal: {
          kind: 'move-post',
          summary: 'Move Thursday’s post to Tuesday',
          detail: 'The Thursday slot moves to Tuesday at 09:00.',
          requiresApproval: true,
        },
      }),
    ).toBe(null)
  })

  test('a refusal is an answer, and only a failure reaches declined', () => {
    // 18 §3.1: "I don't know, here is a person" is a success state. A refusal
    // arrives as an ordinary `done`, so Milo rests rather than looking sorry
    // about the best answer this surface gives.
    expect(
      miloStateFor({
        type: 'done',
        answer: {
          surface: 'site',
          mode: 'sample',
          text: 'No guarantee is given.',
          citations: [],
          proposals: [],
          refusal: 'guarantee',
          handoff: { label: 'Talk to a person', href: '/niche-scan' },
        },
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
        spendSummary: null,
      }),
    ).toBe('idle')

    expect(
      miloStateFor({ type: 'error', kind: 'unreachable', message: 'Could not reach it.' }),
    ).toBe('declined')
  })
})

describe('the copy', () => {
  test('the AI label is part of the name, not a footnote', () => {
    // 18 §3.3: "Always labelled AI, on the launcher and in the panel header."
    expect(MILO_COPY.launcherAria).toContain('AI assistant')
    expect(MILO_COPY.launcherAria).toContain('Milo')
    expect(MILO_COPY.launcherAria).toContain('Mirrorline')
  })

  test('says nothing the product is not allowed to say', () => {
    expect(findBannedClaims(Object.values(MILO_COPY).join(' '))).toEqual([])
  })
})
