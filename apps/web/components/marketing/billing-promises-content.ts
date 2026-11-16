/**
 * Plain billing, said on the page where the money is (09 §10, 11 §2 P3).
 *
 * P3 is the billing-trap complaint: credits charged per source minute,
 * charges after cancelling, files deleted on the way out. 09 §10 answers it
 * in four lines and calls the answer a feature. Until now those four lines
 * lived only on `/legal/cancellation-refunds` — which is the right place for
 * the checkable version and the wrong place for the promise, because nobody
 * reads the refund policy before deciding whether to care.
 *
 * So the four sit beside the prices, with a link to the page that commits to
 * them. **Every promise here is already written in a legal page we publish**;
 * this is a summary of an obligation, not a new one. A test holds the two
 * together.
 */

/** Where the checkable version lives. */
export const BILLING_DETAIL_HREF = '/legal/cancellation-refunds'

export interface BillingPromise {
  readonly id: string
  /** The promise, in the fewest words that still commit to something. */
  readonly title: string
  /** What it rules out, which is the half P3 complains about. */
  readonly body: string
}

export const BILLING_PROMISES: readonly BillingPromise[] = [
  {
    id: 'no-credits',
    title: 'No credits',
    body: 'Nothing is metered by the minute and nothing you have paid for expires at the end of a month. One flat price, and the posts it buys are written on the plan.',
  },
  {
    id: 'cancel-in-one-click',
    title: 'Cancel in one click',
    body: 'From Settings, at any time. No notice period, no cancellation call, and nothing charged after the period you have already paid for.',
  },
  {
    id: 'files-are-yours',
    title: 'Every file stays yours',
    body: 'Export all of it at any time, including after you leave. The videos are made from your footage, and they do not stop being yours when the plan does.',
  },
  {
    id: 'no-setup-fee',
    title: 'No setup fee',
    body: 'No onboarding fee and no annual commitment. The two-week pilot is the paid trial, and it is the only thing that happens before a month starts.',
  },
]
