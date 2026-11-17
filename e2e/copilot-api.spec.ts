/**
 * The co-pilot routes, against a real server.
 *
 * **C1 ships no UI**, so there is no screen to drive — these drive the three
 * endpoints C2 and C3 will build against. That makes them worth having now
 * rather than later: the shape of the stream is the contract between this PR
 * and the next two, and a contract nobody has exercised end to end is a
 * guess.
 *
 * The unit tests cover the same logic in isolation. What only a real server
 * can show is that the handlers are wired, that the response genuinely
 * streams rather than arriving as one lump, and that Next's own machinery has
 * not cached something that must never be cached.
 *
 * Run on chromium only: these are HTTP requests, and a viewport has no
 * opinion about them.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'these are API calls, so the viewport is irrelevant')

interface StreamEvent {
  readonly type: string
  readonly [key: string]: unknown
}

function parseEvents(body: string): StreamEvent[] {
  return body
    .trim()
    .split('\n')
    .filter((entry) => entry.length > 0)
    .map((entry) => JSON.parse(entry) as StreamEvent)
}

test.describe('the co-pilot API answers with no key', () => {
  test('reports its mode, its models and whether the corpus will cache', async ({ request }) => {
    const response = await request.get('/api/copilot/status')
    expect(response.ok()).toBe(true)

    const status = await response.json()

    // No key on a preview, so sample mode — and that is the supported state,
    // not a degraded one (18 §4).
    expect(status.mode).toBe('sample')
    expect(status.models).toEqual({ site: 'claude-haiku-4-5', studio: 'claude-sonnet-5' })

    // The corpus has to clear Haiku 4.5's 4096-token minimum or caching
    // silently does nothing. With no key there is no real count to take, and
    // the response says which claim it is making rather than blurring them.
    expect(status.corpus.minimum).toBe(4096)
    expect(status.corpus.cachesOnHaiku).toBe(true)
    expect(status.corpus.verifiedByRealCount).toBe(false)
    expect(status.corpus.floorTokens).toBeGreaterThanOrEqual(4096)

    // No part of a key, and no key, ever appears in this response.
    expect(JSON.stringify(status)).not.toMatch(/sk-ant/)
  })

  test('answers a question about the plans, from our own pages', async ({ request }) => {
    const response = await request.post('/api/copilot/site', {
      data: { question: 'What does the Growth plan include every month?' },
    })

    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('application/x-ndjson')
    // An answer held in a shared cache would be served to the next visitor.
    expect(response.headers()['cache-control']).toBe('no-store')

    const events = parseEvents(await response.text())

    expect(events[0]).toMatchObject({ type: 'meta', mode: 'sample' })
    expect(events[0]?.notice).toMatch(/sample/i)

    const done = events.at(-1)
    expect(done?.type).toBe('done')

    const answer = (done as unknown as { answer: { text: string; citations: { href: string }[] } })
      .answer
    expect(answer.text).toContain('From our own pages')
    // A quote the visitor cannot go and check is the thing this surface
    // exists not to be.
    expect(answer.citations[0]?.href).toBe('/pricing')
  })

  test('refuses a guarantee rather than answering it', async ({ request }) => {
    const response = await request.post('/api/copilot/site', {
      data: { question: 'Will I get 10k followers if I sign up for Growth?' },
    })

    const events = parseEvents(await response.text())
    const done = events.at(-1) as unknown as { answer: { refusal: string; text: string } }

    expect(done.answer.refusal).toBe('guarantee')
    expect(done.answer.text).not.toMatch(/10k|10,000/)
  })

  test('hands an unanswerable question to a person, which is a success', async ({ request }) => {
    const response = await request.post('/api/copilot/site', {
      data: { question: 'What is the capital of Portugal?' },
    })

    const events = parseEvents(await response.text())
    const done = events.at(-1) as unknown as {
      answer: { refusal: string; handoff: { href: string } | null }
    }

    expect(done.answer.refusal).toBe('outside-corpus')
    expect(done.answer.handoff?.href).toBe('/niche-scan')
  })

  test('the studio surface proposes and does not act', async ({ request }) => {
    const response = await request.post('/api/copilot/studio', {
      data: { question: 'Can you move my Thursday post to Tuesday?' },
    })

    const events = parseEvents(await response.text())

    const proposals = events.filter((event) => event.type === 'proposal')
    expect(proposals.length).toBe(1)

    const proposal = proposals[0]?.proposal as { kind: string; requiresApproval: boolean }
    expect(proposal.kind).toBe('move-post')
    // 18 §2.3: nothing happens until Approve is pressed, and there is no
    // auto-approve anywhere.
    expect(proposal.requiresApproval).toBe(true)
  })

  test('a studio answer about a KPI carries the chip naming that KPI', async ({ request }) => {
    const response = await request.post('/api/copilot/studio', {
      data: { question: 'How many posts were published this week?' },
    })

    const events = parseEvents(await response.text())
    const citations = events.filter((event) => event.type === 'citation')

    expect(citations.length).toBeGreaterThan(0)
    const citation = citations[0]?.citation as { label: string; href: string }
    expect(citation.label).toBe('Posts published')
    expect(citation.href).toMatch(/^\/app\//)
  })

  test('the answer arrives in pieces rather than as one lump', async ({ request }) => {
    // Streaming is the default (§4), and C2's typing animation and C3's
    // panel both depend on it. One delta for the whole answer would satisfy
    // every other assertion here and leave them nothing to animate.
    const response = await request.post('/api/copilot/site', {
      data: { question: 'What does the Growth plan include every month?' },
    })

    const deltas = parseEvents(await response.text()).filter((event) => event.type === 'delta')
    expect(deltas.length).toBeGreaterThan(1)
  })

  test('refuses an empty question and a malformed body with a 400', async ({ request }) => {
    const empty = await request.post('/api/copilot/site', { data: { question: '  ' } })
    expect(empty.status()).toBe(400)

    const malformed = await request.post('/api/copilot/site', {
      data: 'not an object',
      headers: { 'content-type': 'application/json' },
    })
    expect(malformed.status()).toBe(400)
  })

  test('never answers a GET on the two asking routes', async ({ request }) => {
    for (const route of ['/api/copilot/site', '/api/copilot/studio']) {
      const response = await request.get(route)
      expect(response.ok(), `${route} answered a GET`).toBe(false)
    }
  })
})
