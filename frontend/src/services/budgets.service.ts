import { api, type ApiEnvelope } from '@/lib/axios'

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

export type BudgetPoste = {
  id: number
  categorie: string
  description: string
  montant_prevu: number
  montant_realise: number
}

export type Budget = {
  id: number
  exercice: { id: number; annee: number; statut: string }
  residence: { id: number; name: string }
  statut: 'brouillon' | 'approuve'
  total_prevu: number
  total_realise: number
  postes: BudgetPoste[]
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_BUDGETS: Budget[] = [
  {
    id: 1,
    exercice: { id: 1, annee: 2026, statut: 'actif' },
    residence: { id: 1, name: 'Atlas Casablanca' },
    statut: 'brouillon',
    total_prevu: 96000,
    total_realise: 42500,
    postes: [
      {
        id: 1,
        categorie: 'maintenance',
        description: 'Maintenance ascenseurs',
        montant_prevu: 18000,
        montant_realise: 9000,
      },
      {
        id: 2,
        categorie: 'nettoyage',
        description: 'Nettoyage parties communes',
        montant_prevu: 24000,
        montant_realise: 10000,
      },
      {
        id: 3,
        categorie: 'gardiennage',
        description: 'Gardiennage 24h/24',
        montant_prevu: 36000,
        montant_realise: 18000,
      },
      {
        id: 4,
        categorie: 'electricite',
        description: 'Électricité parties communes',
        montant_prevu: 8000,
        montant_realise: 3600,
      },
      {
        id: 5,
        categorie: 'assurance',
        description: 'Assurance immeuble',
        montant_prevu: 6000,
        montant_realise: 1900,
      },
      {
        id: 6,
        categorie: 'administratif',
        description: 'Frais de gestion',
        montant_prevu: 4000,
        montant_realise: 0,
      },
    ],
  },
  {
    id: 2,
    exercice: { id: 1, annee: 2026, statut: 'actif' },
    residence: { id: 2, name: 'Blanca Rabat' },
    statut: 'approuve',
    total_prevu: 72000,
    total_realise: 71200,
    postes: [
      {
        id: 7,
        categorie: 'nettoyage',
        description: 'Nettoyage hebdomadaire',
        montant_prevu: 24000,
        montant_realise: 24000,
      },
      {
        id: 8,
        categorie: 'maintenance',
        description: 'Maintenance générale',
        montant_prevu: 12000,
        montant_realise: 11800,
      },
      {
        id: 9,
        categorie: 'electricite',
        description: 'Éclairage commun',
        montant_prevu: 6000,
        montant_realise: 5900,
      },
      {
        id: 10,
        categorie: 'eau',
        description: 'Eau parties communes',
        montant_prevu: 4800,
        montant_realise: 4800,
      },
      {
        id: 11,
        categorie: 'assurance',
        description: 'Assurance collective',
        montant_prevu: 14400,
        montant_realise: 14400,
      },
      {
        id: 12,
        categorie: 'administratif',
        description: 'Frais syndic',
        montant_prevu: 10800,
        montant_realise: 10300,
      },
    ],
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getBudget(
  residenceId: number,
  exerciceId: number,
): Promise<Budget | null> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ budget: Budget | null }>>(
        `/gestionnaire/residences/${residenceId}/exercices/${exerciceId}/budget`,
      )
      return res.data.data.budget
    },
    MOCK_BUDGETS.find((b) => b.residence.id === residenceId) ?? null,
  )
}

export async function storePoste(
  budgetId: number,
  data: {
    categorie: string
    description: string
    montant_prevu: number
    montant_realise: number
  },
): Promise<BudgetPoste> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ poste: BudgetPoste }>>(
        `/gestionnaire/budgets/${budgetId}/postes`,
        data,
      )
      return res.data.data.poste
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      ...data,
    },
  )
}

export async function updatePoste(
  posteId: number,
  data: Partial<
    Pick<
      BudgetPoste,
      'categorie' | 'description' | 'montant_prevu' | 'montant_realise'
    >
  >,
): Promise<BudgetPoste> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ poste: BudgetPoste }>>(
        `/gestionnaire/budgets/postes/${posteId}`,
        data,
      )
      return res.data.data.poste
    },
    {
      id: posteId,
      categorie: '',
      description: '',
      montant_prevu: 0,
      montant_realise: 0,
      ...data,
    } as BudgetPoste,
  )
}

