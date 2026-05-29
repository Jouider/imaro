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

export type Prestataire = {
  id: number
  name: string
  specialite: string
  phone: string
  email: string
  adresse: string
  note_satisfaction: number | null
  nb_interventions: number
  statut: 'actif' | 'blackliste'
}

export type Contrat = {
  id: number
  titre: string
  prestataire: { id: number; name: string; specialite: string }
  residence: { id: number; name: string }
  type_contrat: string
  montant_annuel: number
  date_debut: string
  date_fin: string
  statut: 'actif' | 'expire' | 'resilie'
  renouvellement_auto: boolean
  jours_avant_expiration: number
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_PRESTATAIRES: Prestataire[] = [
  {
    id: 1,
    name: 'Ascenseurs Maroc SARL',
    specialite: 'ascenseurs',
    phone: '+212522000001',
    email: 'contact@asc-maroc.ma',
    adresse: '15 Bd Anfa, Casablanca',
    note_satisfaction: 4,
    nb_interventions: 12,
    statut: 'actif',
  },
  {
    id: 2,
    name: 'Électro Maghreb',
    specialite: 'electricite',
    phone: '+212522000002',
    email: 'info@electro-maghreb.ma',
    adresse: '7 Rue Bab Doukkala, Rabat',
    note_satisfaction: 3,
    nb_interventions: 8,
    statut: 'actif',
  },
  {
    id: 3,
    name: 'Propre Net Services',
    specialite: 'proprete',
    phone: '+212522000003',
    email: 'propre@net.ma',
    adresse: '23 Av. Hassan II, Casablanca',
    note_satisfaction: 5,
    nb_interventions: 36,
    statut: 'actif',
  },
  {
    id: 4,
    name: 'Plomb Express',
    specialite: 'plomberie',
    phone: '+212522000004',
    email: 'contact@plombexpress.ma',
    adresse: 'Zone Industrielle, Agadir',
    note_satisfaction: 2,
    nb_interventions: 3,
    statut: 'blackliste',
  },
  {
    id: 5,
    name: 'Sécur Pro Maroc',
    specialite: 'securite',
    phone: '+212522000005',
    email: 'contact@securpro.ma',
    adresse: '44 Bd Mohammed VI, Marrakech',
    note_satisfaction: 4,
    nb_interventions: 24,
    statut: 'actif',
  },
]

const MOCK_CONTRATS: Contrat[] = [
  {
    id: 1,
    titre: 'Contrat maintenance ascenseurs 2026',
    prestataire: {
      id: 1,
      name: 'Ascenseurs Maroc SARL',
      specialite: 'ascenseurs',
    },
    residence: { id: 1, name: 'Atlas Casablanca' },
    type_contrat: 'maintenance',
    montant_annuel: 18000,
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
    statut: 'actif',
    renouvellement_auto: true,
    jours_avant_expiration: 230,
  },
  {
    id: 2,
    titre: 'Nettoyage parties communes — Blanca Rabat',
    prestataire: { id: 3, name: 'Propre Net Services', specialite: 'proprete' },
    residence: { id: 2, name: 'Blanca Rabat' },
    type_contrat: 'nettoyage',
    montant_annuel: 24000,
    date_debut: '2026-01-01',
    date_fin: '2026-06-30',
    statut: 'actif',
    renouvellement_auto: false,
    jours_avant_expiration: 46,
  },
  {
    id: 3,
    titre: 'Gardiennage — Marina Agadir',
    prestataire: { id: 5, name: 'Sécur Pro Maroc', specialite: 'securite' },
    residence: { id: 3, name: 'Marina Agadir' },
    type_contrat: 'gardiennage',
    montant_annuel: 60000,
    date_debut: '2025-07-01',
    date_fin: '2026-06-30',
    statut: 'actif',
    renouvellement_auto: true,
    jours_avant_expiration: 46,
  },
  {
    id: 4,
    titre: 'Contrat électricité 2025',
    prestataire: { id: 2, name: 'Électro Maghreb', specialite: 'electricite' },
    residence: { id: 1, name: 'Atlas Casablanca' },
    type_contrat: 'maintenance',
    montant_annuel: 12000,
    date_debut: '2025-01-01',
    date_fin: '2025-12-31',
    statut: 'expire',
    renouvellement_auto: false,
    jours_avant_expiration: 0,
  },
]

// ─── Service functions ────────────────────────────────────────────────────────

export async function getPrestataires(params?: {
  statut?: string
  specialite?: string
}): Promise<Prestataire[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ prestataires: Prestataire[] }>>(
        '/gestionnaire/prestataires',
        { params },
      )
      return res.data.data.prestataires
    },
    params?.statut
      ? MOCK_PRESTATAIRES.filter((p) => p.statut === params.statut)
      : MOCK_PRESTATAIRES,
  )
}

export async function storePrestataire(data: {
  name: string
  specialite: string
  phone: string
  email: string
  adresse: string
}): Promise<Prestataire> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ prestataire: Prestataire }>>(
        '/gestionnaire/prestataires',
        data,
      )
      return res.data.data.prestataire
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      ...data,
      note_satisfaction: null,
      nb_interventions: 0,
      statut: 'actif' as const,
    },
  )
}

export async function updatePrestataire(
  id: number,
  data: Partial<Prestataire>,
): Promise<Prestataire> {
  const res = await api.put<ApiEnvelope<{ prestataire: Prestataire }>>(
    `/gestionnaire/prestataires/${id}`,
    data,
  )
  return res.data.data.prestataire
}

export async function getContrats(params?: {
  residence_id?: number
  statut?: string
}): Promise<Contrat[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ contrats: Contrat[] }>>(
        '/gestionnaire/contrats',
        { params },
      )
      return res.data.data.contrats
    },
    params?.statut
      ? MOCK_CONTRATS.filter((c) => c.statut === params.statut)
      : MOCK_CONTRATS,
  )
}

export async function storeContrat(data: {
  titre: string
  prestataire_id: number
  residence_id: number
  type_contrat: string
  montant_annuel: number
  date_debut: string
  date_fin: string
  renouvellement_auto: boolean
}): Promise<Contrat> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ contrat: Contrat }>>(
        '/gestionnaire/contrats',
        data,
      )
      return res.data.data.contrat
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      titre: data.titre,
      prestataire: MOCK_PRESTATAIRES.find(
        (p) => p.id === data.prestataire_id,
      ) ?? { id: data.prestataire_id, name: 'Prestataire', specialite: '' },
      residence: { id: data.residence_id, name: 'Résidence' },
      type_contrat: data.type_contrat,
      montant_annuel: data.montant_annuel,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      statut: 'actif' as const,
      renouvellement_auto: data.renouvellement_auto,
      jours_avant_expiration: Math.floor(
        (new Date(data.date_fin).getTime() - Date.now()) / 86_400_000,
      ),
    },
  )
}
