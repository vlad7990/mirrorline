#!/usr/bin/env node
/**
 * Licence allow-list gate (CLAUDE.md non-negotiable #10).
 *
 * Reads package.json files straight off disk instead of shelling out to
 * `pnpm ls --json --depth Infinity`: faster, needs no pnpm on PATH, and behaves
 * the same in CI. Under pnpm every resolved package lives at
 * node_modules/.pnpm/<name>@<version>/node_modules/<name>/package.json.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  if (offenders.length === 0) {
    console.log(`licence-check: ${packages.length} packages checked, all licences allowed`);
    process.exit(0);
  }

  printOffenders(offenders);
  process.exit(1);
};

main();
