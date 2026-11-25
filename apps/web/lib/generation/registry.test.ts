/**
 * Choosing an adapter, and the properties every adapter's output must have.
 *
 * The second half matters more than the first. `chooseAdapter` is six lines;
 * the assertions about the *asset* are the ones that will still be here when
 * there are three providers, because they are the ones that say what
 * "labelled" means in code rather than in a comment.
 */

import { describe, expect, test } from 'vitest'

import { CANNED_ADAPTER_NAME, cannedAdapter } from './providers/canned'
import { adapterNames, chooseAdapter } from './registry'
import { dimensionsFor, type BrandKit, type GenerationRequest } from './types'

const BRAND: BrandKit = {
  brandName: 'Pawsitive Steps',
  look: 'muted sage and warm cream',
  captionStyle: null,
  avoid: [],
}

const REQUEST: GenerationRequest = {
  workspaceId: 'ws-1',
  beat: { ideaTitle: 'Three leash mistakes', label: 'Call to action' },
  prompt: 'A worn tennis ball on wet grass, shallow depth of field',
  brand: BRAND,
  kind: 'clip',
  aspectRatio: '9:16',
  seconds: 5,
  resolution: '720p',
}

describe('chooseAdapter', () => {
  test('falls back to the sample adapter when there is no key', () => {
    const choice = chooseAdapter({})

    expect(choice.adapter.name).toBe(CANNED_ADAPTER_NAME)
    expect(choice.isSample).toBe(true)
  })

  test('says that it fell back, rather than falling back quietly', () => {
    // The whole point of `isSample`. A screen that cannot tell a fixture from
    // a render will eventually show one as the other, and non-negotiable 7
    // says demo data is labelled.
    expect(chooseAdapter({}).isSample).toBe(true)
  })

  test('is not fooled by a key belonging to something else', () => {
    // An adapter answers `hasKey` for its own variable only. A stray
    // `ANTHROPIC_API_KEY` must not promote a generation adapter to live.
    expect(chooseAdapter({ ANTHROPIC_API_KEY: 'sk-test' }).isSample).toBe(true)
  })

  test('does not list a provider we decided not to build', () => {
    // Vlad, 25 November 2026: "Do NOT build Runway at all." Its terms permit
    // training on inputs and outputs. This asserts the decision rather than
    // trusting that nobody adds it back.
    expect(adapterNames()).not.toContain('runway')
  })
})

describe('every asset carries its label and its provenance', () => {
  test('is labelled as AI-generated, even from the sample adapter', async () => {
    // Non-negotiable 4 has no sample exemption. An adapter that dropped the
    // label because the pixels were fake would teach the wrong lesson to
    // whoever writes the next one.
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    expect(result.asset.label).toBe('AI-generated')
    expect(result.asset.source).toBe('ai-scene')
  })

  test('names the adapter and the model that answered', async () => {
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    expect(result.asset.provenance.adapter).toBe(CANNED_ADAPTER_NAME)
    // Never a real model id. `agent_runs.model` is reconciled against an
    // invoice, so a row naming a model that was never called makes that
    // reconciliation a guess.
    expect(result.asset.provenance.model).toBe('sample')
    expect(result.asset.provenance.usd).toBe(0)
  })

  test('says “not stated” about a watermark rather than claiming one', async () => {
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    // `null`, not `false`. "There is no provider" and "the provider embedded
    // nothing" are different facts, and the UI must not render the first as a
    // clean verdict — the same rule as `VideoIdea.originality`'s null.
    expect(result.asset.provenance.providerWatermark).toBeNull()
  })

  test('carries a prompt reference and not the prompt', async () => {
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    expect(result.asset.promptRef).toMatch(/^prompt_[0-9a-f]{16}$/)
    expect(result.asset.promptRef).not.toContain('tennis')
  })

  test('points at something nothing can open, so a fixture cannot be composited', async () => {
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    // Deliberately not a path. A renderer handed this fails loudly instead of
    // finding a placeholder file and quietly putting it in a client's video.
    expect(result.asset.location.startsWith('sample://')).toBe(true)
  })

  test('is the same asset twice for the same request, so a screenshot is stable', async () => {
    const first = await cannedAdapter.generate(REQUEST)
    const second = await cannedAdapter.generate(REQUEST)
    if (first.status !== 'ok' || second.status !== 'ok') throw new Error('unreachable')

    expect(first.asset.id).toBe(second.asset.id)
  })

  test('keeps the beat it was asked about, so the renderer knows where it goes', async () => {
    const result = await cannedAdapter.generate(REQUEST)
    if (result.status !== 'ok') throw new Error('unreachable')

    expect(result.asset.beat).toEqual(REQUEST.beat)
  })

  test('an image has no duration, because a still does not have one', async () => {
    const result = await cannedAdapter.generate({ ...REQUEST, kind: 'image' })
    if (result.status !== 'ok') throw new Error('unreachable')

    expect(result.asset.seconds).toBeNull()
  })
})

describe('dimensionsFor', () => {
  test('reads the resolution as the short edge, so 9:16 at 720p is 720 wide', () => {
    // The trap this exists to avoid: treating 720p as the *long* edge gives a
    // vertical clip 405 pixels of width, and a renderer would be upscaling
    // before it started.
    expect(dimensionsFor('9:16', '720p')).toEqual({ width: 720, height: 1280 })
  })

  test.each([
    ['9:16' as const, '480p' as const, { width: 480, height: 854 }],
    ['9:16' as const, '1080p' as const, { width: 1080, height: 1920 }],
    ['1:1' as const, '720p' as const, { width: 720, height: 720 }],
    ['16:9' as const, '720p' as const, { width: 1280, height: 720 }],
  ])('%s at %s', (aspect, resolution, expected) => {
    expect(dimensionsFor(aspect, resolution)).toEqual(expected)
  })

  test('is always even on both edges, because H.264 chroma subsampling requires it', () => {
    for (const aspect of ['9:16', '1:1', '16:9'] as const) {
      for (const resolution of ['480p', '720p', '1080p'] as const) {
        const { width, height } = dimensionsFor(aspect, resolution)
        expect(width % 2, `${aspect} ${resolution} width`).toBe(0)
        expect(height % 2, `${aspect} ${resolution} height`).toBe(0)
      }
    }
  })
})
