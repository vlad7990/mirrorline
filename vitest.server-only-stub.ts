/**
 * A no-op stand-in for `server-only`, for the Vitest runners.
 *
 * `import 'server-only'` is how `scan.ts`, `ledger.ts` and `service-client.ts`
 * declare that they must never reach a browser bundle. It is not a package we
 * depend on: **Next supplies it as a bundler alias**, so it resolves during
 * `next build` and `next dev` and is unresolvable to every other resolver.
 * `require.resolve('server-only')` fails here and nothing is in the store —
 * which is why the first test to import one of those three modules was also
 * the first to see `Cannot find package 'server-only'`.
 *
 * Aliasing is the fix rather than adding the real package, which does exist on
 * npm but would be a dependency carried solely to satisfy a resolver in tests.
 *
 * **A stub loses nothing here.** The real module's only job is to throw when it
 * is pulled into a client bundle; under Vitest there is no client bundle to be
 * pulled into, so there is no condition for it to detect. The guarantee is kept
 * by the two things that can actually check it: `server-only.test.ts`, which
 * walks the import graph and fails if a `'use client'` module reaches one of
 * these files, and the Next build itself.
 */

export {}
