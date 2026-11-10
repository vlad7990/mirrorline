/**
 * The mapping from an engine cut to the shape the grid renders.
 *
 * The two things worth protecting: the engine's own word for a format
 * survives rather than being bent into the mock's union, and the sentence the
 * gate wrote reaches the card so a held cut explains itself.
 */

import { describe, expect, test } from 'vitest'

import type { EngineCut } from '@/lib/engine/types'

import { reasonFrom, thumbnailColorFor, toCutView } from './cut-view'

const JOB = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'

function engineCut(overrides: Partial<EngineCut> = {}): EngineCut {
  return {
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
    file: null,
    ...overrides,
  }
}

describe('toCutView', () => {
  test('carries hook, length and score across unchanged', () => {
    const view = toCutView(engineCut(), JOB)

    expect(view.hook).toBe('Burnout is not a workload problem')
    expect(view.lengthLabel).toBe('0:27')
    expect(view.score).toBe(89)
    expect(view.index).toBe(1)
  })

  test("keeps the engine's own format rather than bending it into the mock union", () => {
    expect(toCutView(engineCut({ format: 'List' }), JOB).format).toBe('List')
  })

  test('translates pass into the studio word for it', () => {
    expect(toCutView(engineCut(), JOB).compliance).toBe('passed')
    expect(toCutView(engineCut(), JOB).complianceLabel).toBe('Passed')
  })

  test('a passing cut has nothing to explain', () => {
    expect(toCutView(engineCut(), JOB).complianceReason).toBeNull()
  })

  test('ids are scoped to the job, so two runs cannot collide', () => {
    const first = toCutView(engineCut(), JOB)
    const second = toCutView(engineCut(), 'other-job-id')

    expect(first.id).not.toBe(second.id)
    expect(first.id).toContain(JOB)
  })

  test('the video url is carried when the API supplied one', () => {
    const view = toCutView({ ...engineCut(), url: `/api/engine/jobs/${JOB}/cuts/1` }, JOB)

    expect(view.videoUrl).toBe(`/api/engine/jobs/${JOB}/cuts/1`)
  })

  test('a cut with no rendered file has no video url', () => {
    expect(toCutView(engineCut(), JOB).videoUrl).toBeUndefined()
  })
})

describe('reasonFrom', () => {
  test('a block outranks a hold, because it is the verdict that stands', () => {
    const cut = engineCut({
      compliance: {
        status: 'blocked',
        findings: [
          { rule: 'near-duplicate', status: 'needs-review', message: '44% similar to cut 2' },
          { rule: 'rights-flag', status: 'blocked', message: 'no rights record in brand.json' },
        ],
      },
    })

    expect(reasonFrom(cut)).toBe('no rights record in brand.json')
  })

  test('a hold is explained when nothing is blocked', () => {
    const cut = engineCut({
      compliance: {
        status: 'needs-review',
        findings: [
          { rule: 'rights-flag', status: 'pass', message: 'rights held' },
          { rule: 'near-duplicate', status: 'needs-review', message: '44% similar to cut 2' },
        ],
      },
    })

    expect(reasonFrom(cut)).toBe('44% similar to cut 2')
  })

  test('the blocked status reaches the view with its sentence', () => {
    const cut = engineCut({
      compliance: {
        status: 'blocked',
        findings: [{ rule: 'ai-label', status: 'blocked', message: 'generated scene, no AI label' }],
      },
    })
    const view = toCutView(cut, JOB)

    expect(view.compliance).toBe('blocked')
    expect(view.complianceReason).toBe('generated scene, no AI label')
  })
})

describe('thumbnailColorFor', () => {
  test('cycles, and never falls off either end', () => {
    expect(thumbnailColorFor(0)).toBe(thumbnailColorFor(4))
    expect(thumbnailColorFor(-1)).toMatch(/^#/)
    expect(thumbnailColorFor(99)).toMatch(/^#/)
  })
})
