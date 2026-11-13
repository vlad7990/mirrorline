/**
 * The FAQ, shared by the home page and `/faq`.
 *
 * 16 §3 row 18 asks the home page to show the top six and `/faq` to carry the
 * rest, which only works if there is one list. It lived in the home page
 * module until `/faq` existed and needed the same answers.
 *
 * The order matters: the first six are what the home page shows, so the six
 * most common objections sit at the top and the longer answers follow.
 */

import * as React from 'react'

import type { FaqItem } from './faq'

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'do-you-post',
    question: 'Do you post for me?',
    answer: (
      <>
        <p className="m-0">
          Yes, once you approve. The Publisher puts approved posts out through the official APIs of
          Instagram, TikTok and YouTube, at the times that have worked for your audience.
        </p>
        <p className="m-0">
          You can leave every post on manual approval, or turn auto-approve on yourself. Nothing is
          posted on your behalf until you choose one.
        </p>
      </>
    ),
  },
  {
    id: 'whose-accounts',
    question: 'Whose accounts do the posts go to?',
    answer: (
      <>
        <p className="m-0">
          Yours. You connect each account, and you can disconnect it at any time without asking us.
        </p>
        <p className="m-0">
          We do not create accounts for you, we do not run accounts on your behalf, and we do not
          use device automation, proxies or app clones.
        </p>
      </>
    ),
  },
  {
    id: 'copyright',
    question: 'What about copyright?',
    answer: (
      <>
        <p className="m-0">
          We only work from material you own or we hold rights to. When a format is rising in your
          niche we take its structure (the hook pattern, the beats, the pacing) and nothing else:
          new script, your footage, your voice.
        </p>
        <p className="m-0">
          Before a video can be scheduled, the Compliance agent compares it with its source and
          holds the wording under our <span className="machine">30%</span> similarity limit, checks
          the rights and consent records, and checks the AI labels.
        </p>
        <p className="m-0">
          That is our own check, not legal clearance. We cannot promise a platform or a rights
          holder will always agree with it, so you see the result and can decide for yourself.
        </p>
      </>
    ),
  },
  {
    id: 'face-and-voice',
    question: 'Do you use my face or voice?',
    answer: (
      <>
        <p className="m-0">
          Only if you ask us to, and only with a signed release we keep on file. No face swaps,
          ever.
        </p>
        <p className="m-0">
          Without a release we use the footage you recorded and a stock voice, and any generated
          scene carries its AI label.
        </p>
      </>
    ),
  },
  {
    id: 'platform-rule',
    question: 'What if a video breaks a platform rule?',
    answer: (
      <>
        <p className="m-0">
          Compliance blocks it before it reaches the calendar and tells you why in plain words. For
          example: background music from a venue, or a claim with nothing behind it.
        </p>
        <p className="m-0">
          You can fix it and send it back through, or override the block yourself; the override is
          logged either way. If something does slip through, tell us and we take it down.
        </p>
      </>
    ),
  },
  {
    id: 'results',
    question: 'When do I see results?',
    answer: (
      <>
        <p className="m-0">
          We do not promise numbers, and we will not quote you any. Short-form growth is slow and
          uneven, it depends on your niche, your footage and your offer, and no agency can honestly
          predict it.
        </p>
        <p className="m-0">
          What we can tell you is what you get and when: in a two-week pilot you get{' '}
          <span className="machine">12</span> videos, a posting schedule and one report. After that
          you get posts out on time, every week, and a report that runs from views to clicks to
          calls. The figures in it are the real ones, including the weeks that go badly.
        </p>
        <p className="m-0">
          Judge us on that. If the posts stop or the reporting goes quiet, leave.
        </p>
      </>
    ),
  },
  {
    id: 'which-industries',
    question: 'Which industries do you work with?',
    answer: (
      <>
        <p className="m-0">
          All of them. There is no industry page on this site and no list to fit into, because the
          agents research whatever niche you are in rather than us picking a vertical in advance.
        </p>
        <p className="m-0">
          Regulated work — health, finance, legal, property — is served normally, with the matching
          rule pack switched on automatically and shown to you.
        </p>
        <p className="m-0">
          We do not work on political content, gambling, crypto or adult content, and we do not
          work with anyone under 18.
        </p>
      </>
    ),
  },
  {
    id: 'sound-like-me',
    question: 'Will it sound like me?',
    answer: (
      <>
        <p className="m-0">
          That is the complaint we read most often about everything else in this category, so it is
          the thing we built around. Your voice and facts profile holds your tone, the words you
          use, the words you never use, your real offers and your real answers.
        </p>
        <p className="m-0">
          Every script has to cite at least one true fact about your business. A script that could
          belong to anyone doing what you do has failed, and gets rewritten.
        </p>
      </>
    ),
  },
  {
    id: 'cancelling',
    question: 'What happens if I cancel?',
    answer: (
      <>
        <p className="m-0">
          You cancel from Settings in one click, at any time. No contract, no notice period, and no
          call where somebody talks you out of it.
        </p>
        <p className="m-0">
          The plan runs to the end of the period you have already paid for, and then stops. There
          are no charges after that.
        </p>
      </>
    ),
  },
  {
    id: 'file-ownership',
    question: 'Do I own the files?',
    answer: (
      <>
        <p className="m-0">
          Yes, all of them, forever. You can export everything whenever you like — including after
          you have cancelled, which is when it actually matters.
        </p>
        <p className="m-0">
          There are no credits anywhere in the product, so nothing you have paid for expires at the
          end of a month.
        </p>
      </>
    ),
  },
  {
    id: 'data-tracked',
    question: 'What data do you track?',
    answer: (
      <>
        <p className="m-0">
          For your account: what we published and when, the figures the platforms’ own insights
          APIs return, clicks on links we generated, and any outcomes you record yourself. Every
          KPI on your dashboard names its source and says how fresh it is.
        </p>
        <p className="m-0">
          On this website: nothing. There is no analytics vendor, no advertising pixel and no
          non-essential cookie set unless you accept one.
        </p>
        <p className="m-0">
          Where a source is not connected, the dashboard says “Not connected” and offers you a
          button. It never shows a zero, because a zero is a claim about a number nobody measured.
        </p>
      </>
    ),
  },
]
