/**
 * Lead capture for "Start a pilot" and "Book a demo".
 *
 * Tonight there is no CRM and no email service, so a lead is appended to
 * .data/leads.json (git-ignored) and nothing else happens. The handler either
 * stores the lead and says ok, or returns a message the form can show. It
 * never answers ok on a failed write — CLAUDE.md working rules: never silently
 * swallow an error.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { NextResponse } from 'next/server'

// Node APIs, and a file that must not be cached or pre-rendered.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_DIRECTORY = '.data'
const LEADS_FILE = 'leads.json'

const INTENTS = ['pilot', 'demo'] as const
type LeadIntent = (typeof INTENTS)[number]

const MAX_SHORT_FIELD = 200
const MAX_LONG_FIELD = 2000
/** A deliberately loose shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface StoredLead {
  readonly id: string
  readonly intent: LeadIntent
  readonly name: string
  readonly email: string
  readonly company: string
  readonly want: string
  /** ISO-8601 UTC, e.g. '2026-11-09T22:10:00.000Z'. */
  readonly receivedAt: string
}

interface ValidLead {
  readonly intent: LeadIntent
  readonly name: string
  readonly email: string
  readonly company: string
  readonly want: string
}

type Validation = { ok: true; lead: ValidLead } | { ok: false; error: string }

function readField(source: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = source[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  return trimmed
}

/** Never trust the request body: every field is checked before it is stored. */
function validate(body: unknown): Validation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'We could not read that form. Please try again.' }
  }

  const source = body as Record<string, unknown>
  const intent = source.intent
  if (typeof intent !== 'string' || !INTENTS.includes(intent as LeadIntent)) {
    return { ok: false, error: 'We could not tell which form this was. Please try again.' }
  }

  const name = readField(source, 'name', MAX_SHORT_FIELD)
  if (!name) return { ok: false, error: 'Please add your name.' }

  const email = readField(source, 'email', MAX_SHORT_FIELD)
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please check the email address and try again.' }
  }

  const company = readField(source, 'company', MAX_SHORT_FIELD)
  if (!company) return { ok: false, error: 'Please add your company or practice.' }

  const want = readField(source, 'want', MAX_LONG_FIELD)
  if (!want) return { ok: false, error: 'Please tell us what you want, in a line or two.' }

  return { ok: true, lead: { intent: intent as LeadIntent, name, email, company, want } }
}

function leadsPath(): string {
  return path.join(process.cwd(), DATA_DIRECTORY, LEADS_FILE)
}

/** An absent file is an empty list; a corrupt file is an error we surface. */
async function readLeads(filePath: string): Promise<readonly StoredLead[]> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (error: unknown) {
    if (isMissingFile(error)) return []
    throw error
  }

  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} does not hold a list of leads`)
  }
  return parsed as readonly StoredLead[]
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

const WRITE_FAILED_MESSAGE =
  'We could not save your details, so nothing was sent. Please email hello@mirrorline.example and we will pick it up from there.'

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'We could not read that form. Please try again.' },
      { status: 400 },
    )
  }

  const validation = validate(body)
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 })
  }

  const filePath = leadsPath()
  const lead: StoredLead = {
    id: `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ...validation.lead,
    receivedAt: new Date().toISOString(),
  }

  try {
    await mkdir(path.dirname(filePath), { recursive: true })
    const existing = await readLeads(filePath)
    // A new array, never a push onto the one we read.
    const next = [...existing, lead]
    await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  } catch (error: unknown) {
    // Detail stays on the server; the visitor gets one clear sentence.
    console.error(`[leads] could not append to ${filePath}: ${getErrorMessage(error)}`)
    return NextResponse.json({ ok: false, error: WRITE_FAILED_MESSAGE }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 })
}
