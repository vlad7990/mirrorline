/**
 * The plan the worker hands the engine, and the summary it reads back.
 *
 * These are the pure halves of the shell-out. The handler around them is all
 * I/O — four tables, two buckets and a subprocess — and the parts worth
 * asserting are here: that four beats arrive in the order the video plays,
 * that a broken script is refused rather than cut short, and that a refusal is
 * read as a refusal rather than as an empty success.
 */

import { describe, expect, it } from 'vitest'

import { brandForRender, parseRenderSummary, planBeatsFrom, renderPlanFor } from './plan'

const ASSET_ID = 'a0000000-0000-4000-8000-000000000001'

const fourBeats = [
  { label: 'Setup', text: 'why people believe the opposite' },
  { label: 'Hook', text: 'say the question out loud' },
  { label: 'Call to action', text: 'tell them where to ask' },
  { label: 'Payoff', text: 'give the real answer' },
]

describe('planBeatsFrom', () => {
  it('returns the four beats in the order the video plays, not the stored order', () => {
    // The jsonb order is whatever the model wrote. A video plays Hook, Setup,
    // Payoff, Call to action.
    expect(planBeatsFrom(fourBeats).map((beat) => beat.label)).toEqual([
      'Hook',
      'Setup',
      'Payoff',
      'Call to action',
    ])
  })

  it('accepts the capitalisation a model actually produces', () => {
    const shouted = fourBeats.map((beat) => ({ ...beat, label: beat.label.toUpperCase() }))
    expect(planBeatsFrom(shouted)?.map((beat) => beat.label)).toEqual([
      'Hook',
      'Setup',
      'Payoff',
      'Call to action',
    ])
  })

  it('refuses a script with three beats rather than cutting three', () => {
    // A video with no call to action is not a shorter video, it is a different
    // one, and nobody asked for it.
    expect(planBeatsFrom(fourBeats.slice(0, 3))).toBeNull()
  })

  it('refuses a beat label it does not know', () => {
    const renamed = [{ ...fourBeats[0], label: 'CTA' }, ...fourBeats.slice(1)]
    expect(planBeatsFrom(renamed)).toBeNull()
  })

  it('refuses a beat with no text, and anything that is not a list', () => {
    expect(planBeatsFrom([{ label: 'Hook', text: '  ' }])).toBeNull()
    expect(planBeatsFrom(null)).toBeNull()
    expect(planBeatsFrom({ beats: fourBeats })).toBeNull()
  })

  it('refuses a duplicate label, because four beats means four different ones', () => {
    const twoHooks = [fourBeats[1], fourBeats[1], fourBeats[0], fourBeats[3]]
    expect(planBeatsFrom(twoHooks)).toBeNull()
  })
})

describe('brandForRender', () => {
  const request = {
    rightsHolder: 'Maya Torres Coaching',
    assetId: ASSET_ID,
    brandName: null,
    confirmedOn: '2026-11-25T18:04:11.000Z',
  }

  it('carries the rights record the client typed, never an invented one', () => {
    const brand = brandForRender(request) as { rights: Record<string, unknown> }

    expect(brand.rights.holder).toBe('Maya Torres Coaching')
    // The record id says where the confirmation came from. It is not a signed
    // document and does not pretend to be one.
    expect(brand.rights.recordId).toBe(`upload-confirmation-${ASSET_ID}`)
    expect(brand.rights.signedOn).toBe('2026-11-25')
  })

  it('uses the client’s own business name when they have given one', () => {
    const named = brandForRender({ ...request, brandName: 'Leeds Dog School' }) as {
      logoLabel: string
    }
    expect(named.logoLabel).toBe('Leeds Dog School')
  })

  it('falls back to the sample brand’s label rather than to nothing', () => {
    // The same fallback the niche report's cover uses: a name we have beats no
    // name, and the fallback stops being reached the moment the field is filled.
    const unnamed = brandForRender({ ...request, brandName: '   ' }) as { logoLabel: string }
    expect(unnamed.logoLabel.length).toBeGreaterThan(0)
  })

  it('is a brand file the engine can validate — colours, fonts, word lists', () => {
    const brand = brandForRender(request) as Record<string, unknown>
    expect(Object.keys(brand).sort()).toEqual(
      [
        'bodyFont',
        'captionStyle',
        'colors',
        'headingFont',
        'logoLabel',
        'rights',
        'wordsAlways',
        'wordsNever',
      ].sort(),
    )
  })
})

