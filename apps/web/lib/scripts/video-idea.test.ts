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

import type { ComparisonCorpus } from '../originality/gate'

import {
  factIsGrounded,
  ideaDraft,
  parseVideoIdea,
  screenIdeas,
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
  // Not checked yet. `screenIdeas` is what fills this in.
  originality: null,
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

/**
 * The same sources, in V3's labelled shape (D126).
 *
 * The second corpus is empty on purpose and mirrors production: we do not hold
 * the client's own posts, so the gate reports it as not compared rather than
 * passing it silently.
 */
const CORPORA: readonly ComparisonCorpus[] = [
  { label: 'the research in your niche report', texts: SOURCE },
  { label: 'your own last 90 posts', texts: [] },
]

describe('a script shares the structure and not the sentences', () => {
  // These used to call `sharedSentence`, which V3's gate subsumed (D126). They
  // now go through `screenIdeas` — the gate's real entry point — so §V2's
  // done-when is still proved, and proved at the level that actually runs.
  // The measuring stick's own behaviour moved to
  // `../originality/similarity.test.ts`, and the outcome vocabulary to
  // `../originality/gate.test.ts`.

  test('a clean idea passes', () => {
    // Act
    const screened = screenIdeas({ ideas: [IDEA], corpora: CORPORA, facts: FACTS })

    // Assert
    expect(screened.rejected).toEqual([])
    expect(screened.kept).toHaveLength(1)
  })

  test('a sentence lifted from a source example is caught, and named', () => {
    // Arrange: verbatim from the research. The exact failure §V3 exists for.
    const copied: VideoIdea = {
      ...IDEA,
      beats: [
        ...IDEA.beats.slice(0, 3),
        {
          label: 'Call to action',
          text: 'The myth is on screen as text before the first word is spoken.',
        },
      ],
    }

    // Act
    const screened = screenIdeas({ ideas: [copied], corpora: CORPORA, facts: FACTS })

    // Assert: the line itself, in the draft's own wording, so a writer can
    // search for it.
    expect(screened.kept).toEqual([])
    expect(screened.rejected[0]?.reason).toContain(
      'The myth is on screen as text before the first word is spoken.',
    )
  })

  test('catches it through punctuation and capitals', () => {
    // Arrange: real copying is not byte-identical. It is the same sentence
    // with a comma moved and a capital changed, which a strict comparison
    // misses.
    const copied: VideoIdea = {
      ...IDEA,
      hook: 'The myth is on screen, as text, before the first word is spoken!',
    }

    // Act
    const screened = screenIdeas({ ideas: [copied], corpora: CORPORA, facts: FACTS })

    // Assert
    expect(screened.kept).toEqual([])
  })

  test('a shared short phrase is not copying', () => {
    // Arrange: "in the first second" appears in half the research in any
    // niche. A check that fired on four words would reject every honest draft.
    const idea: VideoIdea = { ...IDEA, hook: 'Say it in the first second.' }

    // Act
    const screened = screenIdeas({ ideas: [idea], corpora: CORPORA, facts: FACTS })

    // Assert
    expect(screened.kept).toHaveLength(1)
  })

  test('the beat labels are not part of what is compared', () => {
    // Arrange: the recipe's beats are what §V2 says to take. If `ideaDraft`
    // ever started including the labels, a remake would be marked down for
    // doing its job — so this asserts the exclusion directly rather than
    // trusting the comment.
    const draft = ideaDraft(IDEA)

    // Assert
    expect(draft).toContain('Ask the question back, in the words owners use.')
    expect(draft).not.toContain('Hook')
    expect(draft).not.toContain('Call to action')
  })
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
    const screened = screenIdeas({ ideas: [IDEA], corpora: CORPORA, facts: FACTS })

    expect(screened.kept).toHaveLength(1)
    expect(screened.rejected).toEqual([])
  })

  test('a kept idea carries the verdict that cleared it', () => {
    // The number on the screen has to be the number the gate used (D126). If
    // the verdict were dropped here, the studio would have to compute its own
    // — and two computations can disagree.
    const screened = screenIdeas({ ideas: [IDEA], corpora: CORPORA, facts: FACTS })

    expect(screened.kept[0]?.originality?.outcome).toBe('passed')
    expect(screened.kept[0]?.originality?.limit).toBe(30)
    expect(screened.kept[0]?.originality?.comparedAgainst).toEqual([
      'the research in your niche report',
    ])
    // The half we cannot do is named rather than omitted.
    expect(screened.kept[0]?.originality?.notComparedAgainst).toEqual([
      'your own last 90 posts',
    ])
  })

  test('refuses a copied idea and says which sentence', () => {
    const copied: VideoIdea = { ...IDEA, hook: SOURCE[0] as string }
    const screened = screenIdeas({ ideas: [copied], corpora: CORPORA, facts: FACTS })

    expect(screened.kept).toEqual([])
    expect(screened.rejected[0]?.reason).toContain('word for word')
  })

  test('refuses an idea whose fact is not the client’s', () => {
    const invented: VideoIdea = { ...IDEA, fact: 'Trusted by 500 owners' }
    const screened = screenIdeas({ ideas: [invented], corpora: CORPORA, facts: FACTS })

    expect(screened.kept).toEqual([])
    expect(screened.rejected[0]?.reason).toContain('not in the client')
  })

  test('one bad idea does not take the good ones with it', () => {
    const invented: VideoIdea = { ...IDEA, title: 'Invented', fact: 'Trusted by 500 owners' }
    const screened = screenIdeas({ ideas: [IDEA, invented], corpora: CORPORA, facts: FACTS })

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
