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
  /**
   * Where the build lands. `.next` unless `NEXT_DIST_DIR` says otherwise, and
   * the end-to-end suite says otherwise (D111).
   *
   * **This exists because two builds once shared one directory.** Playwright's
   * `webServer` runs `next build && next start` itself, so a developer running
   * `pnpm build` while the suite is running had two `next build` processes
   * writing the same files. The result is not a crash: it is a half-written
   * minified chunk whose export is `undefined` at the call site, reported as
   * `TypeError: (0 , x.CH) is not a function` with a symbol name that matches
   * nothing in the source. It reads exactly like a product bug.
   *
   * It is also **invisible to `git checkout`**, because `.next` is gitignored.
   * That is what made it expensive: the obvious check — reproduce it on
   * `main` — reuses the same corrupted artifacts and "confirms" the fault is
   * pre-existing. A false bug report came out of that.
   *
   * So the suite builds somewhere else, and the collision stops being possible
   * rather than being discouraged by a comment nobody reads mid-debug.
   */
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // The reference screenshots in docs/screens-built/ are taken against the dev
  // server, and Next's floating dev-tools badge sits over the UI in every one
  // of them — over the sidebar usage meter at 1440px and over a section
  // heading at 390px. Nothing in this repo needs the badge.
  devIndicators: false,
  /**
   * One stylesheet instead of two, which is the point that got `/product` to
   * Lighthouse 90 (D66).
   *
   * Next's default splits this app's CSS into a 20 KB file and an 874-byte
   * one. Both are render-blocking and they are **serialised**, so the second
   * cost 153 ms to deliver 874 bytes — almost entirely round trip. Lighthouse
   * named it outright: the critical dependency chain on `/product` is
   * `document → css → css`, with no font or image in it. That is also why the
   * `fetchpriority="high"` the LCP audit asks for measured as nothing and was
   * dropped — the image was never bandwidth-starved; the page simply could
   * not paint until both stylesheets had landed.
   *
   * Merging them moved `/product` 89 → 90, `/how-it-works` 89 → 90 and
   * `/pricing` 89 → 90, medians of three. A uniform point on three pages is
   * what a real fix looks like; every page had the same two-file shape.
   *
   * **The risk this carries is order, not size.** One file means the bundler
   * concatenates rather than letting the browser apply two in sequence, so a
   * rule that relied on the old ordering would lose. The trip-wire is already
   * in the suite: the screenshots project captures every screen at two widths
   * in both themes, and axe runs over all of them. A silent reorder is
   * exactly the kind of thing those catch and assertions do not.
   */
  experimental: { cssChunking: false },
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
