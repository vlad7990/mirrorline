/**
 * The FAQ's words, with no JSX anywhere near them.
 *
 * **Why this file exists at all.** The answers used to be written as JSX
 * fragments inside `faq-content.tsx`, which made them unreachable twice over:
 * `tsconfig.base.json` sets `jsx: "preserve"` and the Vitest config includes
 * only `*.test.ts` under `apps/web`, so **no test and no `.ts` module can
 * import a `.tsx` file at all.** That was tolerable while the FAQ was only
 * rendered. It stopped being tolerable when `lib/copilot/grounding.ts` had to
 * read it: spec 18 §9.3 is explicit that the corpus must be built "from the
 * content modules rather than copying prose, or the bot will answer from a
 * site that no longer exists".
 *
 * The alternative was a second copy of eleven answers, kept in step with the
 * first by hand. That is the arrangement D54 refused for the email check and
 * for the same reason: two copies of a thing is how the two stop agreeing,
 * and here the symptom would be a public bot quoting a page we no longer
 * serve. This is the fourth time `jsx: "preserve"` has decided a file's
 * extension (F1's `PAGE_CTAS`, F5's articles, D54's scan rules, now this),
 * which is why D54 wrote it down as a rule: **content and rules in `.ts`,
 * components in `.tsx`.**
 *
 * **The run model, and why it is not just strings.** Three answers set a
 * figure in `<span className="machine">` — the mono treatment DESIGN.md gives
 * machine-written numbers. Flattening those to plain text would have changed
 * what the page looks like, and C1 ships no visual change. So a paragraph is
 * a list of runs, each either prose or a machine figure, and
 * `faq-content.tsx` maps them back to exactly the markup it had before:
 * `<p className="m-0">` per paragraph, `<span className="machine">` per
 * figure. The rendered DOM is unchanged; only where the words live has moved.
 */

/** A stretch of an answer: prose, or a figure the machine wrote. */
export type FaqRun = string | { readonly machine: string }

/** One `<p>`. */
export type FaqParagraph = readonly FaqRun[]

export interface FaqEntry {
  readonly id: string
  readonly question: string
  readonly answer: readonly FaqParagraph[]
}

/**
 * The eleven questions, in the order the pages want them.
 *
 * 16 §3 row 18 asks the home page to show the top six and `/faq` to carry the
 * rest, which only works if there is one list. The first six are therefore the
 * six most common objections, and the longer answers follow.
 */
