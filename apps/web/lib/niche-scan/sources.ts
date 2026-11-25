/**
 * A report's sources come from the notes, not from the writer (D138).
 *
 * ============================================================================
 * The bug: sources=0 while pages=8
 * ============================================================================
 *
 * A **passing** eval run — 157 seconds, 18 searches, a report with formats and
 * videos — listed no sources at all, while the notes it was written from held
 * eight pages with titles and urls. Nothing was broken in the sense of throwing:
 * `sourcesUsed` was simply absent from `REPORT_SCHEMA`'s `required` list, so the
 * model was free to leave it out, and under length pressure a field that is
 * *copying* rather than *writing* is the first thing to go.
 *
 * That is a quiet kind of wrong. A niche report whose claims cite nothing reads
 * as an assertion from us rather than a reading of the web, and "where did this
 * come from" is the first question anybody sensible asks of it.
 *
 * ============================================================================
 * The fix: derive it, and stop asking
 * ============================================================================
 *
 * The sources were never the writer's to invent. Rule 10 already defined them as
 * "the pages the notes say were read … and nothing else", which is a mechanical
 * copy — so the write prompt no longer asks for them and the schema no longer
 * carries them. They are built here, in code, from the notes themselves.
 *
 * Three wins, and the third is the one that matters:
 *
 * 1. **It cannot be dropped.** Every accepted report lists its sources whenever
 *    the notes held a url, because no model decides whether to bother.
 * 2. **It is cheaper.** Eight pages of titles and urls is a few hundred output
 *    tokens of pure transcription, in a leg whose ceiling is the thing D137 just
 *    had to raise.
 * 3. **A url cannot be invented here.** A writer transcribing links can mistype
 *    one into a page that does not exist; a copy cannot. We hold the pointer,
 *    never the work (non-negotiable 1), so the pointer had better be the one the
 *    research actually read.
 *
 * Merged **before** `reviewReport`, because `counts.sources` feeds its substance
 * test — deriving afterwards would make a thin-but-real report look thinner to
 * the one check that decides whether to keep it.
 */

import 'server-only'

import type { PageKind, ResearchNotes } from './notes'

/** A source row as `parseSource` wants it, before validation. */
interface SourceRow {
  readonly title?: string
  readonly url: string
  readonly kind: PageKind
}

/**
 * Every page the notes can account for, best-titled first.
 *
 * Order is what survives deduplication: `parseSources` keeps the first row for a
 * url and caps the list at twelve, so pages — the only rows carrying a real
 * title — go first, and the post urls behind the formats and examples follow. A
 * row with no title becomes its own domain rather than "Untitled", which is
 * `parseSource`'s rule and the honest one: a domain is a fact about a link.
 */
export function noteSourceRows(notes: ResearchNotes): readonly SourceRow[] {
  const pages = notes.pages.map(
    (page): SourceRow => ({ title: page.title, url: page.url, kind: page.kind }),
  )

  // Posts, from both places the notes record them. No title: we read the post,
  // not a page title, and inventing one would be inventing the easiest thing to
  // check.
  const posts = notes.examples.map((example): SourceRow => ({ url: example.url, kind: 'post' }))
  const seenAt = notes.formats.flatMap((format) =>
    format.whereSeen.map((url): SourceRow => ({ url, kind: 'post' })),
  )

  return [...pages, ...posts, ...seenAt]
}

/**
 * The model's reply with its sources filled in from the notes.
 *
 * Any `sourcesUsed` the model did send is kept, and kept *first* — a reply from
 * before this changed, or a stored report being re-parsed, should not lose rows
 * it already had. `parseSources` does the validating, deduplicating and capping;
 * this only decides what is offered to it.
 *
 * A reply that is not an object comes back untouched, so an unparseable or
 * truncated-past-saving reply still fails exactly as it did before.
 */
export function withNoteSources(reply: unknown, notes: ResearchNotes): unknown {
  if (typeof reply !== 'object' || reply === null || Array.isArray(reply)) return reply

  const row = reply as Record<string, unknown>
  const existing = Array.isArray(row.sourcesUsed)
    ? row.sourcesUsed
    : Array.isArray(row.sources_used)
      ? row.sources_used
      : []

  return { ...row, sourcesUsed: [...existing, ...noteSourceRows(notes)] }
}
