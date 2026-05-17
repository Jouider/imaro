import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS) return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciceComptable = {
  id: number
  residence_id: number
  annee: number
  statut: 'ouvert' | 'clos'
  date_ouverture: string
  date_cloture: string | null
  seuil_comptable: number
}

export type EcritureComptable = {
  id: number
  exercice_id: number
  date: string
  numero_compte: string
  libelle_compte: string
  description: string
  debit: number
  credit: number
  piece_justificative: string | null
  type: 'depense' | 'encaissement' | 'virement' | 'cloture' | 'report'
  locked: boolean
}

export type ComptePcg = {
  numero: string
  libelle: string
  classe: number
  type: 'actif' | 'passif' | 'charge' | 'produit'
}

export type Depense = {
  id: number
  exercice_id: number
  titre: string
  montant: number
  date: string
  prestataire_id: number | null
  prestataire_nom: string | null
  compte_charge: string
  libelle_compte: string
  mode_paiement: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
  justificatif_path: string | null
  ecriture_id: number
}

export type Encaissement = {
  id: number
  exercice_id: number
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant: number
  date: string
  mode_paiement: 'virement' | 'cheque' | 'especes'
  reference_cheque: string | null
  compte_destination: '5121' | '5122' | '5161'
  ecriture_id: number
}

export type ComptabiliteDashboard = {
  produits: number
  charges: number
  resultat: number
  tresorerie: number
  creances: number
  taux_recouvrement: number
  couverture_tresorerie: number
  banque_5121: number
  cheque_5122: number
  caisse_5161: number
  evolution: Array<{ mois: string; produits: number; charges: number }>
  charges_par_categorie: Array<{ categorie: string; montant: number; couleur: string }>
}

export type GrandLivreCompte = {
  numero: string
  libelle: string
  solde_ouverture: number
  lignes: Array<{
    id: number
    date: string
    description: string
    debit: number
    credit: number
    solde: number
  }>
  solde_final: number
}

export type BalanceLigne = {
  numero: string
  libelle: string
  classe: number
  total_debit: number
  total_credit: number
  solde_debiteur: number
  solde_crediteur: number
}

