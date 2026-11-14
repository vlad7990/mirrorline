/**
 * What each approach actually hands you, drawn rather than described.
 *
 * 19 v2 ★3 for /compare: four category columns with a visual each — raw files
 * from a clipping tool, one generic post from an agency, an empty calendar
 * from doing it yourself, a filled one from us.
 *
 * **Three of the four are diagrams, and that is the honest choice.** A reel
 * frame is what a *finished post* looks like, so putting one in the clipping
 * tool's column would quietly flatter it: the complaint about those tools
 * (P1, P2) is precisely that what comes back is a folder of files rather than
 * anything posted. A file list is what that column deserves. The agency
 * column gets a real frame, because an agency does hand you a finished post —
 * just one, and a generic one.
 *
 * Categories, never brands. 14 §1 and 10 §4, and the reason the whole page is
 * written this way: naming a product would be a claim about that product we
 * would have to stand behind, and the argument is about the method anyway.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import type { SampleFrame } from './kit/page-media'

/* -------------------------------------------------------------------------- */
/* The four visuals                                                            */
/* -------------------------------------------------------------------------- */

/** A folder of files: what a clipping tool returns. */
function RawFiles() {
  const files = ['clip_01.mp4', 'clip_02.mp4', 'clip_03.mp4', 'clip_04.mp4', 'clip_05.mp4']

  return (
    <ul
      aria-label="A folder of exported clip files"
      className="m-0 flex w-full list-none flex-col gap-1.5 p-0"
    >
      {files.map((file) => (
        <li
          key={file}
          className="machine flex items-center justify-between gap-3 rounded-sm bg-surface-subtle px-3 py-2 text-mono text-text-muted"
        >
          <span className="truncate">{file}</span>
          <span aria-hidden="true" className="shrink-0 opacity-60">
            ⋯
          </span>
        </li>
      ))}
    </ul>
  )
}

interface GenericPostProps {
  readonly frame: SampleFrame
}

/** One post, made once: what a retainer with an agency tends to produce. */
function GenericPost({ frame }: GenericPostProps) {
  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div className="relative aspect-[9/16] w-[7.5rem] overflow-hidden rounded-thumb bg-viewer">
        {/* eslint-disable-next-line @next/next/no-img-element -- the reasoning
            `ReelStill` carries: a 9:16 still already sized for a ~120px frame
            has nothing for the optimiser to resize, and it is decorative. */}
        <img
          src={frame.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-viewer/85 via-viewer/20 to-transparent"
        />
        <span className="absolute inset-x-2.5 bottom-2.5 font-heading text-overlay-caption text-on-primary">
          Our team is excited to announce…
        </span>
      </div>
      <figcaption className="text-caption text-text-muted">AI-generated sample</figcaption>
    </figure>
  )
}

interface WeekGridProps {
  /** How many of the fourteen slots carry a post. */
  readonly filled: number
  readonly label: string
}

/**
 * A fortnight of slots, mostly empty or mostly full.
 *
 * The same drawing twice with one number changed, which is the comparison:
 * the difference between doing it yourself and handing it over is not the
 * quality of any single post, it is how much of the grid has anything in it.
 */
function WeekGrid({ filled, label }: WeekGridProps) {
  const slots = 14

  return (
    <div aria-label={label} role="img" className="grid w-full grid-cols-7 gap-1.5">
      {Array.from({ length: slots }, (_, index) => (
        <span
          key={index}
          className={cn(
            'aspect-square rounded-sm',
            index < filled ? 'bg-gold-deep/70' : 'bg-surface-subtle',
          )}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* The columns                                                                 */
/* -------------------------------------------------------------------------- */

export interface CompareColumnsProps {
  /** One frame, for the agency column. */
  readonly frame: SampleFrame
}

interface Column {
  readonly id: string
  readonly approach: string
  readonly gives: string
  readonly visual: React.ReactNode
  readonly isUs?: boolean
}

export function CompareColumns({ frame }: CompareColumnsProps) {
  const columns: readonly Column[] = [
    {
      id: 'tool',
      approach: 'A clipping tool',
      gives: 'A folder of exports. Nothing is posted, nothing is scheduled, and nobody has looked at whether any of it is worth posting.',
      visual: <RawFiles />,
    },
    {
      id: 'agency',
      approach: 'A content agency',
      gives: 'A small number of finished posts, often on a template that would suit anybody. Good work, at a cadence that does not fill a feed.',
      visual: <GenericPost frame={frame} />,
    },
    {
      id: 'diy',
      approach: 'Doing it yourself',
      gives: 'Whatever you had time for. The first fortnight usually goes well and the grid thins out from there, because the week gets busy.',
      visual: <WeekGrid filled={3} label="A fortnight with three posts in it" />,
    },
    {
      id: 'us',
      approach: 'This service',
      gives: 'Every slot filled, through the gate, to accounts you own — and a weekly report saying which of them did anything.',
      visual: <WeekGrid filled={14} label="A fortnight with every slot filled" />,
      isUs: true,
    },
  ]

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((column, position) => (
        <li
          key={column.id}
          className="reveal-item"
          style={{ '--index': position } as React.CSSProperties}
        >
          <div
            className={cn(
              'flex h-full flex-col gap-4 rounded-lg border p-5',
              column.isUs ? 'border-gold bg-gold/5' : 'border-border bg-surface',
            )}
          >
            <h3 className="m-0 font-heading text-subtitle text-text">{column.approach}</h3>
            <div className="flex min-h-[11rem] items-center justify-center">{column.visual}</div>
            <p className="m-0 mt-auto text-meta text-text-muted">{column.gives}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
