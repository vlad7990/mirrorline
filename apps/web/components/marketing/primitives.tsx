/**
 * Quiet layout pieces shared by every public page.
 *
 * DESIGN.md "Layout": generous white space, an 8px grid, a page header with a
 * small eyebrow and a title. DESIGN.md "Typography — Case": sentence case
 * everywhere, uppercase only for the small eyebrow.
 *
 * CLAUDE.md non-negotiable 7: "Demo data is labelled 'Sample data' on public
 * pages." `SampleDataLabel` is the one way that label gets drawn, so it reads
 * the same everywhere and is easy to audit.
 */

import { cn } from '@mirrorline/ui'
import { TriangleAlert } from 'lucide-react'
import * as React from 'react'

/* -------------------------------------------------------------------------- */
/* Section                                                                     */
/* -------------------------------------------------------------------------- */

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** A quiet alternate band, to separate two sections without a rule. */
  tone?: 'page' | 'subtle'
  /** Tighter vertical rhythm, for short bands. */
  size?: 'md' | 'lg'
}

/** A full-bleed band with a centred 1200px column. */
export function Section({
  tone = 'page',
  size = 'lg',
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        tone === 'subtle' ? 'bg-surface-subtle' : 'bg-background',
        size === 'lg' ? 'py-16 sm:py-20' : 'py-12 sm:py-14',
        className,
      )}
      {...props}
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">{children}</div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* SectionHeading                                                              */
/* -------------------------------------------------------------------------- */

export interface SectionHeadingProps {
  eyebrow?: string
  title: React.ReactNode
  /** One calm line under the title. */
  lead?: React.ReactNode
  /** Sits to the right of the title on wide screens, under it at 390px. */
  aside?: React.ReactNode
  /** h2 inside a page, h3 inside a section. */
  level?: 2 | 3
  id?: string
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  aside,
  level = 2,
  id,
  className,
}: SectionHeadingProps) {
  const Heading = level === 2 ? 'h2' : 'h3'

  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 max-w-[62ch] flex-col gap-2">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        {/* A section head on a public page is a brand surface, so it takes
            the fluid scale rather than the studio's fixed one. A nested h3
            stays on the product scale: it is a label inside a section, not
            the section's own statement. */}
        <Heading
          id={id}
          className={cn(
            'reveal-lead m-0 text-balance font-heading text-text',
            level === 2 ? 'text-section' : 'text-title',
          )}
        >
          {title}
        </Heading>
        {lead ? <p className="reveal m-0 max-w-[62ch] text-body text-text-muted">{lead}</p> : null}
      </div>
      {aside ? <div className="flex shrink-0 items-center gap-3">{aside}</div> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export type SampleDataLabelProps = React.HTMLAttributes<HTMLSpanElement>

/**
 * CLAUDE.md non-negotiable 7. Every demo figure on a public page sits next to
 * one of these. The wording is fixed: "Sample data".
 */
export function SampleDataLabel({ className, ...props }: SampleDataLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3 py-1',
        'text-caption font-semibold text-text-muted',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-border-strong" />
      Sample data
    </span>
  )
}

export interface ComingSoonLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Defaults to "Coming soon"; the pricing page says "Coming later". */
  children?: React.ReactNode
}

/** Post-MVP things carry this, so nothing reads as shipped when it isn't. */
export function ComingSoonLabel({ className, children, ...props }: ComingSoonLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-neutral-soft px-3 py-1',
        'text-caption font-semibold text-on-neutral-soft',
        className,
      )}
      {...props}
    >
      {children ?? 'Coming soon'}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* DraftNotice                                                                 */
/* -------------------------------------------------------------------------- */

export interface DraftNoticeProps {
  /** What the draft covers, e.g. "privacy notice". */
  documentName: string
  className?: string
}

/**
 * The warning that opens /privacy and /terms. The wording is fixed, because
 * the point is that a reader cannot miss it: these pages have not been near a
 * lawyer.
 */
export function DraftNotice({ documentName, className }: DraftNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-warning bg-warning-soft p-4 sm:p-5',
        'text-on-warning-soft',
        className,
      )}
    >
      <span className="mt-0.5">
        <TriangleAlert aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-label font-semibold">
          Draft, not legal advice. This document has not been reviewed by a lawyer.
        </p>
        <p className="m-0 text-meta">
          It is a plain-language placeholder for the {documentName} while we build. A reviewed version
          will replace it before anyone is asked to sign anything.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Prose                                                                       */
/* -------------------------------------------------------------------------- */

export type ProseProps = React.HTMLAttributes<HTMLDivElement>

/** A readable text column for the policy and trust pages. */
export function Prose({ className, ...props }: ProseProps) {
  return (
    <div
      className={cn(
        'flex max-w-[68ch] flex-col gap-4 text-body text-text-muted',
        '[&_strong]:font-semibold [&_strong]:text-text',
        className,
      )}
      {...props}
    />
  )
}