export type ImportIaResult = {
  titre: string
  montant: number
  date: string
  fournisseur: string | null
  compte_charge_suggere: string
  confiance: 'haute' | 'moyenne' | 'faible'
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EXERCICES: ExerciceComptable[] = [
  {
    id: 1,
    residence_id: 1,
    annee: 2026,
    statut: 'ouvert',
    date_ouverture: '2026-01-01',
    date_cloture: null,
    seuil_comptable: 72000,
  },
  {
    id: 2,
    residence_id: 1,
    annee: 2025,
    statut: 'clos',
    date_ouverture: '2025-01-01',
    date_cloture: '2025-12-31',
    seuil_comptable: 68000,
  },
]

const MOCK_ECRITURES: EcritureComptable[] = [
  {
    id: 1,
    exercice_id: 1,
    date: '2026-01-05',
    numero_compte: '6111',
    libelle_compte: 'Gardiennage/Surveillance',
    description: 'Gardiennage Janvier 2026 — Sécurité Atlas SARL',
    debit: 3500,
    credit: 0,
    piece_justificative: 'facture-gardiennage-jan26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 2,
    exercice_id: 1,
    date: '2026-01-10',
    numero_compte: '6140',
    libelle_compte: 'Électricité',
    description: 'Facture ONEE Électricité Janvier 2026',
    debit: 1200,
    credit: 0,
    piece_justificative: 'facture-onee-jan26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 3,
    exercice_id: 1,
    date: '2026-01-15',
    numero_compte: '6141',
    libelle_compte: 'Eau',
    description: 'Facture ONEE Eau Janvier 2026',
    debit: 850,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 4,
    exercice_id: 1,
    date: '2026-02-03',
    numero_compte: '6131',
    libelle_compte: 'Maintenance ascenseur',
    description: 'Maintenance préventive ascenseurs Février — Kone Maroc',
    debit: 2800,
    credit: 0,
    piece_justificative: 'facture-kone-fev26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 5,
    exercice_id: 1,
    date: '2026-02-08',
    numero_compte: '6171',
    libelle_compte: 'Nettoyage',
    description: 'Nettoyage parties communes Février 2026',
    debit: 1500,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 6,
    exercice_id: 1,
    date: '2026-03-12',
    numero_compte: '7111',
    libelle_compte: 'Cotisations copropriétaires',
    description: 'Encaissement lot A-01 — Hassan Benali — Mars 2026',
    debit: 0,
    credit: 900,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 7,
    exercice_id: 1,
    date: '2026-03-18',
    numero_compte: '7111',
    libelle_compte: 'Cotisations copropriétaires',
    description: 'Encaissement lot A-02 — Fatima Chraibi — Mars 2026',
    debit: 0,
    credit: 750,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 8,
    exercice_id: 1,
    date: '2026-04-05',
    numero_compte: '6161',
    libelle_compte: 'Assurances',
    description: 'Prime assurance multirisque immeuble — AXA Maroc',
    debit: 2400,
    credit: 0,
    piece_justificative: 'police-axa-2026.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 9,
    exercice_id: 1,
    date: '2026-04-20',
    numero_compte: '6131',
    libelle_compte: 'Maintenance ascenseur',
    description: 'Réparation porte palière étage 3',
    debit: 650,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 10,
    exercice_id: 1,
    date: '2026-05-06',
    numero_compte: '6171',
    libelle_compte: 'Nettoyage',
    description: 'Nettoyage parties communes Mai 2026',
    debit: 1500,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 11,
    exercice_id: 1,
    date: '2026-05-14',
    numero_compte: '7111',
    libelle_compte: 'Cotisations copropriétaires',
    description: 'Encaissement lot B-01 — Karim El Fassi — Mai 2026',
    debit: 0,
    credit: 1100,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 12,
    exercice_id: 1,
    date: '2026-05-16',
    numero_compte: '6515',
    libelle_compte: 'Frais divers',
    description: 'Frais administratifs divers — Mai 2026',
    debit: 320,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
]

const MOCK_DEPENSES: Depense[] = [
  {
    id: 1,
    exercice_id: 1,
    titre: 'Gardiennage Janvier 2026',
    montant: 3500,
    date: '2026-01-05',
    prestataire_id: 1,
    prestataire_nom: 'Sécurité Atlas SARL',
    compte_charge: '6111',
    libelle_compte: 'Gardiennage/Surveillance',
    mode_paiement: 'virement',
    justificatif_path: 'facture-gardiennage-jan26.pdf',
    ecriture_id: 1,
  },
  {
    id: 2,
    exercice_id: 1,
    titre: 'Électricité Janvier 2026',
    montant: 1200,
    date: '2026-01-10',
    prestataire_id: null,
    prestataire_nom: 'ONEE',
    compte_charge: '6140',
    libelle_compte: 'Électricité',
    mode_paiement: 'prelevement',
    justificatif_path: 'facture-onee-jan26.pdf',
    ecriture_id: 2,
  },
  {
    id: 3,
    exercice_id: 1,
    titre: 'Maintenance ascenseurs Février 2026',
    montant: 2800,
    date: '2026-02-03',
    prestataire_id: 2,
    prestataire_nom: 'Kone Maroc',
    compte_charge: '6131',
    libelle_compte: 'Maintenance ascenseur',
    mode_paiement: 'cheque',
    justificatif_path: 'facture-kone-fev26.pdf',
    ecriture_id: 4,
  },
  {
    id: 4,
    exercice_id: 1,
    titre: 'Nettoyage Février 2026',
    montant: 1500,
    date: '2026-02-08',
    prestataire_id: 3,
    prestataire_nom: 'Propreté Plus SARL',
    compte_charge: '6171',
    libelle_compte: 'Nettoyage',
    mode_paiement: 'especes',
    justificatif_path: null,
    ecriture_id: 5,
  },
  {
    id: 5,
    exercice_id: 1,
    titre: 'Assurance multirisque AXA 2026',
    montant: 2400,
    date: '2026-04-05',
    prestataire_id: null,
    prestataire_nom: 'AXA Maroc',
    compte_charge: '6161',
    libelle_compte: 'Assurances',
    mode_paiement: 'virement',
    justificatif_path: 'police-axa-2026.pdf',
    ecriture_id: 8,
  },
  {
    id: 6,
    exercice_id: 1,
    titre: 'Nettoyage Mai 2026',
    montant: 1500,
    date: '2026-05-06',
    prestataire_id: 3,
    prestataire_nom: 'Propreté Plus SARL',
    compte_charge: '6171',
    libelle_compte: 'Nettoyage',
    mode_paiement: 'especes',
    justificatif_path: null,
    ecriture_id: 10,
  },
]

const MOCK_ENCAISSEMENTS: Encaissement[] = [
  {
    id: 1,
    exercice_id: 1,
    coproprietaire_id: 1,
    coproprietaire_nom: 'Hassan Benali',
    lot_numero: 'A-01',
    montant: 900,
    date: '2026-03-12',
    mode_paiement: 'virement',
    reference_cheque: null,
    compte_destination: '5121',
    ecriture_id: 6,
  },
  {
    id: 2,
    exercice_id: 1,
    coproprietaire_id: 2,
    coproprietaire_nom: 'Fatima Chraibi',
    lot_numero: 'A-02',
    montant: 750,
    date: '2026-03-18',
    mode_paiement: 'cheque',
    reference_cheque: 'CHQ-12345',
    compte_destination: '5122',
    ecriture_id: 7,
  },
  {
    id: 3,
    exercice_id: 1,
    coproprietaire_id: 3,
    coproprietaire_nom: 'Karim El Fassi',
    lot_numero: 'B-01',
    montant: 1100,
    date: '2026-05-14',
    mode_paiement: 'especes',
    reference_cheque: null,
    compte_destination: '5161',
    ecriture_id: 11,
  },
]

const MOCK_DASHBOARD: ComptabiliteDashboard = {
  produits: 18000,
  charges: 12400,
  resultat: 5600,
  tresorerie: 24800,
  creances: 4500,
  taux_recouvrement: 78,
  couverture_tresorerie: 2.4,
  banque_5121: 18000,
  cheque_5122: 5200,
  caisse_5161: 1600,
  evolution: [
    { mois: 'Jan', produits: 2400, charges: 5550 },
    { mois: 'Fév', produits: 1800, charges: 4300 },
    { mois: 'Mar', produits: 4200, charges: 1200 },
    { mois: 'Avr', produits: 1500, charges: 3050 },
    { mois: 'Mai', produits: 3600, charges: 1320 },
    { mois: 'Jun', produits: 2100, charges: 0 },
    { mois: 'Jul', produits: 0, charges: 0 },
    { mois: 'Aoû', produits: 0, charges: 0 },
    { mois: 'Sep', produits: 0, charges: 0 },
    { mois: 'Oct', produits: 0, charges: 0 },
    { mois: 'Nov', produits: 0, charges: 0 },
    { mois: 'Déc', produits: 0, charges: 0 },
  ],
  charges_par_categorie: [
    { categorie: 'Gardiennage', montant: 3500, couleur: '#1B4F72' },
    { categorie: 'Maintenance', montant: 3450, couleur: '#E67E22' },
    { categorie: 'Nettoyage', montant: 3000, couleur: '#27AE60' },
    { categorie: 'Assurance', montant: 2400, couleur: '#8E44AD' },
    { categorie: 'Divers', montant: 320, couleur: '#95A5A6' },
  ],
}

const MOCK_COMPTES_PCG: ComptePcg[] = [
  { numero: '5121', libelle: 'Banque principale', classe: 5, type: 'actif' },
  { numero: '5122', libelle: 'Comptes chèques', classe: 5, type: 'actif' },
  { numero: '5161', libelle: 'Caisse', classe: 5, type: 'actif' },
  { numero: '6111', libelle: 'Gardiennage/Surveillance', classe: 6, type: 'charge' },
  { numero: '6131', libelle: 'Maintenance ascenseur', classe: 6, type: 'charge' },
  { numero: '6138', libelle: 'Entretien divers', classe: 6, type: 'charge' },
  { numero: '6140', libelle: 'Électricité', classe: 6, type: 'charge' },
  { numero: '6141', libelle: 'Eau', classe: 6, type: 'charge' },
  { numero: '6142', libelle: 'Gaz', classe: 6, type: 'charge' },
  { numero: '6144', libelle: 'Téléphone/Internet', classe: 6, type: 'charge' },
  { numero: '6161', libelle: 'Assurances', classe: 6, type: 'charge' },
  { numero: '6171', libelle: 'Nettoyage', classe: 6, type: 'charge' },
  { numero: '6174', libelle: 'Espaces verts', classe: 6, type: 'charge' },
  { numero: '6511', libelle: 'Frais bancaires', classe: 6, type: 'charge' },
  { numero: '6512', libelle: 'Frais PTT', classe: 6, type: 'charge' },
  { numero: '6515', libelle: 'Frais divers', classe: 6, type: 'charge' },
  { numero: '7111', libelle: 'Cotisations copropriétaires', classe: 7, type: 'produit' },
  { numero: '7113', libelle: 'Appels de fonds spéciaux', classe: 7, type: 'produit' },
  { numero: '3421', libelle: 'Créances copropriétaires', classe: 3, type: 'actif' },
  { numero: '4411', libelle: 'Fournisseurs', classe: 4, type: 'passif' },
]

const MOCK_GRAND_LIVRE_6171: GrandLivreCompte = {
  numero: '6171',
  libelle: 'Nettoyage',
  solde_ouverture: 0,
  lignes: [
    {
      id: 5,
      date: '2026-02-08',
      description: 'Nettoyage parties communes Février 2026',
      debit: 1500,
      credit: 0,
      solde: 1500,
    },
    {
      id: 10,
      date: '2026-05-06',
      description: 'Nettoyage parties communes Mai 2026',
      debit: 1500,
      credit: 0,
      solde: 3000,
    },
    {
      id: 13,
      date: '2026-05-16',
      description: 'Nettoyage espaces verts Mai 2026',
      debit: 750,
      credit: 0,
      solde: 3750,
    },
  ],
  solde_final: 3750,
}

const MOCK_BALANCE: BalanceLigne[] = [
  { numero: '5121', libelle: 'Banque principale', classe: 5, total_debit: 18000, total_credit: 0, solde_debiteur: 18000, solde_crediteur: 0 },
  { numero: '5161', libelle: 'Caisse', classe: 5, total_debit: 1600, total_credit: 0, solde_debiteur: 1600, solde_crediteur: 0 },
  { numero: '6111', libelle: 'Gardiennage/Surveillance', classe: 6, total_debit: 3500, total_credit: 0, solde_debiteur: 3500, solde_crediteur: 0 },
  { numero: '6131', libelle: 'Maintenance ascenseur', classe: 6, total_debit: 3450, total_credit: 0, solde_debiteur: 3450, solde_crediteur: 0 },
  { numero: '6140', libelle: 'Électricité', classe: 6, total_debit: 1200, total_credit: 0, solde_debiteur: 1200, solde_crediteur: 0 },
  { numero: '6161', libelle: 'Assurances', classe: 6, total_debit: 2400, total_credit: 0, solde_debiteur: 2400, solde_crediteur: 0 },
  { numero: '6171', libelle: 'Nettoyage', classe: 6, total_debit: 3000, total_credit: 0, solde_debiteur: 3000, solde_crediteur: 0 },
  { numero: '7111', libelle: 'Cotisations copropriétaires', classe: 7, total_debit: 0, total_credit: 2750, solde_debiteur: 0, solde_crediteur: 2750 },
]

const MOCK_IMPORT_IA: ImportIaResult = {
  titre: 'Facture Gardiennage Juin',
  montant: 3500,
  date: '2026-06-01',
  fournisseur: 'Sécurité Atlas SARL',
  compte_charge_suggere: '6111',
  confiance: 'haute',
}

// ─── Service functions ────────────────────────────────────────────────────────

// Exercices
export async function getExercicesComptabilite(residenceId: number): Promise<ExerciceComptable[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ExerciceComptable[]>>(
      `/gestionnaire/residences/${residenceId}/comptabilite/exercices`,
    )
    return res.data.data
  }, MOCK_EXERCICES.filter((e) => e.residence_id === residenceId))
}

