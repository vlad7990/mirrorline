/**
 * Where the posts go, how they get there, and what is not built yet.
 *
 * 16 §4 lists "publishing" as one of the five things `/product` has to cover,
 * and it was the one missing: the page showed the studio, the output and the
 * Originality Gate, then stopped before the part where a video becomes a
 * post. 09 §5 is the source for every line here.
 *
 * ## The two honesty rules this content exists to keep
 *
 * **The TikTok caveat is on the page, not in a footnote.** 09 §5: "TikTok
 * posts stay private until our app is audited by TikTok." A client finds that
 * out on day one of a pilot, so leaving it off buys one signature and loses
 * the client — and it is exactly what non-negotiable 7 forbids omitting.
 *
 * **Planned is labelled planned.** Nothing here is implied to work today
 * unless it does. An integrations strip is the easiest place on a marketing
 * site to imply a product that does not exist, so every entry carries a
 * status and a test asserts the planned ones say so.
 */

export type DestinationStatus = 'official-api' | 'audit-pending'

export interface PublishingDestination {
  readonly id: string
  /** The surface a post lands on. */
  readonly platform: string
  /** How it gets there. Always an official API — non-negotiable 3. */
  readonly how: string
  readonly status: DestinationStatus
  /** The thing a client would otherwise find out in week one. */
  readonly note: string
}

export const PUBLISHING_DESTINATIONS: readonly PublishingDestination[] = [
  {
    id: 'instagram',
    platform: 'Instagram Reels',
    how: 'Official Instagram API',
    status: 'official-api',
    note: 'Posted to the business account you connect, at the times that account performs.',
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    how: 'Official TikTok API',
    status: 'audit-pending',
    note: 'Posts stay private until TikTok has audited our app. You will see them on the account; nobody else will until that clears.',
  },
  {
    id: 'youtube',
    platform: 'YouTube Shorts',
    how: 'Official YouTube Data API',
    status: 'official-api',
    note: 'Uploaded to your channel, with the description and the links you approved.',
  },
]

export type IntegrationStatus = 'built' | 'planned'

export interface Integration {
  readonly id: string
  readonly label: string
  readonly what: string
  readonly status: IntegrationStatus
}

/**
 * What else connects, and what is honestly still a plan.
 *
 * Only things a spec already commits to appear here: the Facebook crosspost
 * is 11 §2 P10, the enquiry attribution is 12 §Business outcome, and the
 * export is 09 §10's "the client keeps every file".
 */
export const INTEGRATIONS: readonly Integration[] = [
  {
    id: 'connect',
    label: 'Account connection',
    what: 'You connect each account yourself and can disconnect it at any moment. We never hold a password.',
    status: 'built',
  },
  {
    id: 'export',
    label: 'Export',
    what: 'Every file, at any time, including after you leave.',
    status: 'built',
  },
  {
    id: 'facebook-crosspost',
    label: 'Facebook crosspost',
    what: 'Posting an original to a connected Facebook page as well, so the account can be enrolled in the platform’s own content protection.',
    status: 'planned',
  },
  {
    id: 'enquiry-attribution',
    label: 'Enquiry attribution',
    what: 'Tying a booking, a DM keyword or a link click back to the post that caused it.',
    status: 'planned',
  },
]

/**
 * What we will not do to publish, in the words the spec uses.
 *
 * Non-negotiable 3 and 09 §5. On a page about distribution this is the whole
 * difference between us and the thing this company was before.
 */
export const PUBLISHING_NEVER: readonly string[] = [
  'No device automation',
  'No app clones',
  'No proxies',
  'No purchased or farmed accounts',
]
