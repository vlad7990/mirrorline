/**
 * The platform limits we have to say out loud, in one voice.
 *
 * 02_BRAND_AND_VOICE: say the limit plainly rather than hide it. The calendar
 * legend has said it since the studio was built — "TikTok posts stay private
 * until our app is approved." — to a client looking at their own week.
 *
 * ## Why a template rather than a second sentence
 *
 * PR D puts the same limit on `/pricing`, for YouTube, and the instruction
 * was that it say so **in the same words the calendar legend uses**. Typing
 * those words again would make that true on the day it was typed and
 * unenforceable the day after: six places in this repo already carry
 * hand-typed variants of this caveat — `/metrics`, the accounts board, the
 * publishing section, the agents list and onboarding each say "audited" or
 * "approved" in a slightly different sentence.
 *
 * So "the same words" is a property of the code here rather than a promise in
 * a comment. One template, one platform name substituted. Reword it and both
 * screens change together; there is no version of this file in which the
 * studio and the pricing page drift apart.
 *
 * ## What it must not become
 *
 * Not a general copy bag. This is the one sentence two surfaces owe each
 * other. A second, unrelated string in here is the beginning of the strings
 * file nobody can ever delete anything from.
 */

/** The platforms whose uploads our app is not yet approved to make public. */
export type GatedPlatform = 'TikTok' | 'YouTube'

/**
 * The caveat for one platform.
 *
 * Present tense and no hedge: it is true now, and "until" already says it is
 * temporary without promising a date we do not control.
 */
export function privateUntilApproved(platform: GatedPlatform): string {
  return `${platform} posts stay private until our app is approved.`
}

/** The calendar legend's sentence, and the original of the two. */
export const TIKTOK_PRIVATE_UNTIL_APPROVED = privateUntilApproved('TikTok')

/**
 * The same sentence for YouTube, which `/pricing` shows on the long-form
 * add-on card. Google's audit gates an app's ability to make uploads public,
 * and ours has not started it — `docs/PROGRESS.md`, "Needs Vlad G".
 */
export const YOUTUBE_PRIVATE_UNTIL_APPROVED = privateUntilApproved('YouTube')
