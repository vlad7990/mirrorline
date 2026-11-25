/**
 * The gate that stands between a prompt and a provider.
 *
 * This is the piece of V4 with no provider to blame. If xAI's moderation lets
 * something through, these rules are the only thing that stopped it, so they
 * are tested as rules rather than as a filter that mostly works.
 *
 * The three they implement are not ours to soften:
 * - **non-negotiable 5** — no likeness without a stored consent record, and we
 *   hold none;
 * - **non-negotiable 7** — no claims we cannot stand behind;
 * - trademark, which is nobody's non-negotiable and is still the thing that
 *   gets a client's account a letter.
 */

import { describe, expect, test } from 'vitest'

import { MAX_PROMPT_CHARS, scenePrompt, screenPrompt, type SafetyVerdict } from './safety'
import type { BrandKit, GenerationRequest } from './types'

const BRAND: BrandKit = {
  brandName: 'Pawsitive Steps',
  look: 'muted sage and warm cream, soft morning light',
  captionStyle: 'bold lower-third',
  avoid: ['choke chains'],
}

/** A scene that is exactly what this product is for. */
const GOOD = 'A quiet kitchen at dawn, a dog bowl on the tiles, steam from a kettle'

function refusal(verdict: SafetyVerdict): {
  rule: string
  reason: string
  message: string
} {
  if (verdict.allowed) throw new Error('expected a refusal, got an allowance')
  return { rule: verdict.rule, reason: verdict.reason, message: verdict.message }
}

describe('screenPrompt allows the scenes the product is for', () => {
  test('allows a plain B-roll scene with no people and no marks in it', () => {
    expect(screenPrompt(GOOD, BRAND).allowed).toBe(true)
  })

  test.each([
    ['hands', 'Close-up of hands clipping a lead onto a collar'],
    ['a silhouette', 'A silhouette of a person and a dog on a hill at sunset'],
    ['a crowd at distance', 'A busy park from far away, people and dogs as small shapes'],
    ['an object', 'A worn tennis ball on wet grass, shallow depth of field'],
    ['a texture', 'Slow pan across a knitted blanket in warm cream'],
  ])('allows %s, which is the allowed subset of people-adjacent B-roll', (_label, prompt) => {
    expect(screenPrompt(prompt, BRAND).allowed).toBe(true)
  })

  test('allows the client’s own brand name, because they are the one party entitled to appear', () => {
    // Arrange: the same sentence that would be refused for anybody else's mark.
    const prompt = 'A Pawsitive Steps tote bag on a bench in soft morning light'

    // Act + Assert
    expect(screenPrompt(prompt, BRAND).allowed).toBe(true)
  })

  test('allows an apple, because the fruit is a legitimate thing to film', () => {
    // The deny-list deliberately omits single common words that happen to be
    // marks. A filter that refused "a sliced apple on a board" would be wrong
    // about the sentence and would teach the script agent to avoid ordinary
    // nouns, which is a worse outcome than the risk it removes.
    expect(screenPrompt('A sliced apple on a wooden board', BRAND).allowed).toBe(true)
  })
})

describe('screenPrompt refuses a real person', () => {
  test.each([
    ['a named public figure', 'Taylor Swift walking a golden retriever down a street'],
    ['a likeness request', 'A trainer who looks like Elon Musk, in a park'],
    ['the word deepfake', 'A deepfake of a vet explaining hip dysplasia'],
    ['a lookalike', 'A Zendaya lookalike holding a puppy'],
    ['a title-led name', 'President Vance throwing a ball for a dog'],
    ['style-of a person', 'A portrait in the style of Annie Leibovitz'],
  ])('refuses %s', (_label, prompt) => {
    const { rule } = refusal(screenPrompt(prompt, BRAND))
    expect(rule).toBe('named-person')
  })
})

describe('screenPrompt refuses an identifiable person, consent record or not', () => {
  test.each([
    ['a talking head', 'A talking head explaining crate training'],
    ['speaking to camera', 'A woman speaking to camera about puppy classes'],
    ['a spokesperson', 'A friendly spokesperson introducing the service'],
    ['lip-sync', 'A dog owner, lip-synced to the voice-over'],
    ['a recognisable face', 'Close-up on a recognisable face, smiling'],
  ])('refuses %s', (_label, prompt) => {
    const { rule } = refusal(screenPrompt(prompt, BRAND))
    expect(rule).toBe('identifiable-person')
  })

  test('the message says what to film instead, rather than only what is banned', () => {
    // A refusal that does not say what would work is a dead end, and the
    // client already has `VideoIdea.footage` telling them what to shoot.
    const { message } = refusal(screenPrompt('A talking head about crate training', BRAND))
    expect(message.toLowerCase()).toMatch(/hands|silhouette|film|object/)
  })
})

