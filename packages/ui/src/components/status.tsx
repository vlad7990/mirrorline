/**
 * Trust, made visible: status chips, agent pills, the compliance panel and
 * the AI label.
 *
 * DESIGN.md "Do's": "Pair every colour-coded status with a word." Nothing in
 * this file renders a colour on its own — every state ships its noun.
 * DESIGN.md "Status chip": "a soft background and dark text, always with a
 * word: Passed, Needs review, Blocked, Scheduled, Published, Published
 * (private)."
 */

import { Check, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../cn'

/* -------------------------------------------------------------------------- */
/* StatusDot                                                                   */
/* -------------------------------------------------------------------------- */

export type DotTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted' | 'off'

const DOT_TONES: Record<DotTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  muted: 'bg-text-muted',
  off: 'bg-border-strong',
}

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: DotTone
  /** Soft pulse, for an agent that is working right now. */
  pulse?: boolean
}

/**
 * An 8px dot. Decorative by design: the word beside it carries the meaning,
 * so the dot stays hidden from assistive technology.
 */
export function StatusDot({ tone, pulse = false, className, ...props }: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        DOT_TONES[tone],
        pulse && 'pulse-dot',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* StatusChip                                                                  */
/* -------------------------------------------------------------------------- */

export type Status =
  | 'passed'
  | 'needs-review'
  | 'blocked'
  | 'scheduled'
  | 'published'
  | 'published-private'
  | 'approved'

interface StatusStyle {
  /** The word. Never optional — this is the whole point of the chip. */
  word: string
  classes: string
  dot: DotTone
}

/**
 * DESIGN.md "Colors": "green = passed or published, amber = needs review,
 * red = blocked or error, blue = scheduled or info."
 *
 * "Published" is deliberately the neutral grey the reference markup uses, not
 * green: it is a past fact, not a result.
 */
export const STATUS_STYLES: Record<Status, StatusStyle> = {
  passed: { word: 'Passed', classes: 'bg-success-soft text-on-success-soft', dot: 'success' },
  approved: { word: 'Approved', classes: 'bg-success-soft text-on-success-soft', dot: 'success' },
  'needs-review': {
    word: 'Needs review',
    classes: 'bg-warning-soft text-on-warning-soft',
    dot: 'warning',
  },
  blocked: { word: 'Blocked', classes: 'bg-danger-soft text-on-danger-soft', dot: 'danger' },
  scheduled: { word: 'Scheduled', classes: 'bg-info-soft text-on-info-soft', dot: 'info' },
  published: { word: 'Published', classes: 'bg-neutral-soft text-on-neutral-soft', dot: 'muted' },
  'published-private': {
    word: 'Published (private)',
    classes: 'bg-neutral-soft text-on-neutral-soft',
    dot: 'muted',
  },
}

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status
  /** Override the word only to add detail, e.g. "Needs review · 2". */
  children?: React.ReactNode
  /** Add the matching dot. Off by default: the soft fill already codes it. */
  withDot?: boolean
}

/**
 * Soft background, dark text, fully rounded, caption type, always a word.
 *
 * Deliberately sans, and it stays that way. A chip carries a status word, and
 * a status word is the studio telling you where something stands — not a
 * figure the machine measured. "Passed" in Geist Mono would be claiming to be
 * an audit trail. Even the `children` override ("Needs review · 2") stays
 * sans: the count there qualifies the word, it is not a measurement on its own.
 */
export function StatusChip({
  status,
  children,
  withDot = false,
  className,
  ...props
}: StatusChipProps) {
  const style = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'font-body text-caption',
        style.classes,
        className,
      )}
      {...props}
    >
      {withDot ? <StatusDot tone={style.dot} /> : null}
      {children ?? style.word}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* AgentStatusPill                                                             */
/* -------------------------------------------------------------------------- */

export type AgentStatus = 'working' | 'idle' | 'waiting' | 'blocked' | 'off'

interface AgentStatusStyle {
  word: string
  classes: string
  dot: DotTone
  pulse: boolean
}

/**
 * DESIGN.md "Agent status pill": "a dot plus a word: Working (coral), Idle
 * (grey), Waiting for you (amber), Blocked (red), Off."
 */
