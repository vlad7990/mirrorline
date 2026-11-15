/**
 * What the visitor ends up looking at, tested without a browser.
 *
 * The panel is `.tsx` and unreachable from Vitest, so this is where the rules
 * about refusals, failures and partial text are actually held. The first
 * describe block is the one that matters: 18 §3.2 calls the refusals "the
 * product", and a reducer that filed them under errors would paint the best
 * answers on this surface red.
 */

import { describe, expect, test } from 'vitest'

import type { CopilotAnswer } from './canned'
import type { CopilotEvent } from './events'
import { applyEvent, applyEvents, failExchange, startExchange } from './transcript'

function answer(parts: Partial<CopilotAnswer> = {}): CopilotAnswer {
  return {
    surface: 'site',
    mode: 'sample',
    text: 'The Growth plan includes twenty posts a month.',
    citations: [{ label: 'Plans', href: '/pricing' }],
    proposals: [],
    refusal: null,
    handoff: null,
    ...parts,
  }
}

function done(parts: Partial<CopilotAnswer> = {}): CopilotEvent {
  return {
    type: 'done',
    answer: answer(parts),
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
    spendSummary: null,
  }
}

const GROWTH = startExchange('e1', 'What does the Growth plan include?')

describe('a refusal is an answer', () => {
  test('a guarantee refusal finishes as answered, with its handoff', () => {
    const refused = applyEvents(startExchange('e2', 'Will I get 10,000 followers?'), [
      { type: 'meta', mode: 'sample', notice: 'Sample answer.' },
      done({
        text: 'No guarantee is given. What we report instead is in the Results Ledger.',
        refusal: 'guarantee',
        handoff: { label: 'Talk to a person', href: '/niche-scan' },
      }),
    ])

    expect(refused.status).toBe('answered')
    expect(refused.error).toBeNull()
    expect(refused.refusal).toBe('guarantee')
    expect(refused.handoff).toEqual({ label: 'Talk to a person', href: '/niche-scan' })
  })

  test('“I don’t know, here is a person” is a success state too', () => {
    const outside = applyEvent(
      startExchange('e3', 'Do you do podcast cover art?'),
      done({
        text: 'That is not something I can answer from our pages.',
        citations: [],
        refusal: 'outside-corpus',
        handoff: { label: 'Talk to a person', href: '/niche-scan' },
      }),
    )

    expect(outside.status).toBe('answered')
    expect(outside.error).toBeNull()
  })

  test('only an error event fails the exchange', () => {
    const failed = applyEvent(GROWTH, {
      type: 'error',
      kind: 'rate-limited',
      message: 'Too many questions in a short space of time.',
    })

    expect(failed.status).toBe('failed')
    expect(failed.error).toEqual({
      kind: 'rate-limited',
      message: 'Too many questions in a short space of time.',
    })
  })
})

describe('the text on screen', () => {
  test('deltas accumulate in order while the answer streams', () => {
    const streaming = applyEvents(GROWTH, [
      { type: 'delta', text: 'The Growth plan ' },
      { type: 'delta', text: 'includes twenty posts.' },
    ])

    expect(streaming.text).toBe('The Growth plan includes twenty posts.')
    expect(streaming.status).toBe('streaming')
  })

  test('done replaces the streamed text rather than appending to it', () => {
    // A duplicated or dropped chunk must not be able to leave half a
    // sentence, or two of one, on screen.
    const finished = applyEvents(GROWTH, [
      { type: 'delta', text: 'The Growth pl' },
      { type: 'delta', text: 'The Growth pl' },
      done({ text: 'The Growth plan includes twenty posts a month.' }),
    ])

    expect(finished.text).toBe('The Growth plan includes twenty posts a month.')
  })

  test('the mode comes from the stream and is never invented', () => {
    const labelled = applyEvent(GROWTH, {
      type: 'meta',
      mode: 'sample',
      notice: 'Sample answer.',
    })

    expect(labelled.mode).toBe('sample')
    expect(labelled.notice).toBe('Sample answer.')
    // Nothing has said which mode this is yet, so nothing claims to know.
    expect(GROWTH.mode).toBeNull()
  })
})

describe('citations', () => {
  test('are collected from the stream and merged with the ones done repeats', () => {
    const cited = applyEvents(GROWTH, [
      { type: 'citation', citation: { label: 'Plans', href: '/pricing' } },
      done({
        citations: [
          { label: 'Plans', href: '/pricing' },
          { label: 'What the words mean', href: '/resources' },
        ],
      }),
    ])

    expect(cited.citations).toEqual([
      { label: 'Plans', href: '/pricing' },
      { label: 'What the words mean', href: '/resources' },
    ])
  })

  test('the same destination twice is one chip', () => {
    const cited = applyEvents(GROWTH, [
      { type: 'citation', citation: { label: 'Plans', href: '/pricing' } },
      { type: 'citation', citation: { label: 'Plans', href: '/pricing' } },
    ])

    expect(cited.citations).toHaveLength(1)
  })
})

describe('what the website surface will not render', () => {
  test('a proposal is dropped, because this surface has no Approve button', () => {
    // 18 §1: the website co-pilot may answer, cite and hand off. A proposal
    // card with nothing behind it would be the auto-approve shape §2.3
    // forbids, drawn on a page that cannot execute anything.
    const withProposal = applyEvent(GROWTH, {
      type: 'proposal',
      proposal: {
        kind: 'move-post',
        summary: 'Move Thursday’s post to Tuesday',
        detail: 'The Thursday slot moves to Tuesday at 09:00.',
        requiresApproval: true,
      },
    })

    expect(withProposal).toEqual(GROWTH)
  })
})

describe('the exchange closes exactly once', () => {
  test('an event arriving after done is ignored', () => {
    const finished = applyEvent(GROWTH, done())
    const after = applyEvent(finished, { type: 'delta', text: ' and more' })

    expect(after).toBe(finished)
  })

  test('a late error cannot turn an answered exchange into a failure', () => {
    const finished = applyEvent(GROWTH, done())
    const after = applyEvent(finished, { type: 'error', kind: 'failed', message: 'Broken.' })

    expect(after.status).toBe('answered')
  })

  test('failExchange closes a stream that stopped without saying anything', () => {
    const abandoned = failExchange(GROWTH, { kind: 'failed', message: 'I could not reach it.' })

    expect(abandoned.status).toBe('failed')
    expect(abandoned.error?.message).toBe('I could not reach it.')
  })

  test('failExchange leaves a finished answer alone', () => {
    const finished = applyEvent(GROWTH, done())

    expect(failExchange(finished, { kind: 'failed', message: 'Broken.' })).toBe(finished)
  })
})

describe('nothing is mutated', () => {
  test('applying an event returns a new exchange and leaves the old one', () => {
    const next = applyEvent(GROWTH, { type: 'delta', text: 'hello' })

    expect(next).not.toBe(GROWTH)
    expect(GROWTH.text).toBe('')
    expect(GROWTH.status).toBe('streaming')
  })
})
