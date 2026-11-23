/**
 * The two rules `BACKEND_PHASE §V2` says the agent is done when it obeys.
 *
 * > "a script generated from a recipe shares the recipe's beat structure and
 * > **no sentence** with the source example, and a script with no business
 * > fact is rejected rather than shipped."
 *
 * Both are checked in code rather than asked for in a prompt, so both are
 * testable without a model — which is the point of putting them in a pure
 * module. A test that needed an API call would not run in CI, and a rule that
 * only runs sometimes is not a rule.
 */

import { describe, expect, test } from 'vitest'

import {
  factIsGrounded,
  parseVideoIdea,
  screenIdeas,
  sharedSentence,
  type VideoIdea,
} from './video-idea'

/** A clean idea. Each test below breaks exactly one thing about it. */
const IDEA: VideoIdea = {
  title: 'The question every owner asks me first',
  formatName: 'Myth vs fact',
  hook: 'Everyone asks me whether their dog will grow out of this.',
  beats: [
    { label: 'Hook', text: 'Ask the question back, in the words owners use.' },
    { label: 'Setup', text: 'Explain why waiting usually makes it worse.' },
    { label: 'Payoff', text: 'Give the first thing to change today.' },
    { label: 'Call to action', text: 'Point at the reactive dog intensive.' },
  ],
  footage: ['You to camera in the park, lead in shot'],
  fact: 'Reactive dog intensive, $450 for 4 sessions',
}

const FACTS = [
  'Miami',
  'positive reinforcement only',
  'Reactive dog intensive',
  '$450 for 4 sessions',
]

const SOURCE = [
  'The myth is on screen as text before the first word is spoken.',
  'Hook: show the problem in the first second',
]

describe('a script shares the structure and not the sentences', () => {
  test('a clean idea passes', () => {
    expect(sharedSentence(IDEA, SOURCE)).toBeNull()
  })

  test('a sentence lifted from a source example is caught, and named', () => {
    const copied: VideoIdea = {
      ...IDEA,
      beats: [
        ...IDEA.beats.slice(0, 3),
        // Verbatim from the research. The exact failure §V3 exists for.
        {
          label: 'Call to action',
          text: 'The myth is on screen as text before the first word is spoken.',
        },
      ],
    }

    expect(sharedSentence(copied, SOURCE)).toBe(
      'the myth is on screen as text before the first word is spoken',
    )
  })

  test('catches it through punctuation and capitals', () => {
    // Real copying is not byte-identical: it is the same sentence with a comma
    // moved and a capital changed, which a strict comparison misses.
    const copied: VideoIdea = {
      ...IDEA,
      hook: 'The myth is on screen, as text, before the first word is spoken!',
    }

    expect(sharedSentence(copied, SOURCE)).not.toBeNull()
  })

  test('a shared short phrase is not copying', () => {
    // "in the first second" appears in half the research in any niche. A check
    // that fired on four words would reject every honest draft.
    const idea: VideoIdea = { ...IDEA, hook: 'Say it in the first second.' }

    expect(sharedSentence(idea, SOURCE)).toBeNull()
  })

  // The two tests that used to sit here — "sentences shorter than five words
  // are not compared at all" and "normalising is case, punctuation and
  // whitespace, nothing cleverer" — moved with the functions they described,
  // to `../originality/similarity.test.ts` (D126). They are the measuring
  // stick's behaviour rather than this gate's, and V3 needs the same stick.
})

describe('a script with no business fact is rejected rather than shipped', () => {
  test('a fact quoted from the profile is grounded', () => {
    expect(factIsGrounded('Reactive dog intensive, $450 for 4 sessions', FACTS)).toBe(true)
  })

  test('a fact the profile states in fewer words is grounded', () => {
    // The profile says "Miami"; the script says "based in Miami". Same fact.
    expect(factIsGrounded('based in Miami', FACTS)).toBe(true)
  })

  test('an invented fact is refused', () => {
    // The plausible, unverifiable sentence a client would then be quoted on.
    expect(factIsGrounded('she has trained over 500 dogs', FACTS)).toBe(false)
  })

  test('an empty fact is refused', () => {
    expect(factIsGrounded('   ', FACTS)).toBe(false)
  })

  test('with no profile, nothing is grounded', () => {
    expect(factIsGrounded('Miami', [])).toBe(false)
  })
})

describe('the gate keeps what passes and names what it refused', () => {
  test('keeps a clean idea', () => {
    const screened = screenIdeas({ ideas: [IDEA], sourceTexts: SOURCE, facts: FACTS })

    expect(screened.kept).toHaveLength(1)
    expect(screened.rejected).toEqual([])
  })

  test('refuses a copied idea and says which sentence', () => {
    const copied: VideoIdea = { ...IDEA, hook: SOURCE[0] as string }
    const screened = screenIdeas({ ideas: [copied], sourceTexts: SOURCE, facts: FACTS })

    expect(screened.kept).toEqual([])
    expect(screened.rejected[0]?.reason).toContain('shares a sentence')
  })

  test('refuses an idea whose fact is not the client’s', () => {
    const invented: VideoIdea = { ...IDEA, fact: 'Trusted by 500 owners' }
    const screened = screenIdeas({ ideas: [invented], sourceTexts: SOURCE, facts: FACTS })

    expect(screened.kept).toEqual([])
    expect(screened.rejected[0]?.reason).toContain('not in the client')
  })

  test('one bad idea does not take the good ones with it', () => {
    const invented: VideoIdea = { ...IDEA, title: 'Invented', fact: 'Trusted by 500 owners' }
    const screened = screenIdeas({ ideas: [IDEA, invented], sourceTexts: SOURCE, facts: FACTS })

    expect(screened.kept).toHaveLength(1)
    expect(screened.rejected).toHaveLength(1)
  })
})

describe('what the parser refuses to call an idea', () => {
  test('an idea with fewer than three beats is not a recipe', () => {
    expect(parseVideoIdea({ ...IDEA, beats: IDEA.beats.slice(0, 2) })).toBeNull()
  })

  test('an idea with no fact is refused at the door', () => {
    const withoutFact: Record<string, unknown> = { ...IDEA }
    delete withoutFact.fact

    expect(parseVideoIdea(withoutFact)).toBeNull()
  })

  test('accepts snake_case, because a model returns either', () => {
    const parsed = parseVideoIdea({ ...IDEA, formatName: undefined, format_name: 'Myth vs fact' })

    expect(parsed?.formatName).toBe('Myth vs fact')
  })
})
