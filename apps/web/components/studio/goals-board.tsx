/**
 * The goal cascade — 15 §1 and 15 §5 tab 5.
 *
 * Outcome → objectives → key results → KPIs. Read top to bottom it is the
 * argument the product makes: you told us what you wanted, the Analyst
 * proposed how we would know, and here is where each of those stands.
 *
 * **Every target says where it came from.** 15 §1: "Targets are proposals, not
 * promises. The UI always says 'target', never 'guaranteed'." A number with no
 * stated basis reads as a commitment whatever the heading says, so the basis
 * sits with the figure rather than in a tooltip.
 *
 * The edit controls are real inputs rather than a dialog, because the screen's
 * job is to make a target feel adjustable. They do not persist yet — the goals
 * tables land in PR9 — and the form says so instead of silently discarding a
 * change.
 */

import { Button, Card, Divider, Input, Label, cn } from '@mirrorline/ui'

import {
  CUSTOM_KPI_ENTRY_LABELS,
  type CustomKpi,
  type GoalCascade,
  type KeyResult,
  PACE_LABELS,
  SAMPLE_CASCADE,
  SAMPLE_CUSTOM_KPIS,
  keyResultPace,
} from '@/lib/studio/cascade'

import { GoalProgress } from '../kpi/goal-progress'

/** The pace word's colour. Behind is amber, never red — see `insights.ts`. */
const PACE_CLASS = {
  ahead: 'text-on-success-soft',
  'on-pace': 'text-text-muted',
  behind: 'text-on-warning-soft',
} as const

export interface GoalsBoardProps {
  readonly cascade?: GoalCascade
  readonly customKpis?: readonly CustomKpi[]
}

export function GoalsBoard({
  cascade = SAMPLE_CASCADE,
  customKpis = SAMPLE_CUSTOM_KPIS,
}: GoalsBoardProps) {
  const headline = findLeads(cascade)

  return (
    <div className="flex flex-col gap-5">
      {headline ? (
        <Card as="section" aria-labelledby="outcome-heading" className="flex flex-col gap-4">
          <h2 id="outcome-heading" className="m-0 font-heading text-title text-text">
            Your outcome
          </h2>
          <GoalProgress
            outcome={cascade.outcome}
            current={headline.current}
            target={headline.target}
            unitLabel={headline.unitLabel}
            periodElapsed={cascade.periodElapsed}
            periodLabel={cascade.periodLabel}
          />
        </Card>
      ) : null}

      {cascade.objectives.map((objective) => (
        <Card
          key={objective.id}
          as="section"
          aria-labelledby={objective.id}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-muted">Objective</span>
            <h2 id={objective.id} className="m-0 font-heading text-title text-text">
              {objective.text}
            </h2>
          </div>

          <ul className="m-0 flex list-none flex-col gap-6 p-0">
            {objective.keyResults.map((result) => (
              <li key={result.id}>
                <KeyResultRow keyResult={result} periodElapsed={cascade.periodElapsed} />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <WeeklyActions actions={cascade.weeklyActions} />
      <CustomKpis kpis={customKpis} />
    </div>
  )
}

/**
 * The headline key result, found by KPI key rather than by position.
 *
 * The Analyst can reorder objectives, and a bar that silently started tracking
 * a different number after a reorder would be the worst kind of wrong — still
 * plausible.
 */
function findLeads(cascade: GoalCascade): KeyResult | undefined {
  return cascade.objectives
    .flatMap((objective) => objective.keyResults)
    .find((result) => result.kpiKey === 'leads')
}

function KeyResultRow({
  keyResult,
  periodElapsed,
}: {
  keyResult: KeyResult
  periodElapsed: number
}) {
  const pace = keyResultPace(keyResult, periodElapsed)
  const inputId = `target-${keyResult.id}`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-label font-semibold text-text">{keyResult.label}</span>
        <span className={cn('machine text-mono', PACE_CLASS[pace])}>{PACE_LABELS[pace]}</span>
      </div>

      <p className="machine m-0 text-mono text-text-muted">
        <span className="text-text">{keyResult.current.toLocaleString('en-US')}</span> of{' '}
        {keyResult.target.toLocaleString('en-US')} {keyResult.unitLabel} · from{' '}
        {keyResult.baseline.toLocaleString('en-US')} at baseline · due {keyResult.due}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Target</Label>
          <Input
            id={inputId}
            name={inputId}
            type="number"
            inputMode="numeric"
            defaultValue={keyResult.target}
            className="machine w-32"
          />
        </div>
        <Button variant="secondary">Propose a new target</Button>
      </div>

      {/* 15 §1: a proposal, with its origin stated. Never "guaranteed". */}
      <p className="m-0 text-caption text-text-muted">
        Proposed from your {keyResult.basis}. It is a proposal you can change, not a promise we have
        made. Changes are not saved yet — the goals tables land with the database.
      </p>
    </div>
  )
}

/** 15 §1's last row: what the Analyst is asking the other agents to change. */
function WeeklyActions({ actions }: { actions: readonly string[] }) {
  return (
    <Card as="section" aria-labelledby="weekly-actions-heading" className="flex flex-col gap-3">
      <h2 id="weekly-actions-heading" className="m-0 font-heading text-title text-text">
        This week’s actions
      </h2>
      <p className="m-0 text-meta text-text-muted">
        What the Performance Analyst has asked Trend Scout and the Remake Producer to do
        differently.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {actions.map((action) => (
          <li key={action} className="flex gap-2.5 text-body text-text">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            {action}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** 15 §4: name, unit, target, manual or CSV entry. */
function CustomKpis({ kpis }: { kpis: readonly CustomKpi[] }) {
  return (
    <Card as="section" aria-labelledby="custom-kpis-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="custom-kpis-heading" className="m-0 font-heading text-title text-text">
          Your own KPIs
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary">Add a KPI</Button>
          <Button variant="secondary">Import CSV</Button>
        </div>
      </div>
      <p className="m-0 text-meta text-text-muted">
        Things no platform can tell us — phone calls, walk-ins, reviews. Enter them by hand or
        import a CSV, and they sit beside everything else.
      </p>

      <Divider />

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {kpis.map((kpi) => (
          <li
            key={kpi.key}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-label font-semibold text-text">{kpi.name}</span>
              <span className="text-caption text-text-muted">
                {kpi.unitLabel} · {CUSTOM_KPI_ENTRY_LABELS[kpi.entry]}
                {kpi.lastEntry ? (
                  <>
                    {' · last entry '}
                    <span className="machine">{kpi.lastEntry}</span>
                  </>
                ) : null}
              </span>
            </span>
            <span className="machine text-mono">
              {kpi.current === null ? (
                // 15 §8: nothing entered is not zero. A zero here would be the
                // user's own measurement invented on their behalf.
                <span className="text-text-muted">Nothing entered yet</span>
              ) : (
                <>
                  <span className="text-text">{kpi.current.toLocaleString('en-US')}</span>
                  <span className="text-text-muted"> of {kpi.target.toLocaleString('en-US')}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
