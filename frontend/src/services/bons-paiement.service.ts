import { api, type ApiEnvelope } from '@/lib/axios'

/**
 * Bons de paiement résident (KAN-110). Le copropriétaire émet un bon de
 * paiement (ordre de paiement formel) vers le syndic. Procédure : délai
 * minimal de 24 h avant validation par le syndic ; une fois validé, un ticket
 * de suivi est généré et le bon est archivé (consultable + téléchargeable).
 *
 * Backend attendu (cf. issue backend) :
 *   GET    /portail/bons-paiement
 *   POST   /portail/bons-paiement        { compte_emetteur, beneficiaire, montant, motif }
 *   GET    /portail/bons-paiement/{id}
 *   GET    /portail/bons-paiement/{id}/pdf   (téléchargement)
 */

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

export type BonPaiementStatut = 'en_attente' | 'valide' | 'rejete' | 'expire'

export type BonPaiement = {
  id: number
  reference: string
  compte_emetteur: string
  beneficiaire: string
  montant: number
  motif: string
  statut: BonPaiementStatut
  created_at: string
  /** Date avant laquelle le syndic ne peut pas valider (created_at + 24 h). */
  validable_at: string
  validated_at: string | null
  /** Référence du ticket de suivi généré à la validation. */
  ticket_reference: string | null
  /** URL du PDF une fois disponible. */
  pdf_url: string | null
}

export type CreateBonPaiementInput = {
  compte_emetteur: string
  beneficiaire: string
  montant: number
  motif: string
}

/** Comptes émetteurs proposés au résident (le backend renverra les vrais). */
export const COMPTES_EMETTEUR = [
  { id: 'cheque', label: 'Compte chèque', numero: '000335E000304708' },
  { id: 'epargne', label: 'Compte épargne', numero: '000335E000308891' },
] as const

const HOURS_24 = 24 * 60 * 60 * 1000

const MOCK_BONS: BonPaiement[] = [
  {
    id: 1,
    reference: 'BP-2026-001',
    compte_emetteur: 'Compte chèque · 000335E000304708',
    beneficiaire: 'Syndic Résidence Al Blanca',
    montant: 1500,
    motif: 'Appel de fonds T1 2026',
    statut: 'valide',
    created_at: '2026-05-02T10:00:00Z',
    validable_at: '2026-05-03T10:00:00Z',
    validated_at: '2026-05-03T14:20:00Z',
    ticket_reference: 'TKT-2026-204',
    pdf_url: 'https://api-staging.imaro.ma/storage/bons/BP-2026-001.pdf',
  },
  {
    id: 2,
    reference: 'BP-2026-002',
    compte_emetteur: 'Compte chèque · 000335E000304708',
    beneficiaire: 'Syndic Résidence Al Blanca',
    montant: 750,
    motif: 'Régularisation charges',
    statut: 'en_attente',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    validable_at: new Date(Date.now() + 21 * 60 * 60 * 1000).toISOString(),
    validated_at: null,
    ticket_reference: null,
    pdf_url: null,
  },
]

export async function getBonsPaiement(): Promise<BonPaiement[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ bons: BonPaiement[] }>>(
      '/portail/bons-paiement',
    )
    return res.data.data.bons
  }, MOCK_BONS)
}

export async function getBonPaiement(id: number): Promise<BonPaiement> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ bon: BonPaiement }>>(
        `/portail/bons-paiement/${id}`,
      )
      return res.data.data.bon
    },
    MOCK_BONS.find((b) => b.id === id) ?? MOCK_BONS[0],
  )
}

export async function createBonPaiement(
  data: CreateBonPaiementInput,
): Promise<BonPaiement> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ bon: BonPaiement }>>(
        '/portail/bons-paiement',
        data,
      )
      return res.data.data.bon
    },
    (() => {
      const now = Date.now()
      const seq = String(MOCK_BONS.length + 1).padStart(3, '0')
      return {
        id: now,
        reference: `BP-${new Date().getFullYear()}-${seq}`,
        compte_emetteur: data.compte_emetteur,
        beneficiaire: data.beneficiaire,
        montant: data.montant,
        motif: data.motif,
        statut: 'en_attente' as const,
        created_at: new Date(now).toISOString(),
        validable_at: new Date(now + HOURS_24).toISOString(),
        validated_at: null,
        ticket_reference: null,
        pdf_url: null,
      }
    })(),
  )
}
