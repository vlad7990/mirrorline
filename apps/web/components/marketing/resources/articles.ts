/**
 * The six playbook articles, their categories and their covers (16 §4).
 *
 * **Each one is useful without us.** That is the test an article has to pass
 * to go here: if the reader could act on it with no account and no call, it is
 * worth publishing; if it only makes sense as an argument for buying, it
 * belongs on a product page instead. A test asserts the corollary — that no
 * article's body names the product at all — because the drift is gradual and
 * nobody notices a single helpful paragraph becoming a pitch.
 *
 * No figures are quoted from our market research. 11 says its own numbers are
 * directional and must be re-checked before any is published, so these
 * articles state the *rules* that changed rather than benchmarks that move.
 *
 * Moved here from `app/(marketing)/resources/resources-content.tsx` in F5, and
 * the extension is the reason rather than tidiness: `tsconfig.base.json` sets
 * `jsx: "preserve"` and `vitest.config.ts` includes only `*.test.ts` under
 * `apps/web`, so a `.tsx` content module cannot be asserted against at all —
 * the same constraint that moved `PAGE_CTAS` out of a component file. The
 * three articles it held are unchanged; three more and the covers are new.
 */

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The filter on /resources, and the reason it is a closed union.
 *
 * 19 v2 ★3 asks for "categories, as a filter that works without JavaScript
 * where it can", which means each one is a real URL the server can answer. A
 * free-string category would let a typo ship a category holding one article
 * with no way to reach the others, so the keys are a type and the labels live
 * in one place.
 */
export const ARTICLE_CATEGORIES = [
  {
    key: 'rules',
    label: 'Platform rules',
    blurb: 'What the platforms changed, and what it means for an ordinary account.',
  },
  {
    key: 'measuring',
    label: 'Measuring',
    blurb: 'Which numbers are worth reading, and in what order.',
  },
  {
    key: 'making',
    label: 'Making the work',
    blurb: 'Getting more out of a recording, and writing the part people actually watch.',
  },
  {
    key: 'starting',
    label: 'Starting out',
    blurb: 'What to do when the account is new and there is nothing on it yet.',
  },
] as const satisfies readonly { key: string; label: string; blurb: string }[]

export type ArticleCategoryKey = (typeof ARTICLE_CATEGORIES)[number]['key']

/** True when `value` is one of the four keys — the guard the page filters with. */
export function isCategoryKey(value: string | undefined): value is ArticleCategoryKey {
  return ARTICLE_CATEGORIES.some((category) => category.key === value)
}

/* -------------------------------------------------------------------------- */
/* Articles                                                                    */
/* -------------------------------------------------------------------------- */

export interface ArticleSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly list?: readonly string[]
}

export interface ArticleCover {
  /** A 16:9 generated image under `public/article-covers/`. */
  readonly src: string
  /**
   * What the picture contains, for someone who cannot see it.
   *
   * A cover is decorative where the title sits beside it, which is every card
   * on /resources — but on the article page it is the largest thing above the
   * text, and an empty `alt` on something that big tells a screen-reader user
   * nothing about where they have landed. Described once here and used in both
   * places, so the two cannot drift.
   */
  readonly alt: string
}

export interface Article {
  readonly slug: string
  readonly title: string
  readonly summary: string
  readonly readingMinutes: number
  readonly category: ArticleCategoryKey
  readonly cover: ArticleCover
  readonly sections: readonly ArticleSection[]
}

