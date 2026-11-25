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
import { MAX_CLIP_SECONDS, type BrandKit, type GenerationRequest, type Resolution } from './types'

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
    // A request for twenty seconds is priced at twenty seconds, so the
    // per-request ceiling refuses it with a number the client can see. Silently
    // trimming it to six would deliver a different video from the one asked
    // for and hide that a limit exists.
    expect(projectGenerationUsd(clip('720p', 20))).toBeCloseTo(0.03 * 20, 10)
  })
})

describe('projectGenerationUsd prices an image by the size the resolution maps to', () => {
  test.each([
    ['480p' as Resolution, 0.04],
    ['720p' as Resolution, 0.04],
  ])('%s costs $%s an image', (resolution, usd) => {
    // Both offered resolutions land on 1K. 2K was only ever reachable through
    // 1080p, which D140 removed — its rate survives in `XAI_IMAGE_USD` as the
    // worst tier an unrecognised resolution is charged at.
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

    // $0.03, the dearest second on the table, rather than $0. The figure fell
    // when D140 took 1080p out — the rule did not: price what you do not
    // recognise at the worst thing you do.
    expect(projectGenerationUsd(odd)).toBeCloseTo(0.03 * 5, 10)
  })

  test('an unrecognised resolution on an image is priced at the 2K tier', () => {
    // The other half, and the reason `XAI_IMAGE_USD` keeps a 2K rate it can no
    // longer reach by a legitimate route.
    const odd = { ...image('720p'), resolution: '4K' as unknown as Resolution }

    expect(projectGenerationUsd(odd)).toBeCloseTo(0.06, 10)
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
  // Less assertions about code than the arithmetic written down where it
  // cannot drift.
  test('the default shape — two 5s clips at 720p plus a cover image — is $0.34', () => {
    const twoClips = projectGenerationUsd(clip('720p', 5)) * 2
    const cover = projectGenerationUsd(image('720p'))

    expect(twoClips + cover).toBeCloseTo(0.34, 10)
  })

  test('1080p is not on the menu at all, which is why the ceiling stopped binding', () => {
    // D140. The type no longer admits it, so this asserts the only part of
    // that decision a runtime test can see: the rate table holds exactly the
    // two resolutions we offer. A third one reappearing here is the diff this
    // test exists to fail on.
    expect(Object.keys(XAI_CLIP_LITE_USD_PER_SECOND).sort()).toEqual(['480p', '720p'])
  })

  test('every clip we will actually ask for fits inside the per-request ceiling', () => {
    // The ceiling is a backstop now rather than a constraint, and this is the
    // assertion that says so — the worst legitimate request is
    // MAX_CLIP_SECONDS at the dearest rate, and it has to fit with room.
    for (const resolution of ['480p', '720p'] as const) {
      const worst = projectGenerationUsd(clip(resolution, MAX_CLIP_SECONDS))

      expect(worst, `${resolution} at ${MAX_CLIP_SECONDS}s`).toBeLessThan(
        MAX_GENERATION_REQUEST_USD,
      )
      expect(decideGenerationSpend(0, worst, {}).allowed).toBe(true)
    }
  })

  test('a malformed request is still refused, which is what the ceiling is for now', () => {
    // Twenty seconds is past `MAX_CLIP_SECONDS` and arrives from a payload
    // rather than from a person. $0.60 against a $0.50 ceiling.
    const projected = projectGenerationUsd(clip('720p', 20))

    expect(projected).toBeGreaterThan(MAX_GENERATION_REQUEST_USD)
    expect(decideGenerationSpend(0, projected, {}).allowed).toBe(false)
  })
})
