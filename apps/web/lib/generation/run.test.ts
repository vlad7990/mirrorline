/**
 * The order, asserted as an order rather than as four separate behaviours.
 *
 * ============================================================================
 * Why the assertions are about a log of calls
 * ============================================================================
 *
 * Every step `runGeneration` performs is already tested where it lives:
 * `safety.test.ts` has the gate's cases, `spend.test.ts` has the cap's
 * arithmetic, and the RLS suite covers the insert. Re-testing any of that here
 * would be duplication that drifts.
 *
 * What has no test anywhere else is the **sequence**, and a sequence can only be
 * asserted by watching the calls happen. So the fakes push a label into one
 * shared array and the expectations are about that array: a refused prompt must
 * produce no month read and no generate, a capped request must produce a month
 * read and no generate, and an allowed one must produce all three in order.
 *
 * The negative assertions are the valuable half. "The cap was checked" is easy
 * to satisfy by accident; "the provider was not called" is the property that
 * costs money when it breaks, and it is only ever visible as an absence.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, test } from 'vitest'

import { MEDIA_AGENT } from './ledger'
import type { AdapterChoice } from './registry'
import { runGeneration } from './run'
import type {
  BrandKit,
  GeneratedAsset,
  GenerationAdapter,
  GenerationOutcome,
  GenerationRequest,
} from './types'

/** Fixed, so nothing here depends on which month the suite runs in. */
const NOW = new Date('2026-11-25T12:00:00.000Z')

const BRAND: BrandKit = {
  brandName: 'Harbour Lane Bakery',
  look: 'warm cream and soft morning light',
  captionStyle: 'bold lower third',
  avoid: [],
}

/** A scene no rule in `safety.ts` objects to. */
const SAFE_PROMPT = 'A wide shot of a sunlit counter with steam rising from a cup.'

/**
 * A scene the first rule objects to.
 *
 * `taylor swift` is in `KNOWN_FIGURES`, so this refuses as `named-person`
 * without any structural pattern being involved — the simplest refusal to
 * reason about, which is what a test of ordering wants.
 */
const REFUSED_PROMPT = 'A clip that looks like Taylor Swift walking past the counter.'

function requestFor(prompt: string, overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    workspaceId: 'ws-1',
    beat: { ideaTitle: 'Morning bake', label: 'Hook' },
    prompt,
    brand: BRAND,
    kind: 'clip',
    aspectRatio: '9:16',
    seconds: 3,
    resolution: '720p',
    ...overrides,
  }
}

const ASSET: GeneratedAsset = {
  id: 'prompt_0000000000000001-hook',
  kind: 'clip',
  location: '/tmp/mirrorline-ai/prompt_0000000000000001-hook.mp4',
  width: 720,
  height: 1280,
  seconds: 3,
  beat: { ideaTitle: 'Morning bake', label: 'Hook' },
  promptRef: 'prompt_0000000000000001',
  source: 'ai-scene',
  label: 'AI-generated',
  provenance: {
    adapter: 'fake',
    model: 'fake-clip-billed',
    requestedAt: NOW.toISOString(),
    usd: 0.0855,
    providerRequestId: 'req-1',
    providerWatermark: null,
  },
}

const OK_OUTCOME: GenerationOutcome = { status: 'ok', asset: ASSET }

interface Recorded {
  readonly log: string[]
  readonly inserts: Record<string, unknown>[]
}

/**
 * A thenable query builder.
 *
 * `readMediaMonthUsd` chains `.select().eq().eq().gte()` and awaits the result,
 * so each link has to return something chainable that is also awaitable. An
 * object carrying `then` is exactly that, and a great deal less machinery than
 * a mock library would need to express the same four links.
 */
function builder(result: unknown) {
  const self = {
    select: () => self,
    eq: () => self,
    gte: () => self,
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }

  return self
}

function fakeClient(
  recorded: Recorded,
  options: { readonly monthRows?: readonly { usd: number }[]; readonly readError?: string } = {},
): SupabaseClient {
  const client = {
    from: (table: string) => {
      expect(table, 'the generation ledger reads and writes one table').toBe('agent_runs')

      return {
        select: () => {
          recorded.log.push('read-month')
          return builder({
            data: options.monthRows ?? [],
            error: options.readError ? { message: options.readError } : null,
          })
        },
        insert: (row: Record<string, unknown>) => {
          recorded.log.push('insert')
          recorded.inserts.push(row)
          return Promise.resolve({ error: null })
        },
      }
    },
  }

  return client as unknown as SupabaseClient
}

function fakeChoice(
  recorded: Recorded,
  options: {
    readonly outcome?: GenerationOutcome
    readonly throws?: unknown
    readonly isSample?: boolean
  } = {},
): AdapterChoice {
  const adapter: GenerationAdapter = {
    name: 'fake',
    models: { clip: 'fake-clip', image: 'fake-image' },
    hasKey: () => true,
    projectUsd: () => 0.09,
    generate: async () => {
      recorded.log.push('generate')
      if (options.throws !== undefined) throw options.throws
      return options.outcome ?? OK_OUTCOME
    },
  }

  return { adapter, isSample: options.isSample ?? false }
}

function recorder(): Recorded {
  return { log: [], inserts: [] }
}

