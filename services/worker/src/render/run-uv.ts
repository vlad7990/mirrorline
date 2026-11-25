/**
 * Running the Python render leg, with a clock on it (V5, slice 1).
 *
 * The engine is a Python CLI and this is the only place that starts it, which
 * is the same arrangement `lib/engine/runner.ts` has for the local engine and
 * `ffmpeg.py` has for ffmpeg: one door, so the argument list, the timeout and
 * the error shape are decided once.
 *
 * Three things are deliberate:
 *
 * * **`shell: false`.** The arguments include a client's own file paths. A
 *   shell would make a filename with a semicolon in it a command.
 * * **A timeout per call, not per job.** `budget.test.ts` adds the two budgets
 *   up and asserts they fit inside the render lease with a third to spare; that
 *   arithmetic is only true if each call is actually bounded. A wedged
 *   transcription with no clock on it is how the scan spent 829 seconds of a
 *   900-second lease.
 * * **stdout and stderr both captured.** The sentence a client sees comes from
 *   `summary.json`, but the line *we* need when a render fails is in stderr,
 *   and a worker that discarded it would leave nothing to debug but an exit
 *   code.
 */

import { spawn } from 'node:child_process'

/** Where `uv` is run from: the Python project's own directory. */
export const PIPELINE_DIR = new URL('../../../pipeline/', import.meta.url).pathname

export interface UvResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
  /** True when the clock ran out and the process was killed. */
  readonly timedOut: boolean
}

/** How much of a child's output to keep. Enough to debug, bounded on purpose. */
const MAX_OUTPUT_CHARS = 20_000

const tail = (value: string): string =>
  value.length > MAX_OUTPUT_CHARS ? value.slice(-MAX_OUTPUT_CHARS) : value

/**
 * Run one of the pipeline's console scripts.
 *
 * Resolves rather than rejects on a non-zero exit: the caller decides what an
 * exit code means, and for `render-short` a `1` is a refusal the client is
 * owed in words rather than an error.
 */
export function runPipeline(
  script: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<UvResult> {
  return new Promise((resolve) => {
    const child = spawn('uv', ['run', '--no-editable', script, ...args], {
      cwd: PIPELINE_DIR,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = tail(stdout + chunk.toString('utf8'))
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = tail(stderr + chunk.toString('utf8'))
    })

    const timer = setTimeout(() => {
      timedOut = true
      // SIGKILL rather than SIGTERM: ffmpeg under a Python parent has been
      // known to ignore a polite ask, and the lease is the thing being
      // protected here.
      child.kill('SIGKILL')
    }, timeoutMs)

    const finish = (code: number) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    }

    child.on('error', (error: Error) => {
      // `uv` missing from the image is this path, and it is worth being plain
      // about: the container is misbuilt rather than the footage being wrong.
      finish(127)
      stderr = tail(`${stderr}\n${error.message}`)
    })

    child.on('close', (code: number | null) => finish(code ?? 1))
  })
}
