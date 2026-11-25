/**
 * The workspace's time zone, checked before it is believed (D97).
 *
 * The value arrives from `Intl.DateTimeFormat().resolvedOptions().timeZone` in
 * the person's browser, which means it arrives as a form field — and a form
 * field is user input whatever generated it. So it is validated here, on the
 * server, before `set_workspace_timezone` is called at all.
 *
 * Two checks rather than one list:
 *
 *  1. **ICU knows the name.** Constructing a formatter with an unknown zone
 *     throws `RangeError`, which is the most complete test available: it accepts
 *     the backward-compatibility aliases a real browser may still send
 *     (`Asia/Calcutta`, `US/Eastern`) that `Intl.supportedValuesOf('timeZone')`
 *     leaves out, and it needs no list to keep up to date.
 *  2. **It is short.** The longest IANA name is 30 characters, so the cap
 *     rejects a long string here rather than somewhere further in.
 *
 * The database checks it a third time, against `pg_timezone_names`, in a trigger
 * no caller can route around. That is the one that cannot be bypassed; this one
 * exists so the normal path never has to produce a `45004`.
 */

/** Generous: the longest IANA name is `America/Argentina/Buenos_Aires`, at 30. */
const MAX_LENGTH = 48

/**
 * The zone a report's dates are rendered in when the workspace has none (D131).
 *
 * D97 refused `not null default 'UTC'` on the column, and that stays right: the
 * *stored* fact has to be able to say "not captured". A **rendered** date has no
 * such option — something gets printed — and the first live report printed
 * "Scanned 25 November" for a scan that finished at 8:31 PM on the 24th, because
 * `toLocaleDateString()` with no zone uses the server's and Vercel's servers run
 * in UTC.
 *
 * So the fallback lives at the point of rendering rather than in the column.
 * Vlad's decision: `America/New_York`, which is where the business is. A
 * workspace that captured its own zone uses that instead, so this is reached
 * only by rows predating D97's capture or whose capture failed.
 */
export const FALLBACK_TIME_ZONE = 'America/New_York'

export function parseTimeZone(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) return null

  try {
    // The constructor is the check. Its result is deliberately unused.
    new Intl.DateTimeFormat('en-GB', { timeZone: trimmed })
  } catch {
    return null
  }

  return trimmed
}

/**
 * What the date is, right now, in a given zone — `YYYY-MM-DD`.
 *
 * The calendar needs this to decide which week to draw and which column is
 * today. `new Date().toISOString().slice(0, 10)` answers the same question for
 * **UTC**, which is a different day for roughly a third of the world for part of
 * every day: a client in Auckland looking at their Monday morning would be
 * shown the week that ended on Sunday.
 *
 * Assembled from `formatToParts` rather than from a formatted string, because
 * the order and the separators of a formatted date are the locale's business.
 * The parts are named, so this does not depend on `en-CA` happening to put the
 * year first.
 *
 * Returns null for a zone ICU does not know, which keeps the "we do not know"
 * path a single one — the same answer `parseTimeZone` gives.
 */
export function localDateIn(timeZone: string, now: Date): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)

    const find = (type: Intl.DateTimeFormatPartTypes): string | undefined =>
      parts.find((part) => part.type === type)?.value

    const year = find('year')
    const month = find('month')
    const day = find('day')

    if (year === undefined || month === undefined || day === undefined) return null

    return `${year}-${month}-${day}`
  } catch {
    return null
  }
}

/**
 * The workspace's zone, or the fallback — never the server's (D131).
 *
 * Takes the stored column, which may be null, empty, or a string somebody typed
 * in 2026 that ICU has since retired. All three answer the same way, because the
 * caller is about to print a date and has nothing to do with the uncertainty.
 */
export function reportTimeZone(stored: string | null | undefined): string {
  return parseTimeZone(stored) ?? FALLBACK_TIME_ZONE
}

/**
 * When a scan finished, as the client reads it — "24 November 2026".
 *
 * **The workspace's zone rather than the viewer's**, and that is a decision
 * rather than a limitation. This date is printed on a PDF we hand to a prospect:
 * two people opening the same delivered report in Miami and in Berlin must see
 * the same "Scanned" line, and a browser-local date would give them different
 * ones for every scan that finished in the evening. The workspace's zone is also
 * the zone the scan's own day is measured in everywhere else (`localDateIn`).
 *
 * Returns null for a timestamp that will not parse, so the caller omits the line
 * rather than printing "Invalid Date" — the rule the cover already follows for a
 * missing fact.
 */
export function formatReportDate(iso: string, timeZone: string | null | undefined): string | null {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null

  // `reportTimeZone` has already rejected anything ICU cannot construct, so the
  // formatter below cannot throw on the zone.
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: reportTimeZone(timeZone),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at)
}
