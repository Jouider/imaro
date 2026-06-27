import { api, type ApiEnvelope } from '@/lib/axios'

/**
 * Paiements déclarés par le résident (KAN-110 revu). Le copropriétaire déclare
 * un paiement effectué ; le syndic le valide après un délai de 24 h, ce qui
 * génère le reçu PDF (« le bon ») récupérable depuis le détail du paiement.
 *
 * Backend : GET /portail/paiements · POST /portail/paiements (déclaration).
 */

export type PaiementStatut = 'en_attente' | 'valide' | 'rejete'

export type PaiementDeclare = {
  id: number
  reference: string
  montant: number
  methode: 'virement' | 'versement' | 'cheque' | 'especes'
  date: string | null
  statut: PaiementStatut
  /** Date avant laquelle le syndic ne peut pas valider (déclaration + 24 h). */
  validable_at: string | null
  validated_at: string | null
  motif_rejet: string | null
  justificatif_url: string | null
  /** Reçu PDF (« le bon ») — disponible une fois le paiement validé. */
  recu_url: string | null
}

export async function getMesPaiements(): Promise<PaiementDeclare[]> {
  const res =
    await api.get<ApiEnvelope<{ paiements: PaiementDeclare[] }>>(
      '/portail/paiements',
    )
  return res.data.data.paiements
}
