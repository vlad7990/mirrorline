/**
 * Sections 15 and 16 from 16 §3: "Not a farm, not a repost page", and "Your
 * files, your accounts, plain billing".
 *
 * Section 15 merges the old "Four things we will not do" band, which said the
 * same thing in a weaker frame. The limits are the argument, so they are
 * stated as what we are *not*: 11 §4 is explicit that the farm we
 * investigated is the case study, and the honest version of that is a list of
 * things we refuse rather than a list of features.
 *
 * **No competitor and no real farm is named.** 11 §4: "no names of real
 * farms, no fear-mongering". The contrast is with a method, not a company.
 */

import { Card, cn } from '@mirrorline/ui'
import { Ban, Check } from 'lucide-react'
import * as React from 'react'

export interface NotAFarmRule {
  readonly id: string
  /** What a farm does. The thing we are not. */
  readonly them: string
  /** What we do instead, and it has to be checkable. */
  readonly us: string
}

const NOT_A_FARM_RULES: readonly NotAFarmRule[] = [
  {
    id: 'accounts',
    them: 'Thousands of throwaway accounts, each with a handful of followers.',
    us: 'One account you own per platform, connected by you and disconnectable without asking us.',
  },
  {
    id: 'publishing',
    them: 'Device automation, app clones and proxies, to look like a person.',
    us: 'Official platform APIs only. Nothing we do needs to be hidden from the platform.',
  },
  {
    id: 'footage',
    them: 'Other people’s videos, re-uploaded with a crop and a new caption.',
    us: 'The format copied, the footage never. New script, new footage, your voice.',
  },
  {
    id: 'detection',
    them: 'Uniquifying and metadata spoofing, to slip past detection.',
    us: 'The Originality Gate blocks what is too close and rewrites it. It never perturbs something to get it under a threshold.',
  },
  {
    id: 'labels',
    them: 'Generated footage passed off as filmed.',
    us: 'Every AI scene is labelled, in our interface and with the platform’s own AI flag.',
  },
  {
    id: 'repost-watch',
    them: 'Nothing, when someone reposts your work.',
    us: 'Repost Watch makes your originals eligible for the platforms’ protection tools, and shows you how to act. We never file claims for you.',
  },
]

export function NotAFarm({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
        {NOT_A_FARM_RULES.map((rule, position) => (
          <li
            key={rule.id}
            className="reveal-item"
            style={{ '--index': position % 2 } as React.CSSProperties}
          >
            <Card className="flex h-full flex-col gap-3">
              <p className="m-0 flex items-start gap-2.5 text-meta text-text-muted">
                <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
                <span>
                  <span className="sr-only">What a farm does: </span>
                  {rule.them}
                </span>
              </p>
              <p className="m-0 flex items-start gap-2.5 border-t border-border pt-3 text-meta text-text">
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-success"
                  strokeWidth={2.2}
                />
                <span>
                  <span className="sr-only">What we do: </span>
                  {rule.us}
                </span>
              </p>
            </Card>
          </li>
        ))}
      </ul>
      <p className="m-0 max-w-[68ch] text-meta text-text-muted">
        None of these is a certification and none of them is a guarantee. They describe how the
        studio is built, and you can hold us to them.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 16. Your files, your accounts, plain billing                                */
/* -------------------------------------------------------------------------- */

interface PlainTerm {
  readonly id: string
  readonly title: string
  readonly body: string
}

/** 09 §10, which is the direct answer to P3. */
const PLAIN_TERMS: readonly PlainTerm[] = [
  {
    id: 'no-credits',
    title: 'No credits, ever',
    body: 'A flat monthly price. Nothing is metered by the source minute, and nothing expires at the end of the month.',
  },
  {
    id: 'cancel',
    title: 'Cancel in one click',
    body: 'From Settings, at any time. No contract, no notice period, and no call where someone talks you out of it.',
  },
  {
    id: 'files',
    title: 'Every file stays yours',
    body: 'Export everything whenever you like, including after you cancel. We do not hold your library hostage to the subscription.',
  },
  {
    id: 'accounts',
    title: 'The accounts are yours',
    body: 'You connect them and you can disconnect them yourself. We never hold the only set of keys.',
  },
]

export function PlainBilling({ className }: { className?: string }) {
  return (
    <ul className={cn('m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2', className)}>
      {PLAIN_TERMS.map((term, position) => (
        <li
          key={term.id}
          className="reveal-item"
          style={{ '--index': position % 2 } as React.CSSProperties}
        >
          <Card className="flex h-full flex-col gap-2">
            <h3 className="m-0 font-heading text-subtitle text-text">{term.title}</h3>
            <p className="m-0 text-meta text-text-muted">{term.body}</p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
