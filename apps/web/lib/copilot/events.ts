/**
 * The wire contract: one JSON object per line, and how a browser reads it.
 *
 * `respond.ts` explains why the stream is newline-delimited JSON rather than
 * Server-Sent Events — `EventSource` cannot POST, and a question belongs in a
 * body rather than in a URL that something downstream will log. This module
 * is the other half of that decision: the union both ends agree on, and the
 * two pure functions a client needs to turn bytes back into events.
 *
 * ## Why this is not in `adapter.ts`, where it started
 *
 * Because `server-only.test.ts` walks the import graph and fails if any
 * `'use client'` module can reach the adapter at any depth — and it reads
 * `from '…'` without distinguishing a type-only import, which is the right
 * conservatism: the dangerous version of that mistake is always transitive.
 * C2's panel needs the event shape and must never be able to reach the SDK,
 * so the shape moved down here and the adapter re-exports it. Nothing about
 * the contract changed.
 *
 * The type imports below are erased at build time, so a browser bundle that
 * imports this module pulls in neither the corpus nor the canned answers.
 */

import type { Citation, CopilotAnswer, CopilotMode, Proposal } from './canned'
import type { Usage } from './spend'

export type CopilotErrorKind =
  | 'rate-limited'
  | 'unreachable'
  | 'refused'
  | 'cap-reached'
  | 'request-too-large'
  | 'failed'

export type CopilotEvent =
  | { readonly type: 'meta'; readonly mode: CopilotMode; readonly notice: string | null }
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'citation'; readonly citation: Citation }
  | { readonly type: 'proposal'; readonly proposal: Proposal }
  | {
      readonly type: 'done'
      readonly answer: CopilotAnswer
      readonly usage: Usage
      readonly spendSummary: string | null
    }
  | { readonly type: 'error'; readonly kind: CopilotErrorKind; readonly message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLink(value: unknown): boolean {
  return isRecord(value) && typeof value.label === 'string' && typeof value.href === 'string'
}

/**
 * One line to one event, or null when it is not one.
 *
 * Null rather than a throw, and null rather than a half-built object. A
 * stream is read in a loop, and a parser that throws takes the answer down
 * with the bad line; one that returns a partially-typed object puts
 * `undefined` on screen where a sentence should be. Skipping the line and
 * carrying on is the only one of the three that degrades honestly — and the
 * `done` event, which carries the authoritative answer, is validated hardest
 * because everything visible is rebuilt from it.
 */
export function parseEventLine(line: string): CopilotEvent | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  switch (parsed.type) {
    case 'meta':
      if (parsed.mode !== 'live' && parsed.mode !== 'sample') return null
      if (parsed.notice !== null && typeof parsed.notice !== 'string') return null
      return { type: 'meta', mode: parsed.mode, notice: parsed.notice }

    case 'delta':
      if (typeof parsed.text !== 'string') return null
      return { type: 'delta', text: parsed.text }

    case 'citation':
      if (!isLink(parsed.citation)) return null
      return { type: 'citation', citation: parsed.citation as Citation }

    case 'proposal':
      if (!isRecord(parsed.proposal) || typeof parsed.proposal.summary !== 'string') return null
      return { type: 'proposal', proposal: parsed.proposal as unknown as Proposal }

    case 'done': {
      const answer = parsed.answer
      if (!isRecord(answer) || typeof answer.text !== 'string') return null
      if (!Array.isArray(answer.citations)) return null
      return {
        type: 'done',
        answer: answer as unknown as CopilotAnswer,
        usage: (isRecord(parsed.usage) ? parsed.usage : {}) as unknown as Usage,
        spendSummary: typeof parsed.spendSummary === 'string' ? parsed.spendSummary : null,
      }
    }

    case 'error':
      if (typeof parsed.message !== 'string') return null
      return {
        type: 'error',
        kind: typeof parsed.kind === 'string' ? (parsed.kind as CopilotErrorKind) : 'failed',
        message: parsed.message,
      }

    default:
      // An event type we do not know about yet. Ignored rather than treated
      // as a failure, so a server that learns a new one does not break a tab
      // that has not been reloaded.
      return null
  }
}

export interface SplitResult {
  /** Complete lines, in order. */
  readonly lines: readonly string[]
  /** Whatever came after the last newline, to be prepended to the next chunk. */
  readonly rest: string
}

/**
 * Split a buffer on newlines, keeping the unterminated tail.
 *
 * This is the part of stream reading that looks trivial and is not: a chunk
 * boundary falls wherever the network puts it, so a single JSON object
 * routinely arrives in two pieces. Splitting and parsing every piece would
 * drop one event in a long answer and leave no trace of why.
 */
export function splitLines(buffered: string): SplitResult {
  const pieces = buffered.split('\n')
  const rest = pieces.pop() ?? ''
  return { lines: pieces.filter((line) => line.trim().length > 0), rest }
}
