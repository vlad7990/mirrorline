/**
 * The engine's `summary.json`, in TypeScript.
 *
 * This is a copy of a contract that lives in Python
 * (`services/pipeline/src/pipeline/cli.py`, `build_summary`). Two languages,
 * one file format, and no generated client between them — so this module
 * parses defensively and never trusts the shape it is handed, even though
 * both sides are ours. `parseSummary` is the only way in.
 */

export type EngineComplianceStatus = 'pass' | 'needs-review' | 'blocked'

export interface EngineFinding {
  readonly rule: string
  readonly status: EngineComplianceStatus
  readonly message: string
}

export interface EngineCut {
  readonly index: number
  readonly hook: string
  /** The engine's own vocabulary: "Hook question", "List", "Story", "Tip". */
  readonly format: string
  readonly lengthLabel: string
  readonly lengthSeconds: number
  /** 0-100, and always explained by `reasons`. */
  readonly score: number
  readonly reasons: readonly string[]
  readonly hasAiScenes: boolean
  readonly compliance: {
    readonly status: EngineComplianceStatus
    readonly findings: readonly EngineFinding[]
  }
  /** Absolute path on the machine that ran the engine. Never sent to a browser. */
  readonly file: string | null
}

export interface EngineSummary {
  /** ISO-8601 UTC, e.g. '2026-11-10T17:54:00Z'. */
  readonly generatedAt: string
  readonly source: { readonly file: string; readonly rightsHolder: string | null }
  readonly brand: { readonly logoLabel: string; readonly captionStyle: string }
  /**
   * Which implementation answered. Carried into the UI deliberately: a run
   * backed by a script sidecar must never read like a run backed by a model.
   */
  readonly adapters: {
    readonly transcriber: string
    readonly momentFinder: string
    readonly captionBurner: string
    readonly notes: readonly string[]
  }
  readonly flags: { readonly useClaude: boolean }
  readonly counts: {
    readonly cuts: number
    readonly pass: number
    readonly needsReview: number
    readonly blocked: number
  }
  readonly cuts: readonly EngineCut[]
}

export type EngineJobState = 'queued' | 'running' | 'done' | 'failed'

export interface EngineJob {
  readonly id: string
  readonly state: EngineJobState
  /** The name the browser sent. Shown back to the user, so it is escaped on render. */
  readonly sourceName: string
  /** ISO-8601 UTC. */
  readonly startedAt: string
  readonly finishedAt: string | null
  /** Present once the run succeeds. */
  readonly summary: EngineSummary | null
  /** Present when the run failed. A sentence a person can act on. */
  readonly error: string | null
}

class SummaryError extends Error {}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SummaryError(`${where} is not an object`)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, where: string): string {
  if (typeof value !== 'string') throw new SummaryError(`${where} is not a string`)
  return value
}

function asNumber(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SummaryError(`${where} is not a finite number`)
  }
  return value
}

function asStatus(value: unknown, where: string): EngineComplianceStatus {
  const status = asString(value, where)
  if (status !== 'pass' && status !== 'needs-review' && status !== 'blocked') {
    throw new SummaryError(`${where} is not a compliance status: ${status}`)
  }
  return status
}

function asStringArray(value: unknown, where: string): readonly string[] {
  if (!Array.isArray(value)) throw new SummaryError(`${where} is not an array`)
  return value.map((entry, position) => asString(entry, `${where}[${position}]`))
}

function parseFinding(raw: unknown, where: string): EngineFinding {
  const finding = asRecord(raw, where)
  return {
    rule: asString(finding.rule, `${where}.rule`),
    status: asStatus(finding.status, `${where}.status`),
    message: asString(finding.message, `${where}.message`),
  }
}

function parseCut(raw: unknown, where: string): EngineCut {
  const cut = asRecord(raw, where)
  const compliance = asRecord(cut.compliance, `${where}.compliance`)
  const findings = compliance.findings
  if (!Array.isArray(findings)) {
    throw new SummaryError(`${where}.compliance.findings is not an array`)
  }

  return {
    index: asNumber(cut.index, `${where}.index`),
    hook: asString(cut.hook, `${where}.hook`),
    format: asString(cut.format, `${where}.format`),
    lengthLabel: asString(cut.lengthLabel, `${where}.lengthLabel`),
    lengthSeconds: asNumber(cut.lengthSeconds, `${where}.lengthSeconds`),
    score: asNumber(cut.score, `${where}.score`),
    reasons: asStringArray(cut.reasons ?? [], `${where}.reasons`),
    hasAiScenes: cut.hasAiScenes === true,
    compliance: {
      status: asStatus(compliance.status, `${where}.compliance.status`),
      findings: findings.map((entry, position) =>
        parseFinding(entry, `${where}.compliance.findings[${position}]`),
      ),
    },
    file: typeof cut.file === 'string' ? cut.file : null,
  }
}

/**
 * Read a `summary.json`, or say what is wrong with it.
 *
 * Throws rather than returning a partial summary. A half-parsed run shown as
 * a whole one is how a blocked cut becomes a cut somebody schedules.
 */
export function parseSummary(raw: unknown): EngineSummary {
  const summary = asRecord(raw, 'summary')
  const source = asRecord(summary.source, 'summary.source')
  const brand = asRecord(summary.brand, 'summary.brand')
  const adapters = asRecord(summary.adapters, 'summary.adapters')
  const flags = asRecord(summary.flags, 'summary.flags')
  const counts = asRecord(summary.counts, 'summary.counts')
  const cuts = summary.cuts

  if (!Array.isArray(cuts)) throw new SummaryError('summary.cuts is not an array')

  return {
    generatedAt: asString(summary.generatedAt, 'summary.generatedAt'),
    source: {
      file: asString(source.file, 'summary.source.file'),
      rightsHolder: typeof source.rightsHolder === 'string' ? source.rightsHolder : null,
    },
    brand: {
      logoLabel: asString(brand.logoLabel, 'summary.brand.logoLabel'),
      captionStyle: asString(brand.captionStyle, 'summary.brand.captionStyle'),
    },
    adapters: {
      transcriber: asString(adapters.transcriber, 'summary.adapters.transcriber'),
      momentFinder: asString(adapters.momentFinder, 'summary.adapters.momentFinder'),
      captionBurner: asString(adapters.captionBurner, 'summary.adapters.captionBurner'),
      notes: asStringArray(adapters.notes ?? [], 'summary.adapters.notes'),
    },
    flags: { useClaude: flags.useClaude === true },
    counts: {
      cuts: asNumber(counts.cuts, 'summary.counts.cuts'),
      pass: asNumber(counts.pass, 'summary.counts.pass'),
      needsReview: asNumber(counts.needsReview, 'summary.counts.needsReview'),
      blocked: asNumber(counts.blocked, 'summary.counts.blocked'),
    },
    cuts: cuts.map((entry, position) => parseCut(entry, `summary.cuts[${position}]`)),
  }
}
