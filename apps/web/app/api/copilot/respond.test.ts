/**
 * The HTTP half: what the routes accept, and what they refuse.
 *
 * The streaming answer itself is the adapter's, and tested there. What is
 * only testable here is the behaviour a route owns — validating a body it
 * must not trust, holding the rate limit 18 §3.3 asks for, and saying so out
 * loud when it trips rather than failing silently.
 *
 * The addresses below are from the RFC 5737 documentation ranges, so nothing
 * here is or could be a real visitor.
 */

import { beforeEach, describe, expect, test } from 'vitest'

import {
  MAX_QUESTION_CHARS,
  checkRate,
  resetRateLimits,
  respond,
  validateQuestion,
} from './respond'

function ask(body: unknown, address = '203.0.113.5'): Request {
  return new Request('https://example.test/api/copilot/site', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': address },
    body: JSON.stringify(body),
  })
}

/** Hammer one address until it is refused, and hand back the last decision. */
function exhaust(request: Request): ReturnType<typeof checkRate> {
  let last = checkRate(request)
  for (let attempt = 0; attempt < 40 && last.allowed; attempt += 1) {
    last = checkRate(request)
  }
  return last
}

beforeEach(() => {
  resetRateLimits()
})

describe('what counts as a question', () => {
  test('accepts one, trimmed', () => {
    const result = validateQuestion({ question: '  What does Growth cost?  ' })
    expect(result).toEqual({ ok: true, question: 'What does Growth cost?' })
  })

  test('refuses an empty one, and says what to do instead', () => {
    for (const body of [{ question: '' }, { question: '   ' }, {}, null, 'a string', 42]) {
      expect(validateQuestion(body).ok, JSON.stringify(body)).toBe(false)
    }
  })

  test('refuses one longer than the limit', () => {
    const result = validateQuestion({ question: 'a'.repeat(MAX_QUESTION_CHARS + 1) })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toContain(String(MAX_QUESTION_CHARS))
    // The boundary itself is fine. An off-by-one here would refuse a question
    // that is exactly as long as we told the visitor it could be.
    expect(validateQuestion({ question: 'a'.repeat(MAX_QUESTION_CHARS) }).ok).toBe(true)
  })
})

describe('the rate limit', () => {
  test('lets an ordinary visitor through', () => {
    expect(checkRate(ask({ question: 'hello' })).allowed).toBe(true)
  })

  test('trips after enough questions from one address, and says when to retry', () => {
    const last = exhaust(ask({ question: 'hello' }))

    expect(last.allowed).toBe(false)
    // §3.3: "it says so when it trips rather than failing silently". A
    // retry-after of zero would be a refusal with no way to act on it.
    expect(last.retryAfterSeconds).toBeGreaterThan(0)
  })

  test('counts each address separately', () => {
    expect(exhaust(ask({ question: 'hello' }, '203.0.113.5')).allowed).toBe(false)

    // A second visitor behind a different address is unaffected. Without
    // this, one script would silence the bot for everybody.
    expect(checkRate(ask({ question: 'hello' }, '198.51.100.9')).allowed).toBe(true)
  })

  test('forgets the window once it has passed', () => {
    const request = ask({ question: 'hello' })
    expect(exhaust(request).allowed).toBe(false)

    // Two minutes later the same visitor is welcome again.
    expect(checkRate(request, Date.now() + 120_000).allowed).toBe(true)
  })
})

describe('the handler end to end, in sample mode', () => {
  test('answers with a stream of events, each a complete JSON line', async () => {
    const response = await respond(ask({ question: 'What does Growth include?' }), 'site', 'test')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/x-ndjson')
    // A shared cache holding one visitor's answer would serve it to a
    // stranger. There is nothing cacheable about any of this.
    expect(response.headers.get('cache-control')).toBe('no-store')

    const events = (await response.text())
      .trim()
      .split('\n')
      .map((entry) => JSON.parse(entry) as { type: string })

    expect(events[0]).toMatchObject({ type: 'meta', mode: 'sample' })
    expect(events.some((event) => event.type === 'delta')).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'done' })
  })

  test('refuses a malformed body with a 400 and no stream', async () => {
    const broken = new Request('https://example.test/api/copilot/site', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json at all',
    })

    const response = await respond(broken, 'site', 'test')
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
  })

  test('refuses an empty question with a 400', async () => {
    const response = await respond(ask({ question: '' }), 'site', 'test')
    expect(response.status).toBe(400)
  })

  test('answers a 429 with a retry-after header once the limit trips', async () => {
    const request = ask({ question: 'hello' })
    exhaust(request)

    const response = await respond(request, 'site', 'test')
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
  })

  test('the studio surface answers too, and labels itself a sample', async () => {
    const response = await respond(
      ask({ question: 'How many posts were published this week?' }),
      'studio',
      'demo',
    )

    const events = (await response.text())
      .trim()
      .split('\n')
      .map((entry) => JSON.parse(entry) as Record<string, unknown>)

    expect(events[0]).toMatchObject({ type: 'meta', mode: 'sample' })
    expect(events.at(-1)).toMatchObject({ type: 'done' })
  })
})
