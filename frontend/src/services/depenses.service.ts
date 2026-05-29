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

export type DepenseFinance = {
  id: number
  exercice_id: number
  residence_id: number
  residence_nom: string
  titre: string
  montant: number
  date: string
  prestataire_id: number | null
  prestataire_nom: string | null
  compte_charge: string
  libelle_compte: string
  mode_paiement:
    | 'virement'
    | 'cheque'
    | 'especes'
    | 'cb'
    | 'prelevement'
    | 'autre'
  justificatif_path: string | null
  ecriture_id: number
  est_recurrente: boolean
  statut_approbation: 'approuve' | 'en_attente' | 'rejete' | null
  approuve_par: string | null
}

export type ModeleRecurrent = {
  id: number
  residence_id: number
  residence_nom: string
  titre: string
  montant: number
  compte_charge: string
  libelle_compte: string
  mode_paiement: string
  prestataire_nom: string | null
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle'
  jour_emission: number
  date_debut: string
  date_fin: string | null
  actif: boolean
  prochaine_emission: string
}

export type DepensesStats = {
  total_periode: number
  nb_depenses: number
  montant_moyen: number
  en_attente_approbation: number
  evolution_mensuelle: Array<{ mois: string; montant: number }>
  top_comptes: Array<{
    compte: string
    libelle: string
    montant: number
    pct: number
  }>
  top_prestataires: Array<{ nom: string; montant: number; nb: number }>
}

