/**
 * Visites — visitor management via single-use QR codes.
 *
 * Lite portal model: visitors don't install the app. They receive a public
 * link (`/v/:token`) with their QR code on it; the guardian (role `personnel`)
 * at the lobby scans the QR to check them in/out. Each QR has a single visit
 * lifecycle: one check-in + one check-out, then expires.
 *
 * Backend realigned on `docs/feature-visites-backend-brief.md` (KAN-102,
 * PR #288). Contract: `docs/api.md` § « Visites — laissez-passer QR ». All
 * routes are live, so we call them directly (no mocks).
 */
import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Types ─────────────────────────────────────────────────────────────────

export type VisiteType = 'visitor' | 'delivery' | 'contractor' | 'prestataire'

export type VisiteStatus =
  | 'planned'
  | 'arrived'
  | 'departed'
  | 'expired'
  | 'cancelled'

export type Visite = {
  id: number
  residence_id: number
  /** Token used in the public /v/:token URL (also encoded in the QR). */
  qr_token: string
  visitor_name: string
  visitor_phone: string
  type: VisiteType
  purpose?: string | null
  /** Lot whose resident hosts the visit (nullable for ad-hoc/walk-in). */
  host_lot_id?: number | null
  host_lot_numero?: string | null
  host_name?: string | null
  /** Planned arrival time (ISO) — null for walk-ins. */
  planned_at?: string | null
  arrived_at?: string | null
  left_at?: string | null
  status: VisiteStatus
  /**
   * Photo captured by gardien at check-in. In the schema but the upload
   * (`POST /visites/{id}/photo`) is not wired in MVP — stays null.
   */
  photo_url?: string | null
  /**
   * Recurring prestataire pass: when true the QR can be re-used across
   * multiple visits (cleaning company that comes every week). `recurrence`
   * holds a human-readable schedule for display.
   */
  is_recurring?: boolean
  recurrence?: string | null
  created_by_name: string
  created_at: string
}

export type CreateVisiteInput = {
  residence_id: number
  visitor_name: string
  visitor_phone: string
  type: VisiteType
  purpose?: string
  host_lot_id?: number
  planned_at?: string
  /** Recurring prestataire pass — long-lived QR. */
  is_recurring?: boolean
  /** Human-readable schedule (e.g. "Mardi 9h-12h chaque semaine"). */
  recurrence?: string
}

export type WalletLinks = {
  apple_url: string
  google_url: string
}

export type VisitesStats = {
  today: number
  currently_inside: number
  planned: number
  expired_today: number
}

export type ScanResult = {
  visit: Visite
  /** What just happened on this scan. */
  action: 'check_in' | 'check_out' | 'rejected'
  /** Reason code when rejected: too_early | expired | cancelled | already_departed. */
  reason?: string | null
}

// ─── Gestionnaire API ────────────────────────────────────────────────────────

export async function getVisites(residenceId: number): Promise<Visite[]> {
  const res = await api.get<ApiEnvelope<Visite[]>>(
    `/gestionnaire/residences/${residenceId}/visites`,
  )
  return res.data.data
}

export async function getVisitesStats(
  residenceId: number,
): Promise<VisitesStats> {
  const res = await api.get<ApiEnvelope<VisitesStats>>(
    `/gestionnaire/residences/${residenceId}/visites/stats`,
  )
  return res.data.data
}

export async function createVisite(input: CreateVisiteInput): Promise<Visite> {
  const res = await api.post<ApiEnvelope<Visite>>(
    `/gestionnaire/residences/${input.residence_id}/visites`,
    input,
  )
  return res.data.data
}

export async function cancelVisite(id: number): Promise<Visite> {
  const res = await api.post<ApiEnvelope<Visite>>(
    `/gestionnaire/visites/${id}/cancel`,
  )
  return res.data.data
}

// ─── Gardien / personnel API ──────────────────────────────────────────────────

/**
 * Scan a visitor QR at the lobby. `token` may be the raw token or the full
 * `/v/:token` URL (caller strips it). Returns the visit + what happened.
 * `404` when the token is unknown (caller shows "introuvable"); business
 * refusals come back `200` with `action='rejected'` + a `reason`.
 */
export async function scanVisite(token: string): Promise<ScanResult> {
  const res = await api.post<ApiEnvelope<ScanResult>>(`/visites/scan`, {
    token,
  })
  return res.data.data
}

/**
 * Walk-in flow — gardien at the lobby records a visitor on the spot.
 * Creates the visit AND immediately marks it as arrived in one round-trip.
 */
export async function walkInVisite(input: CreateVisiteInput): Promise<Visite> {
  const res = await api.post<ApiEnvelope<Visite>>(`/visites/walk-in`, input)
  return res.data.data
}

/** Currently-inside list (status='arrived') for the gardien's residence(s). */
export async function getActiveVisites(): Promise<Visite[]> {
  const res = await api.get<ApiEnvelope<Visite[]>>(`/gardien/visites/active`)
  return res.data.data
}

// ─── Résident (portail) API ───────────────────────────────────────────────────

/**
 * Visits invited by the currently-authenticated resident. Backend reads the
 * user from the token (no userId arg). Returns recent first.
 */
export async function getMyVisites(): Promise<Visite[]> {
  const res = await api.get<ApiEnvelope<Visite[]>>(`/portail/visites`)
  return res.data.data
}

/**
 * Resident invites a visitor from the portal. Backend infers `residence_id`
 * and `host_lot_id` from the authenticated user.
 */
export async function createMyVisite(input: {
  visitor_name: string
  visitor_phone: string
  type: VisiteType
  purpose?: string
  planned_at?: string
}): Promise<Visite> {
  const res = await api.post<ApiEnvelope<Visite>>(`/portail/visites`, input)
  return res.data.data
}

// ─── Public / MVP-off endpoints ───────────────────────────────────────────────

/**
 * Wallet pass URLs (Apple `.pkpass` + Google Wallet JWT). Not implemented in
 * MVP — the backend returns 404, so this rejects and the pass page simply
 * hides the wallet buttons. Wired ahead of the backend landing it.
 */
export async function getWalletLinks(token: string): Promise<WalletLinks> {
  const res = await api.get<ApiEnvelope<WalletLinks>>(
    `/public/visites/${token}/wallet`,
  )
  return res.data.data
}

/**
 * Upload a visitor photo captured by the gardien at check-in. Not wired in
 * MVP (`POST /visites/{id}/photo` → 404); kept for when the endpoint lands.
 */
export async function uploadVisitePhoto(
  visiteId: number,
  photoDataUrl: string,
): Promise<Visite> {
  const res = await api.post<ApiEnvelope<Visite>>(
    `/visites/${visiteId}/photo`,
    { photo: photoDataUrl },
  )
  return res.data.data
}

/**
 * Public lookup by token — used by the `/v/:token` visitor pass page. No auth.
 * Returns `null` when the token is unknown / expired / cancelled (404) so the
 * page can render its "laissez-passer introuvable" state.
 */
export async function getVisitePublic(token: string): Promise<Visite | null> {
  try {
    const res = await api.get<ApiEnvelope<Visite>>(`/public/visites/${token}`)
    return res.data.data
  } catch {
    return null
  }
}
