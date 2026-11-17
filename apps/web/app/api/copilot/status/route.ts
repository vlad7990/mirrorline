/**
 * GET /api/copilot/status — which mode, what it has spent, and whether the
 * cache is working.
 *
 * **Why a surface needs this.** §4 says the UI must say when it is in sample
 * mode, and a client component cannot work that out for itself: the mode is
 * decided by `ANTHROPIC_API_KEY`, which must never reach a browser bundle. So
 * the answer comes from the server, the same way `/api/engine/status` tells
 * the upload screen whether an engine exists. C2's launcher and C3's panel
 * header both read it.
 *
 * It also reports the two things §6 asks to be watched, because a number
 * nobody can see is a number nobody checks:
 *
 * - **the corpus against Haiku 4.5's 4096-token cache minimum.** With a key
 *   this is a real `messages.countTokens`; without one it is the pessimistic
 *   floor, and the response says which, because "verified" and "cannot be
 *   less than" are different claims.
 * - **the cache-read share.** Zero across repeated questions means the prefix
 *   is being invalidated and every question is paying full price for the whole
 *   corpus, with no error anywhere to say so.
 *
 * No secret is in the response: whether a key exists, never any part of it.
 */

import { NextResponse } from 'next/server'

import { SITE_MODEL, STUDIO_MODEL, copilotMode, corpusCacheVerdict } from '@/lib/copilot/adapter'
import {
  cacheHealth,
  cacheReadShare,
  monthlyCapUsd,
  readLedger,
  spendSummary,
} from '@/lib/copilot/spend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Matches the ids the two route handlers use. */
const WORKSPACES = ['public-site', 'demo'] as const

export async function GET(): Promise<NextResponse> {
  const mode = copilotMode()
  const now = new Date()
  const corpus = await corpusCacheVerdict()

  return NextResponse.json({
    mode,
    models: { site: SITE_MODEL, studio: STUDIO_MODEL },
    corpus: {
      chars: corpus.chars,
      tokens: corpus.tokens,
      floorTokens: corpus.floorTokens,
      minimum: corpus.minimum,
      cachesOnHaiku: corpus.cachesOnHaiku,
      /** True only when a real count was taken, which needs a key. */
      verifiedByRealCount: corpus.tokens !== null,
      reason: corpus.reason,
    },
    capUsd: monthlyCapUsd(),
    workspaces: WORKSPACES.map((workspaceId) => {
      const ledger = readLedger(workspaceId, now)
      return {
        workspaceId,
        month: ledger.month,
        calls: ledger.calls,
        usd: Number(ledger.usd.toFixed(4)),
        summary: spendSummary(ledger),
        cacheReadShare: cacheReadShare(ledger),
        cacheHealth: cacheHealth(ledger),
      }
    }),
  })
}
