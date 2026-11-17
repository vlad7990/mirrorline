/**
 * What the client actually has to do, and what they never have to do.
 *
 * 11 §2 P8 is the complaint — "the posting treadmill burns people out" — and
 * our answer to it is a number: "the client spends ~15 minutes a week
 * approving". That number has been in the research notes since 12 November
 * and nowhere a visitor could see it, which makes it a claim we have only
 * been making to ourselves.
 *
 * ## Why the minutes are itemised rather than totalled
 *
 * "Fifteen minutes a week" from a vendor is the least believable sentence in
 * marketing. Itemised it is checkable: four things, each with the time it
 * takes, and **the total is summed from the items rather than typed** — so
 * the headline figure cannot drift from the list under it, and a fifth task
 * added later changes the number automatically rather than quietly making it
 * wrong. A test asserts the sum still matches what P8 claims.
 *
 * The second half of the file is the division of labour, because "what we
 * need from you" is only honest beside "and here is everything you do not".
 */

export interface EffortItem {
  readonly id: string
  /** What the client does. */
  readonly task: string
  /** How long it takes them, in minutes a week. */
  readonly minutes: number
  /** When it happens, so the week has a shape rather than a total. */
  readonly when: string
}

export const CLIENT_EFFORT: readonly EffortItem[] = [
  {
    id: 'approve',
    task: 'Approve the week’s posts, or send one back with a note.',
    minutes: 8,
    when: 'Once a week, from the calendar. You can also turn auto-approve on.',
  },
  {
    id: 'answer',
    task: 'Answer what the agents could not work out on their own — an offer that changed, a claim they will not make without you.',
    minutes: 4,
    when: 'As it comes up, usually once or twice a week.',
  },
  {
    id: 'send',
    task: 'Drop in a long video when you happen to have one.',
    minutes: 2,
    when: 'Whenever you record something. Weeks with nothing to send still get posts.',
  },
  {
    id: 'read',
    task: 'Read the weekly ledger: what went out, what it produced, what changes next week.',
    minutes: 1,
    when: 'Monday morning, in an email you could ignore and still be fine.',
  },
]

/**
 * The headline figure, summed rather than written.
 *
 * P8 says "~15 minutes a week". If an item is added or re-estimated this
 * moves with it, and the test fails if the claim and the arithmetic stop
 * agreeing.
 */
export function totalEffortMinutes(): number {
  return CLIENT_EFFORT.reduce((total, item) => total + item.minutes, 0)
}

export interface DivisionRow {
  readonly id: string
  /** What the agents do, every day, without being asked. */
  readonly agents: string
  /** What a person does — and it is always a decision rather than labour. */
  readonly person: string
}

/**
 * Who does what.
 *
 * The pattern across every row is the same and it is deliberate: **the agents
 * do the work and the person makes the decisions.** Nothing in the left
 * column is a judgement about the business, and nothing in the right column
 * is labour. That is the division 04 sets out, and it is the only division
 * that justifies the price — a service where the client still decides what to
 * post on a Tuesday night has not removed the treadmill.
 */
export const DIVISION_OF_LABOUR: readonly DivisionRow[] = [
  {
    id: 'what-to-make',
    agents: 'Research the niche weekly and rank the formats that are actually growing in it.',
    person: 'Say what the business is for this quarter, and which goal the account is chasing.',
  },
  {
    id: 'making',
    agents: 'Cut the footage, write the hook, burn the captions, build the originals.',
    person: 'Send a long video when there is one, and say no to a draft that is not you.',
  },
  {
    id: 'checking',
    agents:
      'Run every video through the compliance gate and the Originality Gate before it can be scheduled.',
    person: 'Confirm you hold the rights to the footage, and give consent for any voice or likeness.',
  },
  {
    id: 'posting',
    agents: 'Schedule and post several times a day, at the times that account performs.',
    person: 'Approve the week — or turn auto-approve on and stop approving at all.',
  },
  {
    id: 'reporting',
    agents: 'Report what each post produced, including the weeks that went badly.',
    person: 'Decide whether it is worth continuing. The plan is month to month for that reason.',
  },
]
