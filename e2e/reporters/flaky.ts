/**
 * Names, at the end of a run, every test that only passed because it was
 * retried.
 *
 * **Why this exists.** `retries: 1` in CI is the right call — one genuinely
 * slow runner should not block a merge on a timing artefact — but a retry that
 * nobody reports is a flake-hiding machine. The run goes green, the exit code
 * is 0, and the only trace is a `✘` followed by a `✓` somewhere inside a
 * two-thousand-line log that nobody opens on a passing build. That is strictly
 * worse than no retries at all: the flake is still there, and now it is
 * invisible.
 *
 * So the retry buys the merge and this buys the visibility. A flaky test is not
 * a failure and does not fail the build; it is an item of work, and it gets
 * written somewhere a person will actually see it — the end of the log, and
 * GitHub's run summary when the run is on GitHub.
 *
 * Playwright's `list` reporter prints a `flaky` count of its own. This adds what
 * the count leaves out: which test, where it lives, how many attempts it took,
 * and the error the first attempt died on — which is the part that says whether
 * it was a race, a timeout, or a real bug that happens to be rare.
 */

import { appendFileSync } from 'node:fs'

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'

/**
 * Playwright colours its error messages, and the escape codes are noise in a
 * summary table. Built from a char code rather than written literally so the
 * source carries no control character, which also keeps `no-control-regex`
 * happy.
 */
const ANSI_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

/** Enough of the error to classify it; the full text is in the log above. */
const ERROR_SUMMARY_MAX_CHARS = 160

const RULE = '──────────────────────────────────────────────────────────────────────'

interface FlakyTest {
  readonly title: string
  readonly location: string
  readonly attempts: number
  readonly firstError: string
}

const firstLineOf = (message: string | undefined): string => {
  if (!message) return 'no error recorded'

  const [line = ''] = message.replace(ANSI_SEQUENCE, '').split('\n')
  const trimmed = line.trim()
  if (trimmed.length === 0) return 'no error recorded'

  return trimmed.length > ERROR_SUMMARY_MAX_CHARS
    ? `${trimmed.slice(0, ERROR_SUMMARY_MAX_CHARS)}…`
    : trimmed
}

export default class FlakyReporter implements Reporter {
  private readonly flaky: FlakyTest[] = []

  /**
   * A pass on a later attempt is the definition of flaky here. Reading it per
   * test rather than walking the finished suite tree keeps this reporter
   * independent of how Playwright groups projects and shards.
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'passed' || result.retry === 0) return

    const firstAttempt = test.results.find((attempt) => attempt.status !== 'passed')

    this.flaky.push({
      title: test.titlePath().filter(Boolean).join(' › '),
      location: `${test.location.file.replace(`${process.cwd()}/`, '')}:${test.location.line}`,
      attempts: result.retry + 1,
      firstError: firstLineOf(firstAttempt?.error?.message),
    })
  }

  onEnd(): void {
    if (this.flaky.length === 0) return

    const plural = this.flaky.length === 1 ? 'test' : 'tests'
    const heading = `${this.flaky.length} ${plural} passed only on retry`

    const lines = [
      '',
      RULE,
      `  FLAKY: ${heading}`,
      '  The build is green. These are not failures, but they are not fine.',
      RULE,
      ...this.flaky.flatMap((entry) => [
        `  • ${entry.title}`,
        `      ${entry.location}  ·  passed on attempt ${entry.attempts}`,
        `      first attempt: ${entry.firstError}`,
      ]),
      RULE,
      '',
    ]

    process.stdout.write(`${lines.join('\n')}\n`)
    this.writeStepSummary(heading)
  }

  /**
   * GitHub's run summary, when there is one. This is the half that makes a
   * flake unmissable: a log needs opening, the summary is the first thing on
   * the run's own page. Failing to write it must never fail the suite — the
   * tests passed, and a reporter is not a gate.
   */
  private writeStepSummary(heading: string): void {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY
    if (!summaryPath) return

    const rows = this.flaky.map(
      (entry) =>
        `| ${entry.title} | \`${entry.location}\` | ${entry.attempts} | ${entry.firstError.replace(/\|/g, '\\|')} |`,
    )

    const markdown = [
      `### ⚠️ Flaky: ${heading}`,
      '',
      'The build passed. Each of these failed once and passed on a retry, which',
      'means the timing is wrong somewhere — in the test or in the product.',
      '',
      '| Test | Where | Attempts | First attempt failed with |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
    ].join('\n')

    try {
      appendFileSync(summaryPath, `${markdown}\n`, 'utf8')
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      process.stdout.write(`  (could not write the flaky summary to GitHub: ${reason})\n`)
    }
  }
}
