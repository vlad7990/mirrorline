/**
 * B2.4's mappers: `ledger_weekly` and `alerts` rows → what the screens render.
 *
 * The three worth proving are the three that would be silent if they broke: a
 * date that shifts by a day, a zero that should survive, and an alert whose
 * two halves do not match its kind.
 */

import { describe, expect, it } from 'vitest'

import { type AlertRow, type LedgerWeeklyRow, toKpiAlerts, toLedgerWeeks } from './results-rows'

function ledgerRow(overrides: Partial<LedgerWeeklyRow> = {}): LedgerWeeklyRow {
  return {
    week: '2026-10-20',
    posts: 12,
    views: 48_000,
    sends: 310,
    saves: 190,
    follows: 164,
    leads: 9,
    bookings: 3,
    sales_usd: null,
    ...overrides,
  }
}

function alertRow(overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id: 'alert-1',
    kpi_key: 'leads',
    status: 'open',
    message: 'Nine leads this week against a target of ten.',
    kind: 'trend',
    weeks_off_track: 2,
    broken_since: null,
    ...overrides,
  }
}

describe('toLedgerWeeks', () => {
  it('formats the stored Monday as a day and a short month', () => {
    const [week] = toLedgerWeeks([ledgerRow({ week: '2026-10-20' })])

    expect(week?.week).toBe('20 Oct')
  })

  it('does not shift the day, whatever the machine timezone is', () => {
    // The failure this guards: `new Date('2026-01-01')` is 31 December in any
    // negative offset, so a ledger week silently moves between a laptop and a
    // runner. The mapper splits the string instead, so the first stays the
    // first.
    const [week] = toLedgerWeeks([ledgerRow({ week: '2026-01-01' })])

    expect(week?.week).toBe('1 Jan')
  })

  it('drops the leading zero from the day, as the designs show', () => {
    const [week] = toLedgerWeeks([ledgerRow({ week: '2026-11-06' })])

    expect(week?.week).toBe('6 Nov')
  })

  it('keeps a zero count, because a week with no posts had none', () => {
    // The opposite of the KPI rule, deliberately: a ledger row is a tally of
    // what we did, not a measurement nobody took. See the module note.
    const [week] = toLedgerWeeks([ledgerRow({ posts: 0, leads: 0 })])

    expect(week?.posts).toBe(0)
    expect(week?.leads).toBe(0)
  })

  it('renders a malformed week as stored rather than hiding the row', () => {
    const [week] = toLedgerWeeks([ledgerRow({ week: '20261020' })])

    expect(week?.week).toBe('20261020')
    expect(week?.posts).toBe(12)
  })

  it('returns nothing for a workspace with no weeks', () => {
    expect(toLedgerWeeks([])).toEqual([])
  })
})

describe('toKpiAlerts', () => {
  it('builds a trend alert, titled from the KPI it names', () => {
    const [alert] = toKpiAlerts([alertRow({ kpi_key: 'leads', weeks_off_track: 2 })])

    expect(alert?.kind).toBe('trend')
    expect(alert?.title).toBe('Leads behind pace for 2 weeks')
    // The message is the pipeline's words, passed through untouched.
    expect(alert?.message).toBe('Nine leads this week against a target of ten.')
  })

  it('falls back to the raw key for a KPI this build does not know', () => {
    const [alert] = toKpiAlerts([alertRow({ kpi_key: 'not_a_kpi' })])

    expect(alert?.title).toBe('not_a_kpi behind pace for 2 weeks')
  })

  it('builds a connection alert with a long-month date', () => {
    const [alert] = toKpiAlerts([
      alertRow({ kind: 'connection', weeks_off_track: null, broken_since: '2026-11-11' }),
    ])

    expect(alert?.kind).toBe('connection')
    expect(alert).toMatchObject({ since: '11 November' })
    // Neither a platform nor a date: the row has no platform, and the date
    // already lives in `since`.
    expect(alert?.title).toBe('Posting has stopped')
  })

  it('drops a trend row with no week count rather than inventing one', () => {
    // Unreachable through `alerts_timing_matches_kind`, which is the point:
    // reaching it means something wrote past the constraint, and the union
    // exists so a half-formed alert cannot be gated on.
    expect(toKpiAlerts([alertRow({ weeks_off_track: null })])).toEqual([])
  })

  it('drops a connection row with no broken-since date', () => {
    expect(
      toKpiAlerts([alertRow({ kind: 'connection', weeks_off_track: null, broken_since: null })]),
    ).toEqual([])
  })

  it('drops a kind this build does not know', () => {
    expect(toKpiAlerts([alertRow({ kind: 'something_new' })])).toEqual([])
  })

  it('never produces a connection alert carrying a week count', () => {
    // The whole reason the two are a union rather than one shape with a flag.
    const alerts = toKpiAlerts([
      alertRow({ kind: 'connection', weeks_off_track: 5, broken_since: '2026-11-11' }),
    ])

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).not.toHaveProperty('weeksOffTrack')
  })

  it('returns nothing for a workspace with no alerts', () => {
    expect(toKpiAlerts([])).toEqual([])
  })
})
