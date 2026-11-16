/**
 * The adapter, with no key and with one (spec 18 §5, §7, §8).
 *
 * The headline test is §8's: **"No key = canned mode — with
 * `ANTHROPIC_API_KEY` unset: both surfaces answer, the sample label is
 * visible, and no network call is attempted."** The third clause is the one
 * worth building carefully. "Both surfaces answer" is easy to assert and
 * would pass even if the adapter were quietly calling out and falling back on
 * failure, which is exactly the bug that would empty a budget on a preview.
 * So `fetch` is replaced with a spy that throws, and the assertion is that it
 * was never reached.
 *
 * The request shapes are asserted directly rather than through a mock client.
 * Every one of 18 §0's four facts, plus the Haiku 4.5 effort rule the spec
 * does not mention, is a parameter that is present or absent — so the test
 * that would have caught each of them is a test about the object we build,
 * and it can run with no key at all.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  SITE_MAX_TOKENS,
  SITE_MODEL,
  SITE_SYSTEM,
  STUDIO_EFFORT,
  STUDIO_MAX_TOKENS,
  STUDIO_MODEL,
  STUDIO_SYSTEM,
  askCopilot,
  citationsFromText,
  SAMPLE_FLAG,
  copilotMode,
  corpusCacheVerdict,
  parseProposal,
  parseProposalMove,
  requestShapeFor,
  resetClient,
  resetCorpusVerdict,
  studioCitationsFromText,
  type CopilotEvent,
} from './adapter'
import { SAMPLE_NOTICE } from './canned'
import { SITE_CORPUS_TEXT } from './grounding'
import { resetLedgers, type EnvLike } from './spend'

const NO_KEY: EnvLike = {}
const WITH_KEY: EnvLike = { ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key' }

async function collect(generator: AsyncGenerator<CopilotEvent>): Promise<CopilotEvent[]> {
  const events: CopilotEvent[] = []
  for await (const event of generator) events.push(event)
  return events
}

beforeEach(() => {
  resetClient()
  resetCorpusVerdict()
  resetLedgers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('which mode we are in', () => {
  test('is sample with no key, and live with one', () => {
    expect(copilotMode(NO_KEY)).toBe('sample')
    expect(copilotMode(WITH_KEY)).toBe('live')
  })

  test('treats a blank or whitespace key as no key', () => {
    // An empty string in a `.env.local` is the normal way this goes wrong,
    // and the failure it would otherwise cause is a 401 on a visitor's
    // question rather than a labelled sample answer.
    expect(copilotMode({ ANTHROPIC_API_KEY: '' })).toBe('sample')
    expect(copilotMode({ ANTHROPIC_API_KEY: '   ' })).toBe('sample')
  })

  test('the dev pin beats a real key, which is the whole point of it', () => {
    // `pnpm dev` sets this. Without the assertion the pin is a convention,
    // and a convention is exactly what the dev server already had: it read
    // `.env.local` like any other Next process and answered from the live
    // model during a screenshot run.
    expect(copilotMode({ ...WITH_KEY, [SAMPLE_FLAG]: '1' })).toBe('sample')
  })

  test('only an exact "1" pins it, so a stray value cannot silently mute the model', () => {
    // The opposite failure, and the reason the check is `=== '1'` rather
    // than truthiness: a half-set flag that leaves a preview answering from
    // fixtures while reporting nothing unusual.
    expect(copilotMode({ ...WITH_KEY, [SAMPLE_FLAG]: '0' })).toBe('live')
    expect(copilotMode({ ...WITH_KEY, [SAMPLE_FLAG]: 'true' })).toBe('live')
    expect(copilotMode({ ...WITH_KEY, [SAMPLE_FLAG]: '' })).toBe('live')
  })
})

describe('no key is a supported mode', () => {
  test('both surfaces answer, labelled, and no network call is attempted', async () => {
    // The guard that makes this test worth having. If anything reached the
    // network, it would throw here and the failure would name the call.
    const fetchSpy = vi.fn(() => {
      throw new Error('a network call was attempted in sample mode')
    })
    vi.stubGlobal('fetch', fetchSpy)

    for (const surface of ['site', 'studio'] as const) {
      const events = await collect(
        askCopilot({
          surface,
          question: 'What does the Growth plan include?',
          workspaceId: 'test',
          env: NO_KEY,
        }),
      )

      const meta = events.find((event) => event.type === 'meta')
      expect(meta).toMatchObject({ mode: 'sample', notice: SAMPLE_NOTICE })

      const deltas = events.filter((event) => event.type === 'delta')
      expect(deltas.length, `${surface} produced no answer`).toBeGreaterThan(0)

      const done = events.find((event) => event.type === 'done')
      expect(done).toBeDefined()
      expect(done?.type === 'done' && done.answer.mode).toBe('sample')
      // Nothing was called, so there is no spend to report. "$0.00 of $20.00"
      // would imply a call that cost nothing rather than no call at all.
      expect(done?.type === 'done' && done.spendSummary).toBeNull()

      expect(events.some((event) => event.type === 'error')).toBe(false)
    }

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('the deltas reassemble into exactly the answer', async () => {
    // C2 and C3 build their text by concatenating deltas. If the chunking
    // dropped or duplicated a character the answer would still look roughly
    // right, which is the kind of wrong that survives review.
    const events = await collect(
      askCopilot({
        surface: 'site',
        question: 'Which platforms do you post to?',
        workspaceId: 'test',
        env: NO_KEY,
      }),
    )

    const streamed = events
      .filter((event): event is Extract<CopilotEvent, { type: 'delta' }> => event.type === 'delta')
      .map((event) => event.text)
      .join('')
    const done = events.find((event) => event.type === 'done')

    expect(done?.type === 'done' && done.answer.text).toBe(streamed)
  })

  test('measures the corpus without a key, and says it was not a real count', async () => {
    const verdict = await corpusCacheVerdict(NO_KEY)

    expect(verdict.tokens).toBeNull()
    expect(verdict.cachesOnHaiku).toBe(true)
    expect(verdict.reason).toContain('Unverified by a real count')
  })
})

describe('the request shapes (§5), where the defaults are the trap', () => {
  const site = requestShapeFor('site', 'What does Growth cost?')
  const studio = requestShapeFor('studio', 'How many posts published?')

  test('name the models that exist', () => {
    // §0: the brief said `claude-sonnet-5-5` and `claude-haiku-5-5`, neither
    // of which exists, and both of which would have 404ed at the first real
    // call. There is no Haiku 5.
    expect(site.model).toBe('claude-haiku-4-5')
    expect(studio.model).toBe('claude-sonnet-5')
    expect(SITE_MODEL).toBe(site.model)
    expect(STUDIO_MODEL).toBe(studio.model)
    expect(site.model).not.toMatch(/-\d{8}$/)
    expect(studio.model).not.toMatch(/-\d{8}$/)
  })

  test('send no sampling parameter and no thinking budget', () => {
    // All four are 400s on Sonnet 5 (§0.2, §0.3). Asserted as absent keys
    // rather than as undefined values, because an explicit `undefined` would
    // still be serialised by some clients.
    for (const shape of [site, studio]) {
      const keys = Object.keys(shape)
      expect(keys).not.toContain('temperature')
      expect(keys).not.toContain('top_p')
      expect(keys).not.toContain('top_k')
      expect(keys).not.toContain('thinking')
      expect(keys).not.toContain('budget_tokens')
    }
  })

  test('set effort on the studio request only, because Haiku 4.5 rejects it', () => {
    // Not in the spec, and it would have been a 400 at the first real call
    // exactly like the model ids were. `output_config.effort` is unsupported
    // on Haiku 4.5.
    expect(studio.effort).toBe(STUDIO_EFFORT)
    expect(studio.effort).toBe('medium')
    expect(site.effort).toBeUndefined()
  })

  test('size max_tokens for thinking plus the answer on Sonnet 5', () => {
    // §0.1: thinking is on by default and shares this budget, so a cap sized
    // for the answer alone truncates mid-sentence.
    expect(studio.maxTokens).toBe(STUDIO_MAX_TOKENS)
    expect(studio.maxTokens).toBeGreaterThanOrEqual(8_000)
    expect(site.maxTokens).toBe(SITE_MAX_TOKENS)
  })

  test('put the website corpus in the cached system block, and the question outside it', () => {
    // §5: "The corpus goes in the system block so it is the cached prefix and
    // the visitor's question is the only thing that changes."
    const block = site.system[0]
    expect(block?.cache_control).toEqual({ type: 'ephemeral' })
    expect(block?.text).toContain(SITE_SYSTEM)
    expect(block?.text).toContain(SITE_CORPUS_TEXT)
    expect(block?.text).not.toContain('What does Growth cost?')
  })

  test('keep the workspace’s rows out of the studio’s cached block', () => {
    // A prefix carrying one workspace's numbers caches nothing and needs one
    // cached prompt per workspace. The rows ride in the message instead.
    const block = studio.system[0]
    expect(block?.text).toBe(STUDIO_SYSTEM)
    expect(block?.cache_control).toEqual({ type: 'ephemeral' })

    const message = studio.messages[0]
    expect(typeof message?.content === 'string' && message.content).toContain('Posts published')
  })

  test('the website prefix is identical for two different questions', () => {
    // The thing §6 asks us to watch for, asserted at the point it is decided
    // rather than inferred later from a cache-read count of zero.
    const other = requestShapeFor('site', 'What about copyright?')
    expect(other.system[0]?.text).toBe(site.system[0]?.text)
  })

  test('the website system prompt states the four refusals', () => {
    for (const rule of [
      'Guarantees',
      'Client results',
      'Named competitors',
      'outside these pages',
    ]) {
      expect(SITE_SYSTEM).toContain(rule)
    }
  })

  test('the studio system prompt forbids acting and requires a cited row', () => {
    expect(STUDIO_SYSTEM).toMatch(/you may NOT do anything/i)
    expect(STUDIO_SYSTEM).toMatch(/cannot be tied to a supplied row, say you do not know/i)
    expect(STUDIO_SYSTEM).toMatch(/never report it as zero/i)
  })
})

describe('citations parsed out of a live answer', () => {
  test('keeps a route that exists in the corpus', () => {
    const citations = citationsFromText('The Growth plan is $1,500 a month. [source: /pricing]')
    expect(citations).toEqual([{ label: 'The plans and what they cost', href: '/pricing' }])
  })

  test('drops a route the model invented', () => {
    // A chip leading to a 404 is worse than no chip, and a model inventing a
    // plausible-looking route is the ordinary failure here rather than an
    // exotic one.
    expect(citationsFromText('We have an office. [source: /about-us]')).toEqual([])
  })

  test('does not repeat the same source twice', () => {
    const citations = citationsFromText('One [source: /pricing] and two [source: /pricing]')
    expect(citations.length).toBe(1)
  })

  test('matches a studio row by its label, and drops an unknown one', () => {
    expect(studioCitationsFromText('[Posts published] is the figure.')).toEqual([
      { label: 'Posts published', href: '/app/results' },
    ])
    expect(studioCitationsFromText('[Posts published next quarter] is the figure.')).toEqual([])
  })
})

describe('a proposal that came back from the model', () => {
  const valid = {
    kind: 'pause-account',
    summary: 'Pause posting on one account',
    detail: 'The Publisher stops posting there until you unpause it.',
    requiresApproval: true,
  }

  test('is accepted when it matches the schema exactly', () => {
    expect(parseProposal(valid)).toMatchObject({ kind: 'pause-account', requiresApproval: true })
  })

  test('is refused when it tries to approve itself', () => {
    // §2.3: "There is no auto-approve, no 'always allow', and no setting that
    // adds one." The type forbids writing one; this is what stops one
    // arriving as JSON, where types do not apply.
    expect(parseProposal({ ...valid, requiresApproval: false })).toBeNull()
    expect(parseProposal({ ...valid, requiresApproval: 'true' })).toBeNull()
    expect(parseProposal({ ...valid, requiresApproval: 1 })).toBeNull()

    // Absent entirely, which is the shape a model is most likely to produce.
    const without = Object.fromEntries(
      Object.entries(valid).filter(([field]) => field !== 'requiresApproval'),
    )
    expect(parseProposal(without)).toBeNull()
  })

  test('is refused when the action is not one of the three', () => {
    // §2.3 lists exactly three. A fourth arriving from a model is a model
    // inventing a capability, and it must not reach a card with a button.
    expect(parseProposal({ ...valid, kind: 'delete-account' })).toBeNull()
    expect(parseProposal({ ...valid, kind: 'post-now' })).toBeNull()
  })

  describe('the move-post payload, which is what makes Approve able to act', () => {
    const move = {
      postId: 'post-instagram-2026-11-19-0915',
      date: '2026-11-19',
      time24: '09:15',
      timeLabel: '9:15 am',
    }

    const movePost = {
      kind: 'move-post',
      summary: 'Move the Thursday post to Tuesday',
      detail: 'Same platform, same time of day; only the date changes.',
      requiresApproval: true,
      move,
    }

    test('is carried through when every field is the right shape', () => {
      expect(parseProposal(movePost)).toMatchObject({ kind: 'move-post', move })
    })

    test('a move-post with no payload is dropped, not shown', () => {
      // A card whose Approve button has nothing to perform is worse than no
      // card: it would read as an offer and do nothing, silently. §2.3
      // forbids reading the action out of `detail`, so there is no fallback.
      const without = Object.fromEntries(
        Object.entries(movePost).filter(([field]) => field !== 'move'),
      )
      expect(parseProposal(without)).toBeNull()
      expect(parseProposal({ ...movePost, move: null })).toBeNull()
      expect(parseProposal({ ...movePost, move: 'tuesday at nine' })).toBeNull()
    })

    test('a malformed date or time is refused rather than passed to the grid', () => {
      // These two end up in a cell of the calendar. A bad time sorts wrongly
      // inside a day and a bad date makes a column that does not exist, and
      // neither fails loudly — so they are checked for shape, not presence.
      expect(parseProposalMove({ ...move, date: '19/11/2026' })).toBeNull()
      expect(parseProposalMove({ ...move, date: '2026-11' })).toBeNull()
      expect(parseProposalMove({ ...move, time24: '9:15' })).toBeNull()
      expect(parseProposalMove({ ...move, time24: '25:00' })).toBeNull()
      expect(parseProposalMove({ ...move, time24: '09:75' })).toBeNull()
      expect(parseProposalMove({ ...move, postId: '  ' })).toBeNull()
      expect(parseProposalMove({ ...move, timeLabel: '' })).toBeNull()
    })

    test('the other two kinds carry no payload, and are still accepted', () => {
      // `swap-format` and `pause-account` have no screen that performs them.
      // They are proposals that explain rather than act, and requiring a
      // payload would delete them.
      expect(parseProposal(valid)?.move).toBeUndefined()
      expect(parseProposal({ ...valid, kind: 'swap-format' })).toMatchObject({
        kind: 'swap-format',
      })
    })
  })

  test('is refused when it is empty, malformed or not an object', () => {
    expect(parseProposal(null)).toBeNull()
    expect(parseProposal('pause-account')).toBeNull()
    expect(parseProposal({ ...valid, summary: '   ' })).toBeNull()
    expect(parseProposal({ ...valid, detail: '' })).toBeNull()
  })
})
