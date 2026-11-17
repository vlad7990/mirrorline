/**
 * What both co-pilot routes do, so neither has to do it twice.
 *
 * Validation, rate limiting and the streaming response shape are identical
 * across the two surfaces; the model, the prompt and the grounding are not,
 * and those live in `lib/copilot`. This file is the HTTP half.
 *
 * ## Why the body is newline-delimited JSON
 *
 * One JSON object per line, `application/x-ndjson`. The alternative is
 * Server-Sent Events, which is the standard and would be the right answer if
 * these were GETs — but `EventSource` cannot issue a POST, and a question
 * belongs in a body rather than a query string (§3.3: nothing is logged with
 * an identifier, and a URL is the most logged thing there is). NDJSON over
 * `fetch` is readable with the streams API that C2 and C3 will already be
 * using, and a line is a complete event with nothing to reassemble.
 *
 * ## Rate limiting, and the identifier it does not keep
 *
 * 18 §3.3 asks for a per-IP limit that "says so when it trips rather than
 * failing silently", and in the same breath forbids storing personal data. An
 * IP is personal data. So the limiter keys on a truncated SHA-256 of the
 * address with a per-process salt: enough to count requests from one visitor
 * inside one window, not enough to recover the address or to match it against
 * anything else. **The questions themselves are never stored or logged.**
 *
 * The window is in process memory, which means it is per instance rather than
 * global — the same honest limitation `spend.ts` has, and acceptable for the
 * same reason: there is no key yet, so there is nothing behind it to protect
 * but the canned replies.
 */

import { createHash, randomBytes } from 'node:crypto'

import { NextResponse } from 'next/server'

import { askCopilot, type CopilotEvent } from '@/lib/copilot/adapter'
import type { CopilotSurface } from '@/lib/copilot/canned'

/** Long enough for a real question, short enough that nobody pastes a book. */
export const MAX_QUESTION_CHARS = 1_000

/** Per IP, per window. Generous for a person, useless for a script. */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

/**
 * A per-process salt, so a hashed address cannot be looked up from outside.
 *
 * Regenerated on every boot on purpose: a stable salt would make the hashes
 * comparable across restarts, which is the beginning of a record of who
 * visited.
 */
const SALT = randomBytes(16).toString('hex')

const windows = new Map<string, number[]>()

function visitorKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const address = forwarded.split(',')[0]?.trim() || 'unknown'
  return createHash('sha256').update(`${SALT}:${address}`).digest('hex').slice(0, 16)
}

/** Only for tests: the window is process-local. */
export function resetRateLimits(): void {
  windows.clear()
}

export interface RateDecision {
  readonly allowed: boolean
  readonly retryAfterSeconds: number
}

export function checkRate(request: Request, now: number = Date.now()): RateDecision {
  const key = visitorKey(request)
  const since = now - RATE_WINDOW_MS
  const recent = (windows.get(key) ?? []).filter((at) => at > since)

  if (recent.length >= RATE_LIMIT) {
    const oldest = recent[0] ?? now
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000)),
    }
  }

  windows.set(key, [...recent, now])
  return { allowed: true, retryAfterSeconds: 0 }
}

export type QuestionResult =
  | { readonly ok: true; readonly question: string }
  | { readonly ok: false; readonly error: string }

/** Never trust the body, whatever the form did first. */
export function validateQuestion(body: unknown): QuestionResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'We could not read that request.' }
  }

  const question = (body as Record<string, unknown>).question
  if (typeof question !== 'string') {
    return { ok: false, error: 'Ask a question and I will try to answer it.' }
  }

  const trimmed = question.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: 'Ask a question and I will try to answer it.' }
  }
  if (trimmed.length > MAX_QUESTION_CHARS) {
    return {
      ok: false,
      error: `That is longer than I can take in one go — ${MAX_QUESTION_CHARS} characters at most.`,
    }
  }

  return { ok: true, question: trimmed }
}

function line(event: CopilotEvent): string {
  return `${JSON.stringify(event)}\n`
}

/**
 * Turn the adapter's events into a streaming response.
 *
 * A failure part-way through is emitted as an `error` event on the open
 * stream rather than thrown: the headers have already gone, so there is no
 * status code left to change, and a stream that simply stops is the thing
 * §3.3 calls failing silently.
 */
export function streamAnswer(
  surface: CopilotSurface,
  question: string,
  workspaceId: string,
): Response {
  const encoder = new TextEncoder()

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of askCopilot({ surface, question, workspaceId })) {
          controller.enqueue(encoder.encode(line(event)))
        }
      } catch (error: unknown) {
        console.error(`[copilot] ${surface} stream failed`, error)
        controller.enqueue(
          encoder.encode(
            line({
              type: 'error',
              kind: 'failed',
              message: 'Something went wrong answering that.',
            }),
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      // Nothing here may be cached by anything in front of us: the answer is
      // per question, and a shared cache holding one would serve a stranger's.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

/** The whole of a route handler, minus which surface it is. */
export async function respond(
  request: Request,
  surface: CopilotSurface,
  workspaceId: string,
): Promise<Response> {
  const rate = checkRate(request)
  if (!rate.allowed) {
    // Said out loud, with the standard header, rather than failing quietly.
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many questions in a short space of time. Try again in a minute.',
      },
      { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'We could not read that request.' },
      { status: 400 },
    )
  }

  const validation = validateQuestion(body)
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 })
  }

  return streamAnswer(surface, validation.question, workspaceId)
}
