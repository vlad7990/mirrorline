/**
 * The seven agents, and the metric M8 gave each of them.
 *
 * The `metric` field being required already makes "every agent has one" a
 * compile error rather than a test — so these assert the things a type
 * cannot: that no line is blank or a placeholder, that no two agents claim
 * the same metric, and that the loop is still seven agents in order.
 *
 * The duplicate check is the one worth having. 15 §6 gives six rows for seven
 * agents, because the Remake Producer and the Multiplier share one; writing
 * them out separately is correct, and pasting the same sentence twice is the
 * mistake that looks exactly like having done it.
 */

import { describe, expect, test } from 'vitest'

import { PUBLIC_AGENTS } from './agents'

describe('PUBLIC_AGENTS', () => {
  test('is still seven agents, numbered in loop order', () => {
    expect(PUBLIC_AGENTS).toHaveLength(7)
    expect(PUBLIC_AGENTS.map((agent) => agent.step)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('every metric completes the sentence "Owns …" it is rendered into', () => {
    // This assertion exists because its absence shipped. The first draft
    // transcribed 15 §6's column as written, and that column mixes noun
    // phrases ("Quality and safety tier") with verb phrases ("Tag every
    // video…", "Sends the weekly ledger…"). Rendered behind the word "Owns"
    // three of the seven read "Owns Tags every video it makes…".
    //
    // Every other test passed. A screenshot caught it, which is D62's lesson
    // arriving again: grammar is a property of the rendered sentence, and
    // nothing that checked the field in isolation could see it.
    for (const agent of PUBLIC_AGENTS) {
      // Not blank, not a stub somebody meant to come back to.
      expect(agent.metric.trim().length).toBeGreaterThan(20)
      expect(agent.metric).not.toMatch(/\bTODO\b|\bTBD\b|lorem/i)

      // A continuation, not a new sentence: lower case at the front, and a
      // full stop at the end because the rendered line finishes there.
      expect(agent.metric[0]).toBe(agent.metric[0]?.toLowerCase())
      expect(agent.metric.endsWith('.')).toBe(true)

      // The failure that actually happened, named: a verb phrase after
      // "Owns" is ungrammatical however plausible the words are.
      expect(`Owns ${agent.metric}`).not.toMatch(
        /\bOwns (?:Tags?|Sends?|Reads?|Checks?|Posts?|Writes?|Finds?|Builds?|Runs?|Keeps?) /,
      )
    }
  })

  test('no two agents claim the same metric', () => {
    // 15 §6's shared row is the trap: the Remake Producer and the Multiplier
    // are one line in the spec and two cards in the loop, so the copy that
    // separates them has to actually differ.
    const metrics = PUBLIC_AGENTS.map((agent) => agent.metric)

    expect(new Set(metrics).size).toBe(metrics.length)
  })

  test('the two agents sharing a row in 15 §6 both describe tagging', () => {
    // The other half of the same trap: made distinct, but still faithful to
    // the row they came from rather than invented to pass the check above.
    const tagging = PUBLIC_AGENTS.filter((agent) =>
      ['remake-producer', 'multiplier'].includes(agent.id),
    )

    expect(tagging).toHaveLength(2)
    for (const agent of tagging) {
      expect(agent.metric).toMatch(/\btag(?:s|ged)?\b/i)
    }
  })
})
