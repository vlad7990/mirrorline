/**
 * A stable handle for a prompt, which is not the prompt.
 *
 * `agent_runs.reason`'s own comment draws the line this module exists to
 * respect: *"**Never the prompt and never the question** — 18 §3.3 is that
 * questions are not logged with identifiers… 'cap reached' belongs here; the
 * client's text does not."* But a generated clip still needs to be traceable:
 * two assets from one prompt should be recognisable as siblings, and a support
 * conversation needs something to point at.
 *
 * A reference solves both without storing the sentence. The same prompt always
 * produces the same handle, and the handle reveals nothing.
 *
 * ## Why FNV-1a and not SHA-256
 *
 * Because `node:crypto` cannot be on this side of the client boundary. A
 * `'use client'` panel renders `GeneratedAsset.promptRef`, so the asset's
 * shapes live in a module with no `server-only` — and anything importing
 * `node:crypto` transitively from there is the exact failure
 * `lib/copilot/server-only.test.ts` walks the import graph to catch.
 *
 * The weaker hash is also the honest choice on the merits. **This is an
 * identifier, not a security boundary.** Nothing is authorised by it, nothing
 * is verified against it, and a collision costs two unrelated scenes sharing a
 * label in a log. Reaching for a cryptographic hash here would suggest it was
 * protecting something, which is worse than the collision risk: it invites the
 * next reader to rely on a property this does not have.
 *
 * It is deliberately not reversible either. Sixteen hex characters of a
 * 64-bit hash cannot be turned back into a sentence, so a log line carrying
 * one has not quietly become a log line carrying a prompt.
 */

/**
 * FNV-1a, 64-bit.
 *
 * `BigInt` rather than two 32-bit halves because the arithmetic is written
 * once and read often, and the readable version is worth more here than the
 * microseconds: this runs once per generated asset, not once per frame.
 */
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const SIXTY_FOUR_BITS = 0xffffffffffffffffn

/**
 * Case and whitespace are not meaning.
 *
 * "A quiet kitchen at dawn" and "a  quiet kitchen at dawn" are one prompt, and
 * a reference that called them two would make the sibling relationship this
 * exists to expose depend on a stray space. The same normalising instinct
 * `originality/similarity.ts` applies, for the same reason, on a smaller
 * scale — this does not strip punctuation, because punctuation does change a
 * scene description in a way a double space does not.
 */
function normalise(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * The handle: `prompt_` and sixteen hex characters.
 *
 * Prefixed so a bare value in a log or a URL is self-describing. An empty or
 * whitespace-only prompt still returns a handle rather than throwing — it is
 * not this module's job to validate a prompt (`safety.ts` does that, and
 * rejects an empty one), and a hash that threw would make every caller handle
 * an error with a better home.
 */
export function promptRef(prompt: string): string {
  const text = normalise(prompt)

  let hash = FNV_OFFSET_BASIS
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = (hash * FNV_PRIME) & SIXTY_FOUR_BITS
  }

  return `prompt_${hash.toString(16).padStart(16, '0')}`
}
