/**
 * The three things `BACKEND_PHASE §V3` says the gate is done when it does, and
 * the things `04 §Originality Gate` says it must never do.
 *
 * > "a deliberately-copied draft is blocked and the block is visible in the
 * > studio; the approve action is refused server-side, not merely hidden; and
 * > 'blocked twice' reaches a terminal state rather than looping."
 *
 * The first and third are decided here. The second is decided by whatever
 * holds the verdict — a pure function cannot refuse an action — and these
 * tests pin the shape that makes refusing possible: an outcome that is a value
 * in the row rather than a style on a button.
 */

import { describe, expect, it } from 'vitest'

import {
  judgeOriginality,
  MAX_ATTEMPTS,
  PHRASE_WORD_LIMIT,
  SIMILARITY_LIMIT,
  type ComparisonCorpus,
} from './gate'

/** A sentence from somebody else's post, named so tests can lift it on purpose. */
const SOURCE_SENTENCE =
  'The myth is on screen as text before the first word is spoken.'

/** A source example of the kind the niche report holds. */
const SOURCE: ComparisonCorpus = {
  label: 'the source examples in your niche report',
  texts: [
    SOURCE_SENTENCE,
    'Show the problem in the first second, then name it out loud for them.',
  ],
}

/** Nothing of the client's own, which is the honest state today. */
const NO_OWN_POSTS: ComparisonCorpus = {
  label: 'your own last 90 posts',
  texts: [],
}

/** A draft in the client's own words, sharing only the shape. */
const ORIGINAL =
  'Everyone asks me whether their dog will grow out of this. Here is what I tell them in the park. Change one thing today and watch the lead go slack.'

