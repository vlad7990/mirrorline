/**
 * The five questions `/product` gets asked, which the site FAQ answers for a
 * different reader.
 *
 * `/faq` answers "is this legitimate, and what will it cost me" — the
 * questions somebody asks before they trust us at all. By the time a reader
 * is on `/product` they have usually accepted the premise and want to know
 * what the thing does on a Tuesday: what happens if they send nothing, who
 * presses go, what a blocked video looks like. None of those are on `/faq`,
 * and all five are answerable from 09 and 04.
 *
 * `.tsx` for the reason `pricing-faq-content.tsx` is: the answers carry links
 * and mono figures. Nothing imports it from a test, so the `jsx: "preserve"`
 * limitation that keeps content in `.ts` does not apply.
 */

import Link from 'next/link'
import * as React from 'react'

import type { FaqItem } from './faq'

const LINK = 'underline underline-offset-4 hover:text-text'

export const PRODUCT_FAQ: readonly FaqItem[] = [
  {
    id: 'no-footage',
    question: 'What if I have no footage to send?',
    answer: (
      <>
        <p className="m-0">
          Then we create originals instead. The Niche Scan finds the formats growing in your niche
          and the Remake Producer rebuilds the <em>structure</em> — a new script, new footage and a
          new voice. We never use anybody else&rsquo;s clip, audio or voice.
        </p>
        <p className="m-0">
          Most accounts end up mixing the two: your own long video when you have one, created
          originals in the weeks you do not.
        </p>
      </>
    ),
  },
  {
    id: 'who-approves',
    question: 'Who presses go?',
    answer: (
      <p className="m-0">
        You do, until you decide otherwise. Every post waits in the calendar for your approval, and
        auto-approve is a switch you turn on yourself rather than a default we chose for you. The
        Compliance agent runs before either — nothing reaches the calendar without passing it.
      </p>
    ),
  },
  {
    id: 'blocked-video',
    question: 'What happens when a video is blocked?',
    answer: (
      <p className="m-0">
        It comes back rewritten, with the rule it hit written on it. The Originality Gate blocks and
        rewrites; it never nudges something under a threshold to get it through. That distinction is
        the product — the same technique that used to be run to evade detection is run backwards
        here, to enforce originality. The{' '}
        <Link href="/trust" className={LINK}>
          trust page
        </Link>{' '}
        has the whole rule list.
      </p>
    ),
  },
  {
    id: 'brand-voice',
    question: 'Will it sound like us, or like a robot?',
    answer: (
      <p className="m-0">
        The brand kit carries your words, the ones you never use, your real offers and your facts,
        and every script has to cite at least one of those facts. It is not a style preset: a draft
        with nothing of yours in it does not pass, and you can rewrite any line before it goes out.
      </p>
    ),
  },
  {
    id: 'how-long-to-first-post',
    question: 'How soon does anything go out?',
    answer: (
      <p className="m-0">
        The scan and the brand kit take the first few days, and posting starts once you have
        approved the first batch. The two-week pilot is built around that:{' '}
        <span className="machine">12</span> videos, scheduled and posted, with one full report at
        the end you can judge us on.
      </p>
    ),
  },
]
