/**
 * `parseSummary` is the boundary between two languages, so these tests are
 * mostly about what it refuses. A half-parsed summary shown as a whole one is
 * how a blocked cut becomes a cut somebody schedules.
 */

import { describe, expect, test } from 'vitest'

import { parseSummary } from './types'

const CUT = {
  index: 1,
  hook: 'Burnout is not a workload problem',
  format: 'Hook question',
  lengthLabel: '0:27',
  lengthSeconds: 27.4,
  score: 89,
  reasons: ['opens on a question'],
  hasAiScenes: false,
  compliance: {
    status: 'pass',
    findings: [{ rule: 'rights-flag', status: 'pass', message: 'rights held by Maya Torres' }],
  },
  file: '/tmp/samples/cut-01.mp4',
}

const SUMMARY = {
  generatedAt: '2026-11-10T18:40:00Z',
  source: { file: '/tmp/episode-47.mp4', rightsHolder: 'Maya Torres Coaching' },
  brand: { logoLabel: 'Maya Torres Coaching', captionStyle: 'bold-highlight' },
  adapters: {
    transcriber: 'script-sidecar (json)',
    momentFinder: 'heuristic',
    captionBurner: 'pillow-overlay',
    notes: [],
  },
  flags: { useClaude: false },
  counts: { cuts: 1, pass: 1, needsReview: 0, blocked: 0 },
  cuts: [CUT],
}

describe('parseSummary', () => {
  test('reads a well-formed summary', () => {
    const summary = parseSummary(SUMMARY)

    expect(summary.generatedAt).toBe('2026-11-10T18:40:00Z')
    expect(summary.counts.cuts).toBe(1)
    // `.at(0)?.` rather than `[0].`: tsconfig has noUncheckedIndexedAccess, so
    // an unguarded index is a type error. The assertion is no weaker for it —
    // a missing cut makes the actual value undefined, which still fails.
    expect(summary.cuts.at(0)?.hook).toBe('Burnout is not a workload problem')
    expect(summary.cuts.at(0)?.compliance.status).toBe('pass')
  })

  test('keeps the adapter names, which are the honesty record', () => {
    const summary = parseSummary(SUMMARY)

    expect(summary.adapters.transcriber).toBe('script-sidecar (json)')
    expect(summary.flags.useClaude).toBe(false)
  })

  test('a missing rights holder is null, not an error', () => {
    const summary = parseSummary({
      ...SUMMARY,
      source: { file: '/tmp/episode-47.mp4', rightsHolder: null },
    })

    expect(summary.source.rightsHolder).toBeNull()
  })

  test('refuses something that is not an object', () => {
    expect(() => parseSummary('not an object')).toThrow('summary is not an object')
  })

  test('refuses a cuts field that is not an array', () => {
    expect(() => parseSummary({ ...SUMMARY, cuts: 'nope' })).toThrow('summary.cuts is not an array')
  })

  test('refuses a generatedAt that is not a string', () => {
    expect(() => parseSummary({ ...SUMMARY, generatedAt: 7 })).toThrow(
      'summary.generatedAt is not a string',
    )
  })

  test('refuses a compliance status it does not know', () => {
    const bad = { ...SUMMARY, cuts: [{ ...CUT, compliance: { ...CUT.compliance, status: 'ok' } }] }

    expect(() => parseSummary(bad)).toThrow('is not a compliance status')
  })

  test('refuses a cut whose score is not a number', () => {
    const bad = { ...SUMMARY, cuts: [{ ...CUT, score: '89' }] }

    expect(() => parseSummary(bad)).toThrow('summary.cuts[0].score is not a finite number')
  })

  test('names the cut and the field that is wrong', () => {
    const bad = { ...SUMMARY, cuts: [CUT, { ...CUT, index: 2, hook: 42 }] }

    expect(() => parseSummary(bad)).toThrow('summary.cuts[1].hook is not a string')
  })

  test('a file path that is absent becomes null rather than undefined', () => {
    const summary = parseSummary({ ...SUMMARY, cuts: [{ ...CUT, file: undefined }] })

    expect(summary.cuts.at(0)?.file).toBeNull()
  })
})
