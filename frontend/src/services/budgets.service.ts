import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS) return call()
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
      { id: 1, categorie: 'maintenance', description: 'Maintenance ascenseurs', montant_prevu: 18000, montant_realise: 9000 },
      { id: 2, categorie: 'nettoyage', description: 'Nettoyage parties communes', montant_prevu: 24000, montant_realise: 10000 },
      { id: 3, categorie: 'gardiennage', description: 'Gardiennage 24h/24', montant_prevu: 36000, montant_realise: 18000 },
      { id: 4, categorie: 'electricite', description: 'Électricité parties communes', montant_prevu: 8000, montant_realise: 3600 },
      { id: 5, categorie: 'assurance', description: 'Assurance immeuble', montant_prevu: 6000, montant_realise: 1900 },
      { id: 6, categorie: 'administratif', description: 'Frais de gestion', montant_prevu: 4000, montant_realise: 0 },
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
      { id: 7, categorie: 'nettoyage', description: 'Nettoyage hebdomadaire', montant_prevu: 24000, montant_realise: 24000 },
      { id: 8, categorie: 'maintenance', description: 'Maintenance générale', montant_prevu: 12000, montant_realise: 11800 },
      { id: 9, categorie: 'electricite', description: 'Éclairage commun', montant_prevu: 6000, montant_realise: 5900 },
      { id: 10, categorie: 'eau', description: 'Eau parties communes', montant_prevu: 4800, montant_realise: 4800 },
      { id: 11, categorie: 'assurance', description: 'Assurance collective', montant_prevu: 14400, montant_realise: 14400 },
      { id: 12, categorie: 'administratif', description: 'Frais syndic', montant_prevu: 10800, montant_realise: 10300 },
    ],
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getBudget(residenceId: number, exerciceId: number): Promise<Budget | null> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ budget: Budget | null }>>(
      `/gestionnaire/residences/${residenceId}/exercices/${exerciceId}/budget`,
    )
    return res.data.data.budget
  }, MOCK_BUDGETS.find((b) => b.residence.id === residenceId) ?? null)
}

export async function storePoste(
  budgetId: number,
  data: { categorie: string; description: string; montant_prevu: number; montant_realise: number },
): Promise<BudgetPoste> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<{ poste: BudgetPoste }>>(
      `/gestionnaire/budgets/${budgetId}/postes`,
      data,
    )
    return res.data.data.poste
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    ...data,
  })
}

export async function updatePoste(
  posteId: number,
  data: Partial<Pick<BudgetPoste, 'categorie' | 'description' | 'montant_prevu' | 'montant_realise'>>,
): Promise<BudgetPoste> {
  return withMock(async () => {
    const res = await api.put<ApiEnvelope<{ poste: BudgetPoste }>>(
      `/gestionnaire/budgets/postes/${posteId}`,
      data,
    )
    return res.data.data.poste
  }, { id: posteId, categorie: '', description: '', montant_prevu: 0, montant_realise: 0, ...data } as BudgetPoste)
}

export async function deletePoste(posteId: number): Promise<void> {
  await withMock(async () => {
    await api.delete(`/gestionnaire/budgets/postes/${posteId}`)
  }, undefined)
}

export async function approveBudget(budgetId: number): Promise<Budget> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<{ budget: Budget }>>(
      `/gestionnaire/budgets/${budgetId}/approuver`,
    )
    return res.data.data.budget
  }, { ...(MOCK_BUDGETS.find((b) => b.id === budgetId) ?? MOCK_BUDGETS[0]), statut: 'approuve' as const })
}

export async function createBudget(data: {
  residence_id: number
  exercice_id: number
}): Promise<Budget> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<{ budget: Budget }>>('/gestionnaire/budgets', data)
    return res.data.data.budget
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    exercice: { id: data.exercice_id, annee: 2026, statut: 'actif' },
    residence: { id: data.residence_id, name: 'Nouvelle résidence' },
    statut: 'brouillon' as const,
    total_prevu: 0,
    total_realise: 0,
    postes: [],
  })
}
