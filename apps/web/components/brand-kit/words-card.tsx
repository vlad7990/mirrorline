'use client'

import { useId, useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { brandKit } from '@mirrorline/mock'
import { Button, Card, Input, Label, cn } from '@mirrorline/ui'

/**
 * "Words" — the phrases the agents must use and the ones they must not.
 *
 * 03_SCREENS_SPEC.md "S9 · Brand kit": "words to always and never use."
 * The starting lists come from @mirrorline/mock; adding and removing is client
 * state only, and every update builds a new array rather than editing one.
 *
 * DESIGN.md "Do's": "Pair every colour-coded status with a word" — the green
 * and red chips always sit under the headings "Always use" and "Never use",
 * and each chip names its own action.
 */

type WordTone = 'always' | 'never'

interface ToneStyle {
  readonly chip: string
  readonly heading: string
}

const TONE_STYLES: Record<WordTone, ToneStyle> = {
  always: {
    chip: 'bg-success-soft text-on-success-soft',
    heading: 'text-on-success-soft',
  },
  never: {
    chip: 'bg-danger-soft text-on-danger-soft',
    heading: 'text-on-danger-soft',
  },
}

interface WordListProps {
  /** "Always use" or "Never use". */
  title: string
  tone: WordTone
  words: readonly string[]
  onAdd: (word: string) => void
  onRemove: (word: string) => void
}

function WordList({ title, tone, words, onAdd, onRemove }: WordListProps) {
  const inputId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const toneStyle = TONE_STYLES[tone]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const word = draft.trim()

    if (word.length === 0) {
      setError('Type a word or a phrase first.')
      return
    }
    if (words.includes(word)) {
      setError(`“${word}” is already on this list.`)
      return
    }

    onAdd(word)
    setDraft('')
    setError('')
    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn('m-0 font-body text-meta font-semibold', toneStyle.heading)}>{title}</h3>

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {words.map((word) => (
          <li key={word}>
            {/* The chip is the control: one 44px target, named by its action. */}
            <button
              type="button"
              onClick={() => onRemove(word)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5',
                'font-body text-meta font-semibold',
                toneStyle.chip,
              )}
            >
              {word}
              <X aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
              <span className="sr-only">Remove {word}</span>
            </button>
          </li>
        ))}

        {isAdding ? null : (
          <li>
            <Button variant="secondary" className="rounded-full" onClick={() => setIsAdding(true)}>
              <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
              Add
              <span className="sr-only"> a word to {title.toLowerCase()}</span>
            </Button>
          </li>
        )}
      </ul>

      {isAdding ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={handleSubmit}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={inputId}>Word or phrase to {title.toLowerCase()}</Label>
            <Input
              id={inputId}
              value={draft}
              aria-invalid={error.length > 0 || undefined}
              aria-describedby={error.length > 0 ? errorId : undefined}
              onChange={(event) => {
                setDraft(event.target.value)
                setError('')
              }}
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Add
          </Button>
          <Button
            variant="tertiary"
            onClick={() => {
              setIsAdding(false)
              setDraft('')
              setError('')
            }}
          >
            Cancel
          </Button>
          {error.length > 0 ? (
            <p id={errorId} className="m-0 w-full text-meta font-semibold text-on-danger-soft">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

export function WordsCard() {
  const [alwaysWords, setAlwaysWords] = useState<readonly string[]>(brandKit.wordsAlways)
  const [neverWords, setNeverWords] = useState<readonly string[]>(brandKit.wordsNever)

  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="m-0 font-heading text-subtitle text-text">Words</h2>

      <WordList
        title="Always use"
        tone="always"
        words={alwaysWords}
        onAdd={(word) => setAlwaysWords((previous) => [...previous, word])}
        onRemove={(word) => setAlwaysWords((previous) => previous.filter((item) => item !== word))}
      />

      <WordList
        title="Never use"
        tone="never"
        words={neverWords}
        onAdd={(word) => setNeverWords((previous) => [...previous, word])}
        onRemove={(word) => setNeverWords((previous) => previous.filter((item) => item !== word))}
      />
    </Card>
  )
}
