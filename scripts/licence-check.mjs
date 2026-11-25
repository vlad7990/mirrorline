#!/usr/bin/env node
/**
 * Licence allow-list gate (CLAUDE.md non-negotiable #10).
 *
 * Reads package.json files straight off disk instead of shelling out to
 * `pnpm ls --json --depth Infinity`: faster, needs no pnpm on PATH, and behaves
 * the same in CI. Under pnpm every resolved package lives at
 * node_modules/.pnpm/<name>@<version>/node_modules/<name>/package.json.
 *
 * Two gates run here, because rule 10 now has two halves. The first asks *may
 * we install this* — a question a package manifest can answer. The second asks
 * *where may we use it*, which GSAP's scoped exception (D41) adds and no
 * manifest can answer; that one lives in ./gsap-scope.mjs and reads our own
 * source. A licence that only permits one part of the product is not enforced
 * by checking the licence alone.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkGsapScope, printViolations as printScopeViolations } from './gsap-scope.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const NODE_MODULES = join(REPO_ROOT, 'node_modules');
const PNPM_STORE = join(NODE_MODULES, '.pnpm');

// CLAUDE.md non-negotiable #10 names MIT, Apache-2.0, BSD, ISC and MPL-2.0.
// The rest are permissive licences in the same family that the rule simply
// predates. Each addition past the first group is justified in
// docs/DECISIONS.md D11 — do not widen this list without doing the same.
const ALLOWED_LICENCES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Python-2.0',
  // Permissive, OSI-approved, no copyleft and no attribution obligation.
  'BlueOak-1.0.0',
  // Browser-support *data* (caniuse-lite), not code. Attribution only.
  'CC-BY-4.0',
  // A *font* licence, not a code licence: the Geist families the design
  // system is built on (docs/DECISIONS.md D18). OFL permits bundling and
  // redistribution; its only real conditions are that the font is not sold on
  // its own and that a Reserved Font Name is not reused on a modified build.
  // We do neither. SPDX writes it OFL-1.1; the geist package writes the long
  // form, so both spellings are accepted.
  'OFL-1.1',
  'SIL OPEN FONT LICENSE',
]);

// LGPL is not on the allow-list, and must not be: it is only acceptable for a
// prebuilt native binary that we load dynamically and never modify, vendor or
// statically link. Today that is exactly one package — the sharp/libvips
// binary that Next's image optimiser dlopens. Anything else LGPL must fail and
// be argued for in docs/DECISIONS.md first.
const LGPL_DYNAMIC_BINARY_EXCEPTIONS = new Set([
  '@img/sharp-libvips-darwin-arm64',
  '@img/sharp-libvips-darwin-x64',
  '@img/sharp-libvips-linux-arm64',
  '@img/sharp-libvips-linux-x64',
  '@img/sharp-libvips-linuxmusl-arm64',
  '@img/sharp-libvips-linuxmusl-x64',
]);

/**
 * GSAP, named rather than allow-listed by licence string (docs/DECISIONS.md
 * D33). Vlad's decision, with the trade-off on record.
 *
 * Its `license` field is not an SPDX identifier at all — it is the prose
 * "Standard 'no charge' license: https://gsap.com/standard-license." Putting
 * that string into ALLOWED_LICENCES would quietly admit any future package
 * that copied the wording, so the exception is pinned to the package name
 * *and* to that licence, and to nothing else.
 *
 * The two packages word it differently — core says "Standard 'no charge'
 * license: <url>", `@gsap/react` says "SEE LICENSE AT <url>" — so the pattern
 * matches the **licence URL** they share rather than either sentence. That is
 * also the stricter choice: prose can be copied by accident, a link to
 * Webflow's own licence page cannot.
 *
 * What it is: free for commercial use, every plugin included, since Webflow
 * took it on. What it is not: an OSI-permissive licence. It reserves
 * termination at Webflow's discretion, lets them amend the terms
 * unilaterally, and prohibits use in tools competing with Webflow's visual
 * animation builder. We make short videos out of podcasts and their own FAQ
 * encourages building on top, so the non-compete is not thought to reach us —
 * but it is a term MIT does not have, and rule 10 exists because this project
 * has to survive a lawyer reading it.
 *
 * **Scoped on 2026-11-13 (D41), Vlad's decision.** The exception now covers
 * the public marketing site only, and the installable set is named rather than
 * left as "all plugins": `gsap` core, ScrollTrigger, SplitText, and
 * `@gsap/react` for `useGSAP`'s cleanup. The studio app, `packages/ui`, the
 * Remotion templates and any customer-facing animation tooling stay on CSS and
 * `motion` (MIT, D19). That boundary is the point of the non-compete clause
 * above: a marketing page that animates is nothing like an animation tool we
 * hand to a customer, and keeping GSAP out of the second means the clause
 * never has to be argued.
 *
 * Whether a file obeys that scope is not a manifest question, so it is
 * enforced in ./gsap-scope.mjs instead of here.
 */
