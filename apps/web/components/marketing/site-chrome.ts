/**
 * Measurements shared between the public site's chrome and its layout.
 *
 * This module exists because of a specific App Router trap, and the comment
 * is the point of the file.
 *
 * `SiteHeader` is a `'use client'` module. When a *server* component imports
 * a value from one, Next.js does not give it the value — it gives back a
 * stub that throws "Attempted to call X from the server but X is on the
 * client". For a function that is a loud runtime error. For a constant
 * interpolated into a style attribute it is silent: the stub stringifies and
 * the browser discards the declaration as invalid.
 *
 * That is exactly what happened here. `HEADER_HEIGHT_PX` started life in
 * `site-header.tsx`, the layout read it for its `padding-top`, and the page
 * rendered with `padding-top: function() { throw ... }px`. The fixed header
 * then covered the top 120px of the hero. `pnpm lint`, `pnpm typecheck` and
 * `pnpm build` all passed — the types are correct, only the runtime value is
 * not — and it took reading the rendered style attribute to see it.
 *
 * So: anything both a server and a client component need lives in a module
 * with no `'use client'` directive, like this one.
 */

/**
 * The fixed header's height: a 40px announcement bar plus an 80px nav row.
 *
 * The header is `fixed` rather than `sticky` because the handoff keeps the
 * announcement visible instead of letting it scroll away, which takes it out
 * of flow — so the layout has to reserve this space or the first section
 * renders underneath it.
 *
 * Changing the header's height means changing this. It cannot be measured at
 * build time, and measuring it at runtime would shift the page after paint.
 */
export const HEADER_HEIGHT_PX = 120
