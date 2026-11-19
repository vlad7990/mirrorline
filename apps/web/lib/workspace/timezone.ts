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
