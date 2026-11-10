'use client'

/**
 * "Download weekly report (PDF)".
 *
 * The PDF is not built yet, so the button says so instead of pretending to
 * download something. CLAUDE.md non-negotiable 7: no claims we cannot stand
 * behind, including in a button.
 */

import { Button, Toast } from '@mirrorline/ui'
import { useEffect, useState } from 'react'

const TOAST_MS = 4000

export function ReportButton() {
  const [isNoticeOpen, setNoticeOpen] = useState(false)

  useEffect(() => {
    if (!isNoticeOpen) return
    const timer = window.setTimeout(() => setNoticeOpen(false), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [isNoticeOpen])

  return (
    <>
      <Button variant="primary" onClick={() => setNoticeOpen(true)}>
        Download weekly report (PDF)
      </Button>
      <Toast
        open={isNoticeOpen}
        title="Not ready yet"
        description="The weekly report PDF is coming soon."
        onDismiss={() => setNoticeOpen(false)}
      />
    </>
  )
}
