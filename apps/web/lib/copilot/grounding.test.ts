/**
 * The corpus is the website bot's whole world, so these are the tests that
 * decide whether it can be honest (spec 18 §8).
 *
 * Three of them are the ones worth having:
 *
 * 1. **It clears Haiku 4.5's cache minimum.** 18 §5: below 4096 tokens
 *    "caching silently does nothing — no error, just a bill". There is no
 *    failure mode to watch for, so a test is the only thing that catches it.
 * 2. **Every citation points at a page we actually serve.** §9.3's warning is
 *    that the bot will "answer from a site that no longer exists"; a route
 *    checked against the filesystem turns that into a failing build.
 * 3. **No sample figure is in it.** The fictional week on `/` is labelled
 *    where it renders and would stop being labelled the moment a bot quoted
 *    it. Non-negotiable 7.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { FAQ_ENTRIES, faqAnswerText } from '../../components/marketing/faq-text'
import { PROOF_CARDS } from '../../components/marketing/home-content'
import { findBannedClaims } from '../copy/banned-phrases'

import {
  HAIKU_CACHE_MINIMUM_TOKENS,
  SITE_CORPUS,
  SITE_CORPUS_TEXT,
  STUDIO_FACTS,
  buildSiteCorpus,
  buildStudioFacts,
  corpusFloorTokens,
  measureCorpus,
  renderCorpusSection,
} from './grounding'

const MARKETING_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../app/(marketing)',
)

/** Does this public route have a page on disk. */
function routeExists(route: string): boolean {
  const relative = route === '/' ? 'page.tsx' : path.join(route.slice(1), 'page.tsx')
  return existsSync(path.join(MARKETING_ROOT, relative))
}