export async function deletePoste(posteId: number): Promise<void> {
  await withMock(async () => {
    await api.delete(`/gestionnaire/budgets/postes/${posteId}`)
  }, undefined)
}

export async function approveBudget(budgetId: number): Promise<Budget> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ budget: Budget }>>(
        `/gestionnaire/budgets/${budgetId}/approuver`,
      )
      return res.data.data.budget
    },
    {
      ...(MOCK_BUDGETS.find((b) => b.id === budgetId) ?? MOCK_BUDGETS[0]),
      statut: 'approuve' as const,
    },
  )
}

export async function createBudget(data: {
  residence_id: number
  exercice_id: number
}): Promise<Budget> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ budget: Budget }>>(
        '/gestionnaire/budgets',
        data,
      )
      return res.data.data.budget
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      exercice: { id: data.exercice_id, annee: 2026, statut: 'actif' },
      residence: { id: data.residence_id, name: 'Nouvelle résidence' },
      statut: 'brouillon' as const,
      total_prevu: 0,
      total_realise: 0,
      postes: [],
    },
  )
}

// ─── New Annexe 5 types ───────────────────────────────────────────────────────

export type LigneBudget = {
  id: number
  budget_id: number
  compte_pcg: string
  libelle: string
  type:
    | 'charge_courante'
    | 'charge_travaux'
    | 'produit_courant'
    | 'produit_travaux'
  realise_n1: number
  budget_n: number
  engagement: number
  realise: number
  pct_consomme: number
  ordre: number
  // Optional prestataire linking fields
  prestataire_id?: number
  contrat_id?: number
  nombre?: number
  prix_unitaire?: number
  date_debut?: string
  date_fin?: string
}

export type BudgetAnnexe5 = {
  id: number
  exercice: { id: number; annee: number; statut: string }
  residence: { id: number; name: string }
  statut: 'brouillon' | 'soumis_ag' | 'approuve' | 'verrouille'
  version: number
  total_charges: number
  total_produits: number
  resultat: number
  lignes: LigneBudget[]
}

export type SimulationCotisation = {
  budget_charges_total: number
  lots: Array<{
    lot_numero: string
    coproprietaire_nom: string
    tantieme: number
    pct: number
    cotisation_annuelle: number
    cotisation_mensuelle: number
    variation_vs_n1: number
  }>
}

export type SuggestionIa = {
  compte_pcg: string
  libelle: string
  montant_suggere: number
  montant_n1: number
  variation_pct: number
  justification: string
}

// ─── Mock data for Annexe 5 ───────────────────────────────────────────────────

const MOCK_LIGNES_BUDGET: LigneBudget[] = [
  {
    id: 1,
    budget_id: 10,
    compte_pcg: '6111',
    libelle: 'Gardiennage/Surveillance',
    type: 'charge_courante',
    realise_n1: 38000,
    budget_n: 42000,
    engagement: 7000,
    realise: 14000,
    pct_consomme: 33,
    ordre: 1,
  },
  {
    id: 2,
    budget_id: 10,
    compte_pcg: '6131',
    libelle: 'Maintenance ascenseur',
    type: 'charge_courante',
    realise_n1: 28000,
    budget_n: 32000,
    engagement: 5600,
    realise: 11200,
    pct_consomme: 35,
    ordre: 2,
  },
  {
    id: 3,
    budget_id: 10,
    compte_pcg: '6140',
    libelle: 'Électricité parties communes',
    type: 'charge_courante',
    realise_n1: 12000,
    budget_n: 14000,
    engagement: 2400,
    realise: 4800,
    pct_consomme: 34,
    ordre: 3,
  },
  {
    id: 4,
    budget_id: 10,
    compte_pcg: '6161',
    libelle: 'Assurances',
    type: 'charge_courante',
    realise_n1: 20000,
    budget_n: 22000,
    engagement: 2400,
    realise: 2400,
    pct_consomme: 11,
    ordre: 4,
  },
  {
    id: 5,
    budget_id: 10,
    compte_pcg: '6171',
    libelle: 'Nettoyage parties communes',
    type: 'charge_courante',
    realise_n1: 16000,
    budget_n: 18000,
    engagement: 3000,
    realise: 6000,
    pct_consomme: 33,
    ordre: 5,
  },
  {
    id: 6,
    budget_id: 10,
    compte_pcg: '6138',
    libelle: 'Ravalement de façade',
    type: 'charge_travaux',
    realise_n1: 0,
    budget_n: 50000,
    engagement: 15000,
    realise: 0,
    pct_consomme: 0,
    ordre: 6,
  },
  {
    id: 7,
    budget_id: 10,
    compte_pcg: '6131',
    libelle: 'Réfection toiture',
    type: 'charge_travaux',
    realise_n1: 0,
    budget_n: 30000,
    engagement: 0,
    realise: 0,
    pct_consomme: 0,
    ordre: 7,
  },
  {
    id: 8,
    budget_id: 10,
    compte_pcg: '7111',
    libelle: 'Cotisations copropriétaires',
    type: 'produit_courant',
    realise_n1: 114000,
    budget_n: 128000,
    engagement: 0,
    realise: 38400,
    pct_consomme: 30,
    ordre: 8,
  },
  {
    id: 9,
    budget_id: 10,
    compte_pcg: '7113',
    libelle: 'Appels de fonds travaux',
    type: 'produit_travaux',
    realise_n1: 0,
    budget_n: 80000,
    engagement: 0,
    realise: 0,
    pct_consomme: 0,
    ordre: 9,
  },
]

