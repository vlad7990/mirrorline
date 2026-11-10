/**
 * Where a run lives while it is happening.
 *
 * One directory per job under `.data/engine-jobs/`, which is git-ignored for
 * the same reason `.data/leads.json` is: it holds a client's footage, and
 * that has no business in the repository.
 *
 *     .data/engine-jobs/<id>/
 *       job.json          state, timings, the error if there was one
 *       source.mp4        what the browser uploaded
 *       brand.json        written from the brand kit plus the rights record
 *       samples/          what the engine made, including summary.json
 *
 * A directory is the whole store. No database, no queue, no lock: one machine,
 * one developer, one run at a time. When this moves to a real queue in week 3
 * the shape above is what it has to reproduce.
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type EngineJob, type EngineJobState, parseSummary } from './types'

/**
 * The repo root, found rather than assumed.
 *
 * `process.cwd()` is `apps/web` under `next dev`, so a relative
 * `services/pipeline` resolves to `apps/web/services/pipeline`, which does not
 * exist. The availability probe then reports, truthfully, that the engine is
 * not on this machine, and the upload screen falls back to its demo states on
 * a machine where everything is installed. Walking up to the workspace file
 * is the fix; it was found by running the thing, not by reading it.
 */
function findRepoRoot(): string {
  let directory = process.cwd()
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(path.join(directory, 'pnpm-workspace.yaml'))) return directory
    const parent = path.dirname(directory)
    if (parent === directory) break
    directory = parent
  }
  return process.cwd()
}

export const REPO_ROOT = findRepoRoot()

export const JOBS_DIRECTORY = path.join(REPO_ROOT, '.data', 'engine-jobs')

const JOB_FILE = 'job.json'
const SOURCE_FILE = 'source.mp4'
const BRAND_FILE = 'brand.json'
const SAMPLES_DIRECTORY = 'samples'
const SUMMARY_FILE = 'summary.json'

/** A job id is in URLs and file paths, so it is deliberately boring. */
const ID_PATTERN = /^[a-z0-9-]{8,64}$/

const MAX_CUT_INDEX = 99

export interface StoredJob {
  readonly id: string
  readonly state: EngineJobState
  readonly sourceName: string
  /** ISO-8601 UTC, e.g. '2026-11-10T17:54:00.000Z'. */
  readonly startedAt: string
  readonly finishedAt: string | null
  readonly error: string | null
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isJobId(value: string): boolean {
  return ID_PATTERN.test(value)
}

export function jobDirectory(jobId: string): string {
  if (!isJobId(jobId)) throw new Error(`not a job id: ${jobId}`)
  // Rebuilt from the validated id rather than joined from input, so a path
  // cannot be traversed out of the jobs directory by a crafted id.
  return path.join(JOBS_DIRECTORY, jobId)
}

export function sourcePath(jobId: string): string {
  return path.join(jobDirectory(jobId), SOURCE_FILE)
}

export function brandPath(jobId: string): string {
  return path.join(jobDirectory(jobId), BRAND_FILE)
}

/**
 * Where a supplied transcript goes, so the engine finds it.
 *
 * `ScriptTranscriber` looks for `<video><suffix>` beside the source, so the
 * name is derived from the video's rather than chosen here. Two shapes, and
 * the engine prefers the first: word-level JSON carries real timings, plain
 * text gets timings spread evenly and is labelled as estimated.
 */
export function transcriptPath(jobId: string, kind: 'json' | 'text'): string {
  const suffix = kind === 'json' ? '.transcript.json' : '.script.txt'
  return `${sourcePath(jobId)}${suffix}`
}

export function samplesDirectory(jobId: string): string {
  return path.join(jobDirectory(jobId), SAMPLES_DIRECTORY)
}

export function summaryPath(jobId: string): string {
  return path.join(samplesDirectory(jobId), SUMMARY_FILE)
}

/**
 * The file for one cut, resolved from its index rather than from the path in
 * the summary.
 *
 * The summary's `file` is an absolute path produced on this machine, and
 * serving it verbatim would let whatever wrote it choose any file on disk.
 * The index is a number we validate, so the path is ours.
 */
export function cutPath(jobId: string, index: number): string {
  if (!Number.isInteger(index) || index < 1 || index > MAX_CUT_INDEX) {
    throw new Error(`not a cut index: ${index}`)
  }
  return path.join(samplesDirectory(jobId), `cut-${String(index).padStart(2, '0')}.mp4`)
}

export async function createJobDirectory(jobId: string): Promise<string> {
  const directory = jobDirectory(jobId)
  await mkdir(directory, { recursive: true })
  return directory
}

export async function writeJob(job: StoredJob): Promise<void> {
  await mkdir(jobDirectory(job.id), { recursive: true })
  await writeFile(path.join(jobDirectory(job.id), JOB_FILE), JSON.stringify(job, null, 2), 'utf8')
}

async function readStoredJob(jobId: string): Promise<StoredJob | null> {
  try {
    const raw = await readFile(path.join(jobDirectory(jobId), JOB_FILE), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as StoredJob
  } catch {
    // A job that is not on disk is not an error; it is a 404 for the caller.
    return null
  }
}

/**
 * The job, with its summary attached once the engine has written one.
 *
 * The summary is read on every poll rather than cached: the run writes it
 * once at the end, and re-reading a small JSON file is cheaper than keeping
 * a process alive to hold it.
 */
export async function readJob(jobId: string): Promise<EngineJob | null> {
  if (!isJobId(jobId)) return null

  const stored = await readStoredJob(jobId)
  if (stored === null) return null

  if (stored.state !== 'done') {
    return { ...stored, summary: null }
  }

  try {
    const summary = parseSummary(JSON.parse(await readFile(summaryPath(jobId), 'utf8')))
    return { ...stored, summary }
  } catch (error) {
    // The run said it finished and the file is missing or malformed. That is
    // a failure, reported as one, not a job that sits on "done" with nothing
    // to show.
    return {
      ...stored,
      state: 'failed',
      summary: null,
      error: `the run finished but its summary could not be read: ${messageOf(error)}`,
    }
  }
}

export async function listJobIds(): Promise<readonly string[]> {
  try {
    const entries = await readdir(JOBS_DIRECTORY, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory() && isJobId(entry.name))
      .map((entry) => entry.name)
  } catch {
    return []
  }
}
