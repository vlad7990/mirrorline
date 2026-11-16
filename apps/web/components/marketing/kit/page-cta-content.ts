/**
 * What each page says at the bottom.
 *
 * `site-cta.tsx` puts the same block — "Record once. Show up everywhere." —
 * at the foot of every public page. One component rather than five copies was
 * the right fix for the problem it solved, but it solved the wrong half: the
 * duplication that mattered was never the markup, it was the sentence. A
 * reader who has just finished the pricing table and a reader who has just
 * finished the comparison are in two different places, and telling both the
 * same thing wastes the one position on the page where they have already
 * decided to keep reading.
 *
 * **The offer does not live here, and that is the point.** Every `lead` below
 * leads *into* the pilot terms, which `PageCta` appends from one place. So a
 * page is free to differ in how it arrives at the offer and structurally
 * unable to differ in what the offer is — two weeks, $750, twelve videos from
 * your own footage, stop if it is not worth the next month (09 §Services). A
 * page that restated the terms more attractively for its own audience would
 * be the kind of thing non-negotiable 7 exists to prevent, and this shape
 * means no page can.
 *
 * Content in `.ts` and the component in `.tsx` is the convention
 * `home-content.ts` and `pricing-tiers.ts` already follow, and it is not only
 * tidiness: `tsconfig.base.json` sets `jsx: "preserve"`, so a `.tsx` module
 * cannot be imported by a Vitest spec at all. The test that asserts no two
 * pages close with the same headline needs this file to be plain TypeScript.
 */

export interface PageCtaContent {
  /** The headline's first half, in the serif display scale. */
  readonly title: string
  /** The gold phrase that closes the headline. */
  readonly accent: string
  /**
   * One sentence or two of this page's own framing.
   *
   * Written to run straight into the pilot terms, so it ends on a colon or on
   * a clause that expects them. It never states a price, a count or a
   * duration itself.
   */
  readonly lead: string
  /** Where "Next" points, carrying the reader on around the site. */
  readonly next?: { readonly href: string; readonly label: string }
}

export const PAGE_CTAS = {
  product: {
    title: 'Send one video.',
    accent: 'See what comes back.',
    lead: 'You have already got the footage — a talk, a webinar, a call you recorded anyway. Two weeks is enough to find out whether it is worth posting.',
    next: { href: '/how-it-works', label: 'How it works' },
  },
  'how-it-works': {
    title: 'The first week',
    accent: 'starts on a Monday.',
    lead: 'Everything above happens in the first fortnight, in that order, whether you watch it or not.',
    next: { href: '/pricing', label: 'Pricing' },
  },
  pricing: {
    title: 'Two weeks first,',
    accent: 'then a plan.',
    lead: 'Nobody starts on a retainer. The pilot is the whole of the commitment and it ends by itself.',
    next: { href: '/compare', label: 'Compare' },
  },
  compare: {
    title: 'If it is us,',
    accent: 'start small.',
    lead: 'And if the questions above pointed you at an editor or at doing it yourself, that answer stands — we would rather lose the fortnight than the year. If it is us:',
    next: { href: '/pricing', label: 'Pricing' },
  },
  metrics: {
    title: 'Pick the goal,',
    accent: 'then hold us to it.',
    lead: 'The dashboard above is the one you get, reporting against the goal you choose in onboarding.',
    next: { href: '/product', label: 'The product' },
  },
  'niche-scan': {
    title: 'The scan comes first,',
    accent: 'and it is free.',
    lead: 'We research your niche before anyone signs anything, because a plan written without it is a guess. If the recipes look right:',
    next: { href: '/how-it-works', label: 'How it works' },
  },
  resources: {
    title: 'Use any of this',
    accent: 'without us.',
    lead: 'Everything here works on your own time and costs nothing. When doing it yourself stops being the cheaper option, the pilot is here:',
    next: { href: '/how-it-works', label: 'How it works' },
  },
  businesses: {
    title: 'We do not need to know the trade',
    accent: 'to start on Monday.',
    lead: 'The Niche Scan is what learns it, and it runs before anyone signs anything. Two weeks is long enough to see whether what comes back is worth posting:',
    next: { href: '/niche-scan', label: 'Start the scan' },
  },
  agents: {
    title: 'Seven agents, one loop,',
    accent: 'and a log you can read.',
    lead: 'None of it runs without a cap you set, and none of it posts without passing the gate. The fortnight is the cheapest way to watch it work on your own account:',
    next: { href: '/trust', label: 'Our rules' },
  },
  trust: {
    title: 'Everything above',
    accent: 'is a rule, not a promise.',
    lead: 'Each one is something the product enforces rather than something we intend — which is the only kind worth reading before you hand over an account:',
    next: { href: '/agents', label: 'The agents' },
  },
  individuals: {
    title: 'One account, posted properly,',
    accent: 'for a fortnight.',
    lead: 'No team, no studio and nothing to keep to — that is the part we take. The first two weeks are where you find out whether it suits you:',
    next: { href: '/how-it-works', label: 'How it works' },
  },
} as const satisfies Record<string, PageCtaContent>

export type PageCtaKey = keyof typeof PAGE_CTAS
