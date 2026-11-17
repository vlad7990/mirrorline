import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * The opt-in live runner: `pnpm test:copilot-live`.
 *
 * Separate from `vitest.config.ts` on purpose. The ordinary suite is hermetic
 * — `playwright.config.ts` pins `ANTHROPIC_API_KEY` empty for the server it
 * starts, and the unit tests inject a fake key or none — because a thousand
 * tests that each cost a fraction of a cent is a bill nobody authorised. On
 * 15 November a suite run did make real calls before that pin existed, which
 * is the whole reason this file is its own config rather than a flag.
 *
 * So checking the live path is a deliberate act. These tests cost real money,
 * they are not run in CI, and they print what they spent.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['apps/web/**/*.live.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**'],
    // Reads `apps/web/.env.local` into `process.env`, which plain Vitest does
    // not do and Next does. Wired here and deliberately not in the hermetic
    // config: that suite must have no way to find a key by accident.
    setupFiles: ['./vitest.live.setup.ts'],
    // One file, one process, sequential: the questions share a cached prefix
    // and parallel workers would each pay to create it.
    fileParallelism: false,
    // A live model answering a fixed set of questions, one of them on Sonnet 5
    // with thinking enabled. The default five seconds is not enough.
    testTimeout: 120_000,
  },
});
