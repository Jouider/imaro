/**
 * Visites — visitor management via single-use QR codes.
 *
 * Lite portal model: visitors don't install the app. They receive a public
 * link (`/v/:token`) with their QR code on it; the guardian at the lobby
 * scans the QR to check them in/out. Each QR has a single visit lifecycle:
 * one check-in + one check-out, then expires.
 *
 * Backend Abdellah (futur) — see docs/feature-visites-backend-brief.md.
 * Until the endpoints land, everything is mocked via `withMock`.
 */
import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  // Endpoints pending backend — skip the API call in dev so the UI renders
  // immediately from mock data. Remove this early-return once the routes
  // are deployed.
  if (import.meta.env.DEV) return mock
  try {
    return await call()
  } catch {
    return mock
  }
}

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
  /** Photo captured by gardien at check-in (data URL or remote URL). */
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
  reason?: string
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function isoOffset(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

const MOCK_VISITES: Visite[] = [
  {
    id: 1,
    residence_id: 1,
    qr_token: 'vst_abc123demo',
    visitor_name: 'Ahmed Ouazzani',
    visitor_phone: '+212600112233',
    type: 'visitor',
    purpose: 'Visite familiale',
    host_lot_id: 12,
    host_lot_numero: 'A-12',
    host_name: 'Hassan Benali',
    planned_at: isoOffset(2),
    arrived_at: null,
    left_at: null,
    status: 'planned',
    created_by_name: 'Hassan Benali',
    created_at: isoOffset(-1),
  },
  {
    id: 2,
    residence_id: 1,
    qr_token: 'vst_def456demo',
    visitor_name: 'Glovo — livreur',
    visitor_phone: '+212611223344',
    type: 'delivery',
    purpose: 'Livraison repas',
    host_lot_id: 8,
    host_lot_numero: 'B-04',
    host_name: 'Fatima Chraibi',
    planned_at: null,
    arrived_at: isoOffset(-0.5),
    left_at: null,
    status: 'arrived',
    created_by_name: 'Gardien lobby',
    created_at: isoOffset(-0.5),
  },
  {
    id: 3,
    residence_id: 1,
    qr_token: 'vst_ghi789demo',
    visitor_name: 'Cleanly Pro — équipe ménage',
    visitor_phone: '+212622334455',
    type: 'prestataire',
    purpose: 'Nettoyage parties communes (hebdo)',
    host_lot_id: null,
    host_lot_numero: null,
    host_name: 'Syndic',
    planned_at: isoOffset(-3),
    arrived_at: isoOffset(-3),
    left_at: isoOffset(-1),
    status: 'departed',
    is_recurring: true,
    recurrence: 'Mardi & vendredi · 9h-12h',
    created_by_name: 'Mouad Smac',
    created_at: isoOffset(-24),
  },
  {
    id: 4,
    residence_id: 1,
    qr_token: 'vst_jkl012demo',
    visitor_name: 'Yassine Berrada',
    visitor_phone: '+212633445566',
    type: 'visitor',
    purpose: 'Rendez-vous personnel',
    host_lot_id: 5,
    host_lot_numero: 'A-05',
    host_name: 'Salma El Idrissi',
    planned_at: isoOffset(-30),
    arrived_at: null,
    left_at: null,
    status: 'expired',
    created_by_name: 'Salma El Idrissi',
    created_at: isoOffset(-48),
  },
  {
    id: 5,
    residence_id: 1,
    qr_token: 'vst_mno345demo',
    visitor_name: 'Réparation Otis',
    visitor_phone: '+212644556677',
    type: 'contractor',
    purpose: 'Maintenance ascenseur',
    host_lot_id: null,
    host_lot_numero: null,
    host_name: 'Syndic',
    planned_at: isoOffset(4),
    arrived_at: null,
    left_at: null,
    status: 'planned',
    created_by_name: 'Mouad Smac',
    created_at: isoOffset(-2),
  },
]

const MOCK_STATS: VisitesStats = {
  today: 4,
  currently_inside: 1,
  planned: 2,
  expired_today: 1,
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getVisites(residenceId: number): Promise<Visite[]> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<Visite[]>>(
          `/gestionnaire/residences/${residenceId}/visites`,
        )
      ).data.data,
    MOCK_VISITES,
  )
}

export async function getVisitesStats(
  residenceId: number,
): Promise<VisitesStats> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<VisitesStats>>(
          `/gestionnaire/residences/${residenceId}/visites/stats`,
        )
      ).data.data,
    MOCK_STATS,
  )
}

export async function createVisite(input: CreateVisiteInput): Promise<Visite> {
  return withMock(
    async () =>
      (
        await api.post<ApiEnvelope<Visite>>(
          `/gestionnaire/residences/${input.residence_id}/visites`,
          input,
        )
      ).data.data,
    {
      id: Math.floor(Math.random() * 10_000) + 100,
      residence_id: input.residence_id,
      qr_token: `vst_${Math.random().toString(36).slice(2, 14)}`,
      visitor_name: input.visitor_name,
      visitor_phone: input.visitor_phone,
      type: input.type,
      purpose: input.purpose ?? null,
      host_lot_id: input.host_lot_id ?? null,
      host_lot_numero: null,
      host_name: null,
      planned_at: input.planned_at ?? null,
      arrived_at: null,
      left_at: null,
      status: 'planned',
      created_by_name: 'Mouad Smac',
      created_at: new Date().toISOString(),
    },
  )
}

