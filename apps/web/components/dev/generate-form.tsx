'use client'

/**
 * The dev screen's control: describe a scene, press once, see what came back.
 *
 * ============================================================================
 * The action arrives as a prop, and that is a security decision
 * ============================================================================
 *
 * `run-scan-form.tsx` says it in full, and it cost a red test to learn:
 * `server-only.test.ts` walks the static import graph and fails if a
 * `'use client'` module can reach a provider or the ledger at any depth.
 * Importing `generateSceneAction` here would put this component one hop from
 * `actions.ts` → `runGeneration` → `ledger.ts`, and the walker sees that path —
 * even though Next's `'use server'` boundary means the client only ever
 * receives a reference.
 *
 * The fix is not to teach the guard about the boundary. A guard with an
 * exception carved into it stops being readable at a glance. The page is a
 * server component, so it imports the action and passes it down, and the graph
 * stays provably clean. **Do not replace this prop with an import.**
 *
 * ============================================================================
 * Native selects, on purpose
 * ============================================================================
 *
 * `@mirrorline/ui` exports a Radix `Select`, which is the right control on a
 * client-facing screen. This form uses native `<select>` elements because a
 * native one posts its value with the form with nothing to verify about hidden
 * inputs — and because this screen is for us. The design lock covers the studio
 * and the public site; nothing here is shipped to a client, and the honest way
 * to say that is to not dress it up as though it were.
 */

import { Button, Label, Textarea } from '@mirrorline/ui'
import * as React from 'react'

import {
  BEAT_LABELS,
  GENERATE_ASPECTS,
  GENERATE_KINDS,
  GENERATE_RESOLUTIONS,
  type GenerateActionResult,
  IDLE_GENERATE_STATE,
} from '@/app/app/dev/generate/generate-form-state'
import { GeneratedAssetPanel } from '@/components/dev/generated-asset-panel'
import { MAX_PROMPT_CHARS } from '@/lib/generation/safety'
import { DEFAULT_CLIP_SECONDS, MAX_CLIP_SECONDS } from '@/lib/generation/types'

/**
 * A scene that passes every rule, as the starting value.
 *
 * Pre-filled rather than empty for the reason `RunScanForm` gives about the
 * niche box: the common case is "run the thing", and an empty box asks somebody
 * to invent a prompt before they can find out whether the screen works.
 */
const EXAMPLE_PROMPT =
  'A wide, slow push across a sunlit kitchen counter, flour dust in the light, hands dusting a worktop at the edge of frame.'

/**
 * A scene our own filter refuses, one press away.
 *
 * The refusal is the half of this feature worth demonstrating without a key: a
 * named public figure, turned down before any money moved, with the rule on
 * screen and a `refused` row in `agent_runs` at $0.00. `taylor swift` is in
 * `KNOWN_FIGURES`, so this trips `named-person` on the simplest of the rules
 * rather than on a structural pattern.
 */
const REFUSED_EXAMPLE =
  'A slow push across the counter while Taylor Swift waits for her coffee at the till.'

const FIELD =
  'h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text disabled:opacity-60'

interface ChoiceProps {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly options: readonly string[]
  readonly defaultValue: string
  readonly disabled: boolean
}

