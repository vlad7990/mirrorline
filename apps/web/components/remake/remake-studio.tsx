'use client'

/**
 * S5 · Remake studio.
 *
 * One state owner for the whole screen: the script (which the edit dialog
 * replaces), the chosen hook (which the preview burns in) and whether the
 * remake has been approved. Nothing leaves the browser — this is the demo.
 *
 * CLAUDE.md non-negotiable 6: the Compliance agent's result sits under the
 * three columns, and nothing can be scheduled before it passes.
 */

import { accounts, workspace, type Trend } from '@mirrorline/mock'
import { Button, CompliancePanel, Dialog, PageHeader, Toast } from '@mirrorline/ui'
import { Check } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { EditScriptDialog } from '@/components/remake/edit-script-dialog'
import { FormatRecipe } from '@/components/remake/format-recipe'
import { PreviewPanel } from '@/components/remake/preview-panel'
import {
  COMPLIANCE_CHECKS,
  buildShotList,
  type RemakePlan,
  type ScriptLine,
} from '@/components/remake/remake-plans'
import { REMAKE_SECONDS, clockLabel, type RecipeBeat } from '@/components/remake/remake-recipe'
import { CitedBusinessFact, OriginalityGate } from '@/components/remake/script-evidence'
import { ScriptPanel } from '@/components/remake/script-panel'

export interface RemakeStudioProps {
  trend: Trend
  recipe: readonly RecipeBeat[]
  plan: RemakePlan
}

/** How long the success toast stays up. */
const TOAST_MS = 6000

/** The account the preview is framed for. */
const PREVIEW_HANDLE = accounts.find((account) => account.handle !== null)?.handle ?? ''

export function RemakeStudio({ trend, recipe, plan }: RemakeStudioProps) {
  const [script, setScript] = React.useState<readonly ScriptLine[]>(plan.script)
  const [hookIndex, setHookIndex] = React.useState(0)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isApproved, setIsApproved] = React.useState(false)
  const [isToastOpen, setIsToastOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isToastOpen) return
    const timer = window.setTimeout(() => setIsToastOpen(false), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [isToastOpen])

  const approve = React.useCallback(() => {
    setIsApproved(true)
    setIsToastOpen(true)
  }, [])

  const saveScript = React.useCallback((lines: readonly ScriptLine[]) => {
    setScript(lines)
    setIsEditing(false)
  }, [])

  const lastBeat = recipe[recipe.length - 1]
  const lengthLabel = clockLabel(lastBeat?.endSeconds ?? REMAKE_SECONDS)
  const shots = buildShotList(plan)

  return (
    // DESIGN.md: studio surfaces tighten up relative to marketing. 20px, still
    // on the 8px grid at 2.5 steps.
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <Link
            href="/app/trends"
            className="text-primary underline-offset-4 hover:underline dark:text-accent"
          >
            Back to the Niche Scan
          </Link>
        }
        title={`Remake: ${trend.format}`}
        description={
          <>
            {/* The niche and the workspace are names; the 7-day growth figure
                is what the Trend Scout measured, so only it goes mono. */}
            Remake Producer agent · format from {trend.fromNiche} (
            <span className="machine">{trend.growthLabel}</span>) · made for {workspace.name}
          </>
        }
        action={
          // The page header holds its action in a shrink-0 box, so the row
          // needs a cap of its own to wrap instead of widening the page.
          <div className="flex max-w-[calc(100vw-72px)] flex-wrap items-center gap-2 lg:max-w-none">
            {/* DESIGN.md "Motion — Press": every pressable dips 3% on :active,
                on fine pointers only, and drops the transform entirely under
                prefers-reduced-motion. */}
            <Button asChild variant="tertiary" className="press">
              <Link href="/app/trends">Discard</Link>
            </Button>
            <Button variant="secondary" className="press" onClick={() => setIsEditing(true)}>
              Edit script
            </Button>
            <Button variant="primary" className="press" onClick={approve} disabled={isApproved}>
              Approve and make 5 variants
            </Button>
          </div>
        }
      />

      {isApproved ? (
        <p
          role="status"
          className="m-0 flex items-start gap-2 rounded-lg bg-success-soft px-[18px] py-3.5 text-body text-on-success-soft"
        >
          <Check aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" strokeWidth={2} />
          Approved. The Multiplier is making 5 variants. Each one comes back for your approval
          before it posts.
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)]">
        <FormatRecipe beats={recipe} />
        <ScriptPanel script={script} shots={shots} />
        <PreviewPanel
          hooks={plan.hooks}
          selectedIndex={hookIndex}
          onSelectedIndexChange={setHookIndex}
          lengthLabel={lengthLabel}
          handle={PREVIEW_HANDLE}
        />
      </div>

      {/* 16 §5: the gate's result and the claim's source, beside the
          compliance checklist rather than folded into it. The checklist says
          what was true of the final draft; these two say what the system did
          to get there, and what the one factual line in the script rests on. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <OriginalityGate />
        <CitedBusinessFact />
      </div>

      <CompliancePanel items={COMPLIANCE_CHECKS} status="passed" />

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        {isEditing ? (
          <EditScriptDialog
            lines={script}
            onSave={saveScript}
            onCancel={() => setIsEditing(false)}
          />
        ) : null}
      </Dialog>

      <Toast
        open={isToastOpen}
        title="Approved"
        description="5 variants are queued. You'll approve each one before it posts."
        onDismiss={() => setIsToastOpen(false)}
      />
    </div>
  )
}
