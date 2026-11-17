/**
 * The templates and the glossary (19 v2 ★/resources item 4).
 *
 * **"Each a real list rather than a promise of one."** That phrasing in the
 * spec is doing real work, and it rules out the shape this section usually
 * takes: a card saying "Download the hook sheet" behind an email field. The
 * resources page already promises no gated downloads and no email required, so
 * a template here is the template — the actual lines, on the page, in the
 * HTML, where they can be read and copied without an account.
 *
 * That also decides what a template may contain. A worksheet that only makes
 * sense once someone has our studio open is a product tour wearing a
 * template's clothes. Everything below works on paper.
 */

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

export interface Template {
  readonly id: string
  readonly title: string
  /** What it is for, in one line. */
  readonly purpose: string
  /** The thing itself: the lines a reader would copy out. */
  readonly lines: readonly string[]
  /** How to use it — after the lines rather than before them. */
  readonly note: string
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'hook-sheet',
    title: 'The hook sheet',
    purpose: 'Six openings for one idea, so you are choosing rather than settling.',
    lines: [
      'Idea, in one sentence: ______',
      '1. The correction — “You are doing ______, and it costs you ______.”',
      '2. The specific number — “______ of these are optional. Here is which.”',
      '3. The named mistake — “If ______ happened to you, check ______ first.”',
      '4. The visible before — open on ______ in frame, and say nothing for a beat.',
      '5. The honest refusal — “Do not do this if ______.”',
      '6. The overheard question — “Someone asked me ______ yesterday and I answered badly.”',
    ],
    note: 'Record all six in one sitting, then post the one you like least first. Your ranking of your own openings is usually wrong, and a week of data settles it.',
  },
  {
    id: 'week-plan',
    title: 'The one-week plan',
    purpose: 'A week that can actually be filled from one recording, written out by day.',
    lines: [
      'Mon — the strongest claim from the recording. The longest cut of the week.',
      'Tue — a question you get asked constantly, answered properly.',
      'Wed — the shortest cut you have. One idea, under twenty seconds.',
      'Thu — a mistake you see people make, named plainly.',
      'Fri — a story with a point. The one that needs a beat before the payoff.',
      'Sat — nothing. The gap is deliberate, and it is where your reserve goes if a week slips.',
      'Sun — a cut you would not normally post. The one you are unsure about.',
    ],
    note: 'Two of those slots are doing a job that is not content. Saturday is the buffer that stops a bad week becoming a visible gap, and Sunday is the experiment that keeps the account from narrowing to the five things that already worked.',
  },
  {
    id: 'consent-note',
    title: 'The consent note',
    purpose: 'A short written record for anyone who appears in, or is heard in, your footage.',
    lines: [
      'Who: ______ (full name, and how to reach them)',
      'What was recorded: ______ (date, place, roughly what happened)',
      'Where it may be used: ______ (name the accounts, not “social media”)',
      'For how long: ______ (a date, or “until they ask us to stop”)',
      'May their voice be used separately from their picture? yes / no',
      'May the footage be edited and re-cut? yes / no',
      'How to withdraw: ______ (one address, and what happens to posts already up)',
      'Signed, and dated: ______',
    ],
    note: 'Keep it with the footage rather than in a folder of its own, so a recording and its permission never get separated. A client call recorded with a verbal “sure, go ahead” is not this, and the difference between them only matters once.',
  },
  {
    id: 'repurposing-pass',
    title: 'The repurposing pass',
    purpose: 'What to mark while watching a long recording back — once, in order.',
    lines: [
      'Mark every claim someone could reasonably disagree with.',
      'Mark every number, price or piece of specific evidence.',
      'Mark every mistake you name that you see people make.',
      'Mark every question you answer that you get asked a lot.',
      'Mark every short story that has a point at the end of it.',
      'Do not mark explanations, context or preamble. They are why the recording is long.',
      'Stop at the end. Do not go back for more — a second pass finds worse ones.',
    ],
    note: 'Expect six to twelve marks out of an hour, not thirty. If you have thirty, most of them are explanations, and cutting those produces posts that need the rest of the recording to make sense.',
  },
]

/* -------------------------------------------------------------------------- */
/* Glossary                                                                    */
/* -------------------------------------------------------------------------- */

export interface GlossaryEntry {
  readonly term: string
  readonly definition: string
  /** The part people get wrong, where there is one. */
  readonly caveat?: string
}

/**
 * The words these articles and the platforms' own documentation use.
 *
 * Industry terms, not ours. A glossary that defined our features would be a
 * product page with a dictionary's manners, and someone who arrived here from
 * a search for "non-follower reach" wants the metric rather than the brand.
 * Alphabetical, because every other order is an argument about importance.
 */
export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'Cadence',
    definition: 'How often an account posts, and how evenly. Usually written as posts per week.',
    caveat:
      'Evenness matters more than the number. Twelve posts in three days and then nothing reads as a backlog being dumped.',
  },
  {
    term: 'Completion rate',
    definition:
      'The share of views that reached the end of the video. Sometimes called watch-through.',
    caveat:
      'It falls as a video gets longer, so it only compares honestly between posts of about the same length.',
  },
  {
    term: 'Hook',
    definition:
      'The opening of a short video — roughly the first three seconds, before any substance has arrived.',
  },
  {
    term: 'Impressions',
    definition: 'How many times a post was put in front of a screen, counting repeats.',
    caveat:
      'Not the same as reach. One person shown a post four times is four impressions and one reach.',
  },
  {
    term: 'Material edit',
    definition:
      'The platforms’ phrase for a change substantial enough to make reused material your own. A new recording qualifies; a watermark, a crop or a new caption does not.',
  },
  {
    term: 'Non-follower reach',
    definition: 'How many people saw a post who do not already follow the account.',
    caveat:
      'The number to read when you want to know whether an account is meeting anyone new, which a follower count cannot tell you.',
  },
  {
    term: 'Official API',
    definition:
      'A platform’s published interface for posting with an account holder’s permission. The alternative — software driving the app or a browser — breaks the terms of every major platform.',
  },
  {
    term: 'Reach',
    definition: 'How many distinct people saw a post at least once.',
  },
  {
    term: 'Remake',
    definition:
      'Rebuilding a format from scratch: the structure of a video that worked, with your own script, your own footage and your own voice. Distinct from a repost in both law and practice.',
  },
  {
    term: 'Sends and saves',
    definition:
      'How many people forwarded a post privately or kept it. Usually read per 1,000 reach, so that posts of different sizes can be compared.',
    caveat:
      'The signal platforms currently weight hardest, and the closest thing to a quality score an account can see.',
  },
  {
    term: 'Three-second hold',
    definition:
      'The share of viewers still watching at three seconds. The first thing to read, because nothing downstream means much if it is low.',
  },
  {
    term: 'Vertical',
    definition:
      'A 9:16 video, the shape every short-video surface expects. Not to be confused with an industry vertical.',
  },
]
