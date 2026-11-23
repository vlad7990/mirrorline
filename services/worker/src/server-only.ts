/**
 * A no-op stand-in for `server-only`, for the worker.
 *
 * The same stub and the same reasoning as `vitest.server-only-stub.ts`:
 * `import 'server-only'` is how `scan.ts`, `ledger.ts` and
 * `service-client.ts` declare they must never reach a browser bundle, and it
 * is **not a package we depend on** — Next supplies it as a bundler alias, so
 * it resolves during `next build` and is unresolvable to every other resolver.
 * Without this, the worker's first import of the scan dies on
 * `Cannot find package 'server-only'`.
 *
 * **A stub loses nothing.** The real module's only job is to throw when pulled
 * into a client bundle, and this process has no client bundle to be pulled
 * into. The guarantee is kept by the two things that can actually check it:
 * `server-only.test.ts`, which walks the import graph and fails if a
 * `'use client'` module reaches one of these files, and the Next build itself.
 *
 * **Its own copy rather than the Vitest one.** That file is wired into
 * `vitest.config.ts` and belongs to the test runner; pointing a production
 * process's module resolution at a test fixture would make the runner's
 * configuration load-bearing for the worker. Two four-line files that say why
 * they exist beat one shared file that two very different things depend on.
 *
 * Aliased in `tsconfig.json`'s `paths`, which `tsx` honours at runtime.
 */

export {}
