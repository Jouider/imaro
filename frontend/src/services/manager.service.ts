import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
// In dev, if the backend is unreachable the functions return mock data silently.

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManagerDashboard = {
  nb_residences: number
  nb_gestionnaires: number
  total_encaissements: number
  total_depenses: number
  solde: number
}

export type ManagerResidence = {
  id: number
  name: string
  adresse: string
  ville: string
  nb_lots: number
  nb_coproprietaires: number
  gestionnaire_id: number | null
  gestionnaire_nom: string | null
  statut: string
  created_at: string
}

export type ManagerGestionnaire = {
  id: number
  name: string
  email: string
  phone: string | null
  nb_residences: number
  statut: 'actif' | 'inactif'
  created_at: string
}

// ─── Mock data (dev fallback) ─────────────────────────────────────────────────

const MOCK_DASHBOARD: ManagerDashboard = {
  nb_residences: 12,
  nb_gestionnaires: 4,
  total_encaissements: 484200,
  total_depenses: 312500,
  solde: 171700,
}

const MOCK_RESIDENCES: ManagerResidence[] = [
  {
    id: 1,
    name: 'Résidence Atlas',
    adresse: '12 rue des Orangers',
    ville: 'Casablanca',
    nb_lots: 48,
    nb_coproprietaires: 42,
    gestionnaire_id: 1,
    gestionnaire_nom: 'Hassan Alaoui',
    statut: 'active',
    created_at: '2024-01-15T08:00:00Z',
  },
  {
    id: 2,
    name: 'Résidence Anfa',
    adresse: "8 boulevard de l'Océan",
    ville: 'Casablanca',
    nb_lots: 36,
    nb_coproprietaires: 31,
    gestionnaire_id: 1,
    gestionnaire_nom: 'Hassan Alaoui',
    statut: 'active',
    created_at: '2024-03-22T08:00:00Z',
  },
  {
    id: 3,
    name: 'Marina Tower',
    adresse: 'Boulevard Marina',
    ville: 'Rabat',
    nb_lots: 84,
    nb_coproprietaires: 78,
    gestionnaire_id: 2,
    gestionnaire_nom: 'Salma Bennani',
    statut: 'active',
    created_at: '2024-06-01T08:00:00Z',
  },
  {
    id: 4,
    name: 'Résidence Al Blanca',
    adresse: '5 rue Ibn Sina',
    ville: 'Casablanca',
    nb_lots: 24,
    nb_coproprietaires: 22,
    gestionnaire_id: null,
    gestionnaire_nom: null,
    statut: 'active',
    created_at: '2025-02-10T08:00:00Z',
  },
]

const MOCK_GESTIONNAIRES: ManagerGestionnaire[] = [
  {
    id: 1,
    name: 'Hassan Alaoui',
    email: 'hassan.alaoui@imaro.ma',
    phone: '+212661234567',
    nb_residences: 6,
    statut: 'actif',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    name: 'Salma Bennani',
    email: 'salma.bennani@imaro.ma',
    phone: '+212662345678',
    nb_residences: 4,
    statut: 'actif',
    created_at: '2024-02-15T08:00:00Z',
  },
  {
    id: 3,
    name: 'Karim El Fassi',
    email: 'karim.elfassi@imaro.ma',
    phone: '+212663456789',
    nb_residences: 2,
    statut: 'actif',
    created_at: '2024-09-01T08:00:00Z',
  },
  {
    id: 4,
    name: 'Nadia Tazi',
    email: 'nadia.tazi@imaro.ma',
    phone: null,
    nb_residences: 0,
    statut: 'inactif',
    created_at: '2025-01-05T08:00:00Z',
  },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getManagerDashboard(): Promise<ManagerDashboard> {
  return withMock(async () => {
    const res =
      await api.get<ApiEnvelope<ManagerDashboard>>('/manager/dashboard')
    return res.data.data
  }, MOCK_DASHBOARD)
}

// ─── Résidences ───────────────────────────────────────────────────────────────

export async function getManagerResidences(): Promise<ManagerResidence[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ManagerResidence[]>>(
      '/manager/residences',
    )
    return res.data.data
  }, MOCK_RESIDENCES)
}

