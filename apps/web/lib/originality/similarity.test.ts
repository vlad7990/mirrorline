/**
 * The Originality Gate's measuring stick (V3, D126).
 *
 * These tests come before the implementation on purpose, and the first few
 * describe the trap rather than the feature: **a remake is supposed to share
 * its source's structure.** `12 §3` says take the beats and never the footage
 * or audio; D112 says patterns, never expression. So a similarity measure that
 * scored the whole text would flag every *correct* remake, and the only way to
 * ship it would be to raise the limit until it never fired — which is the gate
 * the predecessor project had.
 *
 * Hence the shape below: the measure sees expression only, and the beat names
 * are never part of what it compares.
 */

import { describe, expect, it } from 'vitest'

import {
  comparableSentences,
  longestSharedPhrase,
  MIN_SENTENCE_WORDS,
  normaliseForComparison,
  sentencesOf,
  sharedSentences,
  shingleOverlap,
} from './similarity'

describe('normaliseForComparison', () => {
  it('ignores case, punctuation and runs of whitespace', () => {
    // Arrange
    const a = 'Stop   pulling on the lead — do THIS instead!'
    const b = 'stop pulling on the lead, do this instead'

    // Act + Assert
    expect(normaliseForComparison(a)).toBe(normaliseForComparison(b))
  })

  it('treats the curly and the straight apostrophe as the same character', () => {
    expect(normaliseForComparison("your dog's recall")).toBe(
      normaliseForComparison('your dog’s recall'),
    )
  })

  it('returns an empty string for text that is only punctuation', () => {
    expect(normaliseForComparison('—  …  !!')).toBe('')
  })
})

describe('sentencesOf', () => {
  it('splits on sentence endings and drops the empties', () => {
    // Arrange
    const text = 'Hook them in one second. Then earn the next five!  Really?'

    // Act
    const sentences = sentencesOf(text)

    // Assert
    expect(sentences).toEqual([
      'Hook them in one second.',
      'Then earn the next five!',
      'Really?',
    ])
  })

  it('splits on newlines, because a script is written in lines', () => {
    expect(sentencesOf('Hook: stop pulling\nSetup: three steps')).toEqual([
      'Hook: stop pulling',
      'Setup: three steps',
    ])
  })

  it('does not split a decimal or an abbreviation mid-sentence', () => {
    // Arrange: "2.5" and "e.g." are not three sentences.
    const text = 'It took 2.5 weeks, e.g. eighteen days.'

    // Act + Assert
    expect(sentencesOf(text)).toEqual(['It took 2.5 weeks, e.g. eighteen days.'])
  })

  it('returns nothing for an empty or whitespace-only script', () => {
    expect(sentencesOf('')).toEqual([])
    expect(sentencesOf('   \n  ')).toEqual([])
  })
})

describe('comparableSentences', () => {
  it('normalises, and keeps only sentences long enough to be evidence', () => {
    // Arrange: V2's `sentencesOf`, under a name that says which of the two it
    // is. 'Also short.' is two words and is not evidence of anything.
    const text = 'This one is long enough to compare. Also short.'

    // Act + Assert
    expect(comparableSentences(text)).toEqual([
      'this one is long enough to compare',
    ])
  })

  it('agrees with the exported threshold', () => {
    // Arrange: exactly at the limit, and one word under it.
    const atLimit = Array.from({ length: MIN_SENTENCE_WORDS }, () => 'word').join(' ')
    const underLimit = Array.from({ length: MIN_SENTENCE_WORDS - 1 }, () => 'word').join(' ')

    // Act + Assert
    expect(comparableSentences(atLimit)).toHaveLength(1)
    expect(comparableSentences(underLimit)).toHaveLength(0)
  })
})

describe('sharedSentences', () => {
  it('finds a sentence reused verbatim', () => {
    // Arrange
    const draft = 'Here is my own hook. Nobody tells you this about recall.'
    const source = 'Nobody tells you this about recall. And here is why.'

    // Act
    const shared = sharedSentences(draft, [source])

    // Assert
    expect(shared).toEqual(['Nobody tells you this about recall.'])
  })

  it('finds it through different casing and punctuation', () => {
    // Arrange: moving a comma is not writing a new sentence.
    const draft = 'nobody tells you this, about recall'
    const source = 'Nobody tells you this about recall!'

    // Act + Assert
    expect(sharedSentences(draft, [source])).toHaveLength(1)
  })

  it('reports the draft’s own wording, so the writer can find the line', () => {
    // Arrange
    const draft = 'Nobody TELLS you this about recall.'

    // Act
    const [shared] = sharedSentences(draft, [
      'nobody tells you this about recall',
    ])

    // Assert: the draft's text, not the normalised form and not the source's.
    expect(shared).toBe('Nobody TELLS you this about recall.')
  })

  it('is empty when the draft only shares the idea', () => {
    // Arrange
    const draft = 'Most owners have never been shown how recall actually works.'
    const source = 'Nobody tells you this about recall.'

    // Act + Assert
    expect(sharedSentences(draft, [source])).toEqual([])
  })

  it('searches every source, not only the first', () => {
    // Arrange
    const draft = 'Mine is original. This line came from the second source.'

    // Act
    const shared = sharedSentences(draft, [
      'Nothing in common here.',
      'This line came from the second source.',
    ])

    // Assert
    expect(shared).toEqual(['This line came from the second source.'])
  })

  it('does not fire on a four-word fragment', () => {
    // Arrange: V2's rule, moved here rather than reinvented — "a four-word
    // fragment is not evidence of copying" (video-idea.ts). `MIN_SENTENCE_WORDS`
    // is what keeps "Here is the thing" from being a copied sentence, and the
    // guarantee has to survive being moved into this module.
    const draft = 'Here is the thing.'
    const source = 'Here is the thing. Now listen to the rest of it.'

    // Act + Assert
    expect(sharedSentences(draft, [source])).toEqual([])
  })

  it('reports a reused sentence once, however many sources carry it', () => {
    // Arrange
    const draft = 'Stop pulling on the lead.'

    // Act
    const shared = sharedSentences(draft, [
      'Stop pulling on the lead.',
      'Stop pulling on the lead!',
    ])

    // Assert
    expect(shared).toEqual(['Stop pulling on the lead.'])
  })
})