const MOCK_BUDGET_ANNEXE5: BudgetAnnexe5 = {
  id: 10,
  exercice: { id: 1, annee: 2026, statut: 'actif' },
  residence: { id: 1, name: 'Atlas Casablanca' },
  statut: 'brouillon',
  version: 1,
  total_charges: 128000,
  total_produits: 208000,
  resultat: 80000,
  lignes: MOCK_LIGNES_BUDGET,
}

const MOCK_SIMULATION: SimulationCotisation = {
  budget_charges_total: 128000,
  lots: [
    {
      lot_numero: 'A-01',
      coproprietaire_nom: 'Hassan Benali',
      tantieme: 45,
      pct: 4.5,
      cotisation_annuelle: 5760,
      cotisation_mensuelle: 480,
      variation_vs_n1: 8.5,
    },
    {
      lot_numero: 'A-02',
      coproprietaire_nom: 'Fatima Chraibi',
      tantieme: 42,
      pct: 4.2,
      cotisation_annuelle: 5376,
      cotisation_mensuelle: 448,
      variation_vs_n1: 8.5,
    },
    {
      lot_numero: 'A-03',
      coproprietaire_nom: 'Youssef Tazi',
      tantieme: 38,
      pct: 3.8,
      cotisation_annuelle: 4864,
      cotisation_mensuelle: 405,
      variation_vs_n1: 8.5,
    },
    {
      lot_numero: 'A-04',
      coproprietaire_nom: 'Nadia Berrada',
      tantieme: 38,
      pct: 3.8,
      cotisation_annuelle: 4864,
      cotisation_mensuelle: 405,
      variation_vs_n1: 8.5,
    },
    {
      lot_numero: 'A-05',
      coproprietaire_nom: 'Omar Fassi',
      tantieme: 35,
      pct: 3.5,
      cotisation_annuelle: 4480,
      cotisation_mensuelle: 373,
      variation_vs_n1: 8.5,
    },
  ],
}

const MOCK_SUGGESTIONS_IA: SuggestionIa[] = [
  {
    compte_pcg: '6111',
    libelle: 'Gardiennage/Surveillance',
    montant_suggere: 44000,
    montant_n1: 38000,
    variation_pct: 15.8,
    justification:
      'Hausse du SMIG 2026 impactant le coût des agents de sécurité (+15%)',
  },
  {
    compte_pcg: '6131',
    libelle: 'Maintenance ascenseur',
    montant_suggere: 33500,
    montant_n1: 28000,
    variation_pct: 19.6,
    justification:
      'Contrat Kone Maroc renouvelé avec révision annuelle de 5% + visite réglementaire supplémentaire',
  },
  {
    compte_pcg: '6140',
    libelle: 'Électricité',
    montant_suggere: 15000,
    montant_n1: 12000,
    variation_pct: 25.0,
    justification:
      "Révision des tarifs ONEE prévue au T2 2026 (+15%) + installation d'éclairage LED (ROI 18 mois)",
  },
  {
    compte_pcg: '6161',
    libelle: 'Assurances',
    montant_suggere: 23000,
    montant_n1: 20000,
    variation_pct: 15.0,
    justification:
      'Renouvellement police AXA avec extension RCO et majoration indice BTP 2026',
  },
  {
    compte_pcg: '6171',
    libelle: 'Nettoyage',
    montant_suggere: 18500,
    montant_n1: 16000,
    variation_pct: 15.6,
    justification:
      "Appel d'offres 2026 — 3 offres reçues, recommandation prestataire actuel + fréquence espaces verts",
  },
]

