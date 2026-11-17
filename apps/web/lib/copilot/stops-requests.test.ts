/**
 * The cap and the rate limit stop *requests*, not just decisions.
 *
 * `spend.test.ts` proves `checkSpend` returns `allowed: false` and
 * `respond.test.ts` proves `checkRate` returns `allowed: false`. Neither
 * proves the thing non-negotiable 11 actually asks for: that **nothing goes
 * out**. A limiter that returns the right verdict and then calls the model
 * anyway passes both of those files and still spends the money.
 *
 * So these tests stub `globalThis.fetch`, record every URL the SDK reaches
 * for, and assert on the absence of the one that bills. The SDK captures
 * `fetch` at construction (`client.d.ts`: `private fetch`), which is why
 * `resetClient()` runs before the stub is installed rather than after.
 *
 * The key here is a fake. That is the point: mode is decided by the key being
 * non-empty, so a fake one puts the adapter on the live path with no way to
 * reach a real endpoint — and if the cap ever stops holding, this test fails
 * with a recorded URL rather than with an invoice.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { askCopilot, resetClient, resetCorpusVerdict } from './adapter'
import { readLedger, resetLedgers } from './spend'
import { resetRateLimits, respond } from '@/app/api/copilot/respond'

/** Non-empty, and obviously not real. Only its emptiness is ever read. */
const FAKE_KEY = 'sk-ant-not-a-real-key-for-tests'

/** Small enough that any real question is over it, large enough to be valid. */
const TINY_CAP = '0.0001'

const COUNT_TOKENS = '/v1/messages/count_tokens'

const realFetch = globalThis.fetch

let urls: string[] = []

/**
 * Answers `count_tokens` and records everything.
 *
 * A completion request is recorded and then refused, so a test that was
 * supposed to stop one fails on the recorded URL rather than hanging.
 */
function installStub(): void {
  urls = []
  globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    urls.push(url)

    if (url.includes(COUNT_TOKENS)) {
      return new Response(JSON.stringify({ input_tokens: 7_000 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ type: 'error', error: { message: 'stubbed' } }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof globalThis.fetch
}

/** Every URL that would have cost money: the completion endpoint, not the count. */
function billableCalls(): readonly string[] {
  return urls.filter((url) => !url.includes(COUNT_TOKENS))
}

beforeEach(() => {
  resetLedgers()
  resetRateLimits()
  resetClient()
  resetCorpusVerdict()
  installStub()
})

afterEach(() => {
  globalThis.fetch = realFetch
  vi.unstubAllEnvs()
  resetClient()
  resetCorpusVerdict()
  resetLedgers()
  resetRateLimits()
})

describe('the spend cap stops the call, not just the answer', () => {
  test('a question over the cap never reaches the completion endpoint', async () => {
    const events = []
    for await (const event of askCopilot({
      surface: 'site',
      question: 'What does the Growth plan include?',
      workspaceId: 'tiny-cap',
      env: { ANTHROPIC_API_KEY: FAKE_KEY, COPILOT_MONTHLY_CAP_USD: TINY_CAP },
    })) {
      events.push(event)
    }

    // It got far enough to be on the live path and to count the real prompt.
    expect(events[0]).toEqual({ type: 'meta', mode: 'live', notice: null })
    expect(urls.some((url) => url.includes(COUNT_TOKENS))).toBe(true)

    // And then it stopped. This is the assertion the whole file exists for.
    expect(billableCalls()).toEqual([])

    expect(events.at(-1)).toEqual({
      type: 'error',
      kind: 'cap-reached',
      message: 'This workspace has reached its cap for the month.',
    })
  })

  test('a refused call is not recorded as spend either', async () => {
    for await (const event of askCopilot({
      surface: 'site',
      question: 'What does the Growth plan include?',
      workspaceId: 'tiny-cap',
      env: { ANTHROPIC_API_KEY: FAKE_KEY, COPILOT_MONTHLY_CAP_USD: TINY_CAP },
    })) {
      // Drained for its side effects; the ledger is what is being read.
      void event
    }

    // A call that never happened must not appear in the month. Counting a
    // refusal as a call would make the cap tighten every time it held.
    const ledger = readLedger('tiny-cap', new Date())
    expect(ledger.calls).toBe(0)
    expect(ledger.usd).toBe(0)
  })

  test('the studio surface is capped by the same gate', async () => {
    const events = []
    for await (const event of askCopilot({
      surface: 'studio',
      question: 'How is this week going?',
      workspaceId: 'tiny-cap-studio',
      env: { ANTHROPIC_API_KEY: FAKE_KEY, COPILOT_MONTHLY_CAP_USD: TINY_CAP },
    })) {
      events.push(event)
    }

    expect(billableCalls()).toEqual([])
    expect(events.at(-1)).toMatchObject({ type: 'error', kind: 'cap-reached' })
  })
})

describe('the website rate limit stops the call before the adapter sees it', () => {
  /** Twenty in a window is the limit; the twenty-first is the one being tested. */
  const RATE_LIMIT = 20

  function ask(): Request {
    return new Request('https://example.test/api/copilot/site', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({ question: 'What does the Growth plan include?' }),
    })
  }

  test('the twenty-first question is a 429 and costs nothing', async () => {
    // `respond` reads `process.env`, not an injected env: it is a route
    // handler and has nowhere to take one from. `vi.stubEnv` rather than an
    // assignment, because `server-only.test.ts` asserts that exactly one file
    // in the app contains the text `env.ANTHROPIC_API_KEY` — the rule that
    // keeps mode decided in one place — and that sweep cannot tell a write
    // from a read. Stubbing is the idiomatic form anyway, and it restores
    // itself.
    vi.stubEnv('ANTHROPIC_API_KEY', FAKE_KEY)
    vi.stubEnv('COPILOT_MONTHLY_CAP_USD', TINY_CAP)

    // Drain the allowance. These are on the live path and would each have
    // made a billable call, so they are drained with the cap at its tiny
    // value — the limiter is what this test is about, not the cap.
    for (let n = 0; n < RATE_LIMIT; n += 1) {
      const allowed = await respond(ask(), 'site', 'rate-limited')
      expect(allowed.status).toBe(200)
      // The stream has to be drained or the generator never runs and
      // "nothing went out" would be true for the wrong reason.
      await allowed.text()
    }

    const before = urls.length
    const refused = await respond(ask(), 'site', 'rate-limited')

    expect(refused.status).toBe(429)
    // Said out loud, with the header a client can act on (§3.3).
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0)
    await expect(refused.json()).resolves.toMatchObject({
      ok: false,
      error: 'Too many questions in a short space of time. Try again in a minute.',
    })

    // Nothing at all went out for the refused question — not even the token
    // count. The limiter runs before the adapter, which is the whole reason
    // it is in `respond` rather than inside `askCopilot`.
    expect(urls.length).toBe(before)
    expect(billableCalls()).toEqual([])
  })
})
