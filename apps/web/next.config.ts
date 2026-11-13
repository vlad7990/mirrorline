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
  /**
   * `/how-it-works` became `/agents` when the v4 handoff's five-page
   * structure landed (D25) — the page was always about the seven agents, and
   * the new `/product` covers what the old title promised.
   *
   * Permanent, not temporary: the path is not coming back, and a 308 tells a
   * search engine to move its index rather than keep both. The URL has been
   * in previews and in `docs/PROGRESS.md`, so it has to keep resolving
   * rather than 404.
   */
  async redirects() {
    /*
     * `/how-it-works` used to 308 to `/agents`: the path existed in the old
     * site map with no page behind it, and the agents page was the closest
     * thing. 16 §4 makes it a real route — Scan → Make → Post & prove, with
     * the first week's timeline — so the redirect is gone rather than
     * shadowing the page that now answers to that name.
     */
    /*
     * The policy documents moved under /legal (16 §4) and the old paths
     * keep working. Permanent, because they were linked from the footer for
     * weeks and someone may have one bookmarked — and a policy document is
     * exactly the kind of link people keep.
     */
    return [
      { source: '/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/terms', destination: '/legal/terms', permanent: true },
    ];
  },
};

export default nextConfig;
