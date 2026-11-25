/**
 * The media cap's arithmetic, and the one direction it must never fail in.
 *
 * `lib/agents/ledger.ts` states the rule this file is mostly here to pin down:
 * *"A read that fails is not a month at zero… conflating them fails open: a
 * database hiccup would reset every workspace's cap to 'plenty of room left',
 * which is the one direction a spend guard must never fail in."*
 *
 * That property is pure, so it is tested purely. The Supabase read that
 * produces the number lives in `ledger.ts` and is covered the way every other
 * database call in this repo is — not by a mock that would only prove the mock
 * works.
 */

import { describe, expect, test } from 'vitest'

import {
  DEFAULT_GENERATION_CAP_USD,
  MAX_GENERATION_REQUEST_USD,
  decideGenerationSpend,
  generationCapUsd,
  projectGenerationUsd,
  XAI_CLIP_LITE_USD_PER_SECOND,
} from './spend'
import type { BrandKit, GenerationRequest, Resolution } from './types'

const BRAND: BrandKit = { brandName: null, look: null, captionStyle: null, avoid: [] }

function clip(resolution: Resolution, seconds?: number): GenerationRequest {
  return {
    workspaceId: 'ws-1',
    beat: { ideaTitle: 'Three leash mistakes', label: 'Setup' },
    prompt: 'A worn tennis ball on wet grass',
    brand: BRAND,
    kind: 'clip',
    aspectRatio: '9:16',
    ...(seconds === undefined ? {} : { seconds }),
    resolution,
  }
}

function image(resolution: Resolution): GenerationRequest {
  return { ...clip(resolution), kind: 'image' }
}

describe('projectGenerationUsd prices a clip at the published per-second rate', () => {
  test.each([
    ['480p' as Resolution, 0.02],
    ['720p' as Resolution, 0.03],
    ['1080p' as Resolution, 0.14],
  ])('%s is $%s a second on the Lite model', (resolution, perSecond) => {
    // Arrange: five seconds, the shape the cost table in the plan is built on.
    const request = clip(resolution, 5)

    // Act
    const usd = projectGenerationUsd(request)

    // Assert: exact, not approximate. A cap built on a rounded rate is a cap
    // that is wrong by the rounding every time it is consulted.
    expect(usd).toBeCloseTo(perSecond * 5, 10)
    expect(XAI_CLIP_LITE_USD_PER_SECOND[resolution]).toBe(perSecond)
  })

  test('uses the default clip length when the request does not say', () => {
    expect(projectGenerationUsd(clip('720p'))).toBeCloseTo(0.03 * 5, 10)
  })

  test('prices the seconds asked for, rather than quietly clamping them', () => {
    // A request for fifteen seconds is priced at fifteen seconds, so the
    // per-request ceiling refuses it with a number the client can see. Silently
    // trimming it to six would deliver a different video from the one asked
    // for and hide that a limit exists.
    expect(projectGenerationUsd(clip('1080p', 15))).toBeCloseTo(0.14 * 15, 10)
  })
})

describe('projectGenerationUsd prices an image by the size the resolution maps to', () => {
  test.each([
    ['480p' as Resolution, 0.04],
    ['720p' as Resolution, 0.04],
    ['1080p' as Resolution, 0.06],
  ])('%s costs $%s an image', (resolution, usd) => {
    expect(projectGenerationUsd(image(resolution))).toBeCloseTo(usd, 10)
  })

  test('an image costs the same whatever length was asked for, because length is meaningless', () => {
    expect(projectGenerationUsd({ ...image('720p'), seconds: 15 })).toBeCloseTo(0.04, 10)
  })
})

describe('projectGenerationUsd is pessimistic about what it does not recognise', () => {
  test('an unrecognised resolution is priced at the most expensive tier, not at zero', () => {
    // The rule `usageUsd` already follows: "An unknown model is priced at the
    // most expensive tier we have rather than at zero. Costing an unrecognised
    // model nothing is how a cap stops being a cap the next time a model id
    // changes." A resolution string is the same hazard.
    const odd = { ...clip('720p', 5), resolution: '4K' as unknown as Resolution }

    expect(projectGenerationUsd(odd)).toBeCloseTo(0.14 * 5, 10)
  })
})