export type ImportIaDepense = {
  titre: string
  montant: number
  date: string
  fournisseur: string | null
  compte_charge_suggere: string
  confiance: 'haute' | 'moyenne' | 'faible'
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_DEPENSES: DepenseFinance[] = [
  {
    id: 1,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Gardiennage Janvier 2026',
    montant: 3500,
    date: '2026-01-15',
    prestataire_id: 1,
    prestataire_nom: 'Sécurité Atlas SARL',
    compte_charge: '6138',
    libelle_compte: 'Autres rémunérations',
    mode_paiement: 'virement',
    justificatif_path: 'facture-gardiennage-jan26.pdf',
    ecriture_id: 3,
    est_recurrente: true,
    statut_approbation: 'approuve',
    approuve_par: 'Admin Gestionnaire',
  },
  {
    id: 2,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Nettoyage Janvier 2026',
    montant: 1500,
    date: '2026-02-03',
    prestataire_id: 2,
    prestataire_nom: 'Propreté Plus SARL',
    compte_charge: '6131',
    libelle_compte: 'Nettoyage des locaux',
    mode_paiement: 'virement',
    justificatif_path: null,
    ecriture_id: 4,
    est_recurrente: true,
    statut_approbation: 'approuve',
    approuve_par: 'Admin Gestionnaire',
  },
  {
    id: 3,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Contrats maintenance ascenseur Février 2026',
    montant: 2800,
    date: '2026-02-10',
    prestataire_id: 3,
    prestataire_nom: 'Kone Maroc',
    compte_charge: '6134',
    libelle_compte: 'Contrats de maintenance',
    mode_paiement: 'cheque',
    justificatif_path: 'facture-kone-fev26.pdf',
    ecriture_id: 5,
    est_recurrente: false,
    statut_approbation: 'approuve',
    approuve_par: 'Admin Gestionnaire',
  },
  {
    id: 4,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Électricité Février 2026',
    montant: 1200,
    date: '2026-02-15',
    prestataire_id: null,
    prestataire_nom: 'ONEE',
    compte_charge: '6112',
    libelle_compte: 'Électricité',
    mode_paiement: 'prelevement',
    justificatif_path: 'facture-onee-fev26.pdf',
    ecriture_id: 2,
    est_recurrente: true,
    statut_approbation: 'approuve',
    approuve_par: 'Admin Gestionnaire',
  },
  {
    id: 5,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Entretien porte palière Mars 2026',
    montant: 650,
    date: '2026-03-20',
    prestataire_id: 4,
    prestataire_nom: 'Atlas Serrurerie',
    compte_charge: '6135',
    libelle_compte: 'Entretien et petites réparations',
    mode_paiement: 'especes',
    justificatif_path: null,
    ecriture_id: 9,
    est_recurrente: false,
    statut_approbation: 'en_attente',
    approuve_par: null,
  },
  {
    id: 6,
    exercice_id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Assurance multirisque AXA 2026',
    montant: 2400,
    date: '2026-04-05',
    prestataire_id: null,
    prestataire_nom: 'AXA Maroc',
    compte_charge: '6136',
    libelle_compte: "Primes d'assurances",
    mode_paiement: 'virement',
    justificatif_path: 'police-axa-2026.pdf',
    ecriture_id: 8,
    est_recurrente: false,
    statut_approbation: 'approuve',
    approuve_par: 'Admin Gestionnaire',
  },
]

const MOCK_MODELES: ModeleRecurrent[] = [
  {
    id: 1,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Gardiennage mensuel',
    montant: 3500,
    compte_charge: '6138',
    libelle_compte: 'Autres rémunérations',
    mode_paiement: 'virement',
    prestataire_nom: 'Sécurité Atlas SARL',
    frequence: 'mensuelle',
    jour_emission: 1,
    date_debut: '2026-01-01',
    date_fin: null,
    actif: true,
    prochaine_emission: '2026-06-01',
  },
  {
    id: 2,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Nettoyage mensuel',
    montant: 1500,
    compte_charge: '6131',
    libelle_compte: 'Nettoyage des locaux',
    mode_paiement: 'virement',
    prestataire_nom: 'Propreté Plus SARL',
    frequence: 'mensuelle',
    jour_emission: 5,
    date_debut: '2026-01-01',
    date_fin: null,
    actif: true,
    prochaine_emission: '2026-06-05',
  },
  {
    id: 3,
    residence_id: 1,
    residence_nom: 'Atlas Casablanca',
    titre: 'Assurance annuelle',
    montant: 2400,
    compte_charge: '6136',
    libelle_compte: "Primes d'assurances",
    mode_paiement: 'virement',
    prestataire_nom: 'AXA Maroc',
    frequence: 'annuelle',
    jour_emission: 1,
    date_debut: '2026-01-01',
    date_fin: null,
    actif: true,
    prochaine_emission: '2027-01-01',
  },
]

const MOCK_STATS: DepensesStats = {
  total_periode: 12050,
  nb_depenses: 6,
  montant_moyen: 2008,
  en_attente_approbation: 1,
  evolution_mensuelle: [
    { mois: 'Jan', montant: 5000 },
    { mois: 'Fév', montant: 4000 },
    { mois: 'Mar', montant: 650 },
    { mois: 'Avr', montant: 2400 },
    { mois: 'Mai', montant: 0 },
  ],
  top_comptes: [
    { compte: '6138', libelle: 'Autres rémunérations', montant: 3500, pct: 29 },
    {
      compte: '6134',
      libelle: 'Contrats de maintenance',
      montant: 2800,
      pct: 23,
    },
    { compte: '6136', libelle: "Primes d'assurances", montant: 2400, pct: 20 },
    { compte: '6131', libelle: 'Nettoyage des locaux', montant: 1500, pct: 12 },
  ],
  top_prestataires: [
    { nom: 'Sécurité Atlas SARL', montant: 3500, nb: 1 },
    { nom: 'Kone Maroc', montant: 2800, nb: 1 },
    { nom: 'Propreté Plus SARL', montant: 1500, nb: 1 },
  ],
}

const MOCK_IMPORT_IA: ImportIaDepense = {
  titre: 'Facture Gardiennage Juin 2026',
  montant: 3500,
  date: '2026-06-01',
  fournisseur: 'Sécurité Atlas SARL',
  compte_charge_suggere: '6138',
  confiance: 'haute',
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getDepensesFinance(params?: {
  compte?: string
  prestataire?: string
  from?: string
  to?: string
  statut_approbation?: string
}): Promise<DepenseFinance[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<DepenseFinance[]>>(
        '/gestionnaire/depenses-finance',
        { params },
      )
      return res.data.data
    },
    (() => {
      let data = MOCK_DEPENSES
      if (params?.compte)
        data = data.filter((d) => d.compte_charge === params.compte)
      if (params?.prestataire)
        data = data.filter((d) =>
          d.prestataire_nom
            ?.toLowerCase()
            .includes(params.prestataire!.toLowerCase()),
        )
      if (params?.from) data = data.filter((d) => d.date >= params.from!)
      if (params?.to) data = data.filter((d) => d.date <= params.to!)
      if (params?.statut_approbation)
        data = data.filter(
          (d) => d.statut_approbation === params.statut_approbation,
        )
      return data
    })(),
  )
}

