import 'server-only'

/**
 * What the studio shows: the approved ideas, the last upload, the shorts
 * (V5, slice 1).
 *
 * ============================================================================
 * Two clients, and the split is the security model
 * ============================================================================
 *
 * Rows are read with the **member's own client**, so row-level security decides
 * what they can see — `renders_select_members`, `video_assets_select_members`
 * and the draft policies next door. Nothing here passes a workspace id into a
 * query as though that were an authorisation check.
 *
 * URLs are signed with the **service client**, because the buckets have no
 * `storage.objects` policy at all (deliberately — see the migration). Signing
 * is therefore a privileged act, and it happens only for rows the member has
 * already been handed by their own grants. A caller who can see the row can
 * watch the video; a caller who cannot see the row never reaches the signing
 * call.
 *
 * ============================================================================
 * A URL that could not be signed is null, and the card says so
 * ============================================================================
 *
 * Not an exception, and not an empty string. A `ready` render whose URL failed
 * to sign is a real state — Storage having a bad minute — and a player pointed
 * at nothing is worse than a line of text explaining it.
 */

import { createAgentServiceClient } from '../agents/service-client'
import { createSupabaseServerClient } from '../supabase/server-client'

import { PLAYBACK_URL_TTL_SECONDS } from './paths'
import { parseSegments } from './segment'
import {
  parseAssetStatus,
  parseCompliance,
  parseRenderStatus,
  RENDERS_BUCKET,
  type RenderSummary,
  type VideoAssetSummary,
} from './types'

const RENDER_COLUMNS =
  'id, title, status, cut_index, asset_id, draft_id, duration_s, segments, ai_label, compliance, approved_at, created_at, error, storage_path, poster_path'

const ASSET_COLUMNS =
  'id, original_name, status, bytes, duration_s, has_audio, rights_holder, created_at, error'

/** An approved idea the client can point a camera at — the render's script. */
export interface ApprovedIdea {
  readonly draftId: string
  readonly title: string
}

const asText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const asNumber = (value: unknown): number | null => {
  // `numeric` comes back from PostgREST as a string, which is correct of it and
  // surprising here: `duration_s` would otherwise render as "12.5" and compare
  // as a string.
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/**
 * Sign one object, or null.
 *
 * Errors are logged and swallowed *here* rather than thrown, because the caller
 * is rendering a list: one unsignable poster must not blank the other three
 * cards.
 */
async function sign(path: string | null): Promise<string | null> {
  if (path === null || path.trim() === '') return null

  const supabase = createAgentServiceClient()
  const signed = await supabase.storage
    .from(RENDERS_BUCKET)
    .createSignedUrl(path, PLAYBACK_URL_TTL_SECONDS)

  if (signed.error !== null) {
    console.error(`[video] could not sign ${path}: ${signed.error.message}`)
    return null
  }

  return signed.data?.signedUrl ?? null
}

async function toRender(row: Record<string, unknown>): Promise<RenderSummary | null> {
  const id = asText(row.id)
  const status = parseRenderStatus(row.status)
  const assetId = asText(row.asset_id)
  if (id === null || status === null || assetId === null) return null

  const [playbackUrl, posterUrl] =
    status === 'ready'
      ? await Promise.all([sign(asText(row.storage_path)), sign(asText(row.poster_path))])
      : [null, null]

  return {
    id,
    title: asText(row.title) ?? 'Untitled',
    status,
    cutIndex: typeof row.cut_index === 'number' ? row.cut_index : 0,
    assetId,
    draftId: asText(row.draft_id),
    durationS: asNumber(row.duration_s),
    segments: parseSegments(row.segments),
    aiLabel: asText(row.ai_label),
    compliance: parseCompliance(row.compliance),
    approvedAt: asText(row.approved_at),
    createdAt: asText(row.created_at) ?? '',
    error: asText(row.error),
    playbackUrl,
    posterUrl,
  }
}

/** This workspace's shorts, newest first. */
export async function readRenders(limit = 12): Promise<readonly RenderSummary[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('renders')
    .select(RENDER_COLUMNS)
    .order('created_at', { ascending: false })
    .order('cut_index', { ascending: true })
    .limit(limit)

  if (error !== null) {
    console.error(`[video] could not read renders: ${error.code ?? 'unknown'}`)
    return []
  }

  const parsed = await Promise.all(
    (data ?? []).map((row) => toRender(row as Record<string, unknown>)),
  )

  return parsed.filter((render): render is RenderSummary => render !== null)
}

/**
 * The ideas this client has approved, newest first.
 *
 * `status = 'approved'` is the whole filter, and it is doing V3's work: an
 * unapproved idea is not a script we may spend CPU on, and the list the screen
 * offers is therefore the list of things that can legitimately be rendered.
 */
export async function readApprovedIdeas(limit = 10): Promise<readonly ApprovedIdea[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('drafts')
    .select('id, title')
    .eq('kind', 'video-idea')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(limit)

  if (error !== null) {
    console.error(`[video] could not read approved ideas: ${error.code ?? 'unknown'}`)
    return []
  }

  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>
    const draftId = asText(record.id)
    const title = asText(record.title)
    return draftId === null || title === null ? [] : [{ draftId, title }]
  })
}

/** The most recent upload, so the screen can say what it is working from. */
export async function readLatestAsset(): Promise<VideoAssetSummary | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('video_assets')
    .select(ASSET_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error !== null || data === null) {
    if (error !== null) {
      console.error(`[video] could not read the latest upload: ${error.code ?? 'unknown'}`)
    }
    return null
  }

  const row = data as Record<string, unknown>
  const id = asText(row.id)
  const status = parseAssetStatus(row.status)
  if (id === null || status === null) return null

  return {
    id,
    originalName: asText(row.original_name) ?? 'your upload',
    status,
    bytes: asNumber(row.bytes),
    durationS: asNumber(row.duration_s),
    hasAudio: typeof row.has_audio === 'boolean' ? row.has_audio : null,
    rightsHolder: asText(row.rights_holder) ?? '',
    createdAt: asText(row.created_at) ?? '',
    error: asText(row.error),
  }
}
