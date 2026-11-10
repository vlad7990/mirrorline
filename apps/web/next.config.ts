import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship raw TS/TSX, so Next must compile them itself.
  transpilePackages: ['@mirrorline/ui', '@mirrorline/mock'],
};

export default nextConfig;