export async function cancelVisite(id: number): Promise<Visite> {
  return withMock(
    async () =>
      (
        await api.post<ApiEnvelope<Visite>>(
          `/gestionnaire/visites/${id}/cancel`,
        )
      ).data.data,
    {
      ...MOCK_VISITES[0],
      id,
      status: 'cancelled',
    },
  )
}

/** Manual override scan-in (gardien flow embedded in gestionnaire page). */
export async function scanVisite(token: string): Promise<ScanResult> {
  return withMock(
    async () =>
      (await api.post<ApiEnvelope<ScanResult>>(`/visites/scan`, { token })).data
        .data,
    {
      visit: {
        ...MOCK_VISITES[0],
        status: 'arrived',
        arrived_at: new Date().toISOString(),
      },
      action: 'check_in',
    },
  )
}

/**
 * Walk-in flow — gardien at the lobby records a visitor on the spot.
 * Creates the visit AND immediately marks it as arrived in one round-trip.
 */
export async function walkInVisite(input: CreateVisiteInput): Promise<Visite> {
  return withMock(
    async () =>
      (await api.post<ApiEnvelope<Visite>>(`/visites/walk-in`, input)).data
        .data,
    {
      id: Math.floor(Math.random() * 10_000) + 200,
      residence_id: input.residence_id,
      qr_token: `vst_${Math.random().toString(36).slice(2, 14)}`,
      visitor_name: input.visitor_name,
      visitor_phone: input.visitor_phone,
      type: input.type,
      purpose: input.purpose ?? null,
      host_lot_id: input.host_lot_id ?? null,
      host_lot_numero: null,
      host_name: null,
      planned_at: null,
      arrived_at: new Date().toISOString(),
      left_at: null,
      status: 'arrived',
      created_by_name: 'Gardien lobby',
      created_at: new Date().toISOString(),
    },
  )
}

/**
 * Visits invited by the currently-authenticated resident. Backend reads the
 * user from the token (no userId arg). Returns recent first.
 */
export async function getMyVisites(): Promise<Visite[]> {
  return withMock(
    async () =>
      (await api.get<ApiEnvelope<Visite[]>>(`/portail/visites`)).data.data,
    // Resident dev fallback: a couple of MOCK_VISITES they'd "own"
    MOCK_VISITES.slice(0, 3),
  )
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
  return withMock(
    async () =>
      (await api.post<ApiEnvelope<Visite>>(`/portail/visites`, input)).data
        .data,
    {
      id: Math.floor(Math.random() * 10_000) + 300,
      residence_id: 1,
      qr_token: `vst_${Math.random().toString(36).slice(2, 14)}`,
      visitor_name: input.visitor_name,
      visitor_phone: input.visitor_phone,
      type: input.type,
      purpose: input.purpose ?? null,
      host_lot_id: 1,
      host_lot_numero: 'A-12',
      host_name: 'Vous',
      planned_at: input.planned_at ?? null,
      arrived_at: null,
      left_at: null,
      status: 'planned',
      created_by_name: 'Vous',
      created_at: new Date().toISOString(),
    },
  )
}

/** Currently-inside list (visits with status='arrived'). Used by gardien home. */
export async function getActiveVisites(): Promise<Visite[]> {
  return withMock(
    async () =>
      (await api.get<ApiEnvelope<Visite[]>>(`/gardien/visites/active`)).data
        .data,
    MOCK_VISITES.filter((v) => v.status === 'arrived'),
  )
}

/**
 * Wallet pass URLs. Backend signs an Apple `.pkpass` and generates a Google
 * Wallet JWT URL; frontend just opens them. Token is the visit's qr_token.
 */
export async function getWalletLinks(token: string): Promise<WalletLinks> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<WalletLinks>>(
          `/public/visites/${token}/wallet`,
        )
      ).data.data,
    {
      apple_url: `${window.location.origin}/api/public/visites/${token}/apple.pkpass`,
      google_url: `https://pay.google.com/gp/v/save/${token}-mock-jwt`,
    },
  )
}

/**
 * Upload a visitor photo captured by the gardien at check-in. Accepts a base64
 * data URL; backend stores and returns the public URL on the visit object.
 */
export async function uploadVisitePhoto(
  visiteId: number,
  photoDataUrl: string,
): Promise<Visite> {
  return withMock(
    async () =>
      (
        await api.post<ApiEnvelope<Visite>>(`/visites/${visiteId}/photo`, {
          photo: photoDataUrl,
        })
      ).data.data,
    { ...MOCK_VISITES[0], id: visiteId, photo_url: photoDataUrl },
  )
}

/** Public lookup by token — used by /v/:token visitor pass page. No auth. */
export async function getVisitePublic(token: string): Promise<Visite | null> {
  return withMock(
    async () =>
      (await api.get<ApiEnvelope<Visite>>(`/public/visites/${token}`)).data
        .data,
    MOCK_VISITES.find((v) => v.qr_token === token) ?? MOCK_VISITES[0],
  )
}
