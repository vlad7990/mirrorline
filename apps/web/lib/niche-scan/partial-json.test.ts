/**
 * Truncated notes are read as far as they got (D137).
 *
 * The case these are written from: a research leg stopped on `max_tokens` with
 * twenty searches paid for, and the whole reply was discarded because its last
 * object was half-written. The bar is that a complete format survives a
 * truncation anywhere after it, and that nothing is ever invented to make the
 * JSON close.
 */

import { describe, expect, test } from 'vitest'

import { parsePartialJson } from './partial-json'

const COMPLETE = {
  formats: [
    { name: 'myth correction', howItGoes: 'claim on screen, then the fix', basis: 'posts' },
    { name: 'one-tip clip', howItGoes: 'tip to camera, then a demo', basis: 'guidance' },
  ],
  coverage: 'searched three platforms',
}

describe('whole replies are untouched', () => {
  test('parses JSON that was never truncated', () => {
    // Arrange
    const text = JSON.stringify(COMPLETE)

    // Act
    const parsed = parsePartialJson(text)

    // Assert
    expect(parsed).toEqual(COMPLETE)
  })

  test('tolerates the whitespace a pretty-printed reply carries', () => {
    expect(parsePartialJson(`\n  ${JSON.stringify(COMPLETE)}  \n`)).toEqual(COMPLETE)
  })
})

describe('a truncated reply keeps every finished value', () => {
  test('cut inside the second object: the first format survives', () => {
    // Arrange — the shape of the failing run: the reply stops mid-member.
    const text =
      '{"formats":[{"name":"myth correction","howItGoes":"claim, then the fix"},{"name":"one'

    // Act
    const parsed = parsePartialJson(text) as { formats: readonly { name: string }[] }

    // Assert
    expect(parsed.formats).toHaveLength(1)
    expect(parsed.formats[0]?.name).toBe('myth correction')
  })

  test('cut right after a comma', () => {
    const text = '{"formats":[{"name":"a","howItGoes":"b"}],'

    expect(parsePartialJson(text)).toEqual({ formats: [{ name: 'a', howItGoes: 'b' }] })
  })

  test('cut after a key, before its value: the key is dropped, not guessed', () => {
    const text = '{"formats":[{"name":"a","howItGoes":"b"}],"coverage":'

    expect(parsePartialJson(text)).toEqual({ formats: [{ name: 'a', howItGoes: 'b' }] })
  })

  test('cut mid-string: the half-written value is dropped', () => {
    const text = '{"formats":[{"name":"a","howItGoes":"b"}],"coverage":"I searched for'

    expect(parsePartialJson(text)).toEqual({ formats: [{ name: 'a', howItGoes: 'b' }] })
  })

  test('a brace inside a string is not mistaken for a boundary', () => {
    // Arrange — the kind of prose a coverage note contains.
    const text = '{"coverage":"the page showed {views} only","formats":[{"name":"a'

    // Act — the only readable prefix ends at the coverage string's own quote,
    // because the `}` inside it is not a boundary and nothing after it closed.
    const parsed = parsePartialJson(text)

    // Assert
    expect(parsed).toEqual({ coverage: 'the page showed {views} only' })
  })

  test('an escaped quote inside a string does not end it', () => {
    const text = '{"coverage":"she said \\"no prong\\" twice","formats":[]'

    expect(parsePartialJson(text)).toEqual({
      coverage: 'she said "no prong" twice',
      formats: [],
    })
  })

  test('keeps the deepest nesting it can close', () => {
    const text =
      '{"formats":[{"name":"a","whereSeen":["https://example.com/p/1","https://example.com/p/2"]'

    expect(parsePartialJson(text)).toEqual({
      formats: [{ name: 'a', whereSeen: ['https://example.com/p/1', 'https://example.com/p/2'] }],
    })
  })
})

describe('nothing is invented', () => {
  test('a reply that was never JSON returns null', () => {
    expect(parsePartialJson('I could not find much about that niche.')).toBeNull()
  })

  test('an empty reply returns null', () => {
    expect(parsePartialJson('   ')).toBeNull()
  })

  test('a truncation before any value closed returns null', () => {
    // There is nothing complete in here, and an empty object would be a lie
    // about what arrived — `notesAreUsable` must see nothing, not `{}`.
    expect(parsePartialJson('{"formats":[{"name":"myth corr')).toBeNull()
  })

  test('never halves a number, because a halved number is an invented one', () => {
    // Arrange — `12345` views, cut after the second digit. Closing here would
    // report 12 views off a page that showed 12,345.
    const text = '{"examples":[{"url":"https://example.com/p/1","views":12'

    // Act
    const parsed = parsePartialJson(text) as { examples: readonly { views?: number }[] }

    // Assert — the url survived; the number did not.
    expect(parsed.examples).toHaveLength(1)
    expect(parsed.examples[0]?.views).toBeUndefined()
  })
})