describe('screenPrompt refuses somebody else’s mark', () => {
  test.each([
    ['a competitor mark', 'A Starbucks cup on the table beside the dog bed'],
    ['a logo request', 'The brand logo embroidered on a cap'],
    ['a trademark', 'A trademarked pattern across the blanket'],
    ['wearing a brand', 'A trainer wearing Nike, kneeling on the grass'],
  ])('refuses %s', (_label, prompt) => {
    const { rule } = refusal(screenPrompt(prompt, BRAND))
    expect(rule).toBe('brand-or-logo')
  })
})

describe('screenPrompt applies the claim rules we already had', () => {
  test('refuses a prompt that would render a banned claim as on-screen text', () => {
    // `lib/copy/banned-phrases.ts` already guards published copy. A scene that
    // burns the claim into the picture would route around it, so the prompt
    // goes through the same sweep rather than through a second opinion.
    const { rule } = refusal(
      screenPrompt('Text on screen reading “go viral with these three tips”', BRAND),
    )
    expect(rule).toBe('banned-claim')
  })
})

describe('screenPrompt refuses the degenerate inputs', () => {
  test('refuses an empty prompt', () => {
    expect(refusal(screenPrompt('', BRAND)).rule).toBe('empty')
  })

  test('refuses a whitespace-only prompt, which is the same thing wearing a hat', () => {
    expect(refusal(screenPrompt('   \n\t ', BRAND)).rule).toBe('empty')
  })

  test('refuses a prompt past the length ceiling', () => {
    const tooLong = `${GOOD} ${'and more detail '.repeat(MAX_PROMPT_CHARS)}`
    expect(refusal(screenPrompt(tooLong, BRAND)).rule).toBe('too-long')
  })
})

describe('a refusal is logged without the prompt in it', () => {
  // `agent_runs.reason` carries the words a person reads in the log, and its
  // own comment is explicit: "**Never the prompt and never the question**…
  // 'cap reached' belongs here; the client's text does not." A reason that
  // quoted the sentence would put client text next to a workspace id, which is
  // the one thing 18 §3.3 forbids.
  test.each([
    ['a named person', 'Taylor Swift walking a golden retriever down a street'],
    ['a mark', 'A Starbucks cup on the table beside the dog bed'],
    ['a talking head', 'A woman speaking to camera about puppy classes'],
  ])('the reason for %s names the rule, never the sentence', (_label, prompt) => {
    const { reason } = refusal(screenPrompt(prompt, BRAND))

    // Not a substring of the prompt, and not the distinctive words from it.
    expect(reason).not.toContain(prompt)
    for (const word of prompt.split(/\s+/).filter((entry) => entry.length > 6)) {
      expect(reason.toLowerCase(), `reason leaked “${word}”`).not.toContain(word.toLowerCase())
    }
  })

  test('the message may quote what matched, because the client wrote it and is reading it', () => {
    // The opposite rule to the one above, and the distinction is the audience.
    // The client needs to know which words to change; the log does not.
    const { message } = refusal(
      screenPrompt('A Starbucks cup on the table beside the dog bed', BRAND),
    )
    expect(message.toLowerCase()).toContain('starbucks')
  })
})

describe('scenePrompt frames the request as an allow-list', () => {
  const request: GenerationRequest = {
    workspaceId: 'ws-1',
    beat: { ideaTitle: 'Three leash mistakes', label: 'Setup' },
    prompt: GOOD,
    brand: BRAND,
    kind: 'clip',
    aspectRatio: '9:16',
    seconds: 5,
    resolution: '720p',
  }

  test('carries the scene through', () => {
    expect(scenePrompt(request)).toContain(GOOD)
  })

  test('tells the model what it may not produce, as well as our filter refusing it', () => {
    // "A prompt is a request; a check is a rule" (`video-idea.ts`). The rule is
    // `screenPrompt`; this is the request, and it exists because a draft that
    // passes first time is cheaper than one the provider refuses.
    const framed = scenePrompt(request).toLowerCase()
    expect(framed).toContain('no identifiable faces')
    expect(framed).toContain('no logos')
    expect(framed).toContain('no on-screen text')
  })

  test('carries the client’s look and their avoid list', () => {
    const framed = scenePrompt(request)
    expect(framed).toContain('muted sage and warm cream')
    expect(framed).toContain('choke chains')
  })

  test('says nothing about a brand when the kit is empty, rather than saying “null”', () => {
    const bare: GenerationRequest = {
      ...request,
      brand: { brandName: null, look: null, captionStyle: null, avoid: [] },
    }

    const framed = scenePrompt(bare)
    expect(framed).not.toContain('null')
    expect(framed).not.toContain('undefined')
    expect(framed).toContain(GOOD)
  })
})