describe('a prompt our own rules refuse', () => {
  test('never reads the ledger and never calls the provider', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(REFUSED_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    expect(run.outcome.status).toBe('refused')
    // The whole point of screening first: neither expensive step ran.
    expect(recorded.log).not.toContain('read-month')
    expect(recorded.log).not.toContain('generate')
  })

  test('is still written to the ledger, at zero, with the rule in the reason', async () => {
    const recorded = recorder()

    await runGeneration(fakeClient(recorded), requestFor(REFUSED_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    expect(recorded.inserts).toHaveLength(1)
    expect(recorded.inserts[0]).toMatchObject({
      workspace_id: 'ws-1',
      agent: MEDIA_AGENT,
      status: 'refused',
      usd: 0,
      // The model that *would* have been called. `'none'` is reserved for the
      // cap's refusal, where no model was selected for any work.
      model: 'fake-clip',
    })
    expect(String(recorded.inserts[0]?.reason)).toContain('public figure')
  })

  test('carries the rule beside the outcome, so a screen can name it', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(REFUSED_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    expect(run.safetyRule).toBe('named-person')
  })

  test('says nothing about a provider, because none was asked', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(REFUSED_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    // A provenance block here would read as "the provider refused this", which
    // is a different fact with different consequences for a client.
    expect(run.outcome.status === 'refused' && run.outcome.provenance).toBeNull()
  })
})

describe('the cap, which is checked before the call and not after it', () => {
  test('refuses over the per-request ceiling without calling the provider', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      limits: { maxRequestUsd: 0.01 },
      choice: fakeChoice(recorded),
    })

    expect(run.outcome.status).toBe('capped')
    expect(recorded.log).toEqual(['read-month', 'insert'])
  })

  test('refuses when the month is already at its ceiling', async () => {
    const recorded = recorder()

    const run = await runGeneration(
      fakeClient(recorded, { monthRows: [{ usd: 9.99 }] }),
      requestFor(SAFE_PROMPT),
      { now: NOW, env: {}, limits: { monthlyCapUsd: 10 }, choice: fakeChoice(recorded) },
    )

    expect(run.outcome.status).toBe('capped')
    expect(recorded.log).not.toContain('generate')
  })

  test('refuses when the month could not be read at all', async () => {
    const recorded = recorder()

    const run = await runGeneration(
      fakeClient(recorded, { readError: 'connection reset' }),
      requestFor(SAFE_PROMPT),
      { now: NOW, env: {}, choice: fakeChoice(recorded) },
    )

    // Null is not zero. A database hiccup must not read as "plenty of room".
    expect(run.outcome.status).toBe('capped')
    expect(recorded.log).not.toContain('generate')
  })

  test('logs its refusal with no model, because nothing was called', async () => {
    const recorded = recorder()

    await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      limits: { maxRequestUsd: 0.01 },
      choice: fakeChoice(recorded),
    })

    expect(recorded.inserts[0]).toMatchObject({ status: 'refused', usd: 0, model: 'none' })
  })
})

describe('a generation the gate and the cap both allow', () => {
  test('runs the three steps in order', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    expect(run.outcome.status).toBe('ok')
    expect(recorded.log).toEqual(['read-month', 'generate', 'insert'])
  })

  test('logs what was billed, not what was projected', async () => {
    const recorded = recorder()

    await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded),
    })

    // `projectUsd` says 0.09 and the asset came back billed at 0.0855. The
    // ledger has to hold the second, or a month's spend drifts from the invoice
    // in the direction that is hardest to notice.
    expect(recorded.inserts[0]).toMatchObject({
      status: 'ok',
      usd: 0.0855,
      model: 'fake-clip-billed',
    })
  })

  test('names the adapter and whether it was the fixture', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded, { isSample: true }),
    })

    // What non-negotiable 7 reads to decide whether to say "Sample data".
    expect(run.isSample).toBe(true)
    expect(run.adapter).toBe('fake')
  })
})

describe('an adapter that throws, which the interface says it must not', () => {
  test('becomes a failed outcome rather than an exception', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded, { throws: new Error('socket hang up') }),
    })

    expect(run.outcome.status).toBe('failed')
    expect(recorded.log).toEqual(['read-month', 'generate', 'insert'])
  })

  test('still writes a row, so the ledger is never silently short one', async () => {
    const recorded = recorder()

    await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded, { throws: new Error('socket hang up') }),
    })

    expect(recorded.inserts[0]).toMatchObject({ status: 'failed', usd: 0 })
    expect(String(recorded.inserts[0]?.reason)).toContain('socket hang up')
  })

  test('shows the client our sentence rather than the thrown one', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded, { throws: new Error('rejected the credential we sent') }),
    })

    // The reason is for the log; the message is for a person. A thrown error is
    // the one string in this path nobody here wrote, so it never reaches a
    // screen — `xai.ts` keeps credentials out of its errors, and this is the
    // belt to that brace.
    expect(run.outcome.status === 'failed' && run.outcome.message).not.toContain('credential')
  })

  test('survives something thrown that is not an Error', async () => {
    const recorded = recorder()

    const run = await runGeneration(fakeClient(recorded), requestFor(SAFE_PROMPT), {
      now: NOW,
      env: {},
      choice: fakeChoice(recorded, { throws: 'a string, because somebody will' }),
    })

    expect(run.outcome.status).toBe('failed')
    expect(String(recorded.inserts[0]?.reason)).toContain('a non-error was thrown')
  })
})