describe('generationCapUsd', () => {
  test('defaults to the approved $15 a month', () => {
    expect(generationCapUsd({})).toBe(DEFAULT_GENERATION_CAP_USD)
    expect(DEFAULT_GENERATION_CAP_USD).toBe(15)
  })

  test('reads an override, so a test or a plan change does not need a deploy', () => {
    expect(generationCapUsd({ GENERATION_MONTHLY_CAP_USD: '40' })).toBe(40)
  })

  test.each([['nonsense'], ['0'], ['-5'], ['']])(
    'ignores the bad value %s rather than trusting it',
    (raw) => {
      expect(generationCapUsd({ GENERATION_MONTHLY_CAP_USD: raw })).toBe(
        DEFAULT_GENERATION_CAP_USD,
      )
    },
  )

  test('does not read the co-pilot’s cap, because they are separate budgets', () => {
    // Sharing `COPILOT_MONTHLY_CAP_USD` would mean three B-roll clips a day
    // could starve the co-pilot, and raising one would raise the other.
    expect(generationCapUsd({ COPILOT_MONTHLY_CAP_USD: '999' })).toBe(DEFAULT_GENERATION_CAP_USD)
  })
})

describe('decideGenerationSpend', () => {
  test('allows a run that fits, and says how much room is left', () => {
    const decision = decideGenerationSpend(2, 0.15, {})

    expect(decision.allowed).toBe(true)
    if (!decision.allowed) throw new Error('unreachable')
    expect(decision.projectedUsd).toBeCloseTo(0.15, 10)
    expect(decision.remainingUsd).toBeCloseTo(13, 10)
  })

  test('refuses a month that could not be read, and never calls it zero', () => {
    // The whole point. `null` is "we do not know", and the only safe reading of
    // "we do not know" is no.
    const decision = decideGenerationSpend(null, 0.01, {})

    expect(decision.allowed).toBe(false)
    if (decision.allowed) throw new Error('unreachable')
    expect(decision.reason).toMatch(/could not read/i)
    expect(decision.message).not.toMatch(/\$/)
  })

  test('refuses one request that is too big on its own, before any month is consulted', () => {
    // Passing a month of zero proves the ceiling is enforced from the
    // projection rather than from history — which is what makes it hold on a
    // cold instance with no ledger at all.
    const decision = decideGenerationSpend(0, 0.9, {})

    expect(decision.allowed).toBe(false)
    if (decision.allowed) throw new Error('unreachable')
    expect(decision.reason).toContain('per-request')
  })

  test('refuses a run that would cross the month’s cap', () => {
    const decision = decideGenerationSpend(14.95, 0.3, {})

    expect(decision.allowed).toBe(false)
    if (decision.allowed) throw new Error('unreachable')
    expect(decision.reason).toContain('14.95')
    expect(decision.message).toMatch(/cap/i)
  })

  test('allows a run that lands exactly on the cap, because the cap is a ceiling not a fence', () => {
    expect(decideGenerationSpend(14.7, 0.3, {}).allowed).toBe(true)
  })

  test('takes a per-call ceiling, the way the scan takes its own', () => {
    // `SpendLimits.maxRequestUsd` exists for exactly this: "the honest way to
    // allow that is a named ceiling at the call site rather than raising the
    // global one for everybody".
    expect(decideGenerationSpend(0, 0.9, { maxRequestUsd: 1 }).allowed).toBe(true)
  })
})

describe('what the approved ceilings mean in practice', () => {
  // These are less assertions about code than the arithmetic written down
  // where it cannot drift. The $0.50 per-request ceiling has a consequence for
  // 1080p that is worth being able to see.
  test('the default shape — two 5s clips at 720p plus a cover image — is $0.34', () => {
    const twoClips = projectGenerationUsd(clip('720p', 5)) * 2
    const cover = projectGenerationUsd(image('720p'))

    expect(twoClips + cover).toBeCloseTo(0.34, 10)
  })

  test('a 5-second 1080p clip is over the per-request ceiling, and is refused', () => {
    // $0.70 against a $0.50 ceiling. 1080p is therefore available for clips of
    // about three seconds and refused past that — a real consequence of the
    // approved number, recorded here rather than discovered by a client.
    const projected = projectGenerationUsd(clip('1080p', 5))

    expect(projected).toBeGreaterThan(MAX_GENERATION_REQUEST_USD)
    expect(decideGenerationSpend(0, projected, {}).allowed).toBe(false)
  })

  test('a 3-second 1080p clip fits', () => {
    expect(decideGenerationSpend(0, projectGenerationUsd(clip('1080p', 3)), {}).allowed).toBe(true)
  })
})
