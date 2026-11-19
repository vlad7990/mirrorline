import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Single root-level runner: unit tests live beside the code they cover.
// Browser-level checks belong to Playwright (./e2e), so they are excluded here.
export default defineConfig({
  resolve: {
    alias: {
      // The same '@/' the Next app and tsconfig resolve. Without it a test can
      // only reach across apps/web by relative path, which quietly splits the
      // codebase into "modules a test may import" and the rest.
      '@': fileURLToPath(new URL('./apps/web', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.test.tsx',
      'apps/web/**/*.test.ts',
      // The repo gates in scripts/ are plain ESM, not TypeScript: they run
      // under bare `node` with no build step, so their tests are .mjs too.
      'scripts/**/*.test.mjs',
    ],
    // `*.live.test.ts` calls the real model and costs real money. It has its
    // own config and its own script (`pnpm test:copilot-live`) so that this
    // suite stays free, hermetic and runnable in CI. Excluded here rather
    // than named out of `include`, because `apps/web/**/*.test.ts` matches it.
    //
    // `*.db.test.ts` is excluded for a different reason: it needs a real
    // Supabase project and writes rows to it (`pnpm test:rls-db`,
    // `vitest.db.config.ts`). BACKEND_PHASE.md §1 rules out a mocked RLS
    // test, so this suite must not be able to collect one and call it green.
    exclude: ['**/node_modules/**', 'e2e/**', '**/*.live.test.ts', '**/*.db.test.ts'],
  },
});
