import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

// There is an unrelated package-lock.json further up this machine's home
// directory, so Next guesses the wrong workspace root and traces the wrong
// files. Pin it to the repo root — two levels up from apps/web.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS/TSX, so Next must compile them itself.
  transpilePackages: ['@mirrorline/ui', '@mirrorline/mock'],
  outputFileTracingRoot: repoRoot,
  // The reference screenshots in docs/screens-built/ are taken against the dev
  // server, and Next's floating dev-tools badge sits over the UI in every one
  // of them — over the sidebar usage meter at 1440px and over a section
  // heading at 390px. Nothing in this repo needs the badge.
  devIndicators: false,
};

export default nextConfig;