export async function storeDepenseFinance(
  data: FormData,
): Promise<DepenseFinance> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<DepenseFinance>>(
        '/gestionnaire/depenses-finance',
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      exercice_id: 1,
      residence_id: 1,
      residence_nom: 'Atlas Casablanca',
      titre: (data.get('titre') as string) ?? 'Nouvelle dépense',
      montant: Number(data.get('montant') ?? 0),
      date:
        (data.get('date') as string) ?? new Date().toISOString().slice(0, 10),
      prestataire_id: null,
      prestataire_nom: (data.get('prestataire') as string) || null,
      compte_charge: (data.get('compte_charge') as string) ?? '6135',
      libelle_compte: 'Entretien et petites réparations',
      mode_paiement: ((data.get('mode_paiement') as string) ??
        'virement') as DepenseFinance['mode_paiement'],
      justificatif_path: null,
      ecriture_id: Math.floor(Math.random() * 1000) + 100,
      est_recurrente: false,
      statut_approbation:
        Number(data.get('montant') ?? 0) > 5000 ? 'en_attente' : 'approuve',
      approuve_par:
        Number(data.get('montant') ?? 0) > 5000 ? null : 'Admin Gestionnaire',
    },
  )
}

export async function deleteDepenseFinance(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/depenses-finance/${id}`)
  }, undefined)
}

export async function importFactureIa(file: File): Promise<ImportIaDepense> {
  return withMock(
    async () => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post<ApiEnvelope<ImportIaDepense>>(
        '/gestionnaire/depenses-finance/import-ia',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
    { ...MOCK_IMPORT_IA, titre: file.name.replace(/\.[^.]+$/, '') },
  )
}

export async function getDepensesStats(): Promise<DepensesStats> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<DepensesStats>>(
      '/gestionnaire/depenses-finance/stats',
    )
    return res.data.data
  }, MOCK_STATS)
}

export async function getModelesRecurrents(): Promise<ModeleRecurrent[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ModeleRecurrent[]>>(
      '/gestionnaire/depenses-finance/recurrentes',
    )
    return res.data.data
  }, MOCK_MODELES)
}

export async function storeModeleRecurrent(
  data: object,
): Promise<ModeleRecurrent> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ModeleRecurrent>>(
        '/gestionnaire/depenses-finance/recurrentes',
        data,
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      residence_id: 1,
      residence_nom: 'Atlas Casablanca',
      titre: 'Nouveau modèle',
      montant: 0,
      compte_charge: '6135',
      libelle_compte: 'Entretien et petites réparations',
      mode_paiement: 'virement',
      prestataire_nom: null,
      frequence: 'mensuelle' as const,
      jour_emission: 1,
      date_debut: new Date().toISOString().slice(0, 10),
      date_fin: null,
      actif: true,
      prochaine_emission: new Date().toISOString().slice(0, 10),
      ...data,
    } as ModeleRecurrent,
  )
}

export async function toggleModeleRecurrent(
  id: number,
): Promise<ModeleRecurrent> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ModeleRecurrent>>(
        `/gestionnaire/depenses-finance/recurrentes/${id}/toggle`,
      )
      return res.data.data
    },
    {
      ...(MOCK_MODELES.find((m) => m.id === id) ?? MOCK_MODELES[0]),
      actif: !(MOCK_MODELES.find((m) => m.id === id)?.actif ?? true),
    },
  )
}

export async function approuverDepense(id: number): Promise<DepenseFinance> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<DepenseFinance>>(
        `/gestionnaire/depenses-finance/${id}/approuver`,
      )
      return res.data.data
    },
    {
      ...(MOCK_DEPENSES.find((d) => d.id === id) ?? MOCK_DEPENSES[0]),
      statut_approbation: 'approuve' as const,
      approuve_par: 'Admin Gestionnaire',
    },
  )
}

export async function rejeterDepense(
  id: number,
  motif: string,
): Promise<DepenseFinance> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<DepenseFinance>>(
        `/gestionnaire/depenses-finance/${id}/rejeter`,
        { motif },
      )
      return res.data.data
    },
    {
      ...(MOCK_DEPENSES.find((d) => d.id === id) ?? MOCK_DEPENSES[0]),
      statut_approbation: 'rejete' as const,
    },
  )
}