// ─── New service functions for Annexe 5 ──────────────────────────────────────

export async function getBudgetAnnexe5(
  residenceId: number,
  exerciceId: number,
): Promise<BudgetAnnexe5 | null> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<BudgetAnnexe5 | null>>(
        `/gestionnaire/residences/${residenceId}/exercices/${exerciceId}/budget-annexe5`,
      )
      return res.data.data
    },
    residenceId === 1 ? MOCK_BUDGET_ANNEXE5 : null,
  )
}

export async function updateLigneBudget(
  ligneId: number,
  budget_n: number,
): Promise<LigneBudget> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<LigneBudget>>(
        `/gestionnaire/budgets/lignes/${ligneId}`,
        { budget_n },
      )
      return res.data.data
    },
    {
      ...(MOCK_LIGNES_BUDGET.find((l) => l.id === ligneId) ??
        MOCK_LIGNES_BUDGET[0]),
      budget_n,
      pct_consomme:
        budget_n > 0
          ? Math.round(
              ((MOCK_LIGNES_BUDGET.find((l) => l.id === ligneId)?.realise ??
                0) /
                budget_n) *
                100,
            )
          : 0,
    },
  )
}

export async function bulkUpdateLignes(
  budgetId: number,
  lignes: Array<{ id: number; budget_n: number }>,
): Promise<LigneBudget[]> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<LigneBudget[]>>(
        `/gestionnaire/budgets/${budgetId}/lignes/bulk`,
        { lignes },
      )
      return res.data.data
    },
    lignes.map((l) => ({
      ...(MOCK_LIGNES_BUDGET.find((ml) => ml.id === l.id) ??
        MOCK_LIGNES_BUDGET[0]),
      budget_n: l.budget_n,
    })),
  )
}

export async function ajouterLigne(
  budgetId: number,
  data: Partial<LigneBudget>,
): Promise<LigneBudget> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<LigneBudget>>(
        `/gestionnaire/budgets/${budgetId}/lignes`,
        data,
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      budget_id: budgetId,
      compte_pcg: data.compte_pcg ?? '6138',
      libelle: data.libelle ?? 'Nouvelle ligne',
      type: data.type ?? 'charge_courante',
      realise_n1: data.realise_n1 ?? 0,
      budget_n: data.budget_n ?? 0,
      engagement: 0,
      realise: 0,
      pct_consomme: 0,
      ordre: data.ordre ?? 99,
    },
  )
}

export async function supprimerLigne(ligneId: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/budgets/lignes/${ligneId}`)
  }, undefined)
}

export async function soumettreBudgetAg(
  budgetId: number,
): Promise<BudgetAnnexe5> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BudgetAnnexe5>>(
        `/gestionnaire/budgets/${budgetId}/soumettre-ag`,
      )
      return res.data.data
    },
    { ...MOCK_BUDGET_ANNEXE5, statut: 'soumis_ag' as const },
  )
}

export async function verrouillerBudget(
  budgetId: number,
): Promise<BudgetAnnexe5> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BudgetAnnexe5>>(
        `/gestionnaire/budgets/${budgetId}/verrouiller`,
      )
      return res.data.data
    },
    { ...MOCK_BUDGET_ANNEXE5, statut: 'verrouille' as const },
  )
}

export async function getSimulationCotisation(
  budgetId: number,
): Promise<SimulationCotisation> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<SimulationCotisation>>(
      `/gestionnaire/budgets/${budgetId}/simulation`,
    )
    return res.data.data
  }, MOCK_SIMULATION)
}

export async function getSuggestionsIa(
  budgetId: number,
): Promise<SuggestionIa[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<SuggestionIa[]>>(
      `/gestionnaire/budgets/${budgetId}/suggestions-ia`,
    )
    return res.data.data
  }, MOCK_SUGGESTIONS_IA)
}
