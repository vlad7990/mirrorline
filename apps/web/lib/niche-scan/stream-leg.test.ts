/**
 * The two budgets that cannot be checked by reading the constants (D138).
 *
 * A stall is "nothing has happened for ninety seconds", which no arithmetic over
 * `RESEARCH_STALL_MS` can demonstrate — the only way to know the watchdog fires,
 * and that it reports a stall rather than a timeout, is to run a stream that
 * goes quiet. The SDK stream is stubbed and the clock is faked, so this costs
 * milliseconds and no tokens.
 *
 * The second is the search ceiling being **global across attempts**. A stall
 * retry that counted from zero could run twice the searches the spend cap
 * projected, and the only thing preventing it is one number being passed in.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { streamLeg } from './stream-leg'

type Listener = (...args: readonly unknown[]) => void

/**
 * A stream that does only what `streamLeg` asks of it.
 *
 * `finalMessage()` never resolves on its own: every test here ends in an abort,
 * which is what the SDK does to a stream whose controller is aborted.
 */
function stubStream() {
  const listeners = new Map<string, Listener[]>()
  let abort: (error: unknown) => void = () => {}
  const final = new Promise<never>((_resolve, reject) => {
    abort = reject
  })

  return {
    on(event: string, listener: Listener) {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
      return this
    },
    abort() {
      abort(new Error('aborted'))
    },
    finalMessage() {
      return final
    },
    emit(event: string, ...args: readonly unknown[]) {
      for (const listener of listeners.get(event) ?? []) listener(...args)
    },
  }
}

function clientFor(stream: ReturnType<typeof stubStream>): Anthropic {
  return { messages: { stream: () => stream } } as unknown as Anthropic
}

const BASE = {
  label: 'test leg',
  model: 'claude-sonnet-5',
  maxTokens: 1_000,
  effort: 'high' as const,
  system: 'rules',
  schema: {},
  messages: [{ role: 'user' as const, content: 'go' }],
  requestTimeoutMs: 60_000,
  maxContinuations: 0,
  maxRetries: 0,
}

const SEARCH_TOOLS = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 12 }]

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the stall watchdog', () => {
  test('aborts a stream that goes quiet, and calls it a stall', async () => {
    // Arrange — ten minutes left on the clock, so nothing but the watchdog can
    // stop this leg.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      stallMs: 90_000,
    })

    // Act — a hundred seconds in which nothing streams.
    await vi.advanceTimersByTimeAsync(100_000)
    const outcome = await pending

    // Assert
    expect(outcome.stoppedBy).toBe('stall')
    expect(outcome.response).toBeNull()
  })

  test('leaves a stream that is still talking alone', async () => {
    // Arrange
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      stallMs: 90_000,
    })

    // Act — an event every sixty seconds for five minutes. Slow, not stalled.
    for (let tick = 0; tick < 5; tick += 1) {
      await vi.advanceTimersByTimeAsync(60_000)
      stream.emit('streamEvent', {}, null)
    }

    // Assert: still running. The race is what proves it — had the watchdog
    // fired, the outcome would win.
    const settled = await Promise.race([
      pending.then(() => 'stopped'),
      Promise.resolve('still running'),
    ])
    expect(settled).toBe('still running')

    // Clean up: nothing else will ever settle this promise.
    stream.abort()
    await pending.catch(() => undefined)
  })

  test('a stalled leg still bills the tokens it used', async () => {
    // Arrange — a snapshot arrives, then silence. Billing it as zero would
    // under-report spend, which is the direction that quietly raises the cap.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      stallMs: 90_000,
    })

    stream.emit('streamEvent', {}, { usage: { input_tokens: 1_200, output_tokens: 5 } })

    // Act
    await vi.advanceTimersByTimeAsync(100_000)
    const outcome = await pending

    // Assert
    expect(outcome.stoppedBy).toBe('stall')
    expect(outcome.usage.outputTokens).toBe(5)
    expect(outcome.usage.inputTokens).toBe(1_200)
  })

  test('a leg with no stallMs has no watchdog at all', async () => {
    // The write leg: 75 seconds of its own, nothing to wait on, and silence is
    // not evidence of anything over that distance.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
    })

    await vi.advanceTimersByTimeAsync(300_000)

    const settled = await Promise.race([
      pending.then((outcome) => outcome.stoppedBy),
      Promise.resolve('still running'),
    ])
    expect(settled).toBe('still running')

    stream.abort()
    await pending.catch(() => undefined)
  })
})

describe('the search ceiling is global across attempts', () => {
  test('searches already spent count against it', async () => {
    // Arrange — a ceiling of three with two already spent by a stalled first
    // attempt. One more search is all this attempt may run.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      tools: SEARCH_TOOLS,
      searchCeiling: 3,
      searchesSoFar: 2,
    })

    // Act
    stream.emit('contentBlock', { type: 'server_tool_use' })
    await vi.advanceTimersByTimeAsync(0)
    const outcome = await pending

    // Assert — the third search is the last one, and the count that comes back
    // is the total rather than this attempt's.
    expect(outcome.stoppedBy).toBe('searches')
    expect(outcome.searches).toBe(3)
  })

  test('without a carried count the same ceiling allows three more', async () => {
    // The behaviour `searchesSoFar` exists to prevent: a fresh attempt starting
    // from zero would spend the whole ceiling again.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      tools: SEARCH_TOOLS,
      searchCeiling: 3,
    })

    stream.emit('contentBlock', { type: 'server_tool_use' })
    stream.emit('contentBlock', { type: 'server_tool_use' })
    await vi.advanceTimersByTimeAsync(0)

    const settled = await Promise.race([
      pending.then((outcome) => outcome.stoppedBy),
      Promise.resolve('still running'),
    ])
    expect(settled).toBe('still running')

    stream.abort()
    await pending.catch(() => undefined)
  })

  test('a block that is not a search does not count', async () => {
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 600_000,
      tools: SEARCH_TOOLS,
      searchCeiling: 1,
      searchesSoFar: 0,
    })

    stream.emit('contentBlock', { type: 'text', text: '{' })
    await vi.advanceTimersByTimeAsync(0)

    const settled = await Promise.race([
      pending.then((outcome) => outcome.stoppedBy),
      Promise.resolve('still running'),
    ])
    expect(settled).toBe('still running')

    stream.abort()
    await pending.catch(() => undefined)
  })
})

describe('the time budget still wins when it is the one that fires', () => {
  test('a leg with no time left never starts a request', async () => {
    const stream = stubStream()

    const outcome = await streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() - 1,
      stallMs: 90_000,
    })

    expect(outcome.stoppedBy).toBe('time')
    expect(outcome.legs).toBe(0)
  })

  test('a quiet leg whose deadline comes first is a timeout, not a stall', async () => {
    // Arrange — thirty seconds of clock against a ninety-second stall
    // threshold. The diagnosis has to name the budget that actually fired.
    const stream = stubStream()
    const pending = streamLeg({
      ...BASE,
      client: clientFor(stream),
      deadlineAt: Date.now() + 30_000,
      stallMs: 90_000,
    })

    await vi.advanceTimersByTimeAsync(31_000)

    expect((await pending).stoppedBy).toBe('time')
  })
})
