/**
 * Read the JSON a truncated reply *did* finish (D137).
 *
 * ============================================================================
 * Why this exists
 * ============================================================================
 *
 * A research leg that stops on `max_tokens` has a final message and a text block
 * full of notes — and the block ends mid-object, so `JSON.parse` throws and
 * `jsonFrom` returns null. The scan then reports "could not find enough about
 * that niche", having just paid for twenty searches and thrown away every format
 * the model wrote down. One of three measured dog-trainer runs failed exactly
 * that way, 88 tokens from where a passing run finished.
 *
 * This is **not** D136's salvage, which was structurally impossible: that tried
 * to continue a server-side tool conversation with a new turn and the API
 * refuses. Nothing is sent here. The bytes are already in hand; the only
 * question is whether we read the complete half or discard all of it.
 *
 * ============================================================================
 * How it repairs
 * ============================================================================
 *
 * Cut back to a point where a value had *finished*, then close whatever is still
 * open. Candidate cut points are the ends of complete objects, arrays and
 * strings, tried from the latest backwards, so the first success is the longest
 * readable prefix. A brace inside a string is not a cut point, which is why the
 * scan tracks string state rather than counting characters.
 *
 * **A number is never a cut point**, and that is the one rule here with teeth. A
 * reply truncated inside `"views": 12345` would close as `"views": 12` — a
 * figure nobody reported, written into a report as if a page had shown it. Rule
 * 6 and non-negotiable 7 both forbid that, so a value is only kept when its own
 * closing delimiter arrived.
 *
 * It never invents a value either. A half-written member is dropped, not
 * completed — the same direction `notes.ts` already takes with a malformed
 * entry, and the reason `notesAreUsable` is still the gate: repairing the JSON
 * says what arrived, not whether it is enough to write a report from.
 */

import 'server-only'

/**
 * How far back to look for a readable prefix.
 *
 * Bounded because the loop parses at each candidate: a reply with thousands of
 * braces would otherwise turn a failed scan into a slow failed scan. The
 * candidates are tried latest-first, so the bound only ever costs the notes
 * written *earliest* — which, in a reply truncated at the end, is not where the
 * damage is.
 */
const MAX_CUT_POINTS = 1_200

interface PrefixState {
  /** Closers owed, in the order their openers appeared. */
  readonly closers: readonly string[]
  readonly inString: boolean
}

function scanPrefix(prefix: string): PrefixState {
  const closers: string[] = []
  let inString = false
  let escaped = false

  for (const character of prefix) {
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }
    if (character === '{') closers.push('}')
    else if (character === '[') closers.push(']')
    else if (character === '}' || character === ']') closers.pop()
  }

  return { closers, inString }
}

/**
 * Drop the separator a truncation left dangling.
 *
 * Only trailing whitespace and commas. A prefix ending in `:` — a key whose
 * value never arrived — is refused rather than patched, because the honest patch
 * is to drop the key too and an earlier cut point does that correctly.
 */
function withoutDanglingComma(prefix: string): string | null {
  const trimmed = prefix.replace(/[\s,]+$/u, '')
  if (trimmed === '') return null

  // The prefix must end where a value *closed*. A key with no value (`:`) is
  // one way it does not; a bare literal — `12` of `12345`, `tru` of `true` — is
  // the dangerous one, because closing it would parse and would lie.
  return /["}\]]$/u.test(trimmed) ? trimmed : null
}

function repaired(prefix: string): string | null {
  const state = scanPrefix(prefix)
  if (state.inString) return null

  const body = withoutDanglingComma(prefix)
  if (body === null) return null

  return body + [...state.closers].reverse().join('')
}

/**
 * Where a value may have finished: the whole prefix, then each closing
 * delimiter, latest first.
 *
 * `}`, `]` and `"` only. A quote that turns out to have *opened* a string is
 * rejected by `scanPrefix`, and a cut after a key's quote fails to parse, so
 * both are self-correcting — whereas a cut after a digit would parse happily
 * and silently halve a number.
 */
function cutPoints(text: string): readonly number[] {
  const points: number[] = [text.length]

  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (points.length > MAX_CUT_POINTS) break
    const character = text[index]
    if (character === '}' || character === ']' || character === '"') points.push(index + 1)
  }

  return points
}

/**
 * The object a reply meant to return, as far as it got.
 *
 * Returns `null` when nothing parses — including for a reply that was never
 * JSON, so a caller can treat "unreadable" and "truncated past saving" the same
 * way, which is how `parseNotes` already treats them.
 */
export function parsePartialJson(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed === '') return null

  for (const end of cutPoints(trimmed)) {
    const candidate = repaired(trimmed.slice(0, end))
    if (candidate === null) continue
    try {
      return JSON.parse(candidate)
    } catch {
      // This cut point was not a value boundary after all. Try an earlier one.
    }
  }

  return null
}