export const ARTICLES: readonly Article[] = [
  {
    slug: 'originality-rules-2026',
    title: 'The originality rules, and what counts as a material edit',
    summary:
      'Platforms stopped recommending accounts that mostly post other people’s material. What that means in practice, and what does and does not count as making something your own.',
    readingMinutes: 5,
    category: 'rules',
    cover: {
      src: '/article-covers/originality-rules-2026.webp',
      alt: 'A desk in the late afternoon with a stack of plain printed pages and a pen laid across them.',
    },
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
    category: 'measuring',
    cover: {
      src: '/article-covers/what-to-measure.webp',
      alt: 'A kitchen table in the morning with an open notebook of hand-ruled empty rows and a phone propped against a jar.',
    },
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
    category: 'making',
    cover: {
      src: '/article-covers/one-video-a-month.webp',
      alt: 'A long oak worktable with an open laptop turned away from the camera and a paper month calendar pinned behind it.',
    },
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
          'This works, and it is still work: a sixty-minute recording is roughly a full day of cutting, captioning and scheduling if you do it yourself. That is also the part you can do without any help at all, if you have the day.',
        ],
      },
    ],
  },
  {
    slug: 'posting-through-the-api',
    title: 'What posting through the official APIs lets you do — and what it does not',
    summary:
      'Scheduling tools are not all the same thing. Which posts a platform will accept from software, which it will only let you finish by hand, and why the difference is worth knowing before you plan a week.',
    readingMinutes: 6,
    category: 'rules',
    cover: {
      src: '/article-covers/posting-through-the-api.webp',
      alt: 'A tidy wooden desk corner with two phones lying flat side by side and charging cables neatly coiled.',
    },
    sections: [
      {
        id: 'two-kinds',
        title: 'There are two kinds of “scheduling”',
        paragraphs: [
          'The first kind talks to the platform through its published API: the post is handed over with your permission, the platform accepts it, and it appears. The second kind drives a copy of the app, or a browser, or a rack of phones, and types for you.',
          'They look identical in a product screenshot and they are not remotely the same risk. The second kind breaks the terms of every major platform, and the account it is pointed at is the thing that gets limited when it is noticed — not the tool.',
        ],
      },
      {
        id: 'what-works',
        title: 'What the official route actually supports',
        paragraphs: [
          'More than people expect, and less than every tool implies. Worth checking against your own plan before you build a week around it:',
        ],
        list: [
          'A single vertical video with a caption: supported everywhere, and the case everything else is measured against.',
          'A specific publish time: supported, though the platform may deliver a minute or two either side of it.',
          'First comment: supported on some platforms and not others, which is why a tool promising it everywhere is worth a question.',
          'Tagging other accounts, and locations: usually supported, sometimes only through the app.',
          'Trending audio from the platform’s own library: generally not available to software at all. If a tool offers it, ask how.',
        ],
      },
      {
        id: 'the-audio-trap',
        title: 'The audio question, which is the one that catches people',
        paragraphs: [
          'The commercial-use library a platform offers inside its app is licensed for that app, and the licence does not travel to a file you uploaded from elsewhere. So a track chosen in the app is fine, and the same track baked into an mp4 by a desktop editor is a different situation entirely.',
          'The practical answer for a business account is to own the audio: your own voice, a library you hold a licence to, or silence with captions. It is less fun, and it is the version you can keep doing.',
        ],
      },
      {
        id: 'what-to-ask',
        title: 'Three questions for any tool you are considering',
        paragraphs: [
          'Any honest vendor can answer all three in a sentence, and the answers tell you what you are buying.',
        ],
        list: [
          'Do you post through the platform’s official API, and which permissions do you ask my account for?',
          'What happens to my scheduled posts if I disconnect the account today?',
          'Which items in your feature list are done by software, and which need me to finish them in the app?',
        ],
      },
    ],
  },
  {
    slug: 'first-three-seconds',
    title: 'The first three seconds, and how to write them',
    summary:
      'Nearly everything that decides whether a short video works happens before anyone has heard a full sentence. Six opening shapes that hold attention, and the four habits that lose it.',
    readingMinutes: 5,
    category: 'making',
    cover: {
      src: '/article-covers/first-three-seconds.webp',
      alt: 'A woman standing in a plain bright room, talking to a small camera on a tripod, caught mid-sentence.',
    },
    sections: [
      {
        id: 'why-three',
        title: 'Why three seconds, and not the whole video',
        paragraphs: [
          'A feed is a sequence of decisions to keep watching, and the first one is made before you have said anything of substance. If the opening fails, nothing you put at thirty seconds exists, however good it is — which is why the hook is the only part worth rewriting more than once.',
          'This is not a reason to be shrill. The opening has to earn the next three seconds, not win an argument.',
        ],
      },
      {
        id: 'shapes',
        title: 'Six openings that work',
        paragraphs: [
          'Each of these works because it opens a small, specific gap the viewer wants closed. Write the same idea as three of them and you will see which is strongest.',
        ],
        list: [
          'The correction: “You are pricing this the way I did for two years, and it cost me.”',
          'The specific number: “Four things on this invoice are optional. Here is which.”',
          'The named mistake: “If your reach dropped in March, check this one setting first.”',
          'The visible before: start on the problem in frame, and say nothing for a beat.',
          'The honest refusal: “Do not buy this if you only post twice a month.”',
          'The overheard question: “Someone asked me this yesterday and I gave a bad answer.”',
        ],
      },
      {
        id: 'habits',
        title: 'Four habits that lose the opening',
        paragraphs: ['All four are comfortable to record, and all four cost you the view.'],
        list: [
          'Greeting the viewer. “Hey guys, so today I wanted to talk about…” is three seconds spent on nothing.',
          'Explaining what the video will cover instead of starting it.',
          'A title card the viewer has to read while nothing is happening.',
          'Burying the specific thing. If the interesting sentence is at 0:20, that is where the video should start.',
        ],
      },
      {
        id: 'practice',
        title: 'A twenty-minute exercise',
        paragraphs: [
          'Take one post you already made that did poorly. Write six new openings for it, one in each shape above, without changing anything else. Record the six back to back in one sitting — it takes about twenty minutes.',
          'Post the one you like least. Then look at the three-second hold on it in a week. The reason this is worth doing is that your ranking of the six will usually be wrong, and finding that out once changes how you write for good.',
        ],
      },
    ],
  },
  {
    slug: 'starting-from-zero',
    title: 'Starting an account from zero: the first thirty days',
    summary:
      'What to do when there is nothing on the account yet, in the order that matters — and the two things that feel urgent in week one and are not.',
    readingMinutes: 6,
    category: 'starting',
    cover: {
      src: '/article-covers/starting-from-zero.webp',
      alt: 'An almost-empty corkboard on a pale wall with a single index card pinned at its centre in early-morning light.',
    },
    sections: [
      {
        id: 'the-shape',
        title: 'The shape of the month',
        paragraphs: [
          'A new account has one job in its first month, and it is not growth: it is to produce enough different posts that you can tell what works. You cannot read a signal off four posts, and you can off thirty.',
          'So the month is three weeks of making and one week of reading, and the reading week is the one people skip.',
        ],
      },
      {
        id: 'week-one',
        title: 'Week one: decide the five things you talk about',
        paragraphs: [
          'Write down five subjects you could speak about for two minutes without preparation, and that someone would pay you about. Five, not fifteen — the point is that the account becomes recognisable, and an account about everything is about nothing.',
          'Then record against those five in one sitting. Fifteen posts out of one afternoon is normal, and it is much easier than fifteen afternoons.',
        ],
      },
      {
        id: 'week-two-three',
        title: 'Weeks two and three: post more than feels comfortable',
        paragraphs: [
          'Once a day if you can, five a week if you cannot. This is the one point where volume genuinely helps, because what you are buying is information rather than reach.',
        ],
        list: [
          'Vary the opening deliberately, not the subject. Five subjects, many openings.',
          'Keep each post to one idea. Two ideas in one post means you cannot tell which one worked.',
          'Write the caption as if the video had not autoplayed — some of your audience reads first.',
          'Do not delete the ones that flop. You need them in the comparison.',
        ],
      },
      {
        id: 'week-four',
        title: 'Week four: read it, then cut it down',
        paragraphs: [
          'Sort every post by three-second hold, and separately by sends and saves. Two different orderings, and the posts near the top of both are the ones to keep making. Usually two of your five subjects are carrying the account, and you would not have guessed which.',
          'Then cut the other three subjects, or demote them to one post a fortnight. A month of effort that ends in a narrower account is a month that worked.',
        ],
      },
      {
        id: 'not-urgent',
        title: 'Two things that feel urgent in week one and are not',
        paragraphs: [
          'Follower count. On a new account it is noise for at least a month, and watching it daily will make you change things that were fine.',
          'The profile. A clear name, one sentence saying who you help, and a way to contact you is the whole requirement. The grid aesthetic, the link page and the highlight covers can wait until something is working — they are a pleasant way to avoid recording.',
        ],
      },
    ],
  },
]

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug)
}

/**
 * The articles in a category, in publication order.
 *
 * `undefined` means "all", which is the no-filter state rather than an error:
 * /resources is reachable with no query string at all and that is its default
 * view, so the absence of a category is a legitimate input and not something
 * to guard against.
 */
export function articlesIn(category: ArticleCategoryKey | undefined): readonly Article[] {
  if (category === undefined) return ARTICLES
  return ARTICLES.filter((article) => article.category === category)
}

/**
 * Up to `limit` other articles, nearest first: same category before the rest.
 *
 * Used by the article page's footer. Same-category first because it is the
 * only ordering that is true — "related" by any other measure would be a
 * recommendation we have no data to make, and three in a random order would be
 * presented as a judgement it is not.
 */
export function relatedArticles(slug: string, limit = 3): readonly Article[] {
  const category = findArticle(slug)?.category
  const others = ARTICLES.filter((article) => article.slug !== slug)
  const sameCategory = others.filter((article) => article.category === category)
  const rest = others.filter((article) => article.category !== category)

  return [...sameCategory, ...rest].slice(0, limit)
}
