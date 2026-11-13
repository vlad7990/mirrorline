/**
 * The two things that have to be true about a script before it can be made:
 * it is not somebody else's wording, and its one factual claim has a source.
 *
 * **The Originality Gate blocks and rewrites.** It does not flag and continue.
 * The panel therefore reports what the gate *did* — including the draft it
 * sent back — rather than a green tick. A gate whose failures are invisible is
 * indistinguishable from a gate that never fails, and the predecessor project
 * is the reason that distinction matters here.
 *
 * **The business fact carries its source.** Non-negotiable 7: no claims we
 * cannot stand behind. A claim about the client's business, sourced to the
 * client's own material, is one we can.
 */

import { Card, StatusChip, cn } from '@mirrorline/ui'
import { Quote, ShieldCheck } from 'lucide-react'

import {
  BUSINESS_FACT,
  type BusinessFact,
  ORIGINALITY_RESULT,
  type OriginalityOutcome,
  type OriginalityResult,
} from './remake-plans'

const OUTCOME_LABEL: Record<OriginalityOutcome, string> = {
  passed: 'Passed first time',
  rewritten: 'Rewritten, then passed',
  blocked: 'Blocked',
}

/**
 * "Rewritten" is green, not amber.
 *
 * The gate caught something and fixed it, which is the system working. Amber
 * would read as "we are not sure", and we are: this draft is under the limit.
 */
const OUTCOME_STATUS = {
  passed: 'passed',
  rewritten: 'passed',
  blocked: 'blocked',
} as const

export function OriginalityGate({
  result = ORIGINALITY_RESULT,
}: {
  readonly result?: OriginalityResult
}) {
  const isUnderLimit = result.similarity <= result.limit

  return (
    <Card as="section" aria-labelledby="originality-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="originality-heading"
          className="m-0 flex items-center gap-2 font-heading text-title text-text"
        >
          <ShieldCheck aria-hidden="true" className="size-[18px] text-text-muted" strokeWidth={2} />
          Originality Gate
        </h2>
        <StatusChip status={OUTCOME_STATUS[result.outcome]}>
          {OUTCOME_LABEL[result.outcome]}
        </StatusChip>
      </div>

      <p className="m-0 text-body text-text-muted">
        {/* Both figures are measurements, so both go mono; the words between
            them are the studio explaining, and stay in Geist. */}
        <span
          className={cn('machine', isUnderLimit ? 'text-on-success-soft' : 'text-on-danger-soft')}
        >
          {result.similarity}% similar
        </span>{' '}
        against a limit of <span className="machine">{result.limit}%</span>, measured against{' '}
        {result.comparedAgainst}.
      </p>

      {result.rewriteNote ? (
        <p className="m-0 rounded-lg bg-surface-subtle p-4 text-meta text-text-muted">
          {result.rewriteNote}
        </p>
      ) : null}

      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        The gate blocks and rewrites. Nothing over the limit goes forward as written, and there is
        no way to wave a draft past it — not from this screen and not from any other.
      </p>
    </Card>
  )
}

export function CitedBusinessFact({ fact = BUSINESS_FACT }: { readonly fact?: BusinessFact }) {
  return (
    <Card as="section" aria-labelledby="business-fact-heading" className="flex flex-col gap-3">
      <h2
        id="business-fact-heading"
        className="m-0 flex items-center gap-2 font-heading text-title text-text"
      >
        <Quote aria-hidden="true" className="size-[18px] text-text-muted" strokeWidth={2} />
        The claim, and where it came from
      </h2>

      <blockquote className="m-0 border-l-2 border-accent pl-4 text-body text-text">
        {fact.claim}
      </blockquote>

      <p className="m-0 text-meta text-text-muted">
        {fact.source} Supplied by {fact.suppliedBy} on{' '}
        <span className="machine">{fact.suppliedOn}</span>.
      </p>

      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        A script may only state a fact about your business that we can point at in something you
        gave us. We do not research claims on your behalf and we do not invent statistics.
      </p>
    </Card>
  )
}
