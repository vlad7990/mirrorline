/**
 * Where an object lives, derived rather than accepted (V5, slice 1).
 *
 * ============================================================================
 * Every path here is built from ids we generated
 * ============================================================================
 *
 * `lib/engine/jobs.ts` already made this call for the local engine — "paths are
 * rebuilt from a validated id, never joined from input" — and the reason is
 * stronger once the destination is shared storage rather than a laptop's
 * `.data/`. A path that incorporated the uploaded filename would let the
 * uploader choose where their bytes land, and `..` is a filename.
 *
 * So the only thing taken from the client is the **extension**, from a fixed
 * list, and even that is a convenience: ffprobe reads the container, not the
 * suffix.
 *
 * The workspace id leads, because that makes "everything belonging to this
 * workspace" a prefix — which is how a storage policy would be written the day
 * one is needed, and how deleting a workspace's footage stays one call.
 */

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/webm': 'webm',
  'video/mpeg': 'mpg',
}

/** The mime types the `client-footage` bucket accepts, as one list. */
export const ACCEPTED_SOURCE_MIMES: readonly string[] = Object.keys(EXTENSION_BY_MIME)

/**
 * The extension to store this upload under.
 *
 * Null when the mime type is not one we accept — the caller refuses, and the
 * refusal happens before a token is minted rather than after 4 GB has moved.
 * The bucket's own `allowed_mime_types` says the same thing a second time, in
 * the one place a tampered client cannot reach.
 */
export function sourceExtensionFor(mime: string): string | null {
  return EXTENSION_BY_MIME[mime] ?? null
}

/** `<workspace_id>/<asset_id>/source.<ext>` in `client-footage`. */
export function sourceObjectPath(
  workspaceId: string,
  assetId: string,
  extension: string,
): string {
  return `${workspaceId}/${assetId}/source.${extension}`
}

/** `<workspace_id>/<render_id>/short.mp4` in `renders`. */
export function renderObjectPath(workspaceId: string, renderId: string): string {
  return `${workspaceId}/${renderId}/short.mp4`
}

/** `<workspace_id>/<render_id>/poster.jpg` in `renders`. */
export function posterObjectPath(workspaceId: string, renderId: string): string {
  return `${workspaceId}/${renderId}/poster.jpg`
}

/**
 * How long a playback URL lives: ten minutes.
 *
 * Long enough to watch a 45-second video twice and to survive a slow page, and
 * short enough that a URL copied out of devtools and pasted into a group chat
 * has stopped working before anybody opens it. The studio re-signs on every
 * render of the card, which costs nothing.
 */
export const PLAYBACK_URL_TTL_SECONDS = 10 * 60

/**
 * An upload token's lifetime is **Supabase's, not ours** — and that has a
 * consequence the UI has to carry.
 *
 * `createSignedUploadUrl(path, { upsert })` takes no `expiresIn`; the only
 * option it accepts is `upsert`. So there is no number to put here, and
 * pretending otherwise with a constant nothing reads would be worse than the
 * absence.
 *
 * What follows from it: a 4 GB upload on a domestic connection is measured in
 * hours, and §V5 wants one that "survives an interrupted and resumed
 * connection". A long enough pause can therefore outlive the token. The upload
 * component treats an expired token as an ordinary event — ask the action for a
 * new one for the same object path and let TUS resume from the offset the
 * server already holds — rather than as a failed upload.
 */
export const UPLOAD_TOKEN_IS_SUPABASES_TO_EXPIRE = true