export const AGENT_STATUS_STYLES: Record<AgentStatus, AgentStatusStyle> = {
  working: {
    word: 'Working',
    classes: 'bg-accent-soft text-on-accent-soft',
    dot: 'accent',
    pulse: true,
  },
  idle: {
    word: 'Idle',
    classes: 'bg-neutral-soft text-on-neutral-soft',
    dot: 'muted',
    pulse: false,
  },
  waiting: {
    word: 'Waiting for you',
    classes: 'bg-warning-soft text-on-warning-soft',
    dot: 'warning',
    pulse: false,
  },
  blocked: {
    word: 'Blocked',
    classes: 'bg-danger-soft text-on-danger-soft',
    dot: 'danger',
    pulse: false,
  },
  off: { word: 'Off', classes: 'bg-neutral-soft text-on-neutral-soft', dot: 'off', pulse: false },
}

export interface AgentStatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: AgentStatus
  /** Shorten "Waiting for you" to "Waiting" in a tight column. */
  short?: boolean
}

export function AgentStatusPill({
  status,
  short = false,
  className,
  ...props
}: AgentStatusPillProps) {
  const style = AGENT_STATUS_STYLES[status]
  const word = short && status === 'waiting' ? 'Waiting' : style.word

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'font-body text-caption',
        style.classes,
        className,
      )}
      {...props}
    >
      <StatusDot tone={style.dot} pulse={style.pulse} />
      {word}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* AiLabel                                                                     */
/* -------------------------------------------------------------------------- */

export type AiLabelProps = React.HTMLAttributes<HTMLSpanElement>

/**
 * DESIGN.md "AI label": "a small white badge reading 'AI scene' on any
 * thumbnail or preview with AI-generated footage."
 *
 * The badge sits on a video thumbnail, which stays one of the dark demo
 * colours in both themes, so it uses the fixed white/ink token pair rather
 * than surface/text — those flip with the theme and the badge would vanish.
 */
export function AiLabel({ className, children = 'AI scene', ...props }: AiLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm bg-on-primary px-1.5 py-0.5',
        'font-body text-caption text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* CompliancePanel                                                             */
/* -------------------------------------------------------------------------- */

export interface ComplianceItem {
  /** The reason, in plain words: "New wording · 12% similar (limit 30%)". */
  label: string
  /** True when the check passed. */
  ok: boolean
}

type PanelStatus = Extract<Status, 'passed' | 'needs-review' | 'blocked'>

export interface CompliancePanelProps extends React.HTMLAttributes<HTMLElement> {
  items: readonly ComplianceItem[]
  /** Defaults to "Compliance agent". */
  title?: string
  /** Derived from the items when omitted. */
  status?: PanelStatus
}

/** Green when everything passed; amber when something still needs a human. */
const PANEL_BORDER: Record<PanelStatus, string> = {
  passed: 'border-success/30',
  'needs-review': 'border-warning/30',
  blocked: 'border-danger/30',
}

/**
 * DESIGN.md "Compliance panel": "green border with a 'Passed' pill and a
 * ticked checklist, e.g. 'No original footage used' and 'New wording · 12%
 * similar (limit 30%)'."
 */
export function CompliancePanel({
  items,
  title = 'Compliance agent',
  status,
  className,
  ...props
}: CompliancePanelProps) {
  const resolvedStatus: PanelStatus =
    status ?? (items.every((item) => item.ok) ? 'passed' : 'needs-review')

  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface p-5',
        PANEL_BORDER[resolvedStatus],
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="m-0 font-heading text-subtitle text-text">{title}</h2>
        <StatusChip status={resolvedStatus} />
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-body text-text">
            {item.ok ? (
              <Check
                aria-hidden="true"
                className="mt-0.5 size-[18px] shrink-0 text-success"
                strokeWidth={2}
              />
            ) : (
              <X
                aria-hidden="true"
                className="mt-0.5 size-[18px] shrink-0 text-danger"
                strokeWidth={2}
              />
            )}
            {/* The icon is colour; this word is the meaning. */}
            <span className="sr-only">{item.ok ? 'Passed:' : 'Not met:'}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
