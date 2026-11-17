/**
 * The FAQ, shared by the home page and `/faq`.
 *
 * 16 §3 row 18 asks the home page to show the top six and `/faq` to carry the
 * rest, which only works if there is one list. It lived in the home page
 * module until `/faq` existed and needed the same answers.
 *
 * **The words moved to `faq-text.ts`, and only the words.** This file is now
 * the renderer: it maps each answer's paragraphs and runs back to the markup
 * it has always had — `<p className="m-0">` per paragraph, and
 * `<span className="machine">` around a figure the machine wrote. The DOM is
 * unchanged. The reason for the move is in `faq-text.ts`: a `.tsx` module
 * cannot be imported by a test or by `lib/copilot/grounding.ts`, and spec 18
 * §9.3 requires the co-pilot's corpus to read our content rather than keep a
 * second copy of it.
 *
 * `FAQ_ITEMS` keeps its name, shape and order, so nothing downstream changed.
 */

import type * as React from 'react'

import type { FaqItem } from './faq'
import { FAQ_ENTRIES, type FaqParagraph } from './faq-text'

function renderParagraph(paragraph: FaqParagraph, key: number): React.ReactElement {
  return (
    <p className="m-0" key={key}>
      {paragraph.map((run, index) =>
        typeof run === 'string' ? (
          run
        ) : (
          <span className="machine" key={index}>
            {run.machine}
          </span>
        ),
      )}
    </p>
  )
}

export const FAQ_ITEMS: readonly FaqItem[] = FAQ_ENTRIES.map((entry) => ({
  id: entry.id,
  question: entry.question,
  answer: <>{entry.answer.map(renderParagraph)}</>,
}))
