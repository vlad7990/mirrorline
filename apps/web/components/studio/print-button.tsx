'use client'

import { Button } from '@mirrorline/ui'
import { Printer } from 'lucide-react'

/**
 * "Print or save as PDF", in one place (D120).
 *
 * ## The label is the honest one, and it was already here
 *
 * `LedgerExport` has shipped this exact control since 13 November, with this
 * exact wording. It is kept rather than improved: the button opens the
 * browser's print dialog, and "Download PDF" would promise a file appearing in
 * the downloads folder. Saving as PDF is one choice in that dialog and
 * printing is the other, so the label names both and over-promises neither.
 *
 * Extracted here because the niche report needs the same control, and the
 * version that existed was welded to the ledger's CSV builder — reusing it
 * would have meant the report importing `LedgerWeek`.
 *
 * ## Why there is no PDF library behind it
 *
 * `globals.css` carries the full reasoning. In short: jsPDF or
 * `@react-pdf/renderer` would lay the document out a second time, with a
 * second engine, and the printed copy would drift from the screen the first
 * time somebody changed one of them. The browser's typesetter agrees with the
 * screen by construction, and it is already installed.
 *
 * ## `data-print-hide`
 *
 * Set here rather than by every caller, because a control printing itself
 * onto the document it produced is the detail that makes a report look
 * unfinished to the prospect it was sent to — and that is not a thing worth
 * re-remembering at each call site.
 */
export function PrintButton({ label = 'Print or save as PDF' }: { readonly label?: string }) {
  return (
    <Button data-print-hide variant="secondary" onClick={() => window.print()}>
      <Printer aria-hidden="true" className="size-4" strokeWidth={1.8} />
      {label}
    </Button>
  )
}