export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    id: 'do-you-post',
    question: 'Do you post for me?',
    answer: [
      [
        'Yes, once you approve. The Publisher puts approved posts out through the official APIs of Instagram, TikTok and YouTube, at the times that have worked for your audience.',
      ],
      [
        'You can leave every post on manual approval, or turn auto-approve on yourself. Nothing is posted on your behalf until you choose one.',
      ],
    ],
  },
  {
    id: 'whose-accounts',
    question: 'Whose accounts do the posts go to?',
    answer: [
      ['Yours. You connect each account, and you can disconnect it at any time without asking us.'],
      [
        'We do not create accounts for you, we do not run accounts on your behalf, and we do not use device automation, proxies or app clones.',
      ],
    ],
  },
  {
    id: 'copyright',
    question: 'What about copyright?',
    answer: [
      [
        'We only work from material you own or we hold rights to. When a format is rising in your niche we take its structure (the hook pattern, the beats, the pacing) and nothing else: new script, your footage, your voice.',
      ],
      [
        'Before a video can be scheduled, the Compliance agent compares it with its source and holds the wording under our ',
        { machine: '30%' },
        ' similarity limit, checks the rights and consent records, and checks the AI labels.',
      ],
      [
        'That is our own check, not legal clearance. We cannot promise a platform or a rights holder will always agree with it, so you see the result and can decide for yourself.',
      ],
    ],
  },
  {
    id: 'face-and-voice',
    question: 'Do you use my face or voice?',
    answer: [
      [
        'Only if you ask us to, and only with a signed release we keep on file. No face swaps, ever.',
      ],
      [
        'Without a release we use the footage you recorded and a stock voice, and any generated scene carries its AI label.',
      ],
    ],
  },
  {
    id: 'platform-rule',
    question: 'What if a video breaks a platform rule?',
    answer: [
      [
        'Compliance blocks it before it reaches the calendar and tells you why in plain words. For example: background music from a venue, or a claim with nothing behind it.',
      ],
      [
        'You can fix it and send it back through, or override the block yourself; the override is logged either way. If something does slip through, tell us and we take it down.',
      ],
    ],
  },
  {
    id: 'results',
    question: 'When do I see results?',
    answer: [
      [
        'We do not promise numbers, and we will not quote you any. Short-form growth is slow and uneven, it depends on your niche, your footage and your offer, and no agency can honestly predict it.',
      ],
      [
        'What we can tell you is what you get and when: in a two-week pilot you get ',
        { machine: '12' },
        ' videos, a posting schedule and one report. After that you get posts out on time, every week, and a report that runs from views to clicks to calls. The figures in it are the real ones, including the weeks that go badly.',
      ],
      ['Judge us on that. If the posts stop or the reporting goes quiet, leave.'],
    ],
  },
  {
    id: 'which-industries',
    question: 'Which industries do you work with?',
    answer: [
      [
        'All of them. There is no industry page on this site and no list to fit into, because the agents research whatever niche you are in rather than us picking a vertical in advance.',
      ],
      [
        'Regulated work — health, finance, legal, property — is served normally, with the matching rule pack switched on automatically and shown to you.',
      ],
      [
        'We do not work on political content, gambling, crypto or adult content, and we do not work with anyone under 18.',
      ],
    ],
  },
  {
    id: 'sound-like-me',
    question: 'Will it sound like me?',
    answer: [
      [
        'That is the complaint we read most often about everything else in this category, so it is the thing we built around. Your voice and facts profile holds your tone, the words you use, the words you never use, your real offers and your real answers.',
      ],
      [
        'Every script has to cite at least one true fact about your business. A script that could belong to anyone doing what you do has failed, and gets rewritten.',
      ],
    ],
  },
  {
    id: 'cancelling',
    question: 'What happens if I cancel?',
    answer: [
      [
        'You cancel from Settings in one click, at any time. No contract, no notice period, and no call where somebody talks you out of it.',
      ],
      [
        'The plan runs to the end of the period you have already paid for, and then stops. There are no charges after that.',
      ],
    ],
  },
  {
    id: 'file-ownership',
    question: 'Do I own the files?',
    answer: [
      [
        'Yes, all of them, forever. You can export everything whenever you like — including after you have cancelled, which is when it actually matters.',
      ],
      [
        'There are no credits anywhere in the product, so nothing you have paid for expires at the end of a month.',
      ],
    ],
  },
  {
    id: 'data-tracked',
    question: 'What data do you track?',
    answer: [
      [
        'For your account: what we published and when, the figures the platforms’ own insights APIs return, clicks on links we generated, and any outcomes you record yourself. Every KPI on your dashboard names its source and says how fresh it is.',
      ],
      [
        'On this website: nothing. There is no analytics vendor, no advertising pixel and no non-essential cookie set unless you accept one.',
      ],
      [
        'Where a source is not connected, the dashboard says “Not connected” and offers you a button. It never shows a zero, because a zero is a claim about a number nobody measured.',
      ],
    ],
  },
]

/** How many of the eleven the home page shows (16 §3 row 18). */
export const FAQ_HOME_COUNT = 6

/**
 * One answer as the plain text a reader would hear.
 *
 * Used by the co-pilot's grounding corpus, which needs the words and not the
 * markup. Paragraphs are joined with a blank line so the model sees the same
 * breaks a reader does; runs are concatenated without a separator, because a
 * machine figure sits inside a sentence rather than beside it.
 */
export function faqAnswerText(entry: FaqEntry): string {
  return entry.answer
    .map((paragraph) =>
      paragraph.map((run) => (typeof run === 'string' ? run : run.machine)).join(''),
    )
    .join('\n\n')
}
