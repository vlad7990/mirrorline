/**
 * The three starter articles (16 §4).
 *
 * **Each one is useful without us.** That is the test an article has to pass
 * to go here: if the reader could act on it with no account and no call, it
 * is worth publishing; if it only makes sense as an argument for buying, it
 * belongs on a product page instead.
 *
 * No figures are quoted from our market research. 11 says its own numbers are
 * directional and must be re-checked before any is published, so these
 * articles state the *rules* that changed rather than benchmarks that move.
 */

export interface ArticleSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly list?: readonly string[]
}

export interface Article {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly readingMinutes: number
  readonly sections: readonly ArticleSection[]
}

export const ARTICLES: readonly Article[] = [
  {
    slug: 'originality-rules-2026',
    title: 'The originality rules, and what counts as a material edit',
    summary:
      'Platforms stopped recommending accounts that mostly post other people’s material. What that means in practice, and what does and does not count as making something your own.',
    readingMinutes: 5,
    sections: [
      {
        id: 'what-changed',
        title: 'What actually changed',
        paragraphs: [
          'The rule is about *recommendation*, not removal. An account posting mostly unoriginal material does not get taken down; it stops being shown to people who do not already follow it. If your reach fell while your posting stayed the same, this is the first thing to check.',
          'It now covers photos and carousels, not only video. An account that moved to carousels to avoid the video rules did not avoid anything.',
        ],
      },
      {
        id: 'material-edit',
        title: 'What does not count as making it yours',
        paragraphs: [
          'The phrase the platforms use is a material edit, and the examples they give of what fails are consistent.',
        ],
        list: [
          'Adding a watermark or a logo.',
          'Cropping, zooming, or mirroring the frame.',
          'Putting a new caption over someone else’s footage.',
          'Re-uploading your own post from one platform to another with nothing changed.',
          'A reaction that is mostly the original playing.',
        ],
      },
      {
        id: 'what-does',
        title: 'What does count',
        paragraphs: [
          'A new recording. That is the short version, and everything else is a variation on it: your own footage, your own script, your own voice. The structure of a format — the hook pattern, the beats, the pacing — is not what the rules are about, which is why remaking a format is fine and reposting a video is not.',
          'The practical test: if you removed the original from the internet, would your post still exist? If the answer is no, it is not yours.',
        ],
      },
      {
        id: 'doing-it',
        title: 'What to do this week',
        paragraphs: ['Three things, in order of how much they are worth.'],
        list: [
          'Count what share of your last thirty posts started as someone else’s material. If it is over half, that is your reach problem.',
          'Take the three formats you reposted that did best, and remake one of them yourself — same structure, your footage, your words.',
          'Stop cross-posting unchanged. Re-cut for each platform, even if the change is only the first second.',
        ],
      },
    ],
  },
  {
    slug: 'what-to-measure',
    title: 'What to measure, if you only measure five things',
    summary:
      'Views are the least useful number on the page. Five metrics that tell you whether short video is doing anything for the business, and the order to read them in.',
    readingMinutes: 6,
    sections: [
      {
        id: 'why-not-views',
        title: 'Why views are nearly useless alone',
        paragraphs: [
          'A view is counted after a second or two. It tells you the platform showed the post to someone, which is a fact about distribution rather than about your content, and it moves for reasons that have nothing to do with you.',
          'Worse, views are the number most easily inflated by exactly the behaviour that stopped working — volume, recycling, posting across lots of accounts. Optimising for views is how people end up busy and no better off.',
        ],
      },
      {
        id: 'the-five',
        title: 'The five, in reading order',
        paragraphs: [
          'Read them in this order, because each one only means something if the one before it is healthy.',
        ],
        list: [
          'Three-second hold — did the opening work? If this is low, nothing downstream matters and the hook is the only thing to fix.',
          'Sends and saves per 1,000 reach — was it worth passing on? This is the signal platforms now weight hardest, and the closest thing to a quality score you can see.',
          'Non-follower reach — are you meeting anyone new, or circling the people you already have?',
          'Profile visits — did it make anyone curious about you rather than about the post?',
          'Leads, bookings or sales — did it produce anything. The only one the business actually feels.',
        ],
      },
      {
        id: 'cadence',
        title: 'How often to look',
        paragraphs: [
          'Weekly, not daily. Short video is noisy enough that a day tells you almost nothing, and watching it daily mostly teaches you to over-react to posts that were fine.',
          'Compare a week against the previous week and against the same week a month ago. If a number moves, ask what you changed before assuming the platform did something.',
        ],
      },
      {
        id: 'honesty',
        title: 'Two rules for your own reporting',
        paragraphs: [
          'First: never report a zero for something you did not measure. If a link was not tracked, the answer is “not tracked”, not “no clicks”. A zero in a report gets treated as a finding.',
          'Second: keep the bad weeks in. A report you cannot trust when the numbers fall is not a report, it is a sales document, and you will stop believing it exactly when you need it.',
        ],
      },
    ],
  },
  {
    slug: 'one-video-a-month',
    title: 'Turning one recording into a month of posts',
    summary:
      'A practical method for getting twenty or more genuinely different posts out of a single long video, without any of them feeling like the same post twice.',
    readingMinutes: 7,
    sections: [
      {
        id: 'what-to-record',
        title: 'What to record in the first place',
        paragraphs: [
          'The best source is a conversation, not a monologue. An interview, a client call you had permission to record, a talk with questions at the end — anything where someone else is pushing you to be specific.',
          'Sixty to ninety minutes is plenty. The constraint is rarely length; it is how many distinct ideas you actually got to. Six good ideas beats an hour of circling one.',
        ],
      },
      {
        id: 'finding-moments',
        title: 'Finding the moments',
        paragraphs: [
          'Go through once and mark every point where you said something you would be willing to argue with a peer about. Those are the posts. Explanations and preamble are not.',
        ],
        list: [
          'A claim someone could disagree with.',
          'A number, a price, or a specific piece of evidence.',
          'A mistake you see people make.',
          'A question you get asked constantly, answered properly.',
          'A short story with a point.',
        ],
      },
      {
        id: 'making-them-different',
        title: 'Making them genuinely different',
        paragraphs: [
          'This is where most people fail: twenty cuts from one video will feel like twenty copies unless something structural changes between them. Change at least two of four things each time — the hook, the length, the format, the call to action.',
          'A useful habit is to write three hooks for every cut and post the one you like least first. You are a poor judge of your own openings, and the data will tell you more in a week than your instinct will.',
        ],
      },
      {
        id: 'spreading',
        title: 'Spreading them out',
        paragraphs: [
          'Do not post twenty cuts in four days. Spread them across a month, interleaved with anything else you make, so the account reads as someone who talks regularly rather than someone who dumped a backlog.',
          'Keep two or three in reserve for the weeks when nothing gets recorded. The gap, not the quality, is what costs you.',
        ],
      },
      {
        id: 'honest-note',
        title: 'The honest caveat',
        paragraphs: [
          'This works, and it is still work: a sixty-minute recording is roughly a full day of cutting, captioning and scheduling if you do it yourself. That is the part we automate, and it is also the part you can do without us if you have the day.',
        ],
      },
    ],
  },
]

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug)
}
