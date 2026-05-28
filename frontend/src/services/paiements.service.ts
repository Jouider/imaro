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

// ─── Types ───────────────────────────────────────────────────────────────────

export type Creance = {
  id: number
  appel_fonds_id: number
  appel_fonds_titre: string
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant_initial: number
  montant_regle: number
  solde_restant: number
  date_echeance: string
  date_derniere_relance: string | null
  statut: 'a_payer' | 'en_retard' | 'paye' | 'partiellement_paye' | 'annulee'
  nb_relances: number
  jours_retard: number
}

export type Encaissement = {
  id: number
  creance_id: number | null
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  appel_fonds_titre: string
  montant: number
  date_paiement: string
  methode: 'especes' | 'virement' | 'cheque' | 'cb' | 'mobile_money'
  reference_cheque: string | null
  compte_destination: '5121' | '5122' | '5161'
  est_avance: boolean
  recu_path: string | null
  est_rapproche: boolean
}

export type VirementDeclare = {
  id: number
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant: number
  date_declaration: string
  reference: string
  justificatif_path: string | null
  statut: 'en_attente' | 'valide' | 'rejete'
  valide_par: string | null
  date_validation: string | null
}

export type Decompte = {
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  tantieme: number
  exercice_annee: number
  total_appele: number
  total_paye: number
  solde: number
  detail: Array<{
    appel_fonds_titre: string
    date_echeance: string
    montant_du: number
    montant_paye: number
    statut: string
  }>
}

