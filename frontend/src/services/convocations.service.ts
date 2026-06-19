import { api, type ApiEnvelope } from '@/lib/axios'

// Convocations AG — génération PDF par copropriétaire + PDF fusionné (KAN-98).
// Contrat proposé : issue GitHub #269 (à confirmer par le backend). Le front est
// câblé avec `withMock` en attendant le déploiement réel.

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Convocation = {
  id: number
  coproprietaire_nom: string
  lot: string
  tantieme: number
  /** URL de la convocation individuelle (PDF). */
  url: string
}

export type ConvocationsResult = {
  /** `pending` tant que le Job de génération tourne, sinon `ready`. */
  status: 'ready' | 'pending'
  generated_at: string | null
  /** PDF fusionné « Imprimer tout » — null tant que rien n'a été généré. */
  merged_url: string | null
  convocations: Convocation[]
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_CONVOCATIONS: ConvocationsResult = {
  status: 'ready',
  generated_at: '2026-06-15T09:00:00Z',
  merged_url: 'https://example.com/convocations/ag-merged.pdf',
  convocations: [
    {
      id: 1,
      coproprietaire_nom: 'Youssef El Alaoui',
      lot: 'A-102',
      tantieme: 35,
      url: 'https://example.com/convocations/conv-1.pdf',
    },
    {
      id: 2,
      coproprietaire_nom: 'Fatima Zahra Bennani',
      lot: 'A-103',
      tantieme: 28,
      url: 'https://example.com/convocations/conv-2.pdf',
    },
    {
      id: 3,
      coproprietaire_nom: 'Karim Idrissi',
      lot: 'B-201',
      tantieme: 37,
      url: 'https://example.com/convocations/conv-3.pdf',
    },
  ],
}

// ─── Service functions ────────────────────────────────────────────────────────

/** Liste des convocations générées pour une AG (+ statut du Job). */
export async function getConvocations(
  agId: number,
): Promise<ConvocationsResult> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ConvocationsResult>>(
      `/gestionnaire/assemblees/${agId}/convocations`,
    )
    return res.data.data
  }, MOCK_CONVOCATIONS)
}

/** Déclenche la génération asynchrone d'une convocation par copropriétaire. */
export async function generateConvocations(
  agId: number,
): Promise<{ status: string; count: number }> {
  return withMock(
    async () => {
      const res = await api.post<
        ApiEnvelope<{ status: string; count: number }>
      >(`/gestionnaire/assemblees/${agId}/convocations`)
      return res.data.data
    },
    { status: 'accepted', count: MOCK_CONVOCATIONS.convocations.length },
  )
}
