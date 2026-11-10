'use client'

/**
 * The one modal the public site uses: the lead form and the 390px nav drawer.
 *
 * It is a thin wrapper over the Radix dialog that @mirrorline/ui exports, so
 * the public site and the studio trap focus, handle Escape and restore focus
 * in exactly the same way. The wrapper exists only to make the two shapes the
 * marketing pages need — a centred panel and a right-hand drawer — one prop
 * apart, and to guarantee every dialog has a title.
 */

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@mirrorline/ui'
import * as React from 'react'

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side={variant === 'drawer' ? 'right' : 'center'} closeLabel={closeLabel}>
        <div className="flex flex-col gap-1 pr-10">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  )
}
