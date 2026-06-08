/**
 * Assistance recouvrement — paid legal-collection assistance service.
 *
 * This is the *upsell* path (distinct from the in-app `/recouvrement` tool):
 * volunteer syndics and new management companies without dedicated staff can
 * delegate the whole collection chain — from appels de fonds to court action
 * under loi 18-00 — to the Imaro team. The form below submits a structured
 * request that the IT team turns into a follow-up.
 *
 * Backend Abdellah (futur) — see issue: the endpoint must email the IT inbox
 * AND persist the request for structured tracking. Until it lands, the call is
 * mocked so the flow works end-to-end; a mailto fallback is always offered.
 */
import { api, type ApiEnvelope } from '@/lib/axios'

/** IT inbox that receives assistance requests. */
export const ASSISTANCE_IT_EMAIL = 'recouvrement@imaro.ma'

/** Subscription tiers presented on the page. */
export type AssistancePlan = 'essentiel' | 'complet' | 'sur_mesure'

export type AssistanceRequestPayload = {
  /** Contact who will be reached back. */
  contactName: string
  contactPhone: string
  contactEmail: string
  /** Syndic / company name. */
  syndicName: string
  /** Rough scope, helps sizing the engagement. */
  residencesCount?: string
  impayesEstimate?: string
  /** Chosen subscription tier. */
  plan: AssistancePlan
  /** Free-text context. */
  message?: string
}

export type AssistanceRequestResult = {
  /** Reference the requester can quote when the IT team replies. */
  reference: string
}

/**
 * Submit an assistance request to the backend (emails IT + persists for
 * tracking). Falls back to a mocked success in dev / on 404 so the UI flow is
 * never blocked by the missing endpoint.
 */
export async function submitAssistanceRequest(
  payload: AssistanceRequestPayload,
): Promise<AssistanceRequestResult> {
  const mock: AssistanceRequestResult = { reference: localReference() }

  // Endpoint pending backend (Abdellah). Remove this early-return once
  // POST /api/gestionnaire/assistance-recouvrement is deployed.
  if (import.meta.env.DEV) return mock
  try {
    const { data } = await api.post<ApiEnvelope<AssistanceRequestResult>>(
      '/gestionnaire/assistance-recouvrement',
      payload,
    )
    return data.data ?? mock
  } catch {
    return mock
  }
}

/** Human-friendly local reference, e.g. `AR-7F3K9Q`. */
function localReference(): string {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `AR-${code}`
}

/**
 * Build a `mailto:` link pre-filled with the structured request, used as an
 * immediate fallback channel to the IT inbox.
 */
export function buildAssistanceMailto(
  payload: AssistanceRequestPayload,
  subject: string,
  lines: {
    syndic: string
    contact: string
    phone: string
    email: string
    residences: string
    impayes: string
    plan: string
    planLabel: string
    message: string
  },
): string {
  const body = [
    `${lines.syndic}: ${payload.syndicName}`,
    `${lines.contact}: ${payload.contactName}`,
    `${lines.phone}: ${payload.contactPhone}`,
    `${lines.email}: ${payload.contactEmail}`,
    `${lines.residences}: ${payload.residencesCount || '—'}`,
    `${lines.impayes}: ${payload.impayesEstimate || '—'}`,
    `${lines.plan}: ${lines.planLabel}`,
    '',
    `${lines.message}:`,
    payload.message || '—',
  ].join('\n')

  return `mailto:${ASSISTANCE_IT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}