export async function createExercice(
  residenceId: number,
  data: { annee: number; date_ouverture: string },
): Promise<ExerciceComptable> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<ExerciceComptable>>(
      `/gestionnaire/residences/${residenceId}/comptabilite/exercices`,
      data,
    )
    return res.data.data
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    residence_id: residenceId,
    annee: data.annee,
    statut: 'ouvert' as const,
    date_ouverture: data.date_ouverture,
    date_cloture: null,
    seuil_comptable: 0,
  })
}

// Dashboard
export async function getComptaDashboard(exerciceId: number): Promise<ComptabiliteDashboard> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ComptabiliteDashboard>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/dashboard`,
    )
    return res.data.data
  }, MOCK_DASHBOARD)
}

// Écritures
export async function getJournal(
  exerciceId: number,
  params?: { from?: string; to?: string; search?: string },
): Promise<EcritureComptable[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<EcritureComptable[]>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/journal`,
      { params },
    )
    return res.data.data
  }, MOCK_ECRITURES.filter((e) => e.exercice_id === exerciceId))
}

export async function getGrandLivre(
  exerciceId: number,
  compte: string,
): Promise<GrandLivreCompte> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<GrandLivreCompte>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/grand-livre/${compte}`,
    )
    return res.data.data
  }, compte === '6171' ? MOCK_GRAND_LIVRE_6171 : {
    numero: compte,
    libelle: MOCK_COMPTES_PCG.find((c) => c.numero === compte)?.libelle ?? compte,
    solde_ouverture: 0,
    lignes: [],
    solde_final: 0,
  })
}

export async function getBalance(exerciceId: number): Promise<BalanceLigne[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<BalanceLigne[]>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/balance`,
    )
    return res.data.data
  }, MOCK_BALANCE)
}

