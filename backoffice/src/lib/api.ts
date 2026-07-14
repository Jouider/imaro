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

export type MetricPoint = { label: string; value: number }

export type Metrics = {
  clients: { total: number; actifs: number; essai: number; suspendus: number }
  par_plan: Record<string, number>
  parc: { residences: number; lots: number; utilisateurs: number }
  essais_expirant_7j: number
  derniers_clients: { id: number; name: string; plan: string; status: string }[]
  // KPIs business (KAN-139) — optionnels tant que MetricsController ne les
  // expose pas ; complétés par un mock en dev (voir getMetrics).
  mrr?: number
  arr?: number
  mrr_precedent?: number
  revenus_mois?: number
  churn_pct?: number
  conversion_pct?: number
  evolution_mrr?: MetricPoint[]
  nouveaux_tenants?: MetricPoint[]
}

/**
 * KPIs business simulés tant que `GET /admin/metrics` (KAN-139, back) ne les
 * renvoie pas. Les vraies valeurs de l'API priment (voir getMetrics).
 */
const MOCK_BUSINESS_METRICS: Partial<Metrics> = {
  mrr: 48600,
  arr: 583200,
  mrr_precedent: 45200,
  revenus_mois: 51200,
  churn_pct: 2.4,
  conversion_pct: 31,
  evolution_mrr: [
    { label: 'Jan', value: 32000 },
    { label: 'Fév', value: 35500 },
    { label: 'Mar', value: 38200 },
    { label: 'Avr', value: 41000 },
    { label: 'Mai', value: 45200 },
    { label: 'Jun', value: 48600 },
  ],
  nouveaux_tenants: [
    { label: 'Jan', value: 3 },
    { label: 'Fév', value: 2 },
    { label: 'Mar', value: 4 },
    { label: 'Avr', value: 3 },
    { label: 'Mai', value: 5 },
    { label: 'Jun', value: 4 },
  ],
}

/** Mock complet (base + business) — repli dev quand l'API n'est pas joignable. */
const MOCK_METRICS: Metrics = {
  clients: { total: 24, actifs: 18, essai: 4, suspendus: 2 },
  par_plan: { starter: 9, business: 12, premium: 3 },
  parc: { residences: 86, lots: 1420, utilisateurs: 512 },
  essais_expirant_7j: 2,
  derniers_clients: [
    { id: 1, name: 'Gest Syndic SARL', plan: 'business', status: 'active' },
    { id: 2, name: 'Cabinet Anfa', plan: 'premium', status: 'active' },
    { id: 3, name: 'Syndic Marina', plan: 'starter', status: 'trial' },
  ],
  ...MOCK_BUSINESS_METRICS,
}

/**
 * Récupère les métriques du dashboard. Complète les KPIs business absents avec
 * un mock en dev (bascule automatique dès que le back les renvoie — les champs
 * réels de l'API écrasent le mock). En dev, si l'API est injoignable, renvoie un
 * mock complet pour permettre le développement hors-ligne du back-office.
 */
export async function getMetrics(): Promise<Metrics> {
  try {
    const data = (await api.get<{ data: Metrics }>('/admin/metrics')).data.data
    if (!import.meta.env.DEV) return data
    return { ...MOCK_BUSINESS_METRICS, ...data }
  } catch (err) {
    if (import.meta.env.DEV) return MOCK_METRICS
    throw err
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

// ── Utilisateurs (recherche globale cross-tenant, KAN-141) ───────────────────
export type AdminUser = {
  id: number
  name: string
  email: string | null
  phone: string | null
  role: string
  tenant: { id: number; name: string } | null
  status: 'active' | 'inactive'
  last_login_at: string | null
}

const MOCK_USERS: AdminUser[] = [
  {
    id: 1,
    name: 'Mohammed Fikri',
    email: 'm.fikri@gestsyndic.ma',
    phone: '+212600000001',
    role: 'manager',
    tenant: { id: 1, name: 'Gest Syndic SARL' },
    status: 'active',
    last_login_at: '2026-07-13T09:12:00Z',
  },
  {
    id: 2,
    name: 'Salma Bennani',
    email: 'salma.bennani@gestsyndic.ma',
    phone: '+212600000002',
    role: 'gestionnaire',
    tenant: { id: 1, name: 'Gest Syndic SARL' },
    status: 'active',
    last_login_at: '2026-07-12T15:40:00Z',
  },
  {
    id: 3,
    name: 'Hassan Benali',
    email: 'hassan.benali@anfa.ma',
    phone: '+212611223344',
    role: 'resident',
    tenant: { id: 2, name: 'Cabinet Anfa' },
    status: 'inactive',
    last_login_at: null,
  },
]

/** Recherche globale d'utilisateurs (repli mock en dev si l'API n'est pas prête). */
export async function searchUsers(q: string): Promise<AdminUser[]> {
  try {
    const res = await api.get<{ data: AdminUser[] }>('/admin/users', {
      params: { q: q || undefined },
    })
    return res.data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    const needle = q.trim().toLowerCase()
    return needle
      ? MOCK_USERS.filter((u) =>
          [u.name, u.email, u.phone, u.tenant?.name]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(needle)),
        )
      : MOCK_USERS
  }
}

export async function resetUserPassword(id: number): Promise<string> {
  const res = await api.post<{ data: { temp_password: string } }>(
    `/admin/users/${id}/reset-password`,
  )
  return res.data.data.temp_password
}

export async function toggleUserActive(id: number, active: boolean) {
  await api.post(`/admin/users/${id}/toggle`, { is_active: active })
}

export async function forceUserLogout(id: number) {
  await api.post(`/admin/users/${id}/logout`)
}
