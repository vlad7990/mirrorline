/**
 * What survives an aborted research leg (D136).
 *
 * The first live run of the two-leg scan hit the 24-search ceiling in 103
 * seconds **with nothing written**:
 *
 *     [niche-scan research] stopped by the searches budget after 103s of 270s · 24 of 24
 *     [niche-scan] leg 1 research: … formats=0 hooks=0 topics=0 lengths=0 patterns=0 examples=0 pages=0
 *
 * The research was not lost — the search *results* are content blocks of the
 * aborted message — but the notes were never written, so the scan failed with
 * twenty-four searches paid for and nothing to show.
 *
 * `salvageableContent` is what makes the recovery call safe to send: an aborted
 * stream can leave a half-built final block, and re-sending that is a 400.
 */

import { describe, expect, test } from 'vitest'

import { salvageableContent } from './research'

/** The shape the SDK assembles: a search, its result, then the model's prose. */
const SEARCH = { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: {} }
const RESULT = { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [] }
const TEXT = { type: 'text', text: 'Myth-vs-fact is the dominant format.', citations: [] }

function message(content: readonly unknown[]) {
  return { content } as never
}

describe('salvageableContent', () => {
  test('keeps every completed search and its result', () => {
    // Arrange — two full search/result pairs.
    const partial = message([SEARCH, RESULT, SEARCH, RESULT])

    // Act
    const kept = salvageableContent(partial)

    // Assert
    expect(kept).toHaveLength(4)
  })

  test('drops a trailing search whose result never arrived', () => {
    // The 400 this function exists to prevent: a `server_tool_use` with no
    // matching `web_search_tool_result` is an unpaired block, and the abort
    // happens precisely when one is in flight.
    const partial = message([SEARCH, RESULT, SEARCH])

    const kept = salvageableContent(partial)

    expect(kept).toHaveLength(2)
    expect(kept[1]).toEqual(RESULT)
  })

  test('drops trailing prose, which may be half a sentence', () => {
    // Losing a partial sentence costs nothing: the model is about to be asked
    // to write the notes again from the results above it.
    const partial = message([SEARCH, RESULT, TEXT])

    expect(salvageableContent(partial)).toHaveLength(2)
  })

  test('salvages nothing when no search had completed', () => {
    // Aborted before reading anything. There is no research to write up, and a
    // salvage call would invent one — which is the placeholder reply all over
    // again.
    expect(salvageableContent(message([SEARCH]))).toHaveLength(0)
    expect(salvageableContent(message([TEXT]))).toHaveLength(0)
  })

  test('salvages nothing from an empty or absent message', () => {
    expect(salvageableContent(null)).toHaveLength(0)
    expect(salvageableContent(message([]))).toHaveLength(0)
  })
})
