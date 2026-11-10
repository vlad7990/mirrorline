'use client'

/**
 * The quiet layer: button, card, page header, eyebrow, divider, progress bar.
 *
 * Every rule here comes from DESIGN.md:
 * - "Flat by default: depth comes from 1px borders and the contrast between
 *   surface and background, not shadows."
 * - "Button primary: primary fill, white label, 48px tall (44px minimum)."
 * - "Button secondary: white with a #D6D3CA border and dark text. A tertiary
 *   text button in deep coral is used for low-emphasis actions."
 * - "Keep touch targets at 44px or larger and text contrast at 4.5:1 or higher."
 */

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '../cn'

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

const buttonVariants = cva(
  // Shared: 10px radius, label type, no shadow, and a disabled state that
  // still reads at 4.5:1 against its own fill.
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md font-body text-label font-semibold',
    'transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-55',
  ].join(' '),
  {
    variants: {
      variant: {
        /** One per section. DESIGN.md: white text only on primary or ink. */
        primary: 'bg-primary text-on-primary hover:bg-primary-hover',
        /** White with a border-strong outline and dark text. */
        secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-subtle',
        /**
         * Low-emphasis text button in deep coral. In dark mode the deep coral
         * reaches only 3.5:1 on surface, so the lighter accent takes over —
         * that holds the 4.5:1 floor without inventing a colour.
         */
        tertiary: 'bg-transparent text-primary underline-offset-4 hover:underline dark:text-accent',
        /** No fill until hover. For icon rows and toolbars. */
        ghost: 'bg-transparent text-text hover:bg-surface-subtle',
      },
      size: {
        /** 48px — the primary action. */
        lg: 'h-12 px-5',
        /** 44px — the minimum touch target DESIGN.md sets. */
        md: 'h-11 px-4',
        /** 44px square, for an icon-only control. */
        icon: 'h-11 w-11 px-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md', fullWidth: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'fullWidth'> {
  /** Render the child element instead of a <button> — a link that looks like one. */
  asChild?: boolean
  /** Stretch to the container width. */
  fullWidth?: boolean
  /** Show a spinner and block interaction while an action is in flight. */
  loading?: boolean
  /** Announced alongside the label while loading. */
  loadingLabel?: string
}

/**
 * `asChild` composes onto a link or a Radix trigger. The spinner is dropped in
 * that mode, because Slot accepts exactly one child.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    asChild = false,
    className,
    variant,
    size,
    fullWidth = false,
    loading = false,
    loadingLabel = 'Working',
    disabled,
    children,
    type,
    ...props
  },
  ref,
) {
  // DESIGN.md gives the primary button 48px and everything else 44px.
  const resolvedSize = size ?? (variant === 'primary' ? 'lg' : 'md')
  const classes = cn(buttonVariants({ variant, size: resolvedSize, fullWidth }), className)

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      // An explicit type stops a button inside a form from submitting it.
      type={type ?? 'button'}
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" strokeWidth={2} />
          <span className="sr-only">{loadingLabel}</span>
        </>
      ) : null}
      {children}
    </button>
  )
})

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

const cardVariants = cva('rounded-lg border', {
  variants: {
    tone: {
      /** The default: white on the warm page, 1px border, no shadow. */
      surface: 'border-border bg-surface text-text',
      /** The dark insight panel. At most one or two per screen. */
      ink: 'border-ink bg-ink text-on-ink',
      /** A quiet inset block inside another card. */
      subtle: 'border-border bg-surface-subtle text-text',
      /** An empty slot waiting for content. */
      dashed: 'border-dashed border-border-strong bg-surface text-text',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-[22px]',
      lg: 'p-8',
    },
    selected: {
      /** DESIGN.md "Elevation": selection is a 2px ink border, never a shadow. */
      true: 'border-2 border-ink',
      false: '',
    },
  },
  defaultVariants: { tone: 'surface', padding: 'md', selected: false },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Render as <section>, <article>, … when the card is a landmark. */
  as?: 'div' | 'section' | 'article' | 'aside' | 'li'
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { as, className, tone, padding, selected, ...props },
  ref,
) {
  // The tag varies at runtime, but TypeScript would otherwise intersect the
  // props and refs of every allowed element and reject all of them. Every
  // option here is a plain block container, so typing it as the default is
  // accurate for props and for the ref.
  const Component = (as ?? 'div') as 'div'

  return (
    <Component
      ref={ref}
      className={cn(cardVariants({ tone, padding, selected }), className)}
      {...props}
    />
  )
})

/* -------------------------------------------------------------------------- */
/* Eyebrow                                                                     */
/* -------------------------------------------------------------------------- */

export type EyebrowProps = React.HTMLAttributes<HTMLSpanElement>

/**
 * The only uppercase type in the system. DESIGN.md "Typography — Case":
 * "Uppercase only for small section eyebrows (12–13px, letter-spacing 0.06em)."
 * The `.eyebrow` utility in theme.css carries size, weight and tracking.
 */
export function Eyebrow({ className, ...props }: EyebrowProps) {
  return <span className={cn('eyebrow', className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/* PageHeader                                                                  */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The small line above the title. Write it in sentence case; CSS uppercases it. */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  /** One calm line under the title. */
  description?: React.ReactNode
  /** The primary action, right-aligned on wide screens. */
  action?: React.ReactNode
  /** h1 on a page, h2 inside a section. */
  headingLevel?: 1 | 2
}

/**
 * DESIGN.md "Layout": "a page header with a small eyebrow, a title and the
 * primary action on the right."
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  headingLevel = 1,
  className,
  ...props
}: PageHeaderProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)} {...props}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Heading className="m-0 font-heading text-headline text-text">{title}</Heading>
        {description ? (
          <p className="m-0 max-w-[62ch] text-body text-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/* Divider                                                                     */
/* -------------------------------------------------------------------------- */

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
}

/** A 1px border-token line. DESIGN.md "components.divider". */
export function Divider({ orientation = 'horizontal', className, ...props }: DividerProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        'border-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* ProgressBar                                                                 */
/* -------------------------------------------------------------------------- */

export interface ProgressBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Current value, clamped into [min, max]. */
  value: number
  /** Defaults to 100. */
  max?: number
  min?: number
  /**
   * What the bar measures, e.g. "Posts used this month". Required: a bar with
   * no name is a decoration a screen reader cannot explain.
   */
  label: string
  /** Spoken instead of the raw number, e.g. "63 of 90 posts". */
  valueText?: string
}

/** 6px. DESIGN.md "components.progress-bar". */
const PROGRESS_HEIGHT = 'h-1.5'

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** Accent fill on a border track, fully rounded, 6px tall. */
export function ProgressBar({
  value,
  max = 100,
  min = 0,
  label,
  valueText,
  className,
  ...props
}: ProgressBarProps) {
  // A zero-width range would divide by zero; widen it rather than throw.
  const safeMax = max > min ? max : min + 1
  const current = clamp(value, min, safeMax)
  const percent = ((current - min) / (safeMax - min)) * 100

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={current}
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuetext={valueText}
      className={cn('w-full overflow-hidden rounded-full bg-border', PROGRESS_HEIGHT, className)}
      {...props}
    >
      <div
        className={cn('rounded-full bg-accent transition-[width] duration-300', PROGRESS_HEIGHT)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