export type CreateResidenceInput = {
  name: string
  address: string
  city: string
  gestionnaire_id?: number | null
}

export async function createManagerResidence(
  input: CreateResidenceInput,
): Promise<ManagerResidence> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ManagerResidence>>(
        '/manager/residences',
        input,
      )
      return res.data.data
    },
    {
      id: Date.now(),
      name: input.name,
      adresse: input.address,
      ville: input.city,
      nb_lots: 0,
      nb_coproprietaires: 0,
      gestionnaire_id: input.gestionnaire_id ?? null,
      gestionnaire_nom: null,
      statut: 'active',
      created_at: new Date().toISOString(),
    },
  )
}

export type UpdateResidenceInput = Partial<CreateResidenceInput>

export async function updateManagerResidence(
  id: number,
  input: UpdateResidenceInput,
): Promise<ManagerResidence> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<ManagerResidence>>(
        `/manager/residences/${id}`,
        input,
      )
      return res.data.data
    },
    {
      ...MOCK_RESIDENCES[0],
      id,
      name: input.name ?? MOCK_RESIDENCES[0].name,
      adresse: input.address ?? MOCK_RESIDENCES[0].adresse,
      ville: input.city ?? MOCK_RESIDENCES[0].ville,
    },
  )
}

export async function deleteManagerResidence(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/manager/residences/${id}`)
  }, undefined)
}

export async function assignGestionnaireToResidence(
  residenceId: number,
  gestionnaireId: number,
): Promise<ManagerResidence> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ManagerResidence>>(
        `/manager/residences/${residenceId}/assign-gestionnaire`,
        { gestionnaire_id: gestionnaireId },
      )
      return res.data.data
    },
    {
      ...MOCK_RESIDENCES[0],
      id: residenceId,
      gestionnaire_id: gestionnaireId,
      gestionnaire_nom:
        MOCK_GESTIONNAIRES.find((g) => g.id === gestionnaireId)?.name ?? null,
    },
  )
}

// ─── Gestionnaires ────────────────────────────────────────────────────────────

export async function getManagerGestionnaires(): Promise<
  ManagerGestionnaire[]
> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ManagerGestionnaire[]>>(
      '/manager/gestionnaires',
    )
    return res.data.data
  }, MOCK_GESTIONNAIRES)
}

export type CreateGestionnaireInput = {
  name: string
  email: string
  phone?: string | null
}

export async function createManagerGestionnaire(
  input: CreateGestionnaireInput,
): Promise<ManagerGestionnaire> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ManagerGestionnaire>>(
        '/manager/gestionnaires',
        input,
      )
      return res.data.data
    },
    {
      id: Date.now(),
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      nb_residences: 0,
      statut: 'actif',
      created_at: new Date().toISOString(),
    },
  )
}

export type UpdateGestionnaireInput = Partial<CreateGestionnaireInput> & {
  is_active?: boolean
}

export async function updateManagerGestionnaire(
  id: number,
  input: UpdateGestionnaireInput,
): Promise<ManagerGestionnaire> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<ManagerGestionnaire>>(
        `/manager/gestionnaires/${id}`,
        input,
      )
      return res.data.data
    },
    {
      ...MOCK_GESTIONNAIRES[0],
      id,
      name: input.name ?? MOCK_GESTIONNAIRES[0].name,
      email: input.email ?? MOCK_GESTIONNAIRES[0].email,
      phone:
        input.phone !== undefined ? input.phone : MOCK_GESTIONNAIRES[0].phone,
      statut:
        input.is_active === false ? 'inactif' : MOCK_GESTIONNAIRES[0].statut,
    },
  )
}