describe('renderPlanFor', () => {
  it('names every field read_plan requires', () => {
    const plan = renderPlanFor({
      sourcePath: '/work/source.mp4',
      outDir: '/work/out',
      title: 'What this actually costs',
      hook: 'Here is what this costs',
      beats: planBeatsFrom(fourBeats) ?? [],
      words: [{ text: 'here', start: 0.1, end: 0.4 }],
      brand: { logoLabel: 'x' },
    })

    expect(Object.keys(plan).sort()).toEqual(
      ['beats', 'brand', 'hook', 'out', 'source', 'title', 'words'].sort(),
    )
  })
})

describe('parseRenderSummary', () => {
  const summary = {
    ok: true,
    short: '/work/out/short.mp4',
    poster: '/work/out/poster.jpg',
    durationS: 48.2,
    bytes: 12_345,
    segments: [
      { beat: 'Hook', startS: 1, endS: 9.5, text: 'say the question', coverage: 0.8 },
      { beat: 'Payoff', startS: 20, endS: 28, text: 'the real answer', coverage: 0.6 },
    ],
    aiScenes: [],
    compliance: { verdict: 'passed', findings: [] },
    encoder: { name: 'libopenh264', isLgpl: true },
    font: { family: 'DejaVu Sans', isBrandFont: false },
  }

  it('turns the engine’s windows into segments, adding the asset id', () => {
    const parsed = parseRenderSummary(summary, ASSET_ID)

    // The engine sees a path; the window belongs to an asset only once it is
    // back on this side.
    expect(parsed?.segments).toEqual([
      { kind: 'source', assetId: ASSET_ID, startS: 1, endS: 9.5, beat: 'Hook', text: 'say the question' },
      { kind: 'source', assetId: ASSET_ID, startS: 20, endS: 28, beat: 'Payoff', text: 'the real answer' },
    ])
  })

  it('reads a refusal as a refusal, with the sentence the client sees', () => {
    const refused = parseRenderSummary(
      { ok: false, reason: 'the Payoff beat is not in this footage (best match 18% of its words)' },
      ASSET_ID,
    )

    expect(refused?.ok).toBe(false)
    expect(refused?.reason).toContain('Payoff')
    // Not a zero-length success: nothing was produced and nothing should be
    // uploaded.
    expect(refused?.shortPath).toBeNull()
    expect(refused?.segments).toEqual([])
  })

  it('gives a refusal with no sentence one anyway', () => {
    expect(parseRenderSummary({ ok: false }, ASSET_ID)?.reason).not.toBeNull()
  })

  it('carries the two honesty fields: which encoder, and whose font', () => {
    const parsed = parseRenderSummary(summary, ASSET_ID)
    expect(parsed?.encoderName).toBe('libopenh264')
    expect(parsed?.fontFamily).toBe('DejaVu Sans')
    expect(parsed?.isBrandFont).toBe(false)
  })

  it('drops a window it cannot read rather than encoding against a guess', () => {
    const broken = { ...summary, segments: [{ beat: 'Hook', startS: 5 }] }
    expect(parseRenderSummary(broken, ASSET_ID)?.segments).toEqual([])
  })

  it('is null only when the file is not a summary at all', () => {
    expect(parseRenderSummary(null, ASSET_ID)).toBeNull()
    expect(parseRenderSummary({ short: '/x.mp4' }, ASSET_ID)).toBeNull()
  })
})
