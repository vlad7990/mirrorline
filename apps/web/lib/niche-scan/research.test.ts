/**
 * Reading leg one's reply, including the replies that did not finish (D137).
 *
 * The run this is written from: `stop_reason max_tokens`, 20,783 output tokens,
 * twenty searches paid for — and `formats=0 … pages=0`, because the reply's last
 * object was half-written and the whole thing was discarded. The scan then told
 * the client it "could not find enough about that niche".
 *
 * `notesFromReply` is exported precisely so this can be tested: a live model
 * cannot be asked to truncate on demand, and the behaviour that failed is the
 * behaviour at the truncation.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, test } from 'vitest'

import { notesAreUsable } from './notes'
import { notesFromReply, RESEARCH_NOTE_CAPS, TRUNCATED_COVERAGE_NOTE } from './research'

function reply(...texts: readonly string[]): readonly Anthropic.ContentBlock[] {
  return texts.map((text) => ({ type: 'text', text, citations: null }) as Anthropic.ContentBlock)
}

const WHOLE = {
  formats: [
    {
      name: 'myth correction',
      howItGoes: 'claim on screen, then the correction to camera',
      whereSeen: ['https://www.instagram.com/p/abc123/'],
      basis: 'posts',
    },
  ],
  hookNotes: [{ text: 'opens on the wrong belief', basis: 'posts' }],
  coverage: 'searched instagram and tiktok for reactive-dog training',
}

describe('a reply that closed is read strictly', () => {
  test('parses the notes and reports no truncation', () => {
    // Arrange
    const content = reply(JSON.stringify(WHOLE))

    // Act
    const read = notesFromReply(content)

    // Assert
    expect(read.truncated).toBe(false)
    expect(read.notes.formats).toHaveLength(1)
    expect(read.notes.coverage).toBe(WHOLE.coverage)
  })

  test('finds the notes past a commentary block', () => {
    const read = notesFromReply(reply('Here is what I found.', JSON.stringify(WHOLE)))

    expect(read.notes.formats).toHaveLength(1)
    expect(read.truncated).toBe(false)
  })
})

describe('a reply the output ceiling cut short keeps what it finished', () => {
  /** The failing shape: two formats written, the third stopped mid-sentence. */
  const CUT =
    '{"formats":[' +
    '{"name":"myth correction","howItGoes":"claim on screen, then the correction",' +
    '"whereSeen":["https://www.instagram.com/p/abc123/"],"basis":"posts"},' +
    '{"name":"one-tip clip","howItGoes":"one tip to camera, then a demo",' +
    '"whereSeen":[],"basis":"guidance"},' +
    '{"name":"before and after","howItGoes":"the dog at week one, then at we'

  test('the complete formats survive instead of all of them being lost', () => {
    // Act
    const read = notesFromReply(reply(CUT))

    // Assert
    expect(read.notes.formats.map((format) => format.name)).toEqual([
      'myth correction',
      'one-tip clip',
    ])
    expect(notesAreUsable(read.notes)).toBe(true)
  })

  test('it says so, so the write leg does not invent the coverage it lacks', () => {
    const read = notesFromReply(reply(CUT))

    expect(read.truncated).toBe(true)
    expect(read.notes.coverage).toBe(TRUNCATED_COVERAGE_NOTE)
  })

  test('a coverage note that did arrive is kept, with the warning after it', () => {
    // Arrange — coverage written early, the examples cut off after it.
    const cut =
      '{"coverage":"searched instagram and tiktok",' +
      '"formats":[{"name":"myth correction","howItGoes":"claim, then the correction",' +
      '"whereSeen":[],"basis":"posts"}],' +
      '"examples":[{"url":"https://www.instagram.com/p/abc123/","platform":"inst'

    // Act
    const read = notesFromReply(reply(cut))

    // Assert
    expect(read.notes.coverage).toBe(`searched instagram and tiktok\n\n${TRUNCATED_COVERAGE_NOTE}`)
  })
})

describe('what is still a failure', () => {
  test('a truncation with nothing complete in it is empty, not salvaged', () => {
    // Arrange — `notesAreUsable` must say no, and `scan.ts` must fail the scan
    // rather than send a write leg out with nothing.
    const read = notesFromReply(reply('{"formats":[{"name":"myth corr'))

    // Assert
    expect(read.truncated).toBe(false)
    expect(notesAreUsable(read.notes)).toBe(false)
  })

  test('a reply that was never notes is empty', () => {
    const read = notesFromReply(reply('I could not find much about that niche.'))

    expect(notesAreUsable(read.notes)).toBe(false)
  })

  test('examples alone are not enough to write from', () => {
    // Rule 14's other half: a format or a claim is the minimum, and a salvage
    // that recovered only posts has not recovered a report.
    const cut =
      '{"examples":[{"url":"https://www.instagram.com/p/abc123/","platform":"instagram",' +
      '"formatName":"myth correction","whatHappens":"claim, then the correction",' +
      '"sourceNote":"instagram search"}],"formats":[{"name":"myth corr'

    expect(notesAreUsable(notesFromReply(reply(cut)).notes)).toBe(false)
  })
})

describe('the ask is sized to be compact', () => {
  test('asks for at most four formats and six posts', () => {
    // The numbers the prompt is built from, asserted because "compact by
    // design" is only true while they stay small — the failing run was a
    // length problem, not a breadth one.
    expect(RESEARCH_NOTE_CAPS.formats).toBeLessThanOrEqual(4)
    expect(RESEARCH_NOTE_CAPS.examples).toBeLessThanOrEqual(6)
  })

  test('asks for notes of one line, not paragraphs', () => {
    expect(RESEARCH_NOTE_CAPS.noteWords).toBeLessThanOrEqual(25)
    expect(RESEARCH_NOTE_CAPS.howItGoesWords).toBeLessThanOrEqual(50)
  })
})
