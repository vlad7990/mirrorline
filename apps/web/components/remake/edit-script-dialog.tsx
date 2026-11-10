'use client'

/**
 * "Edit script" on S5.
 *
 * One box per beat, so the script keeps its shape while the words change.
 * The draft is local to the dialog and nothing is mutated: Save hands a new
 * list back, Cancel throws the draft away.
 */

import {
  Button,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FieldGroup,
  Textarea,
} from '@mirrorline/ui'
import * as React from 'react'

import type { ScriptLine } from '@/components/remake/remake-plans'

export interface EditScriptDialogProps {
  lines: readonly ScriptLine[]
  onSave: (lines: readonly ScriptLine[]) => void
  onCancel: () => void
}

export function EditScriptDialog({ lines, onSave, onCancel }: EditScriptDialogProps) {
  const [draft, setDraft] = React.useState<readonly ScriptLine[]>(lines)

  const updateLine = React.useCallback((index: number, text: string) => {
    setDraft((previous) =>
      previous.map((line, position) => (position === index ? { ...line, text } : line)),
    )
  }, [])

  return (
    <DialogContent className="max-h-[85vh]">
      <DialogTitle>Edit script</DialogTitle>
      <DialogDescription>
        One line per beat, in your own words. The Compliance agent checks the wording again when
        you approve.
      </DialogDescription>

      <div className="flex flex-col gap-3">
        {draft.map((line, index) => (
          <FieldGroup key={line.beat} label={line.beat}>
            {(field) => (
              <Textarea
                {...field}
                rows={2}
                value={line.text}
                onChange={(event) => updateLine(index, event.target.value)}
              />
            )}
          </FieldGroup>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave(draft)}>
          Save script
        </Button>
      </div>
    </DialogContent>
  )
}