/**
 * Packages whose **manifest** omits a licence the package itself states (V5).
 *
 * `combine-errors` is a transitive dependency of `tus-js-client`, which is the
 * resumable-upload client Supabase's own documentation points at. It ships
 * `License.md` containing the full MIT text, and simply has no `license` field
 * in `package.json` — an npm metadata omission from 2016, not a licence
 * question.
 *
 * It is listed here rather than by widening `ALLOWED_LICENCES`, because
 * "UNKNOWN" must keep failing: an undeclared licence is all-rights-reserved by
 * default, and one package with a readable MIT file is not a reason to admit
 * the next package that has nothing at all. Each entry names the evidence, and
 * the evidence is a file in the installed package that anybody can open.
 */
const MANIFEST_OMITS_LICENCE = new Map([
  [
    'combine-errors',
    { licence: 'MIT', evidence: 'License.md holds the full MIT text; package.json omits the field' },
  ],
]);

const GSAP_LICENCE_EXCEPTIONS = new Set(['gsap', '@gsap/react']);
const GSAP_LICENCE_PATTERN = /gsap\.com\/standard-license/i;

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const listDirs = (path) => {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name);
};

/** Package dirs sit one level deep, or two when the name is scoped (@scope/name). */
const packageDirs = (parent) =>
  listDirs(parent).flatMap((name) =>
    name.startsWith('@')
      ? listDirs(join(parent, name)).map((inner) => join(parent, name, inner))
      : [join(parent, name)],
  );

const collectManifestPaths = () => {
  const roots = existsSync(PNPM_STORE)
    ? listDirs(PNPM_STORE).map((dir) => join(PNPM_STORE, dir, 'node_modules'))
    : [NODE_MODULES];

  return roots
    .flatMap((root) => packageDirs(root))
    .map((dir) => join(dir, 'package.json'))
    .filter((path) => existsSync(path));
};

/** Normalises `license`, legacy `licenses[]`, and SPDX expressions to one label. */
const licenceOf = (manifest) => {
  const { license, licenses } = manifest;
  if (typeof license === 'string' && license.trim()) return license.trim();
  if (license && typeof license === 'object' && license.type) return String(license.type);
  if (Array.isArray(licenses)) {
    const types = licenses.map((entry) => entry?.type).filter(Boolean);
    if (types.length > 0) return types.join(' OR ');
  }
  return 'UNKNOWN';
};

/**
 * OR expressions pass if any term is allowed; AND expressions need every term.
 * `name` is passed so the narrow LGPL dynamic-binary exception can apply to the
 * specific packages it was argued for, and to nothing else.
 */
const isAllowed = (expression, name) => {
  if (name && LGPL_DYNAMIC_BINARY_EXCEPTIONS.has(name) && /^LGPL-3\.0/.test(expression)) {
    return true;
  }
  if (name && GSAP_LICENCE_EXCEPTIONS.has(name) && GSAP_LICENCE_PATTERN.test(expression)) {
    return true;
  }
  // A manifest with no licence field, where the package ships the text anyway.
  // Named one by one, with the evidence recorded beside the name.
  if (expression === 'UNKNOWN' && name && MANIFEST_OMITS_LICENCE.has(name)) {
    return ALLOWED_LICENCES.has(MANIFEST_OMITS_LICENCE.get(name).licence);
  }
  if (expression === 'UNKNOWN') return false;
  const cleaned = expression.replace(/[()]/g, ' ').trim();
  const terms = cleaned
    .split(/\s+(?:OR|AND)\s+/i)
    .map((term) => term.replace(/\+$/, '').trim())
    .filter(Boolean);
  if (terms.length === 0) return false;
  const allowedCount = terms.filter((term) => ALLOWED_LICENCES.has(term)).length;
  return /\sOR\s/i.test(cleaned) ? allowedCount > 0 : allowedCount === terms.length;
};

const printOffenders = (offenders) => {
  const nameWidth = Math.max(7, ...offenders.map((entry) => entry.name.length));
  const versionWidth = Math.max(7, ...offenders.map((entry) => entry.version.length));
  const row = (name, version, licence) =>
    `  ${name.padEnd(nameWidth)}  ${version.padEnd(versionWidth)}  ${licence}`;

  console.error(`\nDisallowed licences found (${offenders.length}):\n`);
  console.error(row('PACKAGE', 'VERSION', 'LICENCE'));
  console.error(row('-'.repeat(nameWidth), '-'.repeat(versionWidth), '-------'));
  for (const offender of offenders) {
    console.error(row(offender.name, offender.version, offender.licence));
  }
  console.error(`\nAllow-list: ${[...ALLOWED_LICENCES].join(', ')}\n`);
};