export type PaiementForm = {
  creance_id: number
  montant: number
  date_paiement: string
  methode: string
  reference_cheque: string
  compte_destination: string
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_CREANCES: Creance[] = [
  {
    id: 1,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 1,
    coproprietaire_nom: 'Hassan Benali',
    lot_numero: 'A-01',
    montant_initial: 900,
    montant_regle: 0,
    solde_restant: 900,
    date_echeance: '2026-03-31',
    date_derniere_relance: '2026-04-15',
    statut: 'en_retard',
    nb_relances: 2,
    jours_retard: 45,
  },
  {
    id: 2,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 2,
    coproprietaire_nom: 'Fatima Chraibi',
    lot_numero: 'A-02',
    montant_initial: 750,
    montant_regle: 750,
    solde_restant: 0,
    date_echeance: '2026-03-31',
    date_derniere_relance: null,
    statut: 'paye',
    nb_relances: 0,
    jours_retard: 0,
  },
  {
    id: 3,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 3,
    coproprietaire_nom: 'Youssef Tazi',
    lot_numero: 'A-03',
    montant_initial: 650,
    montant_regle: 0,
    solde_restant: 650,
    date_echeance: '2026-06-30',
    date_derniere_relance: null,
    statut: 'a_payer',
    nb_relances: 0,
    jours_retard: 0,
  },
  {
    id: 4,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 4,
    coproprietaire_nom: 'Nadia Berrada',
    lot_numero: 'A-04',
    montant_initial: 650,
    montant_regle: 0,
    solde_restant: 650,
    date_echeance: '2026-05-05',
    date_derniere_relance: '2026-05-10',
    statut: 'en_retard',
    nb_relances: 1,
    jours_retard: 12,
  },
  {
    id: 5,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 5,
    coproprietaire_nom: 'Omar Fassi',
    lot_numero: 'A-05',
    montant_initial: 650,
    montant_regle: 325,
    solde_restant: 325,
    date_echeance: '2026-03-31',
    date_derniere_relance: null,
    statut: 'partiellement_paye',
    nb_relances: 0,
    jours_retard: 0,
  },
  {
    id: 6,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 6,
    coproprietaire_nom: 'Amina Kettani',
    lot_numero: 'A-06',
    montant_initial: 650,
    montant_regle: 650,
    solde_restant: 0,
    date_echeance: '2026-03-31',
    date_derniere_relance: null,
    statut: 'paye',
    nb_relances: 0,
    jours_retard: 0,
  },
  {
    id: 7,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 7,
    coproprietaire_nom: 'Rachid Squalli',
    lot_numero: 'A-07',
    montant_initial: 650,
    montant_regle: 0,
    solde_restant: 650,
    date_echeance: '2026-03-15',
    date_derniere_relance: '2026-04-20',
    statut: 'en_retard',
    nb_relances: 3,
    jours_retard: 62,
  },
  {
    id: 8,
    appel_fonds_id: 1,
    appel_fonds_titre: 'Charges Q1 2026',
    coproprietaire_id: 8,
    coproprietaire_nom: 'Houda Lahlou',
    lot_numero: 'A-08',
    montant_initial: 580,
    montant_regle: 0,
    solde_restant: 580,
    date_echeance: '2026-06-30',
    date_derniere_relance: null,
    statut: 'a_payer',
    nb_relances: 0,
    jours_retard: 0,
  },
]

const MOCK_ENCAISSEMENTS: Encaissement[] = [
  {
    id: 1,
    creance_id: 2,
    coproprietaire_id: 2,
    coproprietaire_nom: 'Fatima Chraibi',
    lot_numero: 'A-02',
    appel_fonds_titre: 'Charges Q1 2026',
    montant: 750,
    date_paiement: '2026-03-18',
    methode: 'virement',
    reference_cheque: null,
    compte_destination: '5121',
    est_avance: false,
    recu_path: 'recu-fatima-2026-03.pdf',
    est_rapproche: true,
  },
  {
    id: 2,
    creance_id: 6,
    coproprietaire_id: 6,
    coproprietaire_nom: 'Amina Kettani',
    lot_numero: 'A-06',
    appel_fonds_titre: 'Charges Q1 2026',
    montant: 650,
    date_paiement: '2026-03-25',
    methode: 'cheque',
    reference_cheque: 'CHQ-2026-042',
    compte_destination: '5122',
    est_avance: false,
    recu_path: null,
    est_rapproche: false,
  },
  {
    id: 3,
    creance_id: 5,
    coproprietaire_id: 5,
    coproprietaire_nom: 'Omar Fassi',
    lot_numero: 'A-05',
    appel_fonds_titre: 'Charges Q1 2026',
    montant: 325,
    date_paiement: '2026-04-02',
    methode: 'especes',
    reference_cheque: null,
    compte_destination: '5161',
    est_avance: false,
    recu_path: null,
    est_rapproche: false,
  },
  {
    id: 4,
    creance_id: null,
    coproprietaire_id: 9,
    coproprietaire_nom: 'Mehdi Bensouda',
    lot_numero: 'A-09',
    appel_fonds_titre: '—',
    montant: 1200,
    date_paiement: '2026-04-10',
    methode: 'virement',
    reference_cheque: null,
    compte_destination: '5121',
    est_avance: true,
    recu_path: null,
    est_rapproche: false,
  },
  {
    id: 5,
    creance_id: 8,
    coproprietaire_id: 8,
    coproprietaire_nom: 'Houda Lahlou',
    lot_numero: 'A-08',
    appel_fonds_titre: 'Charges Q1 2026',
    montant: 580,
    date_paiement: '2026-05-01',
    methode: 'mobile_money',
    reference_cheque: null,
    compte_destination: '5121',
    est_avance: false,
    recu_path: null,
    est_rapproche: false,
  },
]

const MOCK_VIREMENTS: VirementDeclare[] = [
  {
    id: 1,
    coproprietaire_id: 10,
    coproprietaire_nom: 'Khalid Bennani',
    lot_numero: 'B-01',
    montant: 650,
    date_declaration: '2026-05-10',
    reference: 'VIR-MAR-2026-0441',
    justificatif_path: 'virement-khalid.pdf',
    statut: 'en_attente',
    valide_par: null,
    date_validation: null,
  },
  {
    id: 2,
    coproprietaire_id: 11,
    coproprietaire_nom: 'Zineb Tahiri',
    lot_numero: 'B-02',
    montant: 580,
    date_declaration: '2026-05-05',
    reference: 'VIR-ATW-2026-0089',
    justificatif_path: 'virement-zineb.pdf',
    statut: 'valide',
    valide_par: 'Admin Gestionnaire',
    date_validation: '2026-05-06',
  },
  {
    id: 3,
    coproprietaire_id: 12,
    coproprietaire_nom: 'Samir Cherkaoui',
    lot_numero: 'B-03',
    montant: 650,
    date_declaration: '2026-04-28',
    reference: 'VIR-BCP-2026-1203',
    justificatif_path: null,
    statut: 'rejete',
    valide_par: 'Admin Gestionnaire',
    date_validation: '2026-04-30',
  },
]

const MOCK_DECOMPTES: Decompte[] = [
  {
    coproprietaire_id: 1,
    coproprietaire_nom: 'Hassan Benali',
    lot_numero: 'A-01',
    tantieme: 45,
    exercice_annee: 2026,
    total_appele: 900,
    total_paye: 0,
    solde: -900,
    detail: [
      {
        appel_fonds_titre: 'Charges Q1 2026',
        date_echeance: '2026-03-31',
        montant_du: 900,
        montant_paye: 0,
        statut: 'en_retard',
      },
    ],
  },
  {
    coproprietaire_id: 2,
    coproprietaire_nom: 'Fatima Chraibi',
    lot_numero: 'A-02',
    tantieme: 42,
    exercice_annee: 2026,
    total_appele: 750,
    total_paye: 750,
    solde: 0,
    detail: [
      {
        appel_fonds_titre: 'Charges Q1 2026',
        date_echeance: '2026-03-31',
        montant_du: 750,
        montant_paye: 750,
        statut: 'paye',
      },
    ],
  },
  {
    coproprietaire_id: 5,
    coproprietaire_nom: 'Omar Fassi',
    lot_numero: 'A-05',
    tantieme: 38,
    exercice_annee: 2026,
    total_appele: 650,
    total_paye: 325,
    solde: -325,
    detail: [
      {
        appel_fonds_titre: 'Charges Q1 2026',
        date_echeance: '2026-03-31',
        montant_du: 650,
        montant_paye: 325,
        statut: 'partiellement_paye',
      },
    ],
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getCreances(params?: {
  statut?: string
  search?: string
}): Promise<Creance[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Creance[]>>(
        '/gestionnaire/creances',
        { params },
      )
      return res.data.data
    },
    (() => {
      let data = MOCK_CREANCES
      if (params?.statut) data = data.filter((c) => c.statut === params.statut)
      if (params?.search) {
        const q = params.search.toLowerCase()
        data = data.filter(
          (c) =>
            c.coproprietaire_nom.toLowerCase().includes(q) ||
            c.lot_numero.toLowerCase().includes(q),
        )
      }
      return data
    })(),
  )
}

export async function getEncaissements(params?: {
  methode?: string
  from?: string
  to?: string
}): Promise<Encaissement[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Encaissement[]>>(
        '/gestionnaire/encaissements',
        { params },
      )
      return res.data.data
    },
    (() => {
      let data = MOCK_ENCAISSEMENTS
      if (params?.methode)
        data = data.filter((e) => e.methode === params.methode)
      if (params?.from)
        data = data.filter((e) => e.date_paiement >= params.from!)
      if (params?.to) data = data.filter((e) => e.date_paiement <= params.to!)
      return data
    })(),
  )
}

