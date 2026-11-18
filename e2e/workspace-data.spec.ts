/**
 * B1's two destructive-adjacent surfaces: the export, and the delete control.
 *
 * ============================================================================
 * Nothing here deletes anything, and that is a constraint not a gap
 * ============================================================================
 *
 * `delete_workspace` removes the workspace and, when it was the user's last,
 * their `auth.users` row (D80). The suite shares one signed-in session created
 * by the `setup` project (D84), so a test that actually confirmed the dialog
 * would delete the account every other spec in the run depends on — and the
 * failures would land in whichever file happened to run next.
 *
 * So these tests prove the **gate**: that the control exists, that it offers
 * the export first, and that it cannot be satisfied by anything other than the
 * exact workspace name. The deletion itself is proved one layer down, against
 * a throwaway user, in `rls.db.test.ts`.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'these are behavioural and an API read; neither has a viewport in it')

/** Non-negotiable 1, as the step-2 checkbox says it. Same string as the two
 *  specs that already assert it, kept in step with them by hand rather than
 *  shared — three copies of one sentence is cheaper than a helper nobody can
 *  find. */
const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

test.describe('/api/export', () => {
  test('sends the signed-in user a dated JSON attachment of their own rows', async ({ request }) => {
    // Arrange / Act — the storageState from `setup` makes this a signed-in
    // request without a form.
    const response = await request.get('/api/export')

    // Assert
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')

    // `mirrorline-export-2026-11-17.json` — the day, so two exports a week
    // apart sort correctly in a downloads folder.
    expect(response.headers()['content-disposition']).toMatch(
      /attachment; filename="mirrorline-export-\d{4}-\d{2}-\d{2}\.json"/,
    )

    // Nobody else's export may come out of a shared cache.
    expect(response.headers()['cache-control']).toContain('no-store')

    const body = await response.json()

    expect(body.exportedFor.userId).toEqual(expect.any(String))
    expect(body.note).toMatch(/your own/i)

    // The twelve tables the user may read, each present even when empty — so
    // "nothing here" is distinguishable from "we did not export this".
    for (const table of [
      'profiles',
      'memberships',
      'workspaces',
      'social_accounts',
      'goals',
      'objectives',
      'key_results',
      'kpi_definitions',
      'metric_snapshots',
      'ledger_weekly',
      'alerts',
      'trends',
    ]) {
      expect(Array.isArray(body.tables[table])).toBe(true)
    }

    // `rls_policies.sql` gives `leads` no policy at all, because a lead
    // belongs to us rather than to any workspace. It must not appear here even
    // as an empty array, which would read as "Mirrorline holds no leads".
    expect(body.tables).not.toHaveProperty('leads')

    // The signed-in user is a member of their own workspace, so this is the
    // one table that cannot legitimately be empty.
    expect(body.tables.memberships.length).toBeGreaterThan(0)
  })

  test('refuses a signed-out request rather than sending an empty file', async ({ browser }) => {
    // A fresh context with no storageState: an export that answered 200 with
    // twelve empty arrays would look like a working feature and a user with no
    // data, which is the wrong answer to "who are you".
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })

    const response = await context.request.get('/api/export')
    expect(response.status()).toBe(401)

    await context.close()
  })
})

test.describe('onboarding writes the niche and the goal', () => {
  test('and the export reads them back, which is what proves they persisted', async ({
    page,
    request,
  }) => {
    // **Why the export is the witness.** The write happens in a server action,
    // so the only evidence inside the browser is a redirect — and a redirect
    // proves the action reached its last line, not that a row exists. Reading
    // the rows back through `/api/export` closes that gap using nothing but
    // B1's own surfaces, as the same user, under the same policies.
    //
    // It cannot be checked against the database after the run instead: the
    // teardown sweeps this account and cascades its workspace, so by the time
    // a query could run, the rows are gone by design.
    const niche = 'Independent bakery in Leeds'
    const outcome = 'Fifty walk-ins a week by March'

    await page.goto('/app/onboarding')

    // Step 1 → 2 → 3. Only step 2 gates Continue, on the rights box.
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('checkbox', { name: RIGHTS_LABEL }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Your niche and goal' })).toBeVisible()

    await page.getByLabel('What do you do?').fill(niche)
    await page.getByLabel('What would success look like?').fill(outcome)

    await page.getByRole('button', { name: 'Open my studio' }).click()

    // **Longer than the five-second default, on purpose.** The submit is a
    // server action that makes several sequential round trips to a Postgres in
    // another region before it can redirect — find the workspace, update it,
    // look for the primary goal, write it. Against the default budget this
    // assertion passed alone and failed in a full run, which is a flake in the
    // test rather than a fault in the app.
    await expect(page).toHaveURL(/\/app\/home$/, { timeout: 20_000 })

    // Now the part the redirect could not tell us.
    const body = await (await request.get('/api/export')).json()

    const niches = body.tables.workspaces.map((row: { niche: string | null }) => row.niche)
    expect(niches).toContain(niche)

    const outcomes = body.tables.goals.map((row: { outcome_text: string }) => row.outcome_text)
    expect(outcomes).toContain(outcome)

    // One primary goal per workspace is a partial unique index, and the action
    // updates rather than inserts on a repeat. A second pass must therefore
    // still leave exactly one.
    const primaries = body.tables.goals.filter((row: { is_primary: boolean }) => row.is_primary)
    expect(primaries).toHaveLength(1)
  })
})

test.describe('the delete control on Settings', () => {
  test('offers the export first and will not unlock on the wrong name', async ({ page }) => {
    await page.goto('/app/settings')

    const card = page.getByRole('region', { name: 'Delete this workspace' })
    const open = card.getByRole('button', { name: 'Delete this workspace' })
    await expect(open).toBeVisible()
    await open.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // The offer, and the reason it has to be here rather than on another card:
    // after this there is no account left to download anything with.
    const exportLink = dialog.getByRole('link', { name: 'Export my data' })
    await expect(exportLink).toHaveAttribute('href', '/api/export')

    const confirm = dialog.getByRole('button', { name: 'Delete this workspace' })
    await expect(confirm).toBeDisabled()

    const field = dialog.getByRole('textbox')

    // Wrong name, right shape.
    await field.fill('not the workspace name')
    await expect(confirm).toBeDisabled()

    // The real name, with its case changed. `matchesWorkspaceName` forgives
    // surrounding whitespace and nothing else, so this must stay refused —
    // this is the assertion that would catch somebody "helpfully" making the
    // comparison case-insensitive.
    const title = (await dialog.getByRole('heading').first().textContent()) ?? ''
    const name = title.replace(/^Delete /, '').replace(/\?$/, '')
    expect(name.length).toBeGreaterThan(0)

    await field.fill(name.toUpperCase() + 'x')
    await expect(confirm).toBeDisabled()

    // Nothing is confirmed: see the note at the top of this file.
    await dialog.getByRole('button', { name: 'Keep my workspace' }).click()
    await expect(dialog).toBeHidden()
  })
})
