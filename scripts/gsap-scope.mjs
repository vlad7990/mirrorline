/**
 * GSAP import-scope gate (CLAUDE.md non-negotiable #10, docs/DECISIONS.md D41).
 *
 * D33 admitted `gsap` as a named licence exception. D41 narrows *where* it may
 * be used: the public marketing site only. The licence allow-list cannot
 * express that — it reads package manifests, and a manifest says nothing about
 * which of our files import it. So this gate reads our own source instead.
 *
 * Two rules, and they are different in kind:
 *
 * 1. **Scope** — a GSAP-family module may only be imported from the marketing
 *    site. Allow-listed by prefix and *denied by default*, so the studio app,
 *    `packages/ui`, the Remotion templates, the pipeline services and any
 *    customer-facing animation tooling we have not written yet are all covered
 *    without being enumerated. Enumeration rots; a default-deny does not.
 *
 * 2. **Banned outright** — ScrollSmoother and Lenis, anywhere, marketing
 *    included. Both replace native scrolling with a transformed proxy, which
 *    is the scroll-jacking spec 17 forbids. Webflow making every GSAP plugin
 *    free is why ScrollSmoother needs naming at all: it now ships inside the
 *    package we are allowed to install, so nothing else would stop an import.
 *
 * Detection is on **module specifiers**, never on prose. Existing marketing
 * components discuss ScrollSmoother in comments explaining why D32 rebuilt its
 * mechanics in CSS; a word-level search would fail them for documenting the
 * very rule they follow.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The only places a GSAP-family import may appear. Both are marketing-only by
 * construction: the route group serves the public pages, and
 * `components/marketing` is imported by nothing outside it.
 *
 * Written with forward slashes and compared against forward-slashed paths, so
 * the gate behaves the same on Windows CI as on a Mac.
 */
export const MARKETING_SCOPES = ['apps/web/app/(marketing)/', 'apps/web/components/marketing/'];

/** Roots walked when scanning the repo. `scripts/` is deliberately absent:
 *  this gate's own tests carry banned specifiers as fixture strings. */
export const SCANNED_ROOTS = ['apps', 'packages', 'services', 'e2e'];

const SKIPPED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  'dist',
  'build',
  'out',
  'coverage',
  'playwright-report',
  'test-results',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Smooth-scroll libraries, banned everywhere. ScrollSmoother is a GSAP plugin;
 * the rest are the Lenis family under both names it has shipped under.
 *
 * `gsap/all` sits here rather than with the allowed plugins because it
 * re-exports every one of them, ScrollSmoother included — it is a way around
 * rule 2 rather than a convenience.
 */
const BANNED_SPECIFIERS = new Set([
  'gsap/ScrollSmoother',
  'gsap/dist/ScrollSmoother',
  'gsap/src/ScrollSmoother',
  'gsap/all',
  'gsap/dist/all',
  'lenis',
  'lenis/react',
  '@studio-freight/lenis',
  '@studio-freight/react-lenis',
]);

const BUNDLE_REASON =
  'gsap/all re-exports every plugin, ScrollSmoother included — import the plugins you need by name';

const SMOOTH_SCROLL_REASON =
  'ScrollSmoother and Lenis are banned everywhere (D41): both replace native scroll with a transformed proxy';

/** Matches `from 'x'`, `import 'x'`, `import('x')` and `require('x')`. */
const SPECIFIER_PATTERN = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*(['"`])([^'"`\n]+)\1/g;

const toPosix = (path) => path.split(sep).join('/');

/** Strips a trailing extension so `gsap/ScrollSmoother.js` cannot slip past. */
const normaliseSpecifier = (specifier) => specifier.replace(/\.(?:js|mjs|cjs)$/, '');

export const isBannedSpecifier = (specifier) =>
  BANNED_SPECIFIERS.has(normaliseSpecifier(specifier));

/** `gsap`, any `gsap/*` plugin, and `@gsap/react`'s useGSAP. */
export const isGsapSpecifier = (specifier) => {
  const normalised = normaliseSpecifier(specifier);
  return normalised === 'gsap' || normalised.startsWith('gsap/') || normalised.startsWith('@gsap/');
};

export const isInMarketingScope = (path) =>
  MARKETING_SCOPES.some((scope) => toPosix(path).startsWith(scope));

/** Every module specifier in a source string, de-duplicated. */
export const specifiersIn = (source) => {
  const found = new Set();
  for (const match of source.matchAll(SPECIFIER_PATTERN)) {
    found.add(match[2]);
  }
  return [...found];
};

const bannedReasonFor = (specifier) =>
  normaliseSpecifier(specifier).endsWith('/all') ? BUNDLE_REASON : SMOOTH_SCROLL_REASON;

/**
 * The whole rule, as a pure function over `{ path, source }` records so it can
 * be tested without touching a filesystem. `path` is repo-relative.
 */
export const findViolations = (files) => {
  const violations = [];
  for (const { path, source } of files) {
    for (const specifier of specifiersIn(source)) {
      if (isBannedSpecifier(specifier)) {
        violations.push({
          path,
          specifier,
          kind: 'banned-module',
          reason: bannedReasonFor(specifier),
        });
        continue;
      }
      if (isGsapSpecifier(specifier) && !isInMarketingScope(path)) {
        violations.push({
          path,
          specifier,
          kind: 'out-of-scope',
          reason: `GSAP is licensed for the public marketing site only (D41) — allowed under ${MARKETING_SCOPES.join(' or ')}`,
        });
      }
    }
  }
  return violations;
};

const walk = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIPPED_DIRS.has(entry.name) ? [] : walk(join(dir, entry.name));
    }
    if (!entry.isFile()) return [];
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) ? [join(dir, entry.name)] : [];
  });
};

/** Reads every scanned source file as a `{ path, source }` record. */
export const collectSourceFiles = (repoRoot = REPO_ROOT) =>
  SCANNED_ROOTS.flatMap((root) => walk(join(repoRoot, root))).map((absolute) => ({
    path: toPosix(relative(repoRoot, absolute)),
    source: readFileSync(absolute, 'utf8'),
  }));

export const printViolations = (violations) => {
  console.error(`\nGSAP scope violations (${violations.length}):\n`);
  for (const violation of violations) {
    console.error(`  ${violation.path}`);
    console.error(`    imports ${violation.specifier}`);
    console.error(`    ${violation.reason}\n`);
  }
};

/** Runs the gate over the repo. Returns the violations rather than exiting, so
 *  the caller decides what a failure means. */
export const checkGsapScope = (repoRoot = REPO_ROOT) =>
  findViolations(collectSourceFiles(repoRoot));
