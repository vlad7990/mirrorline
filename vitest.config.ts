import { defineConfig } from 'vitest/config';

// Single root-level runner: unit tests live beside the code they cover.
// Browser-level checks belong to Playwright (./e2e), so they are excluded here.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.test.tsx',
      'apps/web/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