function Choice({ id, name, label, options, defaultValue, disabled }: ChoiceProps) {
  return (
    <div className="flex min-w-[9rem] flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} defaultValue={defaultValue} disabled={disabled} className={FIELD}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

export interface GenerateFormProps {
  /**
   * The server action, handed in rather than imported. See the header — this is
   * what keeps the import graph clean. Do not replace it with an import.
   */
  readonly action: (
    previous: GenerateActionResult,
    formData: FormData,
  ) => Promise<GenerateActionResult>
}

export function GenerateForm({ action }: GenerateFormProps) {
  const [state, formAction, isSubmitting] = React.useActionState(action, IDLE_GENERATE_STATE)

  /*
   * Uncontrolled, with a ref, and that is a bug fix rather than a preference.
   *
   * This box was `value={prompt}` with a `useState`, and the screen looked
   * right and did nothing: the "load a prompt we refuse" button would not
   * change the text and the counter never moved. React was explicit once the
   * console was read — *"A tree hydrated but some attributes of the server
   * rendered HTML didn't match the client properties. This won't be patched
   * up"* — with the diff pointing at a removed text child of this `<textarea>`.
   *
   * Server rendering a controlled textarea writes its value as the element's
   * **child text**; the client render has no child. The subtree is then left
   * unhydrated, which is why no handler on it ever ran. `defaultValue` renders
   * the same child on both sides and matches.
   *
   * So the value lives in the DOM and the button writes to it through the ref.
   * The counter keeps a `useState`, because it renders — but it is derived from
   * `onChange` rather than owning the text, which is what keeps it out of the
   * server-rendered markup's way.
   */
  const promptBox = React.useRef<HTMLTextAreaElement>(null)
  const [promptLength, setPromptLength] = React.useState(EXAMPLE_PROMPT.trim().length)

  const loadRefusedExample = () => {
    const node = promptBox.current
    if (node === null) return

    node.value = REFUSED_EXAMPLE
    setPromptLength(REFUSED_EXAMPLE.trim().length)
  }

  const promptId = 'scene-prompt'
  const counterId = `${promptId}-counter`
  const isOverLength = promptLength > MAX_PROMPT_CHARS

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        aria-label="Generate one scene"
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={promptId}>The scene, described</Label>
          <Textarea
            ref={promptBox}
            id={promptId}
            name="prompt"
            rows={4}
            defaultValue={EXAMPLE_PROMPT}
            onChange={(event) => setPromptLength(event.target.value.trim().length)}
            disabled={isSubmitting}
            aria-describedby={counterId}
            className="w-full"
          />
          <p
            id={counterId}
            className={
              isOverLength
                ? 'm-0 text-caption text-on-danger-soft'
                : 'm-0 text-caption text-text-muted'
            }
          >
            {promptLength} of {MAX_PROMPT_CHARS} characters.{' '}
            {isOverLength
              ? 'The gate will refuse this for length, which is the point if that is what you are testing.'
              : 'No faces, no marks, no on-screen text — the framing says so as well as the gate.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Choice
            id="scene-kind"
            name="kind"
            label="Kind"
            options={GENERATE_KINDS}
            defaultValue="clip"
            disabled={isSubmitting}
          />
          <Choice
            id="scene-beat"
            name="beat"
            label="Beat"
            options={BEAT_LABELS}
            defaultValue="Hook"
            disabled={isSubmitting}
          />
          <Choice
            id="scene-aspect"
            name="aspectRatio"
            label="Shape"
            options={GENERATE_ASPECTS}
            defaultValue="9:16"
            disabled={isSubmitting}
          />
          <Choice
            id="scene-resolution"
            name="resolution"
            label="Resolution"
            options={GENERATE_RESOLUTIONS}
            defaultValue="720p"
            disabled={isSubmitting}
          />
          <div className="flex min-w-[9rem] flex-1 flex-col gap-1.5">
            <Label htmlFor="scene-seconds">Seconds</Label>
            <input
              id="scene-seconds"
              name="seconds"
              type="number"
              min={1}
              max={MAX_CLIP_SECONDS}
              step={1}
              defaultValue={DEFAULT_CLIP_SECONDS}
              disabled={isSubmitting}
              className={FIELD}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Generating…' : 'Generate one scene'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={loadRefusedExample}
          >
            Load a prompt we refuse
          </Button>
        </div>

        <p className="m-0 max-w-prose text-caption text-text-muted">
          One press is one generation. The prompt is screened first, the month’s spend is read and
          the ceiling checked second, and only then is a provider called — so a refusal costs
          nothing and still leaves a row in the ledger.
        </p>
      </form>

      {/* `role="status"` so the outcome is announced: the interesting results
          here are refusals, and a refusal that only appears visually reads as a
          button that did nothing. */}
      <div role="status" aria-live="polite">
        <GeneratedAssetPanel result={state} />
      </div>
    </div>
  )
}
