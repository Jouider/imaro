import axios from 'axios'

const TOKEN_KEY = 'imaro_bo_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      if (location.pathname !== '/login') location.assign('/login')
    }
    return Promise.reject(error)
  },
)

// ── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password })
  const token = res.data?.data?.token as string | undefined
  const user = res.data?.data?.user
  if (!token) throw new Error('Réponse de connexion invalide')
  if (user?.role !== 'super_admin')
    throw new Error('Accès réservé aux administrateurs Digitoyou')
  setToken(token)
  return user
}

export function logout() {
  setToken(null)
  location.assign('/login')
}

// ── Types ───────────────────────────────────────────────────────────────────
export type Tenant = {
  id: number
  name: string
  email: string
  subdomain: string
  plan: string
  status: 'trial' | 'active' | 'suspended'
  trial_ends_at: string | null
  nb_residences: number
  nb_users: number
  created_at: string | null
}

export type Metrics = {
  clients: { total: number; actifs: number; essai: number; suspendus: number }
  par_plan: Record<string, number>
  parc: { residences: number; lots: number; utilisateurs: number }
  essais_expirant_7j: number
  usage: {
    utilisateurs_actifs_30j: number
    tickets_ouverts: number
    notifications_30j: number
    nouveaux_clients_30j: number
  }
  derniers_clients: { id: number; name: string; plan: string; status: string }[]
}

export type Quota = {
  ressource: string
  used: number
  limit: number | null
  pct: number | null
  warn: boolean
  over: boolean
}

export type ClientOverview = {
  tenant: {
    id: number
    name: string
    subdomain: string
    plan: string
    plan_label: string
    status: 'trial' | 'active' | 'suspended'
    trial_ends_at: string | null
    created_at: string | null
  }
  usagers: { total: number; actifs_30j: number; par_role: Record<string, number> }
  gestionnaires: {
    total: number
    personnel_terrain: number
    charge: { name: string; residences: number }[]
  }
  parc: {
    residences: number
    lots: number
    coproprietaires: number
    occupants: number
    exercices_actifs: number
  }
  reclamations: {
    total: number
    par_statut: { ouvert: number; en_cours: number; resolu: number; clos: number }
    urgents_ouverts: number
    delai_resolution_moyen_h: number | null
    satisfaction_moyenne: number | null
  }
  finances: {
    exercice_actif: number | null
    appels_total_mad: number
    encaisse_mad: number
    impayes_mad: number
    taux_recouvrement: number | null
  }
  engagement: {
    derniere_activite: string | null
    logins_7j: number
    notifications_30j: { whatsapp: number; sms: number; email: number; echecs: number }
  }
  abonnement: {
    plan: string
    plan_label: string
    status: string
    trial_ends_at: string | null
    storage_limit_mb: number | null
    quotas: Quota[]
  }
}

export type Lead = {
  id: number
  cabinet_nom: string
  contact_nom: string | null
  contact_email: string | null
  contact_telephone: string | null
  ville: string | null
  source: string
  statut: string
  date_demo: string | null
  notes: string | null
  converted_tenant: { id: number; name: string; subdomain: string } | null
  created_at: string | null
}