// Dépenses
export async function getDepenses(exerciceId: number): Promise<Depense[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Depense[]>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/depenses`,
    )
    return res.data.data
  }, MOCK_DEPENSES.filter((d) => d.exercice_id === exerciceId))
}

export async function storeDepense(exerciceId: number, data: FormData): Promise<Depense> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<Depense>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/depenses`,
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    exercice_id: exerciceId,
    titre: (data.get('titre') as string) ?? 'Nouvelle dépense',
    montant: Number(data.get('montant') ?? 0),
    date: (data.get('date') as string) ?? new Date().toISOString().slice(0, 10),
    prestataire_id: null,
    prestataire_nom: (data.get('prestataire') as string) || null,
    compte_charge: (data.get('compte_charge') as string) ?? '6138',
    libelle_compte: MOCK_COMPTES_PCG.find((c) => c.numero === data.get('compte_charge'))?.libelle ?? 'Entretien divers',
    mode_paiement: ((data.get('mode_paiement') as string) ?? 'virement') as Depense['mode_paiement'],
    justificatif_path: null,
    ecriture_id: Math.floor(Math.random() * 1000) + 100,
  })
}

export async function deleteDepense(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/comptabilite/depenses/${id}`)
  }, undefined)
}

// Encaissements
export async function getEncaissements(exerciceId: number): Promise<Encaissement[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Encaissement[]>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/encaissements`,
    )
    return res.data.data
  }, MOCK_ENCAISSEMENTS.filter((e) => e.exercice_id === exerciceId))
}

