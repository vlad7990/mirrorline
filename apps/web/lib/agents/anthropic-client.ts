/**
 * The one place the API key is read and the SDK is instantiated.
 *
 * Every agent calls through here: the co-pilot (18 §4) and, from V1, the
 * Niche Scan (§2.5's contract — "server-side only, no key ever reaches a
 * browser bundle").
 *
 * ## Why this module exists, and why it is not just tidiness
 *
 * `lib/copilot/server-only.test.ts` asserts that exactly one file imports
 * `@anthropic-ai/sdk` and exactly one reads `env.ANTHROPIC_API_KEY`, both as
 * **"exactly one, named"** rather than "at most one". That was correct when
 * the co-pilot was the only thing calling a model, and it is the check that
 * would catch a key reaching a browser bundle.
 *
 * V1 adds a second caller, so the choice was: relax the assertion to a list,
 * or give the invariant somewhere to live. §2.5 of the plan originally said
 * the SDK is imported "in one module **per agent**", which is the first
 * option written down — and it is wrong. N importers means N places a key can
 * leak and N places to audit, and the audit is the whole point.
 *
 * So the invariant moves here and stays exact.
 *
 * ## Value imports versus type imports, which is the useful distinction
 *
 * The adapter needs the SDK's *types* (`TextBlockParam`, `MessageParam`,
 * `Usage`, `TextBlock`) and its *error classes* (`instanceof RateLimitError`).
 * Only the second is a runtime dependency.
 *
 * **A type-only import is erased by the compiler** — it emits nothing and
 * cannot put a byte of the SDK in a bundle. So callers keep
 * `import type Anthropic from '@anthropic-ai/sdk'` for shapes, and take every
 * runtime value from here. That is why the error classes are re-exported
 * below rather than left to be imported directly: re-exporting them is what
 * makes "one runtime importer" true instead of aspirational.
 *
 * ## What this module deliberately does not do
 *
 * It does not decide whether to call. The cap (`18 §6`) and the sample-mode
 * decision stay with the callers, because they differ per agent: the
 * co-pilot's cap is $20 a month and a scan's budget is a different shape. This
 * hands out a client and answers one question — is there a key.
 */

import Anthropic from '@anthropic-ai/sdk'

import type { EnvLike } from '../copilot/spend'

/**
 * The SDK's typed error classes, re-exported so no other module needs the SDK
 * at runtime.
 *
 * `18 §7`: errors are caught as the SDK's typed classes, most-specific first,
 * **never by matching on message text**. These are the classes that make that
 * possible from anywhere.
 */
export {
  APIConnectionError,
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Is there a key at all.
 *
 * The only reader of `ANTHROPIC_API_KEY` in the app, which is what
 * `server-only.test.ts` asserts. Callers decide what to do about the answer —
 * `copilotMode` turns it into a `CopilotMode`, a scan turns it into canned or
 * live — so nothing else ever looks at the variable.
 *
 * Trimmed, because an empty string is how the e2e suite says "no key"
 * (`playwright.config.ts` sets `ANTHROPIC_API_KEY: ''` rather than deleting
 * it, since `delete process.env.X` in a config mutates the developer's shell).
 * A whitespace-only value is no key.
 */
export function hasAnthropicKey(env: EnvLike = process.env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim())
}

/**
 * The client, built once, and only when there is a key to build it with.
 *
 * Throws rather than returning a client that would 401: a mistake here should
 * surface as this sentence and not as an authentication error three layers
 * down. Unreachable through any caller that checks `hasAnthropicKey` first,
 * which all of them do.
 */
export function anthropicClient(env: EnvLike = process.env): Anthropic {
  const apiKey = env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('agents: asked for a live client with no ANTHROPIC_API_KEY')
  }
  client ??= new Anthropic({ apiKey })
  return client
}

/** Only for tests: the memoised client would otherwise outlive a changed env. */
export function resetAnthropicClient(): void {
  client = null
}
