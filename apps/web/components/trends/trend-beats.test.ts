/**
 * Frame labels, and the overflow they exist to stop (V1 P0.3).
 *
 * A storyboard frame is 9:16 and about 80px wide inside a format card. A
 * scanned beat is a whole instruction — *"Hook: show the problem (lunging,
 * barking, pulling) in the first second"* — and the first live report put
 * four of those inside four frames, where each one overran into the next.
 *
 * The frame takes the beat's **name**; the beat itself is printed in full
 * under the storyboard. These tests are about that split, not about CSS: the
 * clamp in `StoryboardFrames` is the second line of defence, and this is the
 * first.
 */

import { describe, expect, test } from 'vitest'

import { frameLabel, sentenceCase, storyboardFromBeats } from './trend-beats'

describe('a frame label names the beat, it does not repeat it', () => {
  test('takes the prefix before the colon, which is what a beat is called', () => {
    expect(
      frameLabel('Hook: show the problem (lunging, barking, pulling) in the first second'),
    ).toBe('Hook')
    expect(frameLabel('CTA: invite a comment or save')).toBe('CTA')
  })

  test('a short beat is already a label', () => {
    expect(frameLabel('State the myth')).toBe('State the myth')
  })

  test('a long beat with no colon keeps whole words and says it was cut', () => {
    const label = frameLabel('Walk through the numbered steps with real clips of each one')

    expect(label.endsWith('…')).toBe(true)
    // Never mid-word: a label cut to "Walk through the num…" reads as a bug.
    expect(label).toBe('Walk through the…')
  })

  test('a colon far into the sentence is prose, not a name', () => {
    // Nothing in the first 18 characters names this beat, so the word-trim
    // applies instead of the colon rule.
    const label = frameLabel('Payoff — the one thing that matters: say it plainly')

    expect(label.endsWith('…')).toBe(true)
    expect(label.startsWith('Payoff')).toBe(true)
  })

  test('leaves a lower-case opening that is not a sentence start alone', () => {
    expect(sentenceCase('3-word reframe')).toBe('3-word reframe')
  })
})

describe('the storyboard is four frames, whatever the recipe holds', () => {
  test('keeps the opening beats and the ending when there are more than four', () => {
    const frames = storyboardFromBeats([
      'Hook: name the myth',
      'Setup: say why people believe it',
      'Proof: show the correction',
      'Payoff: the fact',
      'CTA: book a session',
    ])

    expect(frames).toHaveLength(4)
    expect(frames.map((frame) => frame.label)).toEqual(['Hook', 'Setup', 'Proof', 'CTA'])
  })

  test('a three-beat recipe draws three frames', () => {
    expect(storyboardFromBeats(['Hook: a', 'Payoff: b', 'CTA: c'])).toHaveLength(3)
  })

  test('no beats, no storyboard', () => {
    expect(storyboardFromBeats([])).toEqual([])
  })
})
