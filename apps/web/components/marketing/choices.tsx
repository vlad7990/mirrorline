/**
 * The alternatives, named — borrowed from beCreatives.
 *
 * beCreatives runs "The Video Editing Choices In 2026", setting its retainer
 * against freelancers, in-house hires and agencies
 * (docs/design/COMPETITOR_REFERENCES.md §2.4). In a category where the
 * buyer's default is "hire an editor" or "try one of those clipping tools",
 * naming the alternatives does the buyer's work for them.
 *
 * Two rules this section is written under.
 *
 * **No competitor is named.** The rows are approaches, not brands. Saying
 * "tool X gets you banned" about a named product is a claim about that
 * product that we would have to stand behind, and it is not the argument
 * anyway — the argument is about what a method costs you, whoever sells it.
 *
 * **No claim we cannot keep.** Non-negotiable 7 rules out guarantees, so the
 * rows describe what each approach *does*, not what it achieves. Ours is the
 * only column we can speak for, and even there it describes method rather
 * than results: nothing here promises views, followers or growth.
 *
 * The honest part is that we do not win every row. A freelancer is cheaper to
 * start and a repost tool is faster. Showing that is the point — a comparison
 * where the author wins everything is an advertisement, and reads like one.
 */

import { Card, cn } from '@mirrorline/ui'

export interface Choice {
  readonly id: string
  /** The approach, in the buyer's words. */
  readonly approach: string
  readonly volume: string
  readonly rights: string
  readonly control: string
  /** Ours. Styled as the answer rather than as one more option. */
  readonly isUs?: boolean
}

export const CHOICES: readonly Choice[] = [
  {
    id: 'yourself',
    approach: 'Cut it yourself',
    volume: 'An evening per short video, after the filming.',
    rights: 'Yours, and you know it.',
    control: 'Total, which is why it stops when the week gets busy.',
  },
  {
    id: 'freelancer',
    approach: 'A freelance editor',
    volume: 'A few a week, at their pace and their inbox.',
    rights: 'Yours, if your contract says so. Many do not.',
    control: 'You brief, wait, review, re-brief.',
  },
  {
    id: 'repost',
    approach: 'A repost or auto-clip tool',
    volume: 'As many as you like, instantly.',
    rights:
      'Often someone else’s footage, reposted. This is the approach that gets accounts actioned, and it is the reason this project exists.',
    control: 'It posts first and tells you after.',
  },
  {
    id: 'agency',
    approach: 'A content agency',
    volume: 'Whatever the retainer bought.',
    rights: 'Yours, usually. Read the assignment clause.',
    control: 'A monthly call and a shared drive.',
  },
  {
    id: 'mirrorline',
    approach: 'Mirrorline',
    volume: 'A week of posts from one upload, several a day.',
    rights:
      'Your footage only. We rebuild a format’s structure, never its footage, and every generated scene is labelled.',
    control:
      'Every cut passes the Compliance agent, and nothing is posted until you approve it — or until you turn approval off yourself.',
    isUs: true,
  },
]

const COLUMNS = [
  { key: 'volume', label: 'How much comes out' },
  { key: 'rights', label: 'Whose material it uses' },
  { key: 'control', label: 'What happens before it posts' },
] as const

export function Choices() {
  return (
    <>
      {/* Wide screens get a real table: five approaches across three
          questions is tabular data, and a screen reader should be able to
          say "row: a repost tool, column: whose material it uses". */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            How five ways of making short video compare on volume, rights and control
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-[18%] py-3 pr-4 text-label font-semibold text-text">
                The choice
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="py-3 pr-4 text-label font-semibold text-text"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHOICES.map((choice) => (
              <tr
                key={choice.id}
                className={cn(
                  'border-t border-border align-top',
                  // The emphasis is a tinted row, not a border: a 2px border
                  // on one row of an otherwise ruled table reads as a
                  // rendering fault rather than as emphasis.
                  choice.isUs && 'bg-surface-subtle',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'py-4 pr-4 text-label font-semibold',
                    choice.isUs ? 'text-text' : 'text-text-muted',
                  )}
                >
                  {choice.approach}
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.key} className="py-4 pr-4 text-meta text-text-muted">
                    {choice[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* At 390px the same five become cards. A table this wide either
          scrolls sideways, which hides the comparison, or shrinks the type
          past readable. */}
      <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
        {CHOICES.map((choice) => (
          <li key={choice.id}>
            <Card className="flex flex-col gap-2" selected={choice.isUs}>
              <h3 className="m-0 font-heading text-subtitle text-text">{choice.approach}</h3>
              <dl className="m-0 flex flex-col gap-2">
                {COLUMNS.map((column) => (
                  <div key={column.key} className="flex flex-col gap-0.5">
                    <dt className="text-caption font-semibold text-text">{column.label}</dt>
                    <dd className="m-0 text-meta text-text-muted">{choice[column.key]}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
