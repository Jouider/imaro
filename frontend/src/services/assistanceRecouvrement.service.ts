/**
 * Assistance recouvrement — paid legal-collection assistance service.
 *
 * This is the *upsell* path (distinct from the in-app `/recouvrement` tool):
 * volunteer syndics and new management companies without dedicated staff can
 * delegate the whole collection chain — from appels de fonds to court action
 * under loi 18-00 — to the Imaro team. The form below submits a structured
 * request that the IT team turns into a follow-up.
 *
 * Backend (Abdellah, PR #225) — POST /api/gestionnaire/assistance-recouvrement
 * emails the IT inbox AND persists the request for structured tracking. A
 * mailto fallback is always offered on the page if the call fails.
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
 * tracking) and return the reference the requester can quote.
 */
export async function submitAssistanceRequest(
  payload: AssistanceRequestPayload,
): Promise<AssistanceRequestResult> {
  const { data } = await api.post<ApiEnvelope<AssistanceRequestResult>>(
    '/gestionnaire/assistance-recouvrement',
    payload,
  )
  return data.data
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
