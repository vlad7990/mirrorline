import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * The database runner: `pnpm test:rls-db`.
 *
 * Its own config for the same reason `vitest.live.config.ts` has one, but a
 * different reason in kind. `*.live.test.ts` is isolated because it **costs
 * money**. `*.db.test.ts` is isolated because it **needs a real Supabase
 * instance** and writes rows to it.
 *
 * Keeping them apart matters: one is a bill, the other is a dependency, and a
 * single "slow tests" bucket would make `pnpm test:copilot-live` quietly start
 * creating database users — or make the RLS suite look like it spends money,
 * which would discourage running the one check that proves the policies work.
 *
 * `docs/plan/BACKEND_PHASE.md` §1 is explicit that a mocked RLS test proves
 * nothing, so there is no hermetic version of this suite to fall back on. With
 * no credentials it fails in `beforeAll` with a sentence naming the variables
 * to set, which is the honest outcome — not a skip that reads as a pass.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web', import.meta.url)),
      // Next resolves `server-only` through its own bundler alias, so it is
      // unresolvable to Vitest. See `vitest.server-only-stub.ts`.
      'server-only': fileURLToPath(new URL('./vitest.server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['apps/web/**/*.db.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    // Reads `apps/web/.env.local` into `process.env`, which plain Vitest does
    // not do and Next does. The same setup file the live runner uses: it never
    // overwrites an exported value, so a shell can still point this suite at a
    // different project.
    setupFiles: ['./vitest.live.setup.ts'],
    // One file, and its fixtures are shared across the blocks — the deletion
    // test deliberately runs last. Parallel workers would also race each other
    // on the one shared preview database (D76).
    fileParallelism: false,
    // Creating four confirmed users and eleven rows over the network, against
    // a project that may be waking from idle.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
