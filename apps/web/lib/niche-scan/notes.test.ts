/**
 * The seam between the two legs, and the rules it enforces (D132).
 *
 * Two of three live production scans were rejected for placeholder text. The
 * split puts a parser between research and writing, and these are the three
 * things that parser is for:
 *
 * 1. **Non-negotiable 1, one leg earlier.** A media-file url never reaches the
 *    write prompt, so the writer cannot be handed something it must not link to.
 * 2. **A half-example is dropped rather than carried**, because a writer given
 *    an example missing its url will complete it.
 * 3. **"Nothing recorded" is said out loud.** A model handed a gap fills it; a
 *    model told the gap is real reports it.
 */

import { describe, expect, test } from 'vitest'

import {
  isPageUrl,
  NOTE_KEEP_CAPS,
  notesAreUsable,
  notesBrief,
  notesCountLine,
  parseNotes,
  type ResearchNotes,
} from './notes'
import { RESEARCH_NOTE_CAPS } from './research'

const FORMAT = {
  name: 'Myth vs fact',
  howItGoes: 'The claim is on screen as text, then the trainer corrects it to camera, then one tip.',
  whereSeen: ['https://www.tiktok.com/@someone/video/123'],
  basis: 'posts',
}

const EXAMPLE = {
  url: 'https://www.instagram.com/p/abc123/',
  platform: 'instagram',
  formatName: 'Myth vs fact',
  whatHappens: 'Text claim, then the correction, then a single tip.',
  sourceNote: 'instagram search for reactive dog training',
  lengthSeconds: 28,
}

/** A copy with one key gone. Immutable, and lint-clean where a destructure is not. */
function without(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key))
}

const REPLY = {
  formats: [FORMAT],
  hookNotes: [{ text: 'Open on the owner’s own words', basis: 'posts' }],
  topicNotes: [{ text: 'Leash reactivity', basis: 'guidance' }],
  lengthNotes: [{ text: 'Most run under 30 seconds', basis: 'posts' }],
  patternNotes: [{ text: 'Three to five a week', basis: 'guidance' }],
  examples: [EXAMPLE],
  pages: [{ title: 'A guide to reactive dogs', url: 'https://example.com/guide', kind: 'guide' }],
  /*
   * Deliberately does not name YouTube. `copy/youtube-claims.test.ts` sweeps
   * every shipped file for "YouTube" beside a posting verb and demands the
   * "uploads stay private" caveat, and this file is full of the word "post"
   * because the thing it validates is a link to one. Earning an exemption for a
   * fixture string would weaken a compliance guard to save eight characters.
   */
  coverage: 'Searched TikTok, Instagram and two agency write-ups. Found no Shorts at all.',
}

describe('isPageUrl', () => {
  test('accepts a link to a post page', () => {
    expect(isPageUrl('https://www.tiktok.com/@someone/video/123')).toBe(true)
  })

  test('refuses a link to a media file — non-negotiable 1', () => {
    // Arrange
    const mediaFile = 'https://cdn.example.com/clip.mp4'

    // Act
    const allowed = isPageUrl(mediaFile)

    // Assert
    expect(allowed).toBe(false)
  })

  test('refuses a media file with a query string stuck on the end', () => {
    expect(isPageUrl('https://cdn.example.com/clip.mp4?token=abc')).toBe(false)
  })

  test('refuses anything that is not http', () => {
    expect(isPageUrl('ftp://example.com/page')).toBe(false)
  })
})

describe('parseNotes', () => {
  test('keeps every field the writer reads', () => {
    // Act
    const notes = parseNotes(REPLY)

    // Assert
    expect(notes.formats).toHaveLength(1)
    expect(notes.formats[0]?.name).toBe('Myth vs fact')
    expect(notes.examples[0]?.lengthSeconds).toBe(28)
    expect(notes.coverage).toContain('Found no Shorts at all')
  })

  test('drops a format’s media-file link but keeps the format', () => {
    // A format observed on a page we may not link to is still an observation.
    const notes = parseNotes({
      ...REPLY,
      formats: [{ ...FORMAT, whereSeen: ['https://cdn.example.com/clip.mp4'] }],
    })

    expect(notes.formats).toHaveLength(1)
    expect(notes.formats[0]?.whereSeen).toHaveLength(0)
  })

  test('drops an example whose url is a media file', () => {
    const notes = parseNotes({
      ...REPLY,
      examples: [{ ...EXAMPLE, url: 'https://cdn.example.com/clip.mov' }],
    })

    expect(notes.examples).toHaveLength(0)
  })

  test('drops a half-example rather than handing it to the writer', () => {
    // Arrange — no sourceNote, which the report requires on every row.
    const withoutSource = without(EXAMPLE, 'sourceNote')

    // Act
    const notes = parseNotes({ ...REPLY, examples: [withoutSource] })

    // Assert
    expect(notes.examples).toHaveLength(0)
  })

  test('leaves a number out rather than inventing one', () => {
    const withoutLength = without(EXAMPLE, 'lengthSeconds')

    const notes = parseNotes({ ...REPLY, examples: [withoutLength] })

    expect(notes.examples[0]?.lengthSeconds).toBeNull()
    expect(notes.examples[0]?.views).toBeNull()
  })

  test('an unknown basis becomes guidance, never posts', () => {
    // `posts` is a claim that we measured something. Unknown must not promote.
    const notes = parseNotes({
      ...REPLY,
      hookNotes: [{ text: 'Something', basis: 'vibes' }],
    })

    expect(notes.hookNotes[0]?.basis).toBe('guidance')
  })

  test('a bare string note is a note with no basis', () => {
    const notes = parseNotes({ ...REPLY, topicNotes: ['Leash reactivity'] })

    expect(notes.topicNotes[0]).toEqual({ text: 'Leash reactivity', basis: 'guidance' })
  })

  test('accepts snake_case, because a model returns either', () => {
    const notes = parseNotes({
      ...REPLY,
      formats: [{ ...FORMAT, howItGoes: undefined, how_it_goes: 'As observed' }],
      hookNotes: undefined,
      hook_notes: [{ text: 'From snake case', basis: 'posts' }],
    })

    expect(notes.formats[0]?.howItGoes).toBe('As observed')
    expect(notes.hookNotes[0]?.text).toBe('From snake case')
  })

  test('garbage in is empty notes out, not a throw', () => {
    expect(parseNotes(null).formats).toHaveLength(0)
    expect(parseNotes('nope').coverage).toBe('')
    expect(parseNotes({ formats: 'not an array' }).formats).toHaveLength(0)
  })
})

