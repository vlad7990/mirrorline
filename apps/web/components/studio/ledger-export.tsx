'use client'

/**
 * The two ledger exports from 15 §5 tab 6.
 *
 * **Both are real.** The CSV is built here and downloaded; the PDF is the
 * browser's own print-to-PDF, which is a genuine PDF of the ledger rather than
 * a button that opens a "coming soon" toast. The studio had exactly that
 * toast until this landed, and a stub is the right answer only while there is
 * no honest alternative — here there is one, and it is four lines. The stub
 * was deleted on 13 November, once nothing pointed at it.
 *
 * The CSV is assembled rather than templated so a value containing a comma
 * cannot split a row. The ledger's own fields are numbers and short week
 * labels today, but a custom KPI name will land in here eventually and
 * "Walk-ins, Tuesdays" would quietly corrupt every row after it.
 */

import { Button } from '@mirrorline/ui'
import { Download, Printer } from 'lucide-react'

import { type LedgerWeek } from '@/components/kpi/sample-dashboard'

const FILE_NAME = 'mirrorline-results-ledger.csv'

const COLUMNS: readonly (readonly [string, (row: LedgerWeek) => number | string])[] = [
  ['Week', (row) => row.week],
  ['Posts', (row) => row.posts],
  ['Views', (row) => row.views],
  ['Sends', (row) => row.sends],
  ['Saves', (row) => row.saves],
  ['Follows', (row) => row.follows],
  ['Leads', (row) => row.leads],
  ['Bookings', (row) => row.bookings],
]

/** RFC 4180: quote every value, and double any quote inside one. */
function csvCell(value: number | string): string {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function toCsv(rows: readonly LedgerWeek[]): string {
  const header = COLUMNS.map(([name]) => csvCell(name)).join(',')
  const body = rows.map((row) => COLUMNS.map(([, read]) => csvCell(read(row))).join(','))
  return [header, ...body].join('\r\n')
}

export function LedgerExport({ rows }: { readonly rows: readonly LedgerWeek[] }) {
  function downloadCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = FILE_NAME
    link.click()
    // Without this the blob stays in memory for the life of the document.
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={downloadCsv}>
        <Download aria-hidden="true" className="size-4" strokeWidth={1.8} />
        Download CSV
      </Button>
      <Button variant="secondary" onClick={() => window.print()}>
        <Printer aria-hidden="true" className="size-4" strokeWidth={1.8} />
        Print or save as PDF
      </Button>
    </div>
  )
}