export async function storeEncaissement(
  exerciceId: number,
  data: {
    coproprietaire_id: number
    montant: number
    date: string
    mode_paiement: 'virement' | 'cheque' | 'especes'
    compte_destination: '5121' | '5122' | '5161'
    reference_cheque?: string
  },
): Promise<Encaissement> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<Encaissement>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/encaissements`,
      data,
    )
    return res.data.data
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    exercice_id: exerciceId,
    coproprietaire_id: data.coproprietaire_id,
    coproprietaire_nom: 'Copropriétaire',
    lot_numero: 'A-XX',
    montant: data.montant,
    date: data.date,
    mode_paiement: data.mode_paiement,
    reference_cheque: data.reference_cheque ?? null,
    compte_destination: data.compte_destination,
    ecriture_id: Math.floor(Math.random() * 1000) + 100,
  })
}

// Import IA
export async function importFactureIa(
  exerciceId: number,
  file: File,
): Promise<ImportIaResult> {
  return withMock(async () => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<ApiEnvelope<ImportIaResult>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/import-ia`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  }, MOCK_IMPORT_IA)
}

// Clôture
export async function cloturerExercice(exerciceId: number): Promise<ExerciceComptable> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<ExerciceComptable>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/cloture`,
    )
    return res.data.data
  }, {
    ...(MOCK_EXERCICES.find((e) => e.id === exerciceId) ?? MOCK_EXERCICES[0]),
    statut: 'clos' as const,
    date_cloture: new Date().toISOString().slice(0, 10),
  })
}

// Plan comptable
export async function getComptesPcg(): Promise<ComptePcg[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ComptePcg[]>>('/gestionnaire/comptabilite/comptes-pcg')
    return res.data.data
  }, MOCK_COMPTES_PCG)
}
