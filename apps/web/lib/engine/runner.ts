/**
 * Running `make-samples`, and knowing when we cannot.
 *
 * The engine is a Python CLI that shells out to ffmpeg and writes hundreds of
 * megabytes of video. That runs on a developer's machine and nowhere else
 * right now: a Vercel function has no Python, no ffmpeg, a read-only file
 * system and a time limit measured in seconds.
 *
 * So `engineAvailability()` is not a nicety. It is the difference between a
 * screen that degrades to its demo states on the preview and a screen that
 * offers an upload button which cannot work. The UI asks first.
 */

import { spawn } from 'node:child_process'
import { access, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { brandKit } from '@mirrorline/mock'

import { brandPath, messageOf, samplesDirectory, sourcePath } from './jobs'

/** Where the Python project lives, relative to the repo root. */
const PIPELINE_DIRECTORY = path.join('services', 'pipeline')

/**
 * How many cuts to ask for. The engine's own default is 12; a source short
 * enough to be dropped into a browser usually yields fewer, and asking for
 * more than it can honestly make would only pad the grid.
 */
const WANTED_CUTS = 12

/** Long enough for a 20-minute source on a laptop, short enough to not hang. */
const RUN_TIMEOUT_MS = 20 * 60 * 1000

export interface EngineAvailability {
  readonly available: boolean
  /** Written for a person: what is missing and what to do about it. */
  readonly reason: string
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

function canSpawn(command: string, args: readonly string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], { stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

/**
 * Can this machine actually run a job.
 *
 * Checked rather than assumed, and re-checked on every request: `uv sync` can
 * happen between two page loads, and so can deploying this to somewhere that
 * has none of it.
 */
export async function engineAvailability(): Promise<EngineAvailability> {
  if (!(await exists(PIPELINE_DIRECTORY))) {
    return {
      available: false,
      reason:
        'services/pipeline is not on this machine. The engine runs from a checkout of the repo, not from a deployment.',
    }
  }
  if (!(await canSpawn('uv', ['--version']))) {
    return {
      available: false,
      reason: 'uv is not on PATH. Install it with `brew install uv`, then `uv sync --no-editable`.',
    }
  }
  if (!(await canSpawn('ffmpeg', ['-version']))) {
    return {
      available: false,
      reason: 'ffmpeg is not on PATH. Install it with `brew install ffmpeg`.',
    }
  }
  return { available: true, reason: 'uv, ffmpeg and services/pipeline are all here.' }
}

/**
 * The brand file for a run.
 *
 * The colours, fonts, caption style and word lists come from the mock brand
 * kit, because there is no backend yet and S9 is the screen that will own
 * them. The rights record does not: it is written from the confirmation the
 * person made when they uploaded, which is the only part of this file that
 * is a claim about the real world.
 *
 * CLAUDE.md non-negotiable 1 is the reason this function takes a holder and
 * refuses to invent one. Without a rights record the engine still runs and
 * the gate blocks every cut, which is the honest outcome.
 */
export async function writeBrandFile(jobId: string, rightsHolder: string): Promise<void> {
  const brand = {
    logoLabel: brandKit.logoLabel,
    colors: brandKit.colors.map((colour) => ({
      id: colour.id,
      name: colour.name,
      hex: colour.hex,
    })),
    headingFont: brandKit.headingFont,
    bodyFont: brandKit.bodyFont,
    captionStyle: brandKit.captionStyles.find((style) => style.isSelected)?.id ?? 'bold-highlight',
    wordsAlways: [...brandKit.wordsAlways],
    wordsNever: [...brandKit.wordsNever],
    rights: {
      holder: rightsHolder,
      // The record id names where the confirmation came from. It is not a
      // signed document, and it does not pretend to be one.
      recordId: `upload-confirmation-${jobId}`,
      signedOn: new Date().toISOString().slice(0, 10),
    },
  }

  await writeFile(brandPath(jobId), `${JSON.stringify(brand, null, 2)}\n`, 'utf8')
}

export interface RunOutcome {
  readonly ok: boolean
  readonly message: string
}

/**
 * Run the engine to completion.
 *
 * Deliberately not detached: the caller awaits it and writes the job's final
 * state, so a crashed run cannot leave a job sitting at "running" forever.
 * The HTTP handler that starts it does not await it — see the POST route.
 */
export function runEngine(jobId: string): Promise<RunOutcome> {
  const args = [
    'run',
    '--no-editable',
    'make-samples',
    path.resolve(sourcePath(jobId)),
    path.resolve(brandPath(jobId)),
    '--out',
    path.resolve(samplesDirectory(jobId)),
    '--cuts',
    String(WANTED_CUTS),
  ]

  return new Promise((resolve) => {
    const child = spawn('uv', args, {
      cwd: PIPELINE_DIRECTORY,
      // No shell: every argument is passed as its own token, so a filename
      // cannot become part of a command.
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, RUN_TIMEOUT_MS)

    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ ok: false, message: `the engine could not start: ${messageOf(error)}` })
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (signal === 'SIGKILL') {
        resolve({ ok: false, message: `the engine ran past ${RUN_TIMEOUT_MS / 60000} minutes` })
        return
      }
      if (code === 0) {
        resolve({ ok: true, message: stdout.trim() })
        return
      }
      // The CLI writes a sentence to stderr for every refusal it has. Passing
      // it through is better than inventing a friendlier one that says less.
      const detail = stderr.trim() || stdout.trim() || `exit code ${code}`
      resolve({ ok: false, message: detail })
    })
  })
}