describe('the website corpus', () => {
  test('is built from more than one section, so a pass means something', () => {
    // A corpus that silently built nothing would clear every other assertion
    // below by being empty. Same failure shape as D52's eighth goal-picker
    // test and D55's wrong theme key: a check that tests nothing passes
    // exactly like a check that tests something.
    expect(SITE_CORPUS.length).toBeGreaterThan(5)
    expect(SITE_CORPUS_TEXT.length).toBeGreaterThan(5_000)
  })

  test('has the characters the floor needs, with the margin written down', () => {
    // 4096 tokens at the pessimistic 6 characters per token is 24,576
    // characters: below that, the floor can no longer prove the corpus
    // caches and the test above stops being able to pass without a key.
    //
    // It stands at 27,481 as this ships — about 12% clear of the threshold,
    // and roughly 6,900 tokens at the ~4 characters per token English prose
    // actually costs. That margin is thin enough to be worth an assertion of
    // its own: deleting a section is the easy way to walk the corpus under
    // the cache minimum, and the symptom would be a larger bill and nothing
    // else. A failure here means content was removed, not that the check is
    // wrong — put the facts back, or grow the corpus elsewhere first.
    const floorThresholdChars = HAIKU_CACHE_MINIMUM_TOKENS * 6

    expect(
      SITE_CORPUS_TEXT.length,
      `the corpus is ${SITE_CORPUS_TEXT.length} characters and needs ${floorThresholdChars}`,
    ).toBeGreaterThanOrEqual(floorThresholdChars)
  })

  test('clears Haiku 4.5’s 4096-token cache minimum', async () => {
    // No ANTHROPIC_API_KEY in this suite, so there is no real count to take —
    // `measureCorpus` falls back to a floor that the real number is
    // guaranteed to exceed (6 characters per token is pessimistic for English
    // prose, which tokenises at roughly 4). The floor clearing 4096 is
    // therefore proof the corpus does, in the only direction that is safe to
    // be wrong in.
    //
    // 18 §5 asks for a real `messages.countTokens`, and that is what runs the
    // moment a key exists: the live assertion is the one in the next test,
    // and /api/copilot/status takes the same measurement on request. Until
    // then this is the honest status, and it is written up in the handoff
    // rather than left looking verified.
    const measurement = await measureCorpus()

    expect(measurement.tokens, 'no key in this suite, so no real count').toBeNull()
    expect(measurement.floorTokens, measurement.reason).toBeGreaterThanOrEqual(
      HAIKU_CACHE_MINIMUM_TOKENS,
    )
    expect(measurement.cachesOnHaiku).toBe(true)
  })

  test('takes a real token count when one is offered, and believes it over the floor', async () => {
    // The live path, exercised with a stub counter so it is covered without a
    // key. A corpus that the real count puts under the minimum must report
    // `cachesOnHaiku: false` even though the floor says otherwise — the real
    // number wins, which is the whole point of §5 refusing a character
    // estimate.
    const underneath = await measureCorpus(async () => HAIKU_CACHE_MINIMUM_TOKENS - 1)
    expect(underneath.tokens).toBe(HAIKU_CACHE_MINIMUM_TOKENS - 1)
    expect(underneath.cachesOnHaiku).toBe(false)
    expect(underneath.reason).toContain('silently do nothing')

    const over = await measureCorpus(async () => HAIKU_CACHE_MINIMUM_TOKENS + 1)
    expect(over.cachesOnHaiku).toBe(true)
  })

  test('is byte-identical every time it is built', () => {
    // The corpus is the cached prefix. One character of drift between two
    // requests and `cache_read_input_tokens` goes to zero for every visitor,
    // with no error anywhere — 18 §6. Nothing in it may read the clock or a
    // counter, and this is what holds that.
    const first = buildSiteCorpus().map(renderCorpusSection).join('\n\n')
    const second = buildSiteCorpus().map(renderCorpusSection).join('\n\n')

    expect(first).toBe(second)
    expect(first).toBe(SITE_CORPUS_TEXT)
  })

  test('every section cites a public page that exists on disk', () => {
    const missing = SITE_CORPUS.filter((section) => !routeExists(section.route)).map(
      (section) => `${section.id} -> ${section.route}`,
    )

    expect(missing, `cited routes with no page: ${missing.join(', ')}`).toEqual([])
  })

  test('every section has a heading and a body worth retrieving', () => {
    for (const section of SITE_CORPUS) {
      expect(section.heading.length, section.id).toBeGreaterThan(5)
      expect(section.body.length, section.id).toBeGreaterThan(80)
    }
  })

  test('section ids are unique, so a citation names one thing', () => {
    const ids = SITE_CORPUS.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('contains no sample figure from the fictional demo week', () => {
    // PROOF_CARDS is one invented client's week. It is labelled on the page
    // and the label does not survive being quoted, so a bot that could read
    // these numbers could state an invented customer result — non-negotiable
    // 7, and the thing 18 §3.2's second refusal exists to prevent.
    const leaked = PROOF_CARDS.filter(
      (card) => SITE_CORPUS_TEXT.includes(card.story) || SITE_CORPUS_TEXT.includes(card.label),
    ).map((card) => card.label)

    expect(leaked, `sample figures in the corpus: ${leaked.join(', ')}`).toEqual([])
  })

  test('makes no claim the site itself is not allowed to make', () => {
    // The banned-phrase sweep reads our source files. The corpus is assembled
    // at runtime from several of them, so it needs its own pass: a sentence
    // that is fine in two halves could be a guarantee once joined.
    const findings = findBannedClaims(SITE_CORPUS_TEXT)

    expect(
      findings,
      findings.map((finding) => `[${finding.id}] ${finding.why}\n  …${finding.context}…`).join('\n'),
    ).toEqual([])
  })

  test('carries the plans, the agents and the FAQ, because those are what people ask', () => {
    // 18 §3.1 names the corpus as `09_SERVICES`, the pricing tiers and the
    // FAQ. These assertions are the "a question answerable from 09_SERVICES
    // is answered" test's precondition: if the facts are not in the corpus,
    // no amount of prompting puts them in an answer.
    expect(SITE_CORPUS_TEXT).toContain('$1,500')
    expect(SITE_CORPUS_TEXT).toContain('Trend Scout')
    expect(SITE_CORPUS_TEXT).toContain('Do you post for me?')
  })

  test('quotes the FAQ with its machine figures inline', () => {
    // The run model in faq-text.ts splits "under our 30% similarity limit"
    // into three runs so the page can set the figure in mono. Flattened for
    // the corpus it has to read as one sentence again, or the bot quotes a
    // rule with the number missing.
    const copyright = FAQ_ENTRIES.find((entry) => entry.id === 'copyright')
    expect(copyright).toBeDefined()
    expect(faqAnswerText(copyright!)).toContain('under our 30% similarity limit')
  })

  test('quotes the /resources library but none of its articles', () => {
    // The distinction is the point. D53's standard for an article is "useful
    // without us", and a test asserts none of them names the product: they
    // are general advice, so a grounded bot quoting one would be doing the
    // "generally, companies like this…" that 18 §3.1 rules out.
    //
    // The library on the page itself is the opposite case. The glossary
    // defines the words our own KPIs use, and the templates are printed in
    // full precisely so nothing is withheld — a bot holding them back would
    // reintroduce the gate that page refuses to have.
    const articleSections = SITE_CORPUS.filter((section) =>
      /^\/resources\/.+/.test(section.route),
    )
    expect(articleSections.map((section) => section.route)).toEqual([])

    expect(SITE_CORPUS.some((section) => section.route === '/resources')).toBe(true)
  })
})

describe('the studio facts', () => {
  test('exist, and every one could be turned into a chip', () => {
    // 18 §2.2: a factual sentence carries the thing it came from. A fact with
    // no label, no source or no screen could not be cited, and an uncitable
    // claim is indistinguishable from an invented one.
    expect(STUDIO_FACTS.length).toBeGreaterThan(5)

    for (const fact of STUDIO_FACTS) {
      expect(fact.label.length, fact.id).toBeGreaterThan(2)
      expect(fact.value.length, fact.id).toBeGreaterThan(10)
      expect(fact.source.length, fact.id).toBeGreaterThan(2)
      expect(fact.href.startsWith('/app/'), `${fact.id} -> ${fact.href}`).toBe(true)
    }
  })

  test('name real KPIs, so a chip can name the KPI it came from', () => {
    // The §8 test "a studio answer about a KPI carries a chip naming that
    // KPI" needs a KPI name to be nameable. C3 renders the chip; this is the
    // half C1 owns.
    const labels = STUDIO_FACTS.map((fact) => fact.label)
    expect(labels).toContain('Posts published')
  })

  test('say “not connected” rather than zero where nothing was measured', () => {
    // The dashboard's own rule, from the FAQ: "It never shows a zero, because
    // a zero is a claim about a number nobody measured." A co-pilot reading
    // these rows has to inherit it.
    const notConnected = STUDIO_FACTS.filter((fact) => fact.value.includes('Not connected'))

    expect(notConnected.length).toBeGreaterThan(0)
    for (const fact of notConnected) {
      expect(fact.value).toContain('nobody measured it')
    }
  })

  test('are stable between builds', () => {
    expect(buildStudioFacts()).toEqual(buildStudioFacts())
  })

  test('fact ids are unique', () => {
    const ids = STUDIO_FACTS.map((fact) => fact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('the floor used when there is no key', () => {
  test('is a lower bound, not an estimate', () => {
    // 6 characters per token is pessimistic for English; the real count is
    // always higher. If someone "improves" this to 4 to make the margin look
    // better, the floor stops being a floor and the guarantee is gone.
    expect(corpusFloorTokens('a'.repeat(600))).toBe(100)
    expect(corpusFloorTokens('')).toBe(0)
  })
})
