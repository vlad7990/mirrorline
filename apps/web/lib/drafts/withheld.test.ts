/**
 * What the report is allowed to say about the ideas it is not showing (D131).
 *
 * The heading promised three and the page showed one. These tests fix the two
 * facts the honest version needs: which drafts count as withheld, and which
 * check refused each one — because the gate and the fact check are told apart
 * only by the verdict a refused row happens to carry.
 */

import { describe, expect, test } from 'vitest'

import type { OriginalityVerdict } from '../originality/gate'

import type { DraftSummary } from './types'
import { refusedBy, withheldFrom } from './withheld'

function verdict(outcome: OriginalityVerdict['outcome']): OriginalityVerdict {
  const failed = outcome !== 'passed'

  return {
    outcome,
    similarity: failed ? 41 : 4,
    limit: 20,
    longestPhrase: { words: 4, phrase: 'in the first week' },
    phraseWordLimit: 8,
    copiedSentences: [],
    reasons: failed ? ['41% of the phrasing is shared, over the 20% limit'] : [],
    attempt: 1,
    isTerminal: outcome !== 'rewritten',
    comparedAgainst: ['the research in your niche report'],
    notComparedAgainst: ['your own last 90 posts'],
  }
}

function draft(over: Partial<DraftSummary>): DraftSummary {
  return {
    id: 'draft-1',
    kind: 'video-idea',
    title: 'The question every owner asks me first',
    status: 'needs-review',
    originality: verdict('passed'),
    body: 'the judged text',
    attempts: 1,
    approvedAt: null,
    ...over,
  }
}

describe('withheldFrom', () => {
  test('a draft waiting for a decision is not withheld', () => {
    // Arrange
    const drafts = [draft({ status: 'needs-review' })]

    // Act
    const withheld = withheldFrom(drafts)

    // Assert
    expect(withheld).toHaveLength(0)
  })

  test('an approved draft is not withheld', () => {
    expect(withheldFrom([draft({ status: 'approved' })])).toHaveLength(0)
  })

  test('refused and blocked drafts are, and they carry the gate’s reason', () => {
    // Arrange — the shape of the first live report: one kept, the rest refused.
    const drafts = [
      draft({ id: 'kept', status: 'needs-review' }),
      draft({
        id: 'too-close',
        status: 'rejected',
        originality: verdict('rewritten'),
        body: '41% of the phrasing is shared, over the 20% limit',
      }),
      draft({
        id: 'twice',
        status: 'blocked',
        originality: verdict('blocked'),
        body: 'blocked after two attempts',
      }),
    ]

    // Act
    const withheld = withheldFrom(drafts)

    // Assert
    expect(withheld.map((idea) => idea.id)).toEqual(['too-close', 'twice'])
    expect(withheld[0]?.reason).toBe('41% of the phrasing is shared, over the 20% limit')
  })

  test('a refusal with no stored reason still counts as a refusal', () => {
    // Null must never collapse into "nothing was withheld" — that is the exact
    // invisibility the heading bug produced.
    const withheld = withheldFrom([draft({ status: 'rejected', body: null })])

    expect(withheld).toHaveLength(1)
    expect(withheld[0]?.reason).toBeNull()
  })
})

describe('refusedBy', () => {
  test('a failing verdict names the gate', () => {
    const [idea] = withheldFrom([draft({ status: 'rejected', originality: verdict('rewritten') })])

    expect(idea && refusedBy(idea)).toBe('the Originality Gate')
  })

  test('a passing verdict on a refused draft names the fact check', () => {
    // The gate runs first, so this is the only thing a passing verdict beside a
    // refusal can mean.
    const [idea] = withheldFrom([draft({ status: 'rejected', originality: verdict('passed') })])

    expect(idea && refusedBy(idea)).toBe('the fact check')
  })

  test('no verdict is reported as no verdict, not as a guess', () => {
    const [idea] = withheldFrom([draft({ status: 'rejected', originality: null })])

    expect(idea && refusedBy(idea)).toBe('a check that recorded no verdict')
  })
})
