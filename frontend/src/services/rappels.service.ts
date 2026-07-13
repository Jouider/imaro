/**
 * Rappels — automatic payment reminders.
 *
 * Multi-stage reminder engine (J-3 → overdue) over multiple channels
 * (push always-on + optional WhatsApp / Email / SMS), localized per resident.
 *
 * Backend Abdellah (futur) — see docs/feature-rappels-backend-brief.md.
 * Until the endpoints land, everything is mocked via `withMock`.
 */
import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  // Endpoints pending backend (Abdellah) — skip the API call in dev so the
  // page renders immediately from mock data rather than waiting for a 404.
  // Remove this early-return once the rappels routes are deployed.
  if (import.meta.env.DEV) return mock
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type ReminderStageId = 'j3' | 'j2' | 'j1' | 'jour_j' | 'retard'

export const REMINDER_STAGES: ReminderStageId[] = [
  'j3',
  'j2',
  'j1',
  'jour_j',
  'retard',
]

export type ReminderChannel = 'push' | 'whatsapp' | 'email' | 'sms'

/** Optional channels layered on top of the always-on push notification. */
export type ExtraChannel = 'whatsapp' | 'email' | 'sms'

export type ReminderDeliveryStatus = 'delivered' | 'failed' | 'pending' | 'sent'

export type StageConfig = {
  id: ReminderStageId
  enabled: boolean
  channels: Record<ExtraChannel, boolean>
  /** Residents currently sitting in this stage (i.e. eligible right now). */
  pending: number
}

export type RappelsConfig = {
  residence_id: number
  auto_enabled: boolean
  /** Next scheduled automatic run (ISO) or null when disabled. */
  next_run_at: string | null
  /** Daily limit on MANUAL sends (automatic sends are unlimited). */
  daily_limit: number
  /** Manual sends already used today. */
  used_today: number
  /** Max consecutive overdue reminder days before stopping. */
  max_overdue_days: number
  /** Hour of day (0-23) automatic reminders fire. */
  run_hour: number
  stages: StageConfig[]
  /** ISO 639-1 codes the engine can localize into. */
  languages: string[]
}

export type RappelsStats = {
  /** Delivery success rate in % (null until enough volume). */
  delivery_rate: number | null
  delivered: number
  failed: number
  sent_this_month: number
}

export type RecentRappel = {
  id: number
  date: string
  resident_name: string
  stage: ReminderStageId
  channel: ReminderChannel
  status: ReminderDeliveryStatus
  trigger: 'auto' | 'manual'
}

/** Channel message templates — placeholders use single braces ({name}…). */
export type ChannelTemplates = {
  push: { title: string; body: string }
  whatsapp: { body: string }
  email: { subject: string; body: string }
  sms: { body: string }
}

export type SendResult = { queued: number }

// ─── Mocks ───────────────────────────────────────────────────────────────────

const MOCK_CONFIG = (residenceId: number): RappelsConfig => {
  const tomorrow9 = new Date()
  tomorrow9.setDate(tomorrow9.getDate() + 1)
  tomorrow9.setHours(9, 0, 0, 0)
  return {
    residence_id: residenceId,
    auto_enabled: true,
    next_run_at: tomorrow9.toISOString(),
    daily_limit: 3,
    used_today: 0,
    max_overdue_days: 7,
    run_hour: 9,
    stages: [
      { id: 'j3', enabled: true, channels: whatsappEmail(), pending: 4 },
      { id: 'j2', enabled: true, channels: emailOnly(), pending: 2 },
      { id: 'j1', enabled: true, channels: whatsappEmail(), pending: 1 },
      { id: 'jour_j', enabled: true, channels: whatsappOnly(), pending: 3 },
      { id: 'retard', enabled: false, channels: noExtras(), pending: 6 },
    ],
    languages: ['fr', 'ar', 'en', 'es', 'nl'],
  }
}

const noExtras = (): Record<ExtraChannel, boolean> => ({
  whatsapp: false,
  email: false,
  sms: false,
})
const whatsappEmail = (): Record<ExtraChannel, boolean> => ({
  whatsapp: true,
  email: true,
  sms: false,
})
const whatsappOnly = (): Record<ExtraChannel, boolean> => ({
  whatsapp: true,
  email: false,
  sms: false,
})
const emailOnly = (): Record<ExtraChannel, boolean> => ({
  whatsapp: false,
  email: true,
  sms: false,
})

const MOCK_STATS: RappelsStats = {
  delivery_rate: 96.4,
  delivered: 134,
  failed: 5,
  sent_this_month: 139,
}

