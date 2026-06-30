import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types (KAN-87) ───────────────────────────────────────────────────────────

export type RelanceCanal = 'whatsapp' | 'sms' | 'email'
export type RelanceStepType = 'relance' | 'mise_en_demeure'

export type RelanceStep = {
  id: number
  /** Délai en jours après l'échéance (J+X). */
  delai_jours: number
  canal: RelanceCanal
  type: RelanceStepType
}

export type RelanceScenario = {
  residence_id: number
  /** Exécution automatique du scénario (Job planifié côté backend). */
  enabled: boolean
  steps: RelanceStep[]
}

/**
 * Forme renvoyée par l'API (KAN-87) : le scénario est emballé sous `scenario`
 * et ne renvoie pas `residence_id` (réinjecté côté client).
 */
type RelanceScenarioPayload = {
  scenario: { enabled: boolean; steps: RelanceStep[] }
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

const MOCK_SCENARIO: RelanceScenario = {
  residence_id: 1,
  enabled: true,
  steps: [
    { id: 1, delai_jours: 3, canal: 'whatsapp', type: 'relance' },
    { id: 2, delai_jours: 10, canal: 'sms', type: 'relance' },
    { id: 3, delai_jours: 30, canal: 'email', type: 'mise_en_demeure' },
  ],
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Scénario de relance de recouvrement (KAN-87). Étapes ordonnées par délai
 * (J+X après échéance), chacune avec un canal et un type (relance / mise en
 * demeure conforme Loi 18-00 art. 25).
 */
export async function getRelanceScenario(
  residenceId: number,
): Promise<RelanceScenario> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<RelanceScenarioPayload>>(
        `/gestionnaire/residences/${residenceId}/relance-scenario`,
      )
      const { scenario } = res.data.data
      return { residence_id: residenceId, ...scenario }
    },
    { ...MOCK_SCENARIO, residence_id: residenceId },
  )
}

export async function updateRelanceScenario(
  residenceId: number,
  data: { enabled: boolean; steps: Omit<RelanceStep, 'id'>[] },
): Promise<RelanceScenario> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<RelanceScenarioPayload>>(
        `/gestionnaire/residences/${residenceId}/relance-scenario`,
        data,
      )
      const { scenario } = res.data.data
      return { residence_id: residenceId, ...scenario }
    },
    {
      residence_id: residenceId,
      enabled: data.enabled,
      steps: data.steps.map((s, i) => ({ ...s, id: i + 1 })),
    },
  )
}
