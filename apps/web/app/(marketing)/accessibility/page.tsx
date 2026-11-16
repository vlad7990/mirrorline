/**
 * /accessibility — what we test, what we know is not right, and how to tell
 * us (16 §4).
 *
 * The "known gaps" section is the only part of an accessibility statement
 * worth reading, and the only part most of them leave out. Ours names the
 * limits of our own testing — automated checks miss a great deal, and we have
 * not had a screen-reader user through the product.
 *
 * Not a legal document, so no draft notice: it is a factual statement about
 * the state of the build.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { DocPage, type DocPageContent } from '@/components/marketing/doc-page'

export const metadata: Metadata = {
  title: 'Accessibility',
  description:
    'What we test, what we have fixed, what we know is still wrong, and how to tell us about something we have missed.',
}

const CONTENT: DocPageContent = {
  eyebrow: 'Accessibility',
  title: (
    <>
      What we test, <span className="gold-phrase">and what we know is missing.</span>
    </>
  ),
  lead: 'We aim at WCAG 2.1 AA. This page says how we check, what that checking does not catch, and what to do when you find something.',
  sections: [
    {
      id: 'what-we-do',
      title: 'What we check, and when',
      paragraphs: [
        'Automated accessibility checks run against every page of this site and every screen of the studio, in both themes, on every change. A failure blocks the build rather than filing a ticket.',
        'We also check interactive states: the checks run against open menus and expanded cards, not only the page as first drawn, because a closed panel is not in the document and gets silently skipped.',
      ],
      list: [
        'Text contrast at 4.5:1, and 3:1 for large text and meaningful non-text elements.',
        'Every control reachable and operable by keyboard, with a visible focus state.',
        'Headings in order, landmarks present, and a skip link to the main content.',
        'Every image either described or explicitly marked decorative.',
        'All motion removed under “reduce motion”, including the scroll-driven effects.',
      ],
    },
    {
      id: 'motion',
      title: 'Motion',
      paragraphs: [
        'If your system asks for reduced motion you get none of it: the scroll animations, the pinned section and the looping video tiles all stop, and the content is laid out statically instead. That is tested rather than assumed.',
        'Nothing on this site flashes, and nothing auto-plays with sound.',
      ],
    },
    {
      id: 'gaps',
      title: 'What we know is not covered',
      paragraphs: [
        'Automated checks catch perhaps a third of what matters. Being honest about the rest is more useful than a clean badge.',
      ],
      list: [
        'No screen-reader user has been through this product. Our testing is a developer with a screen reader, which is not the same thing.',
        'We have not tested with voice control, switch access or a screen magnifier.',
        'The studio is designed desktop-first. It works in a phone browser and has not had the attention the public pages have.',
        'Some wide tables scroll sideways inside their card. That is better than breaking the page, and it is still awkward on a small screen.',
        'This site is in English only.',
      ],
    },
    {
      id: 'telling-us',
      title: 'If you find something',
      paragraphs: [
        'Tell us through the contact page and we will treat it as a defect rather than a request. You do not need to explain why it matters or name a success criterion — describing what happened is enough.',
        'We will say what we are going to do and roughly when, and if the answer is that we cannot fix it soon, we will say that instead of going quiet.',
      ],
    },
  ],
  updated: '9 November 2026',
}

export default function AccessibilityPage() {
  return <DocPage content={CONTENT} />
}
