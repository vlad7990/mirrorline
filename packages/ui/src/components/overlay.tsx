'use client'

/**
 * Things that sit above the page: the dialog/drawer, tooltips, the alert bar
 * and the success toast.
 *
 * DESIGN.md "Alert bar": "soft red background, dark red text and a solid
 * action button ('Reconnect Instagram')."
 * DESIGN.md "Avoid: gradients, glows and glassmorphism" — the overlay is a
 * flat ink wash, and the panels are the same 1px-bordered surfaces as cards.
 *
 * Radix Dialog gives us focus trapping, Escape-to-close and an inert
 * background for free; we only style it.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../cn'
import { Button } from './primitives'

/* -------------------------------------------------------------------------- */
/* Dialog / Drawer                                                             */
/* -------------------------------------------------------------------------- */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-40 bg-ink/40', className)}
      {...props}
    />
  )
})

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('m-0 font-heading text-title text-text', className)}
      {...props}
    />
  )
})

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('m-0 text-body text-text-muted', className)}
      {...props}
    />
  )
})

export type DialogSide = 'center' | 'right' | 'bottom'

const SIDE_CLASSES: Record<DialogSide, string> = {
  // A centred modal, 16px radius like the wizard panels.
  center:
    'left-1/2 top-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl',
  // The calendar drawer: full height on the right, square against the edge.
  right: 'inset-y-0 right-0 w-[min(420px,100vw)] rounded-l-xl',
  // The phone-width sheet.
  bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl',
}

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: DialogSide
  /** Hide the built-in close button when the content supplies its own. */
  hideClose?: boolean
  /** Label on the close button. */
  closeLabel?: string
}

/**
 * Radix traps focus inside this panel and restores it on close; Escape and an
 * overlay click both dismiss it. Always render a <DialogTitle> inside, or the
 * dialog has no accessible name.
 */
export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  { side = 'center', hideClose = false, closeLabel = 'Close', className, children, ...props },
  ref,
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col gap-4 overflow-y-auto border border-border bg-surface p-6 text-text',
          SIDE_CLASSES[side],
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="absolute right-3 top-3">
              <X aria-hidden="true" className="size-5" strokeWidth={2} />
              <span className="sr-only">{closeLabel}</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

/** The calendar's right-hand drawer. The same dialog, docked to the edge. */
export const Drawer = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  Omit<DialogContentProps, 'side'> & { side?: Exclude<DialogSide, 'center'> }
>(function Drawer({ side = 'right', ...props }, ref) {
  return <DialogContent ref={ref} side={side} {...props} />
})

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps {
  /** The short line of help. Keep it to one sentence. */
  content: React.ReactNode
  /** The element the tooltip describes. Must be focusable. */
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Milliseconds before it appears. */
  delayDuration?: number
}

/**
 * A tooltip is a hint, never the only copy of a fact: anything essential must
 * also be on the page. Wrap the app once in <TooltipProvider>.
 */
export function Tooltip({ content, children, side = 'top', delayDuration = 200 }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 max-w-[260px] rounded-md bg-ink px-2.5 py-1.5',
            'font-body text-meta text-on-ink',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/* -------------------------------------------------------------------------- */
/* AlertBar                                                                    */
/* -------------------------------------------------------------------------- */

export type AlertTone = 'danger' | 'warning' | 'info'

const ALERT_TONES: Record<AlertTone, string> = {
  danger: 'bg-danger-soft text-on-danger-soft',
  warning: 'bg-warning-soft text-on-warning-soft',
  info: 'bg-info-soft text-on-info-soft',
}

// `title` is omitted from the HTML attributes: the native one is a tooltip
// string, ours is the headline.
export interface AlertBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The headline, e.g. "Instagram needs to reconnect." */
  title: React.ReactNode
  /** What it means and what is paused, in one plain sentence. */
  description?: React.ReactNode
  /** The one solid action, e.g. a "Reconnect Instagram" button. */
  action?: React.ReactNode
  tone?: AlertTone
}

/**
 * role="alert" so it is announced the moment it appears.
 *
 * DESIGN.md calls for a "solid action button" here. The reference markup
 * fills that button with dark red and white text, which collides with "Keep
 * white text only on primary (#C8401C) or ink". The rule wins: pass a primary
 * <Button>, which is solid and keeps white text where it is allowed.
 */
export function AlertBar({
  title,
  description,
  action,
  tone = 'danger',
  className,
  ...props
}: AlertBarProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg px-[18px] py-3.5',
        'text-body',
        ALERT_TONES[tone],
        className,
      )}
      {...props}
    >
      <p className="m-0 min-w-0">
        <strong className="font-semibold">{title}</strong>
        {description ? <> {description}</> : null}
      </p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Toast                                                                       */
/* -------------------------------------------------------------------------- */

export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Render it or not. The caller owns the timer. */
  open: boolean
  /** One word or a short phrase: "Published". */
  title: React.ReactNode
  description?: React.ReactNode
  /** Shows a dismiss button when supplied. */
  onDismiss?: () => void
  dismissLabel?: string
}

/**
 * A quiet confirmation. role="status" with aria-live="polite" announces it
 * without interrupting whatever the person is doing.
 */
export function Toast({
  open,
  title,
  description,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
  ...props
}: ToastProps) {
  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3',
        'rounded-lg border border-border bg-surface px-4 py-3 text-text',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-success" />
      <span className="flex flex-col">
        <span className="text-label">{title}</span>
        {description ? <span className="text-meta text-text-muted">{description}</span> : null}
      </span>
      {onDismiss ? (
        <Button variant="ghost" size="icon" onClick={onDismiss}>
          <X aria-hidden="true" className="size-4" strokeWidth={2} />
          <span className="sr-only">{dismissLabel}</span>
        </Button>
      ) : null}
    </div>
  )
}
