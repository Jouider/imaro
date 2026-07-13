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
  derniers_clients: { id: number; name: string; plan: string; status: string }[]
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
