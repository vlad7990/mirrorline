'use client'

/**
 * The one modal the public site uses: the lead form and the 390px nav drawer.
 *
 * It is built on the native `<dialog>` element opened with `showModal()`, which
 * gives us the focus trap, the Escape key, the inert background and the
 * top-layer stacking without shipping a second overlay library into the
 * marketing bundle. `@mirrorline/ui` owns the studio's overlays; this stays
 * local, as the brief asks, rather than reaching into packages/ui.
 *
 * DESIGN.md: 16px radius on wizard-sized panels, 1px borders instead of
 * shadows, 44px touch targets, one visible focus ring (theme.css sets it).
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { IconX } from './icons'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the dialog for screen readers; rendered as the visible title. */
  title: string
  /** One optional line under the title. */
  description?: string
  /** 'center' for the lead form, 'drawer' for the mobile navigation. */
  variant?: 'center' | 'drawer'
  /** Label on the close button, e.g. "Close menu". */
  closeLabel?: string
  children: React.ReactNode
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  variant = 'center',
  closeLabel = 'Close',
  children,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      return
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Escape and the backdrop both fire `close`; this keeps React's state in step.
  const handleClose = React.useCallback(() => onOpenChange(false), [onOpenChange])

  // A click that lands on the dialog element itself is a click on the backdrop,
  // because the panel below fills the dialog's own box.
  const handleBackdropClick = React.useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onOpenChange(false)
    },
    [onOpenChange],
  )

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className={cn(
        // The element itself is only a positioning box; the panel below is the
        // visible surface, so a click here means "backdrop".
        'm-0 max-h-none max-w-none bg-transparent p-0 text-text backdrop:bg-ink/55',
        variant === 'center'
          ? 'fixed inset-0 h-full w-full place-items-center overflow-y-auto open:grid'
          : 'fixed inset-y-0 right-0 left-auto h-full w-full max-w-[380px]',
      )}
    >
      <div
        className={cn(
          'flex w-full flex-col border border-border bg-surface',
          variant === 'center'
            ? 'my-6 max-w-[520px] rounded-xl sm:my-10'
            : 'h-full overflow-y-auto border-y-0 border-r-0',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="m-0 font-heading text-title text-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="m-0 text-meta text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-m-2.5 inline-grid size-11 shrink-0 place-items-center rounded-md text-text-muted hover:bg-surface-subtle hover:text-text"
          >
            <IconX size={20} />
            <span className="sr-only">{closeLabel}</span>
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </dialog>
  )
}