export async function storeEncaissement(
  data: PaiementForm,
): Promise<Encaissement> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<Encaissement>>(
        '/gestionnaire/encaissements',
        data,
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      creance_id: data.creance_id,
      coproprietaire_id: 0,
      coproprietaire_nom: 'Copropriétaire',
      lot_numero: 'A-XX',
      appel_fonds_titre: 'Charges Q1 2026',
      montant: data.montant,
      date_paiement: data.date_paiement,
      methode: data.methode as Encaissement['methode'],
      reference_cheque: data.reference_cheque || null,
      compte_destination:
        data.compte_destination as Encaissement['compte_destination'],
      est_avance: false,
      recu_path: null,
      est_rapproche: false,
    },
  )
}

export async function getVirementsDeclares(): Promise<VirementDeclare[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<VirementDeclare[]>>(
      '/gestionnaire/virements-declares',
    )
    return res.data.data
  }, MOCK_VIREMENTS)
}

export async function validerVirement(id: number): Promise<VirementDeclare> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<VirementDeclare>>(
        `/gestionnaire/virements-declares/${id}/valider`,
      )
      return res.data.data
    },
    {
      ...(MOCK_VIREMENTS.find((v) => v.id === id) ?? MOCK_VIREMENTS[0]),
      statut: 'valide' as const,
      valide_par: 'Admin Gestionnaire',
      date_validation: new Date().toISOString().slice(0, 10),
    },
  )
}

export async function rejeterVirement(
  id: number,
  motif: string,
): Promise<VirementDeclare> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<VirementDeclare>>(
        `/gestionnaire/virements-declares/${id}/rejeter`,
        { motif },
      )
      return res.data.data
    },
    {
      ...(MOCK_VIREMENTS.find((v) => v.id === id) ?? MOCK_VIREMENTS[0]),
      statut: 'rejete' as const,
      valide_par: 'Admin Gestionnaire',
      date_validation: new Date().toISOString().slice(0, 10),
    },
  )
}

export async function getDecompte(coproprietaireId: number): Promise<Decompte> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Decompte>>(
        `/gestionnaire/decomptes/${coproprietaireId}`,
      )
      return res.data.data
    },
    MOCK_DECOMPTES.find((d) => d.coproprietaire_id === coproprietaireId) ??
      MOCK_DECOMPTES[0],
  )
}

export async function relancerCreance(creanceId: number): Promise<void> {
  return withMock(async () => {
    await api.post(`/gestionnaire/creances/${creanceId}/relancer`)
  }, undefined)
}

export async function relancerTout(): Promise<{ nb_envoye: number }> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ nb_envoye: number }>>(
        '/gestionnaire/creances/relancer-tout',
      )
      return res.data.data
    },
    { nb_envoye: MOCK_CREANCES.filter((c) => c.statut === 'en_retard').length },
  )
}
