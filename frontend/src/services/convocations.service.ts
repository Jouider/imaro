import { api, type ApiEnvelope } from '@/lib/axios'

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

// ─── Service functions ────────────────────────────────────────────────────────

/** Liste des convocations générées pour une AG (+ statut du Job). */
export async function getConvocations(
  agId: number,
): Promise<ConvocationsResult> {
  const res = await api.get<ApiEnvelope<ConvocationsResult>>(
    `/gestionnaire/assemblees/${agId}/convocations`,
  )
  return res.data.data
}

/** Déclenche la génération asynchrone d'une convocation par copropriétaire. */
export async function generateConvocations(
  agId: number,
): Promise<{ status: string; count: number }> {
  const res = await api.post<ApiEnvelope<{ status: string; count: number }>>(
    `/gestionnaire/assemblees/${agId}/convocations`,
  )
  return res.data.data
}
