/**
 * `/app/dev/generate` — one generated scene, end to end, for us.
 *
 * ============================================================================
 * What this screen is for
 * ============================================================================
 *
 * Step 6 of `docs/plan/AI_GENERATION_V4.md`. The adapter layer, the safety
 * gate, the spend cap and the ledger are each tested in isolation; this is the
 * first place they run in one sequence against the real database with a person
 * watching. It is a **developer** screen: it says so, it is behind
 * `GENERATION_ENABLED`, and it sits outside the `(studio)` route group so it
 * has no sidebar and is not reachable from a client's navigation.
 *
 * It is demoable with no API key at all, which is why it was worth building
 * before the key arrived. Two of the four outcomes are reachable keyless and
 * both are the interesting ones: the sample adapter answering under a "Sample
 * data" label, and our own filter refusing a named public figure at $0.00 with
 * a row in `agent_runs` to prove the refusal happened.
 *
 * ============================================================================
 * Why `runtime = 'nodejs'`, said once and meant
 * ============================================================================
 *
 * The xAI provider writes bytes with `node:fs`. On an edge runtime that fails
 * **at request time** rather than at build time — a screen that compiles,
 * deploys, and then throws on the one press it exists for. The read route says
 * the same thing for the same reason.
 */

import { notFound } from 'next/navigation'

import { GenerateForm } from '@/components/dev/generate-form'
import { createAgentServiceClient } from '@/lib/agents/service-client'
import { isGenerationEnabled } from '@/lib/generation/flag'
import { readMediaMonthUsd } from '@/lib/generation/ledger'
import { adapterNames, chooseAdapter } from '@/lib/generation/registry'
import { generationCapUsd, MAX_GENERATION_REQUEST_USD } from '@/lib/generation/spend'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'

import { generateSceneAction } from './actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Generate a scene · dev',
  // Belt to the route group's braces. A dev screen that got indexed would be a
  // small embarrassment and a large surprise.
  robots: { index: false, follow: false },
}

function usd(value: number): string {
  return `$${value.toFixed(4)}`
}

interface FactProps {
  readonly label: string
  readonly value: string
  readonly note?: string
}

function Fact({ label, value, note }: FactProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="font-mono text-body text-text">{value}</dd>
      {note === undefined ? null : <p className="m-0 text-caption text-text-muted">{note}</p>}
    </div>
  )
}

export default async function DevGeneratePage() {
  // 404, not 403. A deployment that has not turned generation on should not
  // advertise that it could.
  if (!isGenerationEnabled()) notFound()

  const workspace = await getOwnedWorkspace()
  const choice = chooseAdapter()

  /*
   * This month's media spend, read here so the ceiling is visible before
   * anything is pressed.
   *
   * `null` is not zero, and it is rendered as its own sentence. The cap treats
   * an unreadable ledger as a refusal, so a screen printing "$0.0000" for a
   * failed read would be showing the opposite of what the next press will do.
   *
   * Read with the **service role**, the same client the run itself uses. A
   * month summed under RLS is a month the policy agreed to show, and this
   * figure's only job is to be the one the cap will check against — a screen
   * and a ceiling disagreeing about how much has been spent is worse than no
   * figure at all. The workspace id comes from the session above, so the
   * service role is only ever handed a workspace RLS already agreed this person
   * owns.
   */
  const spentUsd =
    workspace === null
      ? null
      : await readMediaMonthUsd(createAgentServiceClient(), workspace.id, new Date())

  const capUsd = generationCapUsd()

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-[18px] py-8 sm:px-8">
      <header className="mb-8 space-y-3">
        <p className="m-0 font-mono text-caption uppercase tracking-wider text-text-muted">
          Developer screen
        </p>
        <h1 className="text-h2 text-text">Generate one scene</h1>
        <p className="m-0 max-w-prose text-body text-text-muted">
          One press runs the whole path: the prompt is screened, the month’s spend is read and the
          ceiling checked, a provider is called, and the outcome is written to the ledger — in that
          order, whatever the outcome. Not a client screen, and not linked from one.
        </p>
      </header>

      <section aria-labelledby="dev-generate-state" className="mb-8">
        <h2 id="dev-generate-state" className="mb-3 text-h4 text-text">
          What this deployment will do
        </h2>

        <dl className="divide-y divide-border-subtle border-y border-border-subtle">
          <Fact
            label="Adapter in use"
            value={choice.adapter.name}
            note={
              choice.isSample
                ? 'No provider key is set, so the sample adapter answers and the result is labelled “Sample data”. Nothing is called and nothing is billed.'
                : 'A provider key is set. A press will make a real, billable call.'
            }
          />
          <Fact label="Adapters built" value={adapterNames().join(', ')} />
          <Fact
            label="Models"
            value={`${choice.adapter.models.clip} · ${choice.adapter.models.image}`}
          />
          <Fact
            label="Workspace"
            value={workspace === null ? 'none' : workspace.id}
            note={
              workspace === null
                ? 'There is no owned workspace for this session, so a press will say so rather than spend anything.'
                : undefined
            }
          />
          <Fact
            label="Media spend this month"
            value={spentUsd === null ? 'could not be read' : usd(spentUsd)}
            note={
              spentUsd === null
                ? 'An unreadable ledger is treated as a refusal rather than as an empty one — so the next press will be capped.'
                : `Against a ${usd(capUsd)} monthly ceiling, and ${usd(MAX_GENERATION_REQUEST_USD)} for any single request.`
            }
          />
        </dl>
      </section>

      <section aria-labelledby="dev-generate-run">
        <h2 id="dev-generate-run" className="mb-3 text-h4 text-text">
          Run one
        </h2>
        {/*
          The action is imported here, on the server, and handed down. The form
          is a client component, and importing it there would put it one hop
          from the ledger in the static import graph — which
          `server-only.test.ts` fails on by design. `run-scan-form.tsx` has the
          long version of why that guard is left strict.
        */}
        <GenerateForm action={generateSceneAction} />
      </section>
    </main>
  )
}