/**
 * The third gate: the ffmpeg binary we put in an image (V5).
 *
 * Rule 10's two halves were "may we install this" and "where may we use it".
 * ffmpeg adds a third that no manifest can answer, because it is not a
 * dependency — it is a binary downloaded in a Dockerfile, and the thing that
 * decides its licence is **which artefact name was typed there**.
 *
 * The LGPL build and the GPL build differ by six characters in a URL. The
 * licence review that chose LGPL (V5, 25 November 2026) is a comment; this is
 * the part that cannot be edited away by somebody bumping a version. It checks:
 *
 *  * the artefact says `lgpl`, and does not say plain `gpl`;
 *  * the release tag is not `latest`, because a pin that moves underneath us is
 *    a licence claim somebody else's cron job can falsify;
 *  * there is a sha256 to check it against, and it is a sha256.
 *
 * `services/pipeline`'s Python dependencies are still **not** covered by any
 * automated check (docs/PROGRESS.md "Needs Vlad" 2 calls that a gap, not a
 * pass). This closes the binary half of it; `uv.lock` is still owed one.
 */
const FFMPEG_DOCKERFILE = join(REPO_ROOT, 'services', 'worker', 'Dockerfile.video');

export const checkFfmpegPin = () => {
  if (!existsSync(FFMPEG_DOCKERFILE)) return [];

  const text = readFileSync(FFMPEG_DOCKERFILE, 'utf8');
  const argOf = (name) => text.match(new RegExp(`^ARG\\s+${name}=(\\S+)`, 'm'))?.[1] ?? null;

  const tag = argOf('FFMPEG_TAG');
  const asset = argOf('FFMPEG_ASSET');
  const sha = argOf('FFMPEG_SHA256');
  const problems = [];

  if (asset === null || tag === null || sha === null) {
    problems.push('Dockerfile.video must declare FFMPEG_TAG, FFMPEG_ASSET and FFMPEG_SHA256');
    return problems;
  }

  if (!/-lgpl[-.]/.test(asset)) {
    problems.push(`FFMPEG_ASSET ${asset} is not an lgpl build`);
  }

  // `linux64-gpl-9.0` matches this and `linux64-lgpl-9.0` does not, which is
  // the whole point of writing it as a boundary rather than a substring.
  if (/(?:^|[^l])-gpl[-.]/.test(asset)) {
    problems.push(`FFMPEG_ASSET ${asset} is a GPL build; the licence review chose LGPL`);
  }

  if (tag === 'latest') {
    problems.push('FFMPEG_TAG is "latest", which is a pin that moves. Use an autobuild tag.');
  }

  if (!/^[0-9a-f]{64}$/.test(sha)) {
    problems.push(`FFMPEG_SHA256 ${sha} is not a sha256 digest`);
  }

  return problems;
};

const printFfmpegProblems = (problems) => {
  console.error(`\nffmpeg pin (${problems.length}):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nThe worker image ships ffmpeg as a separate, unmodified binary. LGPL is the\n' +
      'build the licence review allowed (V5); x264 and x265 are GPL-only and are\n' +
      'absent from it by construction. See services/worker/Dockerfile.video.\n',
  );
};

const collectPackages = () => {
  const seen = new Map();
  for (const path of collectManifestPaths()) {
    const manifest = readJson(path);
    if (!manifest?.name) continue;
    const key = `${manifest.name}@${manifest.version ?? '0.0.0'}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      name: manifest.name,
      version: manifest.version ?? 'unknown',
      licence: licenceOf(manifest),
    });
  }
  return [...seen.values()];
};

const main = () => {
  if (!existsSync(NODE_MODULES)) {
    console.log('no node_modules; run pnpm install first');
    process.exit(0);
  }

  const packages = collectPackages();
  const offenders = packages
    .filter((pkg) => !isAllowed(pkg.licence, pkg.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Both gates run and both report before anything exits. They fail for
  // unrelated reasons — a dependency's licence, and one of our own imports —
  // so stopping at the first would hide the second until the next commit.
  const scopeViolations = checkGsapScope();
  const ffmpegProblems = checkFfmpegPin();

  if (offenders.length > 0) printOffenders(offenders);
  if (scopeViolations.length > 0) printScopeViolations(scopeViolations);
  if (ffmpegProblems.length > 0) printFfmpegProblems(ffmpegProblems);

  if (offenders.length > 0 || scopeViolations.length > 0 || ffmpegProblems.length > 0) {
    process.exit(1);
  }

  console.log(
    `licence-check: ${packages.length} packages checked, all licences allowed; ` +
      'GSAP scope clean; ffmpeg pinned to an LGPL build',
  );
  process.exit(0);
};

main();
