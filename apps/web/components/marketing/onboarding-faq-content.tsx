/**
 * The questions somebody asks between "I understand how it works" and "fine,
 * start".
 *
 * `/faq` answers the legitimacy questions and `/pricing` answers the money
 * ones. What neither covers is the first fortnight: what we need on day one,
 * when anything appears, what happens if the first batch is wrong. Those are
 * the questions that decide whether a reader starts, and they were nowhere on
 * the page that explains how it works.
 *
 * Every answer here is something we can do today with no client and no key —
 * which is the test for whether a line belongs on this site at all.
 */

import Link from 'next/link'
import * as React from 'react'

import type { FaqItem } from './faq'

const LINK = 'underline underline-offset-4 hover:text-text'

export const ONBOARDING_FAQ: readonly FaqItem[] = [
  {
    id: 'day-one',
    question: 'What do you need from me on day one?',
    answer: (
      <>
        <p className="m-0">
          Three things: which accounts to post to, what the business actually sells, and
          confirmation that you hold the rights to any footage you send. The accounts are connected
          by you, in a click each, and disconnected the same way.
        </p>
        <p className="m-0">
          We do not need a strategy document, a content calendar or a brand book. If you have one,
          it saves the agents a question.
        </p>
      </>
    ),
  },
  {
    id: 'first-post',
    question: 'When does the first post go out?',
    answer: (
      <p className="m-0">
        After the scan, the brand kit and your approval of the first batch — in practice the first
        few days. Nothing posts before you have seen it, and the schedule starts low and rises as
        the account proves itself rather than opening at full volume.
      </p>
    ),
  },
  {
    id: 'first-batch-wrong',
    question: 'What if the first batch is not right?',
    answer: (
      <p className="m-0">
        Send it back. A note on one video changes the brand kit for every video after it, which is
        the point of there being a kit rather than a preference per post. The pilot exists for
        exactly this: two weeks is long enough to find out whether the drafts arrive right, and
        short enough that being wrong costs you a fortnight.
      </p>
    ),
  },
  {
    id: 'change-the-goal',
    question: 'Can I change the goal later?',
    answer: (
      <p className="m-0">
        Yes, and the KPIs change with it — the goal is what decides which numbers the dashboard
        leads with. The{' '}
        <Link href="/metrics" className={LINK}>
          metrics page
        </Link>{' '}
        shows what each of the seven goals reports.
      </p>
    ),
  },
  {
    id: 'who-sees-footage',
    question: 'Who sees my footage?',
    answer: (
      <p className="m-0">
        The agents that have to, and the person reviewing the shortlist. It is not used to train
        anything, it is not published anywhere you did not connect, and you can export or delete it
        at any time. The{' '}
        <Link href="/legal/privacy" className={LINK}>
          privacy notice
        </Link>{' '}
        is the checkable version of that sentence.
      </p>
    ),
  },
]