describe('a draft in the client’s own words passes', () => {
  it('passes, and says so with a number and the limit', () => {
    // Act
    const verdict = judgeOriginality({
      draft: ORIGINAL,
      corpora: [SOURCE, NO_OWN_POSTS],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).toBe('passed')
    expect(verdict.similarity).toBeLessThanOrEqual(SIMILARITY_LIMIT)
    expect(verdict.limit).toBe(SIMILARITY_LIMIT)
    expect(verdict.reasons).toEqual([])
  })

  it('names what it compared against, and what it could not', () => {
    // Act
    const verdict = judgeOriginality({
      draft: ORIGINAL,
      corpora: [SOURCE, NO_OWN_POSTS],
      attempt: 1,
    })

    // Assert: an empty corpus is reported as *not* compared, never folded into
    // the list of things that were. `04 §1` says the second comparison matters
    // as much as the first, so claiming it silently is the failure mode.
    expect(verdict.comparedAgainst).toEqual([SOURCE.label])
    expect(verdict.notComparedAgainst).toEqual([NO_OWN_POSTS.label])
  })
})

describe('a deliberately-copied draft does not go forward as written', () => {
  it('catches a sentence lifted word for word, and names the line', () => {
    // Arrange: the exact failure V3 exists for.
    const draft =
      'Here is my own opening. The myth is on screen as text before the first word is spoken. And here is my own close.'

    // Act
    const verdict = judgeOriginality({ draft, corpora: [SOURCE], attempt: 1 })

    // Assert
    expect(verdict.outcome).toBe('rewritten')
    expect(verdict.copiedSentences).toEqual([
      'The myth is on screen as text before the first word is spoken.',
    ])
    expect(verdict.reasons.join(' ')).toContain('word for word')
  })

  it('catches a lifted line whose last word was changed', () => {
    // Arrange: ten words shared, so the sentences are not equal and a sentence
    // check alone sees nothing. This is what the phrase limit is for, and the
    // most natural way to copy something on purpose.
    const draft =
      'Show the problem in the first second, then name it out loud for me.'

    // Act
    const verdict = judgeOriginality({ draft, corpora: [SOURCE], attempt: 1 })

    // Assert
    expect(verdict.copiedSentences).toEqual([])
    expect(verdict.longestPhrase.words).toBeGreaterThan(PHRASE_WORD_LIMIT)
    expect(verdict.outcome).toBe('rewritten')
    expect(verdict.reasons.join(' ')).toContain('consecutive words')
  })

  it('quotes the offending run so the writer can find it', () => {
    // Arrange
    const draft =
      'Show the problem in the first second, then name it out loud for me.'

    // Act
    const { longestPhrase } = judgeOriginality({
      draft,
      corpora: [SOURCE],
      attempt: 1,
    })

    // Assert
    expect(longestPhrase.phrase).toContain(
      'show the problem in the first second',
    )
  })

  it('fails a draft that is mostly lifted phrasing', () => {
    // Arrange: a draft stitched out of the sources scores high on the phrasing
    // measure as well as tripping the sentence rule.
    const draft = SOURCE.texts.join(' ')

    // Act
    const verdict = judgeOriginality({ draft, corpora: [SOURCE], attempt: 1 })

    // Assert
    expect(verdict.similarity).toBeGreaterThan(SIMILARITY_LIMIT)
    expect(verdict.outcome).not.toBe('passed')
  })
})

describe('the beat structure is not what is being measured', () => {
  it('passes a draft that shares every beat label and no wording', () => {
    // Arrange: this is the trap. `12 §3` says take the recipe's beats, and
    // D112 says patterns never expression — so a gate that scored the labels
    // would reject every *correct* remake, and the tempting fix is to raise
    // the limit until it stops complaining. Beat labels are not passed in at
    // all; this test is here so that stays true.
    const draft =
      'Hook. Setup. Payoff. Call to action. My own sentence about recall in the park, which nobody else wrote.'
    const sourceWithBeats: ComparisonCorpus = {
      label: 'the source format',
      texts: ['Hook. Setup. Payoff. Call to action.'],
    }

    // Act
    const verdict = judgeOriginality({
      draft,
      corpora: [sourceWithBeats],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).toBe('passed')
  })
})

describe('blocked twice is terminal, not a loop', () => {
  it('sends the first failure back to be rewritten', () => {
    // Act
    const verdict = judgeOriginality({
      draft: SOURCE_SENTENCE,
      corpora: [SOURCE],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).toBe('rewritten')
    expect(verdict.isTerminal).toBe(false)
  })

  it('blocks the second failure and stops', () => {
    // Act
    const verdict = judgeOriginality({
      draft: SOURCE_SENTENCE,
      corpora: [SOURCE],
      attempt: MAX_ATTEMPTS,
    })

    // Assert
    expect(verdict.outcome).toBe('blocked')
    expect(verdict.isTerminal).toBe(true)
    expect(verdict.reasons.join(' ')).toContain('twice')
  })

  it('stays blocked past the limit rather than wrapping round to a rewrite', () => {
    // Arrange: a caller that lost count must not be able to buy a third go.
    // "Two failures mean the recipe is too close to its source to remake"
    // (`04 §3`), so attempt 7 is blocked, never 'rewritten'.

    // Act
    const verdict = judgeOriginality({
      draft: SOURCE_SENTENCE,
      corpora: [SOURCE],
      attempt: 7,
    })

    // Assert
    expect(verdict.outcome).toBe('blocked')
    expect(verdict.isTerminal).toBe(true)
  })

  it('a pass is terminal too — there is nothing left to do', () => {
    // Act
    const verdict = judgeOriginality({
      draft: ORIGINAL,
      corpora: [SOURCE],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).toBe('passed')
    expect(verdict.isTerminal).toBe(true)
  })
})

describe('what the gate refuses to do', () => {
  it('fails closed when there is nothing to compare against', () => {
    // Arrange + Act: every corpus empty. A gate that cannot compare must not
    // report a pass — "no sources loaded" would otherwise be the cheapest way
    // through it, and `04 §4` is explicit that an invisible failure is
    // indistinguishable from a gate that never fires.
    const verdict = judgeOriginality({
      draft: ORIGINAL,
      corpora: [NO_OWN_POSTS],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).not.toBe('passed')
    expect(verdict.reasons.join(' ')).toContain('nothing to compare')
  })

  it('fails closed on an empty draft', () => {
    // Act
    const verdict = judgeOriginality({
      draft: '   ',
      corpora: [SOURCE],
      attempt: 1,
    })

    // Assert
    expect(verdict.outcome).not.toBe('passed')
  })

  it('gives the same verdict for the same draft, every time', () => {
    // Arrange: approval depends on this, so "run it again" must not be a way
    // through. No sampling, no clock and no randomness anywhere in the gate.
    const input = { draft: ORIGINAL, corpora: [SOURCE], attempt: 1 } as const

    // Act
    const first = judgeOriginality(input)
    const second = judgeOriginality(input)

    // Assert
    expect(second).toEqual(first)
  })

  it('reports every reason it failed, not only the first', () => {
    // Arrange: a draft that trips the sentence rule and the phrasing number
    // together. The writer needs the whole list, because fixing one and
    // resubmitting spends the only other attempt they have.
    const draft = SOURCE.texts.join(' ')

    // Act
    const verdict = judgeOriginality({ draft, corpora: [SOURCE], attempt: 1 })

    // Assert
    expect(verdict.reasons.length).toBeGreaterThan(1)
  })
})
