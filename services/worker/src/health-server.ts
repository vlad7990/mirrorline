/**
 * `GET /healthz` — the same verdict, over HTTP, for Railway's deploy gate.
 *
 * ============================================================================
 * What this closes, and what it does not
 * ============================================================================
 *
 * Railway runs a healthcheck **only while deploying**. Its documentation says
 * so plainly: "Railway does not monitor the healthcheck endpoint after the
 * deployment has gone live." So this is not a monitor, and reading it as one
 * would be the comfortable mistake.
 *
 * What it *is* is the gate on the most dangerous moment in this system. D114
 * lets me merge my own green pull requests; D125 made every merge to `main` a
 * worker deploy as well as a site deploy. That means **a merge of mine replaces
 * the process holding the production service-role key**, with no build step
 * between the two — `tsx` runs the TypeScript directly, so a type error reaches
 * the running container. Pointing Railway's healthcheck here means a container
 * that cannot boot, cannot read its credentials, or cannot write to Supabase
 * **never replaces the working one**: the deploy is marked failed and the old
 * worker keeps draining the queue.
 *
 * The half this cannot do — noticing a worker that dies at 3pm on a Tuesday —
 * is what `worker_heartbeats` and `/api/health/worker` are for.
 *
 * ============================================================================
 * It cannot report healthy before it has written a row
 * ============================================================================
 *
 * `pulse()` is null until one heartbeat has been accepted by Supabase, and a
 * null pulse is `absent`, which answers 503. That is deliberate: the deploy
 * should wait for proof that this container can reach the database, not merely
 * for proof that Node started.
 */

import { createServer, type Server } from 'node:http'

import { workerLiveness, type WorkerPulse } from '../../../apps/web/lib/jobs/liveness'

/**
 * Railway injects `PORT`. 8080 is the local default, and binding it on a laptop
 * is harmless — nothing else in this repo listens there.
 */
const DEFAULT_PORT = 8080

/** The paths that answer. Everything else is a 404 with no detail. */
const HEALTH_PATHS: readonly string[] = ['/healthz', '/health', '/']

function port(env: NodeJS.ProcessEnv): number {
  const parsed = Number.parseInt(env.PORT ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT
}

/**
 * The body, which carries counts, seconds, timestamps and our own names.
 *
 * Never a job id, a workspace id, an error message or a URL. This endpoint may
 * be reachable by anyone who can reach the container, so it is held to the rule
 * `apps/web/app/api/health/supabase/route.ts` wrote down: a health surface
 * reports "variable names, status codes and row counts".
 */
export function healthBody(
  pulse: WorkerPulse | null,
  nowMs: number,
): { readonly status: number; readonly json: string } {
  const liveness = workerLiveness(pulse, nowMs)

  const json = JSON.stringify({
    ok: liveness.ok,
    state: liveness.state,
    detail: liveness.detail,
    secondsSinceSeen: liveness.secondsSinceSeen,
    jobSeconds: liveness.jobSeconds,
    worker:
      pulse === null
        ? null
        : {
            id: pulse.id,
            kinds: pulse.kinds,
            bootedAt: pulse.bootedAt,
            revision: pulse.revision,
            jobKind: pulse.jobKind,
            jobsFinished: pulse.jobsFinished,
            claimFailures: pulse.claimFailures,
          },
  })

  return { status: liveness.ok ? 200 : 503, json }
}

export function createHealthServer(pulse: () => WorkerPulse | null): Server {
  return createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0] ?? '/'

    if (request.method !== 'GET' || !HEALTH_PATHS.includes(path)) {
      response.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"Not found"}')
      return
    }

    const { status, json } = healthBody(pulse(), Date.now())

    response
      .writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      .end(json)
  })
}

/**
 * Start listening, and **never let a bind failure stop the worker**.
 *
 * The worker's job is draining the queue; serving a status page is not. A port
 * already in use is logged loudly and otherwise ignored, which leaves the
 * conservative outcome in place: Railway's healthcheck fails, the deploy is
 * marked failed, and the worker that was already working keeps working.
 */
export function startHealthServer(
  pulse: () => WorkerPulse | null,
  env: NodeJS.ProcessEnv = process.env,
): Server {
  const server = createHealthServer(pulse)
  const chosen = port(env)

  server.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : 'unknown listen failure'
    console.error(`[worker] health endpoint could not listen on ${chosen}: ${message}`)
  })

  server.listen(chosen, () => {
    console.log(`[worker] health endpoint on ${chosen}/healthz`)
  })

  return server
}
