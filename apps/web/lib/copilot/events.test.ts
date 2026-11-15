/**
 * The wire, read from the other end.
 *
 * `copilot-api.spec.ts` proves the server emits these lines. This proves a
 * browser can turn them back into events without the two halves agreeing by
 * coincidence — and that the failures a network actually produces, a split
 * chunk and a truncated line, do not quietly cost an event.
 */

import { describe, expect, test } from 'vitest'

import { type CopilotEvent, parseEventLine, splitLines } from './events'

describe('parsing a line', () => {
  test('reads a meta event, with its mode and notice', () => {
    const event = parseEventLine('{"type":"meta","mode":"sample","notice":"Sample answer."}')

    expect(event).toEqual({ type: 'meta', mode: 'sample', notice: 'Sample answer.' })
  })

  test('accepts a meta event with no notice', () => {
    expect(parseEventLine('{"type":"meta","mode":"live","notice":null}')).toEqual({
      type: 'meta',
      mode: 'live',
      notice: null,
    })
  })

  test('rejects a mode it does not recognise, rather than passing it through', () => {
    // A mode the UI cannot render is worse than no mode: the label is the
    // whole point of the field (18 §4).
    expect(parseEventLine('{"type":"meta","mode":"demo","notice":null}')).toBeNull()
  })

  test('reads a delta, including an empty one', () => {
    expect(parseEventLine('{"type":"delta","text":"Growth"}')).toEqual({
      type: 'delta',
      text: 'Growth',
    })
    expect(parseEventLine('{"type":"delta","text":""}')).toEqual({ type: 'delta', text: '' })
  })

  test('requires a citation to have somewhere to go', () => {
    expect(
      parseEventLine('{"type":"citation","citation":{"label":"Pricing","href":"/pricing"}}'),
    ).toEqual({ type: 'citation', citation: { label: 'Pricing', href: '/pricing' } })

    // §2.2: a citation that cannot be clicked is a footnote, and footnotes
    // are ruled out by name.
    expect(parseEventLine('{"type":"citation","citation":{"label":"Pricing"}}')).toBeNull()
  })

  test('reads a done event and keeps the answer whole', () => {
    const line = JSON.stringify({
      type: 'done',
      answer: {
        surface: 'site',
        mode: 'sample',
        text: 'The Growth plan includes twenty posts a month.',
        citations: [{ label: 'Plans', href: '/pricing' }],
        proposals: [],
        refusal: null,
        handoff: null,
      },
      usage: { inputTokens: 10, outputTokens: 4, cacheReadTokens: 0, cacheCreationTokens: 0 },
      spendSummary: null,
    })

    const event = parseEventLine(line)

    expect(event?.type).toBe('done')
    expect(event).toMatchObject({
      answer: { text: 'The Growth plan includes twenty posts a month.' },
    })
  })

  test('rejects a done event with no answer in it', () => {
    // Everything on screen is rebuilt from this event, so half of one would
    // put `undefined` where the answer goes.
    expect(parseEventLine('{"type":"done","usage":{}}')).toBeNull()
    expect(parseEventLine('{"type":"done","answer":{"citations":[]}}')).toBeNull()
  })

  test('reads an error event, and defaults an unknown kind rather than dropping it', () => {
    expect(parseEventLine('{"type":"error","kind":"rate-limited","message":"Too many."}')).toEqual({
      type: 'error',
      kind: 'rate-limited',
      message: 'Too many.',
    })

    // The message is the part a visitor reads. A kind we do not know yet is
    // not a reason to swallow it.
    expect(parseEventLine('{"type":"error","message":"Something went wrong."}')).toEqual({
      type: 'error',
      kind: 'failed',
      message: 'Something went wrong.',
    })
  })

  test('returns null for junk rather than throwing', () => {
    // A parser that throws takes the whole answer down with one bad line.
    expect(parseEventLine('not json')).toBeNull()
    expect(parseEventLine('')).toBeNull()
    expect(parseEventLine('   ')).toBeNull()
    expect(parseEventLine('null')).toBeNull()
    expect(parseEventLine('[1,2,3]')).toBeNull()
    expect(parseEventLine('{"type":"something-new","payload":1}')).toBeNull()
  })
})

describe('splitting a buffer', () => {
  test('keeps the tail of a line that has not finished arriving', () => {
    const first = splitLines('{"type":"delta","text":"a"}\n{"type":"del')

    expect(first.lines).toEqual(['{"type":"delta","text":"a"}'])
    expect(first.rest).toBe('{"type":"del')

    // The next chunk completes it, which is the whole reason for `rest`.
    const second = splitLines(`${first.rest}ta","text":"b"}\n`)
    expect(second.lines).toEqual(['{"type":"delta","text":"b"}'])
    expect(second.rest).toBe('')
  })

  test('an event split across two chunks survives the round trip', () => {
    // The failure this guards against loses one event in a long answer and
    // leaves nothing behind to say why.
    const chunks = ['{"type":"delta","te', 'xt":"Growth"}\n']
    const events: CopilotEvent[] = []
    let buffered = ''

    for (const chunk of chunks) {
      buffered += chunk
      const split = splitLines(buffered)
      buffered = split.rest
      for (const line of split.lines) {
        const event = parseEventLine(line)
        if (event) events.push(event)
      }
    }

    expect(events).toEqual([{ type: 'delta', text: 'Growth' }])
  })

  test('drops blank lines without reporting them as events', () => {
    expect(splitLines('\n\n{"type":"delta","text":"a"}\n').lines).toEqual([
      '{"type":"delta","text":"a"}',
    ])
  })
})
