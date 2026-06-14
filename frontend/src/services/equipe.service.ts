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

// ─── App users (membres qui gèrent l'application) ──────────────────────────────

/** Rôles applicatifs — personnes qui opèrent l'app Imaro. */
export type AppRole =
  | 'administrateur'
  | 'gestionnaire'
  | 'assistant'
  | 'comptable'

export const APP_ROLES: AppRole[] = [
  'administrateur',
  'gestionnaire',
  'assistant',
  'comptable',
]

/** Permissions modulaires accordables à un utilisateur de l'app. */
export type AppPermission =
  | 'residences'
  | 'coproprietaires'
  | 'finances'
  | 'depenses'
  | 'recouvrement'
  | 'assemblees'
  | 'documents'
  | 'personnel'
  | 'parametres'

export const APP_PERMISSIONS: AppPermission[] = [
  'residences',
  'coproprietaires',
  'finances',
  'depenses',
  'recouvrement',
  'assemblees',
  'documents',
  'personnel',
  'parametres',
]

/**
 * Permissions pré-cochées par défaut selon le rôle choisi.
 * Servent de point de départ éditable lors de la création / modification.
 */
export const ROLE_PERMISSION_PRESETS: Record<AppRole, AppPermission[]> = {
  // Accès complet à tous les modules
  administrateur: [...APP_PERMISSIONS],
  // Gestion opérationnelle des résidences (sans paramètres système)
  gestionnaire: [
    'residences',
    'coproprietaires',
    'finances',
    'depenses',
    'recouvrement',
    'assemblees',
    'documents',
    'personnel',
  ],
  // Assistant — saisie courante, pas de finance sensible ni paramètres
  assistant: ['residences', 'coproprietaires', 'assemblees', 'documents'],
  // Comptable — volet financier uniquement
  comptable: ['finances', 'depenses', 'recouvrement', 'documents'],
}

export type AppUser = {
  id: number
  name: string
  email: string
  role: AppRole
  permissions: AppPermission[]
  /** Résidences gérées par le membre. Vide = toutes les copropriétés. */
  residence_ids: number[]
  statut: 'actif' | 'inactif'
  created_at: string
}

// ─── Personnel de résidence (staff de terrain) ─────────────────────────────────

/** Postes du personnel de terrain affecté à une résidence. */
export type StaffPoste =
  | 'securite'
  | 'menage'
  | 'gardien'
  | 'jardinier'
  | 'technicien'
  | 'concierge'

export const STAFF_POSTES: StaffPoste[] = [
  'securite',
  'menage',
  'gardien',
  'jardinier',
  'technicien',
  'concierge',
]

/** Permissions opérationnelles accordables au personnel de terrain. */
export type StaffPermission =
  | 'acces_residence'
  | 'gestion_visiteurs'
  | 'pointage'
  | 'incidents'
  | 'cles'
  | 'livraisons'

export const STAFF_PERMISSIONS: StaffPermission[] = [
  'acces_residence',
  'gestion_visiteurs',
  'pointage',
  'incidents',
  'cles',
  'livraisons',
]

export type ResidenceStaff = {
  id: number
  name: string
  poste: StaffPoste
  residence_id: number
  residence_nom: string
  phone: string | null
  permissions: StaffPermission[]
  statut: 'actif' | 'inactif'
  created_at: string
}

// ─── Password generator ─────────────────────────────────────────────────────

/**
 * Génère un mot de passe robuste (12 caractères : maj, min, chiffres, symboles).
 * Utilisé lors de la création d'un utilisateur de l'app.
 */
export function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*?'
  const all = upper + lower + digits + symbols
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  // Garantir au moins un de chaque catégorie
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  const rest = Array.from(
    { length: Math.max(0, length - required.length) },
    () => pick(all),
  )
  return [...required, ...rest].sort(() => Math.random() - 0.5).join('')
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_USERS: AppUser[] = [
  {
    id: 1,
    name: 'Hassan Alaoui',
    email: 'hassan.alaoui@imaro.ma',
    role: 'administrateur',
    permissions: [...APP_PERMISSIONS],
    residence_ids: [],
    statut: 'actif',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    name: 'Salma Bennani',
    email: 'salma.bennani@imaro.ma',
    role: 'gestionnaire',
    permissions: ['residences', 'coproprietaires', 'finances', 'assemblees'],
    residence_ids: [1, 2],
    statut: 'actif',
    created_at: '2024-02-15T08:00:00Z',
  },
  {
    id: 3,
    name: 'Karim El Fassi',
    email: 'karim.elfassi@imaro.ma',
    role: 'comptable',
    permissions: ['finances', 'depenses', 'recouvrement', 'documents'],
    residence_ids: [],
    statut: 'actif',
    created_at: '2024-09-01T08:00:00Z',
  },
  {
    id: 4,
    name: 'Nadia Tazi',
    email: 'nadia.tazi@imaro.ma',
    role: 'assistant',
    permissions: ['residences', 'coproprietaires', 'assemblees', 'documents'],
    residence_ids: [3],
    statut: 'inactif',
    created_at: '2025-01-05T08:00:00Z',
  },
]

