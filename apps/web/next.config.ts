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
};

export default nextConfig;
