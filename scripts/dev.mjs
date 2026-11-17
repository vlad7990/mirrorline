#!/usr/bin/env node
/**
 * The dev server, with the spending door shut unless you open it.
 *
 * `pnpm dev` runs sample mode. `pnpm dev:live` is the explicit opt-in and
 * says so on the way up.
 *
 * ## Why a launcher rather than an inline environment variable
 *
 * `MIRRORLINE_COPILOT_SAMPLE=1 next dev` would have been one line, and it
 * fails on Windows `cmd` — the kind of breakage that is nobody's bug until it
 * is somebody's morning. A launcher is portable, needs no dependency, and
 * buys the thing that actually matters:
 *
 * **It prints which mode it is in before the server starts.** The hole this
 * closes was not that `pnpm dev` could spend; it was that it could spend
 * *without anyone knowing*, and a flag nobody sees is the same hole with a
 * longer name. The line below is the fix. The environment variable is only
 * how it is carried.
 *
 * ## What it cannot do
 *
 * It cannot unset `ANTHROPIC_API_KEY`. Next loads `.env.local` itself, after
 * this process has handed over, so a key deleted here is a key restored a
 * moment later. The flag works because `copilotMode()` honours it — see
 * `apps/web/lib/copilot/adapter.ts`, which is where the decision is made and
 * where the reasoning lives.
 */

import { spawn } from 'node:child_process'

/** Must match `SAMPLE_FLAG` in `apps/web/lib/copilot/adapter.ts`. */
const SAMPLE_FLAG = 'MIRRORLINE_COPILOT_SAMPLE'

const isLive = process.argv.includes('--live')
const passThrough = process.argv.slice(2).filter((argument) => argument !== '--live')

process.stderr.write(
  isLive
    ? '\n  co-pilot: LIVE. Asking it anything calls the real model and costs money.\n' +
        '  Run `pnpm dev` instead for sample answers.\n\n'
    : '\n  co-pilot: sample. The key in .env.local is ignored and nothing can spend.\n' +
        '  Run `pnpm dev:live` if you mean to call the real model.\n\n',
)

const child = spawn('pnpm', ['--filter', '@mirrorline/web', 'dev', ...passThrough], {
  stdio: 'inherit',
  // `--live` simply does not set the flag. There is no "force live" value,
  // because a second way of saying the same thing is a second thing to get
  // wrong — live is the absence of the pin, exactly as it is on Vercel.
  env: isLive ? process.env : { ...process.env, [SAMPLE_FLAG]: '1' },
})

child.on('exit', (code, signal) => {
  // Pass the child's fate through, so Ctrl-C and a crash both read correctly
  // to whatever ran this.
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