const MOCK_STAFF: ResidenceStaff[] = [
  {
    id: 1,
    name: 'Mohammed Ouahbi',
    poste: 'securite',
    residence_id: 1,
    residence_nom: 'Résidence Atlas',
    phone: '+212661112233',
    permissions: ['acces_residence', 'gestion_visiteurs', 'incidents'],
    statut: 'actif',
    created_at: '2024-03-01T08:00:00Z',
  },
  {
    id: 2,
    name: 'Fatima Zahra',
    poste: 'menage',
    residence_id: 1,
    residence_nom: 'Résidence Atlas',
    phone: '+212662223344',
    permissions: ['acces_residence'],
    statut: 'actif',
    created_at: '2024-04-12T08:00:00Z',
  },
  {
    id: 3,
    name: 'Brahim Sefraoui',
    poste: 'gardien',
    residence_id: 2,
    residence_nom: 'Résidence Anfa',
    phone: '+212663334455',
    permissions: ['acces_residence', 'gestion_visiteurs', 'cles', 'livraisons'],
    statut: 'actif',
    created_at: '2024-05-20T08:00:00Z',
  },
  {
    id: 4,
    name: 'Youssef Amrani',
    poste: 'technicien',
    residence_id: 3,
    residence_nom: 'Marina Tower',
    phone: null,
    permissions: ['acces_residence', 'incidents'],
    statut: 'inactif',
    created_at: '2025-02-08T08:00:00Z',
  },
]

// ─── Utilisateurs de l'app — CRUD ───────────────────────────────────────────

export async function getAppUsers(): Promise<AppUser[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<AppUser[]>>('/equipe/utilisateurs')
    return res.data.data
  }, MOCK_USERS)
}

export type CreateAppUserInput = {
  name: string
  email: string
  password: string
  role: AppRole
  permissions: AppPermission[]
  residence_ids: number[]
}

export async function createAppUser(
  input: CreateAppUserInput,
): Promise<AppUser> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<AppUser>>(
        '/equipe/utilisateurs',
        input,
      )
      return res.data.data
    },
    {
      id: Date.now(),
      name: input.name,
      email: input.email,
      role: input.role,
      permissions: input.permissions,
      residence_ids: input.residence_ids,
      statut: 'actif',
      created_at: new Date().toISOString(),
    },
  )
}

export type UpdateAppUserInput = {
  name?: string
  email?: string
  role?: AppRole
  permissions?: AppPermission[]
  residence_ids?: number[]
  is_active?: boolean
  password?: string
}

export async function updateAppUser(
  id: number,
  input: UpdateAppUserInput,
): Promise<AppUser> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<AppUser>>(
        `/equipe/utilisateurs/${id}`,
        input,
      )
      return res.data.data
    },
    {
      ...MOCK_USERS[0],
      id,
      name: input.name ?? MOCK_USERS[0].name,
      email: input.email ?? MOCK_USERS[0].email,
      role: input.role ?? MOCK_USERS[0].role,
      permissions: input.permissions ?? MOCK_USERS[0].permissions,
      residence_ids: input.residence_ids ?? MOCK_USERS[0].residence_ids,
      statut:
        input.is_active === false
          ? 'inactif'
          : input.is_active === true
            ? 'actif'
            : MOCK_USERS[0].statut,
    },
  )
}

export async function deleteAppUser(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/equipe/utilisateurs/${id}`)
  }, undefined)
}

// ─── Personnel de résidence — CRUD ──────────────────────────────────────────

export async function getResidenceStaff(): Promise<ResidenceStaff[]> {
  return withMock(async () => {
    const res =
      await api.get<ApiEnvelope<ResidenceStaff[]>>('/equipe/personnel')
    return res.data.data
  }, MOCK_STAFF)
}

export type CreateStaffInput = {
  name: string
  poste: StaffPoste
  /** Required + unique — the backend generates the access code and sends it. */
  phone: string
  residence_id: number
  permissions: StaffPermission[]
}

/**
 * Create response — the staff record plus `code_apercu`: a masked preview of
 * the generated access code (e.g. `AB••••••`). The full code is never returned;
 * it is delivered to the staff member via WhatsApp → SMS → email (KAN-52).
 */
export type CreateStaffResult = ResidenceStaff & { code_apercu?: string }

export async function createResidenceStaff(
  input: CreateStaffInput,
  residenceNom: string,
): Promise<CreateStaffResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<CreateStaffResult>>(
        '/equipe/personnel',
        input,
      )
      return res.data.data
    },
    {
      id: Date.now(),
      name: input.name,
      poste: input.poste,
      residence_id: input.residence_id,
      residence_nom: residenceNom,
      phone: input.phone,
      permissions: input.permissions,
      statut: 'actif',
      created_at: new Date().toISOString(),
      code_apercu: 'AB••••••',
    },
  )
}

export type UpdateStaffInput = {
  name?: string
  poste?: StaffPoste
  residence_id?: number
  phone?: string | null
  permissions?: StaffPermission[]
  is_active?: boolean
}

export async function updateResidenceStaff(
  id: number,
  input: UpdateStaffInput,
  residenceNom?: string,
): Promise<ResidenceStaff> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<ResidenceStaff>>(
        `/equipe/personnel/${id}`,
        input,
      )
      return res.data.data
    },
    {
      ...MOCK_STAFF[0],
      id,
      name: input.name ?? MOCK_STAFF[0].name,
      poste: input.poste ?? MOCK_STAFF[0].poste,
      residence_id: input.residence_id ?? MOCK_STAFF[0].residence_id,
      residence_nom: residenceNom ?? MOCK_STAFF[0].residence_nom,
      phone: input.phone !== undefined ? input.phone : MOCK_STAFF[0].phone,
      permissions: input.permissions ?? MOCK_STAFF[0].permissions,
      statut:
        input.is_active === false
          ? 'inactif'
          : input.is_active === true
            ? 'actif'
            : MOCK_STAFF[0].statut,
    },
  )
}

export async function deleteResidenceStaff(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/equipe/personnel/${id}`)
  }, undefined)
}