const MOCK_RECENT: RecentRappel[] = [
  {
    id: 1,
    date: daysAgo(0),
    resident_name: 'Yassine Berrada',
    stage: 'jour_j',
    channel: 'email',
    status: 'delivered',
    trigger: 'auto',
  },
  {
    id: 2,
    date: daysAgo(0),
    resident_name: 'Salma El Idrissi',
    stage: 'j1',
    channel: 'push',
    status: 'delivered',
    trigger: 'auto',
  },
  {
    id: 3,
    date: daysAgo(1),
    resident_name: 'Omar Tazi',
    stage: 'retard',
    channel: 'email',
    status: 'failed',
    trigger: 'auto',
  },
  {
    id: 4,
    date: daysAgo(1),
    resident_name: 'Nadia Cherkaoui',
    stage: 'j3',
    channel: 'push',
    status: 'delivered',
    trigger: 'manual',
  },
  {
    id: 5,
    date: daysAgo(2),
    resident_name: 'Karim Benjelloun',
    stage: 'jour_j',
    channel: 'push',
    status: 'delivered',
    trigger: 'auto',
  },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getRappelsConfig(
  residenceId: number,
): Promise<RappelsConfig> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<RappelsConfig>>(
          `/gestionnaire/residences/${residenceId}/rappels/config`,
        )
      ).data.data,
    MOCK_CONFIG(residenceId),
  )
}

export async function updateRappelsConfig(
  residenceId: number,
  patch: Partial<
    Pick<
      RappelsConfig,
      'auto_enabled' | 'daily_limit' | 'max_overdue_days' | 'stages'
    >
  >,
): Promise<RappelsConfig> {
  return withMock(
    async () =>
      (
        await api.patch<ApiEnvelope<RappelsConfig>>(
          `/gestionnaire/residences/${residenceId}/rappels/config`,
          patch,
        )
      ).data.data,
    { ...MOCK_CONFIG(residenceId), ...patch } as RappelsConfig,
  )
}

export async function getRappelsStats(
  residenceId: number,
): Promise<RappelsStats> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<RappelsStats>>(
          `/gestionnaire/residences/${residenceId}/rappels/stats`,
        )
      ).data.data,
    MOCK_STATS,
  )
}

export async function getRecentRappels(
  residenceId: number,
): Promise<RecentRappel[]> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<RecentRappel[]>>(
          `/gestionnaire/residences/${residenceId}/rappels/recent`,
        )
      ).data.data,
    MOCK_RECENT,
  )
}

export async function getRappelsTemplates(
  residenceId: number,
): Promise<ChannelTemplates> {
  return withMock(
    async () =>
      (
        await api.get<ApiEnvelope<ChannelTemplates>>(
          `/gestionnaire/residences/${residenceId}/rappels/templates`,
        )
      ).data.data,
    {
      push: {
        title: 'Rappel de paiement',
        body: 'Bonjour {name}, votre cotisation de {amount} est due le {date}.',
      },
      whatsapp: {
        body: 'Bonjour {name}, rappel : votre paiement de {amount} est dû le {date}. Merci de régler votre compte.',
      },
      email: {
        subject: 'Rappel de paiement — {building}',
        body: 'Bonjour {name},\n\nCeci est un rappel concernant votre cotisation de {amount}, due le {date}.',
      },
      sms: {
        body: 'Imaro : votre paiement de {amount} est dû le {date}. Merci.',
      },
    },
  )
}

/** Manually trigger one stage now. Returns how many residents were queued. */
export async function sendStageNow(
  residenceId: number,
  stage: ReminderStageId,
): Promise<SendResult> {
  return withMock(
    async () =>
      (
        await api.post<ApiEnvelope<SendResult>>(
          `/gestionnaire/residences/${residenceId}/rappels/send`,
          { stage },
        )
      ).data.data,
    {
      queued:
        MOCK_CONFIG(residenceId).stages.find((s) => s.id === stage)?.pending ??
        0,
    },
  )
}

/** Fire every enabled stage immediately ("Tout envoyer maintenant"). */
export async function sendAllNow(residenceId: number): Promise<SendResult> {
  return withMock(
    async () =>
      (
        await api.post<ApiEnvelope<SendResult>>(
          `/gestionnaire/residences/${residenceId}/rappels/send-all`,
          {},
        )
      ).data.data,
    {
      queued: MOCK_CONFIG(residenceId)
        .stages.filter((s) => s.enabled)
        .reduce((sum, s) => sum + s.pending, 0),
    },
  )
}
