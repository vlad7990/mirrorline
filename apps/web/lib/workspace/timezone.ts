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
