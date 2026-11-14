/**
 * Three questions, and an answer that is often "not us".
 *
 * 19 v2 ★4 for /compare: "a decision helper that can recommend against us…
 * A comparison page that recommends itself in every branch is a price list
 * wearing a quiz."
 *
 * That is the whole design constraint, and it is why the logic lives here as
 * a pure function rather than inside the component. **Four of the six
 * outcomes do not sell anything**, and a test asserts it — not as a gesture,
 * but because this is exactly the kind of honesty that erodes one convenient
 * edit at a time. If someone later makes every branch end at a plan, the
 * suite says so.
 *
 * The questions are about *inputs and cadence*, never about a trade. 16 §1
 * and 13 §1 are explicit that the only segmentation is account type and goal,
 * so asking "what industry are you in" would contradict the premise of the
 * whole site.
 */

export type FootageAnswer = 'regular' | 'some' | 'none'
export type CadenceAnswer = 'daily' | 'weekly' | 'rarely'
export type ControlAnswer = 'approve' | 'direct'

export interface DecisionAnswers {
  readonly footage: FootageAnswer
  readonly cadence: CadenceAnswer
  readonly control: ControlAnswer
}

export interface DecisionOption<T extends string> {
  readonly value: T
  readonly label: string
}

export interface DecisionQuestion<T extends string> {
  readonly id: keyof DecisionAnswers
  readonly question: string
  readonly options: readonly DecisionOption<T>[]
}

export const FOOTAGE_QUESTION: DecisionQuestion<FootageAnswer> = {
  id: 'footage',
  question: 'Do you have footage, or will you record any?',
  options: [
    { value: 'regular', label: 'Yes — talks, calls or video I record anyway' },
    { value: 'some', label: 'A little, or I could film on a phone' },
    { value: 'none', label: 'None, and I do not plan to record' },
  ],
}

export const CADENCE_QUESTION: DecisionQuestion<CadenceAnswer> = {
  id: 'cadence',
  question: 'How often do you want something posted?',
  options: [
    { value: 'daily', label: 'Every day, on more than one platform' },
    { value: 'weekly', label: 'A few times a week' },
    { value: 'rarely', label: 'Now and then, when I have something to say' },
  ],
}

export const CONTROL_QUESTION: DecisionQuestion<ControlAnswer> = {
  id: 'control',
  question: 'How close do you want to be to the edit?',
  options: [
    { value: 'approve', label: 'I will approve the work, not direct it' },
    { value: 'direct', label: 'I want to choose the cuts myself' },
  ],
}

export interface Recommendation {
  readonly id: string
  /** The verdict, in one line. */
  readonly title: string
  readonly body: string
  /**
   * True only where the honest answer is us.
   *
   * The component shows a plan and a call to action for `true` and shows
   * neither for `false` — a "not us" verdict that still displayed a buy
   * button would be the quiz recommending itself after all.
   */
  readonly isUs: boolean
  /** Which plan, where there is one. `null` on every "not us" outcome. */
  readonly planId: string | null
}

/**
 * The verdict, as a first-match-wins ladder.
 *
 * Ordered by how decisive each condition is rather than by how the questions
 * are asked. No footage settles it whatever else is true; wanting to direct
 * the edit settles it next, because that is a working relationship we do not
 * offer at any volume.
 */
export function recommend(answers: DecisionAnswers): Recommendation {
  if (answers.footage === 'none') {
    return {
      id: 'record-first',
      title: 'Nothing we sell would help yet.',
      body: 'Everything here is built from material you own. With no footage and no plan to record any, there is nothing for us — or for an editor, or for a clipping tool — to work from. Record one honest ten-minute answer to a question customers actually ask, then come back.',
      isUs: false,
      planId: null,
    }
  }

  if (answers.control === 'direct') {
    return {
      id: 'freelancer-control',
      title: 'Hire a freelance editor.',
      body: 'You approve our work; you do not direct it frame by frame, and at the volume we run that would make both of us miserable. An editor you brief directly will give you the control you are asking for, and cost less for a handful of videos.',
      isUs: false,
      planId: null,
    }
  }

  if (answers.cadence === 'rarely') {
    return {
      id: 'diy',
      title: 'Do it yourself, for now.',
      body: 'Posting when you have something to say is a real strategy and it does not need a retainer. Cut it on your phone and keep the money. A service that posts daily is money spent on a cadence you do not want.',
      isUs: false,
      planId: null,
    }
  }

  if (answers.cadence === 'weekly' && answers.footage === 'some') {
    return {
      id: 'freelancer-volume',
      title: 'An editor is probably cheaper.',
      body: 'A few posts a week from occasional phone footage is well inside what one freelancer can handle, and they will be cheaper than our smallest plan. Come back if the cadence goes up or the footage starts piling up unused.',
      isUs: false,
      planId: null,
    }
  }

  if (answers.cadence === 'weekly') {
    return {
      id: 'creator',
      title: 'Creator, if you want it off your plate.',
      body: 'You have the footage and you want a steady few a week without doing the cutting. That is the smallest plan we actually sell. It is still worth asking whether an editor you already trust would do it for less.',
      isUs: true,
      planId: 'creator',
    }
  }

  return {
    id: 'growth',
    title: 'This is what we are for.',
    body: 'Daily posting on more than one platform, from footage you already have, with you approving rather than editing. That is the job the studio was built to do — and the pilot is two weeks, so you can find out cheaply.',
    isUs: true,
    planId: 'growth',
  }
}

/** Every combination the three questions can produce. For the tests. */
export function allAnswerCombinations(): readonly DecisionAnswers[] {
  return FOOTAGE_QUESTION.options.flatMap((footage) =>
    CADENCE_QUESTION.options.flatMap((cadence) =>
      CONTROL_QUESTION.options.map((control) => ({
        footage: footage.value,
        cadence: cadence.value,
        control: control.value,
      })),
    ),
  )
}
