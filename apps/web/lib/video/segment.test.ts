/**
 * The seam's tests.
 *
 * This file matters more than its size suggests: `segment.ts` is the one module
 * the video and generation sessions share, so these are the assertions that
 * tell the other session it has not broken anything — in particular that a
 * generated segment with no label is not a segment at all.
 */

import { describe, expect, it } from 'vitest'

import {
  aiLabelFor,
  aiScenesOf,
  isBeatLabel,
  parseSegment,
  parseSegments,
  totalDurationS,
  type GeneratedSegment,
  type SourceSegment,
} from './segment'

const sourceSegment: SourceSegment = {
  kind: 'source',
  assetId: 'a0000000-0000-4000-8000-000000000001',
  startS: 12.5,
  endS: 24,
  beat: 'Hook',
  text: 'the thing most first-time managers get wrong',
}

/**
 * The same object with one field gone.
 *
 * A helper rather than `const { text: _text, ...rest } = segment`, because the
 * lint rule counts the discarded binding as an unused variable and `pnpm lint`
 * runs with `--max-warnings=0`. Written once here instead of three disable
 * comments.
 */
function without(segment: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(segment).filter(([name]) => name !== key))
}

const generatedSegment: GeneratedSegment = {
  kind: 'generated',
  clipId: 'clip-7',
  provider: 'example-generator',
  storagePath: 'ws/render/clip-7.mp4',
  promptRef: 'prompt-42',
  beat: 'Setup',
  durationS: 4,
  label: 'AI-generated scene',
}

describe('isBeatLabel', () => {
  it('accepts the four labels the script agent is told to write', () => {
    expect(isBeatLabel('Hook')).toBe(true)
    expect(isBeatLabel('Setup')).toBe(true)
    expect(isBeatLabel('Payoff')).toBe(true)
    expect(isBeatLabel('Call to action')).toBe(true)
  })

  it('rejects a renamed or invented beat', () => {
    // The aligner matches on the label the model produced, so a near-miss is a
    // beat that will never be found rather than a beat with a nickname.
    expect(isBeatLabel('hook')).toBe(false)
    expect(isBeatLabel('CTA')).toBe(false)
    expect(isBeatLabel('Outro')).toBe(false)
  })
})

describe('parseSegment, on footage', () => {
  it('reads a source window back out of jsonb', () => {
    expect(parseSegment({ ...sourceSegment })).toEqual(sourceSegment)
  })

  it('defaults missing text to empty rather than refusing', () => {
    // The text is there to explain the window to a reader. Its absence does not
    // make the window wrong, and refusing would discard a renderable cut.
    expect(parseSegment(without(sourceSegment, 'text'))).toEqual({ ...sourceSegment, text: '' })
  })

  it('refuses a zero-length or reversed window', () => {
    // Not a shorter clip: a filter graph that fails at render time with
    // something unreadable.
    expect(parseSegment({ ...sourceSegment, endS: sourceSegment.startS })).toBeNull()
    expect(parseSegment({ ...sourceSegment, startS: 30, endS: 24 })).toBeNull()
    expect(parseSegment({ ...sourceSegment, startS: -1 })).toBeNull()
  })

  it('refuses a window with no start time rather than starting at zero', () => {
    expect(parseSegment(without(sourceSegment, 'startS'))).toBeNull()
  })
})

describe('parseSegment, on a generated clip', () => {
  it('reads one back out of jsonb', () => {
    expect(parseSegment({ ...generatedSegment })).toEqual(generatedSegment)
  })

  it('refuses a generated clip with no label', () => {
    // Rule 2 of the shared module, and non-negotiable 4. An unlabelled
    // generated scene does not become an unlabelled segment — it stops being a
    // segment, so nothing downstream has to remember to check.
    expect(parseSegment({ ...generatedSegment, label: '' })).toBeNull()
    expect(parseSegment(without(generatedSegment, 'label'))).toBeNull()
  })

  it('refuses a generated clip with no provider or no prompt reference', () => {
    expect(parseSegment({ ...generatedSegment, provider: '' })).toBeNull()
    expect(parseSegment({ ...generatedSegment, promptRef: '' })).toBeNull()
  })

  it('refuses a clip of no duration', () => {
    expect(parseSegment({ ...generatedSegment, durationS: 0 })).toBeNull()
  })
})

describe('parseSegments', () => {
  it('reads a whole cut list', () => {
    expect(parseSegments([sourceSegment, generatedSegment])).toEqual([
      sourceSegment,
      generatedSegment,
    ])
  })

  it('returns nothing at all when one segment is unreadable', () => {
    // A render missing its third beat is not a shorter video, it is the wrong
    // video. The caller can say "this cut list could not be read"; it must not
    // play three beats as though that were the script.
    expect(parseSegments([sourceSegment, { kind: 'source' }])).toEqual([])
  })

  it('treats anything that is not an array as nothing', () => {
    expect(parseSegments(null)).toEqual([])
    expect(parseSegments({ segments: [sourceSegment] })).toEqual([])
  })
})

describe('totalDurationS', () => {
  it('adds windows and clips together', () => {
    expect(totalDurationS([sourceSegment, generatedSegment])).toBeCloseTo(11.5 + 4)
  })

  it('is zero for an empty list', () => {
    expect(totalDurationS([])).toBe(0)
  })
})

describe('aiScenesOf and aiLabelFor', () => {
  it('finds nothing to label in footage alone', () => {
    expect(aiScenesOf([sourceSegment])).toEqual([])
    expect(aiLabelFor([sourceSegment])).toBeNull()
  })

  it('labels one generated scene', () => {
    expect(aiLabelFor([sourceSegment, generatedSegment])).toBe(
      '1 AI-generated scene (example-generator)',
    )
  })

  it('names every provider when two generators contributed', () => {
    // A label that mentions one of two generators is a label that is partly
    // false, which non-negotiable 7 does not allow.
    const second: GeneratedSegment = {
      ...generatedSegment,
      clipId: 'clip-8',
      provider: 'another-generator',
      beat: 'Payoff',
    }

    expect(aiLabelFor([generatedSegment, second])).toBe(
      '2 AI-generated scenes (another-generator, example-generator)',
    )
  })

  it('carries the provider, prompt reference and label into ai_scenes', () => {
    expect(aiScenesOf([generatedSegment])).toEqual([
      {
        clipId: 'clip-7',
        provider: 'example-generator',
        promptRef: 'prompt-42',
        beat: 'Setup',
        label: 'AI-generated scene',
      },
    ])
  })
})
