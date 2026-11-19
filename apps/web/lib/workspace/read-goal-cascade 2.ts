/**
 * The Goals screen's read — as the signed-in user, so RLS decides the rows.
 *
 * ============================================================================
 * Why the key results are fetched by objective id rather than by a join
 * ============================================================================
 *
 * PostgREST could embed `objectives(key_results(*))` in one request, and that
 * would bind the shape of this read to the foreign keys between the tables:
 * renaming a relationship would quietly change what the screen renders. Flat
 * reads say exactly what they fetch, and each is governed by its own policy —
 * `goals_select_members`, `objectives_select_members`,
 * `key_results_select_members` — which is what `rls.db.test.ts` proves.
 *
 * ============================================================================
 * `metric_snapshots` is not read yet, and the gap is deliberate
 * ============================================================================
 *
 * Nothing writes measurements until B6's ingestion, so every key result comes
 * back with `current: null` and renders as "Not measured yet". Filling
 * `latestByKpi` with anything today would be inventing a reading; the field
 * exists so the screen lights up the day the ingestion lands.
 */

import { type GoalCascade } from '@/lib/studio/cascade'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import {
  buildGoalCascade,
  type GoalRow,
  type KeyResultRow,
  type KpiDefinitionRow,
  type ObjectiveRow,
} from './goal-cascade'

export async function readGoalCascade(now: Date = new Date()): Promise<GoalCascade | null> {
  const supabase = await createSupabaseServerClient()

  // The primary goal. RLS scopes this to workspaces the caller belongs to, so
  // no workspace id is passed — there is nothing to get wrong.
  const goalResult = await supabase
    .from('goals')
    .select('id, goal_type, outcome_text, period, created_at')
    .eq('is_primary', true)
    .limit(1)
    .maybeSingle()

  if (goalResult.error !== null || goalResult.data === null) return null

  const goal = goalResult.data as GoalRow

  const objectiveResult = await supabase
    .from('objectives')
    .select('id, goal_id, text, position')
    .eq('goal_id', goal.id)

  const objectives = (objectiveResult.data ?? []) as ObjectiveRow[]

  const keyResultResult =
    objectives.length === 0
      ? null
      : await supabase
          .from('key_results')
          .select('id, objective_id, kpi_key, baseline, target, basis, due')
          .in(
            'objective_id',
            objectives.map((o) => o.id),
          )

  const keyResults = (keyResultResult?.data ?? []) as KeyResultRow[]

  const kpiKeys = [...new Set(keyResults.map((k) => k.kpi_key))]

  const kpiResult =
    kpiKeys.length === 0
      ? null
      : await supabase.from('kpi_definitions').select('key, name, unit').in('key', kpiKeys)

  const kpiDefinitions = (kpiResult?.data ?? []) as KpiDefinitionRow[]

  return buildGoalCascade(
    { goal, objectives, keyResults, kpiDefinitions, latestByKpi: {} },
    now,
  )
}