describe('notesAreUsable', () => {
  test('a format is enough to write from', () => {
    const notes = parseNotes({ formats: [FORMAT], coverage: 'x' })

    expect(notesAreUsable(notes)).toBe(true)
  })

  test('claims alone are enough — a thin niche is a finding, not a failure', () => {
    // Rule 11: a niche with no linkable public short video still gets a report,
    // written from guidance with an empty examples list.
    const notes = parseNotes({
      topicNotes: [{ text: 'Leash reactivity', basis: 'guidance' }],
      coverage: 'No public short video found.',
    })

    expect(notesAreUsable(notes)).toBe(true)
  })

  test('examples without any formats or claims are not enough', () => {
    // Deliberate: the write leg would have nothing to shape, and a model asked
    // to write a report from nothing writes one anyway. That is the placeholder
    // reply this whole change exists to stop.
    const notes = parseNotes({ examples: [EXAMPLE], coverage: 'x' })

    expect(notesAreUsable(notes)).toBe(false)
  })

  test('empty notes are not usable', () => {
    expect(notesAreUsable(parseNotes(null))).toBe(false)
  })
})

describe('notesBrief', () => {
  test('says "none recorded" rather than leaving a gap for the writer to fill', () => {
    // Arrange
    const sparse: ResearchNotes = parseNotes({
      topicNotes: [{ text: 'Leash reactivity', basis: 'guidance' }],
    })

    // Act
    const brief = notesBrief(sparse)

    // Assert
    expect(brief).toContain('Formats observed: none recorded.')
    expect(brief).toContain('Posts found: none.')
    expect(brief).toContain('Hook notes: nothing recorded.')
  })

  test('carries the urls, so the writer copies rather than invents them', () => {
    const brief = notesBrief(parseNotes(REPLY))

    expect(brief).toContain('https://www.instagram.com/p/abc123/')
    expect(brief).toContain('https://www.tiktok.com/@someone/video/123')
  })

  test('says which numbers the page actually showed', () => {
    const brief = notesBrief(parseNotes(REPLY))

    expect(brief).toContain('Numbers the page showed: 28s')
  })

  test('says "none" where a page showed no numbers at all', () => {
    const bare = without(EXAMPLE, 'lengthSeconds')
    const brief = notesBrief(parseNotes({ ...REPLY, examples: [bare] }))

    expect(brief).toContain('Numbers the page showed: none')
  })

  test('carries the coverage line, which tells thin from truncated', () => {
    const brief = notesBrief(parseNotes(REPLY))

    expect(brief).toContain('What the research covered: Searched TikTok')
  })
})

describe('notesCountLine', () => {
  test('counts every section, so Railway can tell the legs apart', () => {
    expect(notesCountLine(parseNotes(REPLY))).toBe(
      'formats=1 hooks=1 topics=1 lengths=1 patterns=1 examples=1 pages=1',
    )
  })
})

/**
 * The parser keeps at least what leg one was asked for (D137).
 *
 * The ask is sized to fit the output ceiling; the keep is sized not to punish a
 * model that overshoots it. They may differ — both passing dog-trainer runs
 * recorded six formats where four were asked for — but only in one direction. A
 * keep below the ask would silently discard work already paid for, which is the
 * same class of mistake as discarding a truncated reply.
 */
describe('the parser keeps at least what the prompt asks for', () => {
  test.each([
    ['formats', NOTE_KEEP_CAPS.formats, RESEARCH_NOTE_CAPS.formats],
    ['examples', NOTE_KEEP_CAPS.examples, RESEARCH_NOTE_CAPS.examples],
    ['hookNotes', NOTE_KEEP_CAPS.hookNotes, RESEARCH_NOTE_CAPS.hookNotes],
    ['topicNotes', NOTE_KEEP_CAPS.topicNotes, RESEARCH_NOTE_CAPS.topicNotes],
    ['lengthNotes', NOTE_KEEP_CAPS.lengthNotes, RESEARCH_NOTE_CAPS.lengthNotes],
    ['patternNotes', NOTE_KEEP_CAPS.patternNotes, RESEARCH_NOTE_CAPS.patternNotes],
    ['pages', NOTE_KEEP_CAPS.pages, RESEARCH_NOTE_CAPS.pages],
  ])('%s', (_section, keep, ask) => {
    expect(keep).toBeGreaterThanOrEqual(ask)
  })

  test('and does not keep so many that the notes stop being notes', () => {
    // The old caps were 12 examples and 20 pages, which is a document rather
    // than a set of notes — and leg two pays for every line of it.
    expect(NOTE_KEEP_CAPS.examples).toBeLessThanOrEqual(8)
    expect(NOTE_KEEP_CAPS.pages).toBeLessThanOrEqual(12)
  })
})
