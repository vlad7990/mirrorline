/**
 * Is "Generate with AI" switched on for this deployment.
 *
 * ============================================================================
 * Why a flag at all, when the money is already capped
 * ============================================================================
 *
 * Because the cap and the flag answer different questions. The cap asks "how
 * much", and it holds. The flag asks "at all" — and until `XAI_API_KEY` has
 * made one real call, been reconciled against the console's own figure, and had
 * zero data retention bought on the account (D140 §5, Vlad's), the honest
 * answer for every deployment including preview is **no**.
 *
 * Off by default, and that direction is the whole point. A flag that defaults
 * on protects nothing: the deployment that most needs it is the one nobody
 * configured. `GENERATION_ENABLED` has to be set, explicitly, by somebody who
 * meant it.
 *
 * ============================================================================
 * Read here and nowhere else
 * ============================================================================
 *
 * Three surfaces ask the question — the screen, the action behind its button,
 * and the route that serves the bytes — and each has to answer it for itself: a
 * page that checks the flag while its action does not is a button that still
 * spends money after the screen stopped offering it. One reader means they
 * cannot disagree about what "enabled" spells.
 *
 * No `server-only` here, deliberately, and not because a client may read it —
 * an unprefixed variable is simply absent in the browser, so a client call
 * would return `false` rather than leak anything. It stays out so this module
 * can sit beside `types.ts` on the client-safe side of the sweep if a panel
 * ever needs to render "generation is off" without reaching the server.
 */

import type { EnvLike } from './types'

/** The variable, named once. */
export const GENERATION_FLAG = 'GENERATION_ENABLED'

/**
 * The two spellings we accept, and nothing else.
 *
 * Not `Boolean(raw)`, which is true for `'false'`, `'0'` and `'off'` — the
 * three things somebody writes when they mean to turn a feature off. A value
 * this module does not recognise is `false`, because "I set it to something" is
 * not the same as "I set it to on".
 */
const TRUTHY = new Set(['1', 'true'])

export function isGenerationEnabled(env: EnvLike = process.env): boolean {
  const raw = env[GENERATION_FLAG]
  return typeof raw === 'string' && TRUTHY.has(raw.trim().toLowerCase())
}