describe('longestSharedPhrase', () => {
  it('counts the longest run of consecutive words shared with a source', () => {
    // Arrange: ten words in common, inside two sentences that are *not* equal
    // — the case a sentence-equality check cannot see at all, because the
    // eleventh word differs.
    const draft =
      'Listen: the one thing nobody tells you about dog recall is timing.'
    const source =
      'The one thing nobody tells you about dog recall is that it is free.'

    // Act
    const { words, phrase } = longestSharedPhrase(draft, [source])

    // Assert
    expect(words).toBe(10)
    expect(phrase).toBe('the one thing nobody tells you about dog recall is')
  })

  it('is one when only single words are shared, never adjacently', () => {
    // Arrange
    const draft = 'Recall is timing.'
    const source = 'Timing matters for recall.'

    // Act
    const { words } = longestSharedPhrase(draft, [source])

    // Assert: "recall" and "timing" both appear, but never side by side.
    expect(words).toBe(1)
  })

  it('takes the longest across all sources', () => {
    // Arrange
    const draft = 'one two three four five'

    // Act
    const { words } = longestSharedPhrase(draft, ['one two', 'three four five'])

    // Assert
    expect(words).toBe(3)
  })

  it('is zero for an empty draft or no sources', () => {
    expect(longestSharedPhrase('', ['anything']).words).toBe(0)
    expect(longestSharedPhrase('anything', []).words).toBe(0)
  })
})

describe('shingleOverlap', () => {
  it('is 100 for text copied word for word', () => {
    // Arrange
    const text =
      'the one thing nobody tells you about recall is the timing of it'

    // Act + Assert
    expect(shingleOverlap(text, [text])).toBe(100)
  })

  it('is 0 for text with no phrase in common', () => {
    // Arrange
    const draft = 'we film three clips every Tuesday in the yard'
    const source = 'book a consultation and bring your vaccination record'

    // Act + Assert
    expect(shingleOverlap(draft, [source])).toBe(0)
  })

  it('rises as more of the draft is lifted', () => {
    // Arrange
    const source =
      'the one thing nobody tells you about recall is that it is free to practise'
    const mostlyLifted =
      'the one thing nobody tells you about recall is that it is free to teach'
    const partlyLifted =
      'the one thing nobody tells you about recall is something I learned in my own yard'

    // Act
    const high = shingleOverlap(mostlyLifted, [source])
    const low = shingleOverlap(partlyLifted, [source])

    // Assert
    expect(high).toBeGreaterThan(low)
    expect(low).toBeGreaterThan(0)
  })

  it('catches a draft stitched out of several sources', () => {
    // Arrange: every word comes from one of four sources, a quarter from
    // each, so the draft is not "close to" any single one of them. Scoring
    // against the closest source alone returned **20%** here — a pass on a 30%
    // limit, for a draft wholly assembled from our research. That is the hole
    // the union closes, and this is the test that would have caught it.
    const sources = [
      'the first thing nobody ever tells you about this work is simple',
      'the second point worth making here concerns the price people quote',
      'a third consideration which matters more than any of the others',
      'finally the fourth mistake that costs the most money every time',
    ]

    // Act
    const score = shingleOverlap(sources.join(' '), sources)

    // Assert: 71%, not 100 — joining the four creates 5-grams that straddle
    // the seams and genuinely appear in no source. What matters is that it is
    // far over any plausible limit instead of comfortably under one.
    expect(score).toBeGreaterThan(60)
  })

  it('is not diluted by padding the set with unrelated sources', () => {
    // Arrange: burying a lifted source among unrelated ones must not lower
    // the score. The denominator is the draft, so sources that share nothing
    // with it contribute nothing either way — which is the property the
    // closest-source version was written for, and which the union keeps.
    const source =
      'the one thing nobody tells you about recall is the timing of the reward'

    // Act
    const alone = shingleOverlap(source, [source])
    const buried = shingleOverlap(source, [
      'completely unrelated text about invoicing and receipts and late fees',
      source,
      'another unrelated passage concerning parking permits and residents',
    ])

    // Assert
    expect(buried).toBe(alone)
  })

  it('is 0 when there is nothing to compare', () => {
    expect(shingleOverlap('', ['something'])).toBe(0)
    expect(shingleOverlap('something', [])).toBe(0)
  })

  it('is 0 rather than 100 when the draft is shorter than one shingle', () => {
    // Arrange: a two-word draft has no 5-gram, so the honest answer is "not
    // measurable" — and for a *gate* that has to read as 0, because the
    // alternative is a one-word script scoring 100 against anything
    // containing that word. The verbatim-sentence rule is what catches a
    // two-word lift, not this number.
    expect(shingleOverlap('stop pulling', ['stop pulling'])).toBe(0)
  })
})
