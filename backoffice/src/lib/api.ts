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
/**
 * L'API a quatre issues possibles à la connexion (cf. AuthController + KAN-147) :
 * succès, création du mot de passe, enrôlement 2FA, vérification 2FA. Les trois
 * dernières ne portent PAS de token complet — l'UI doit les traiter comme des
 * étapes, pas comme des erreurs.
 */
export type AuthStep =
  | { step: 'done'; user: BoUser }
  | { step: 'first_login'; email: string }
  | { step: '2fa_setup'; enrollToken: string }
  | { step: '2fa_verify'; challengeToken: string }

export type BoUser = { id: number; name: string; email: string; role: string }

/** Le back-office est réservé à Digitoyou : on refuse tout autre rôle. */
function assertSuperAdmin(user: BoUser | undefined): BoUser {
  if (user?.role !== 'super_admin')
    throw new Error('Accès réservé aux administrateurs Digitoyou')
  return user
}

type AuthPayload = {
  status?: string
  data?: {
    token?: string
    user?: BoUser
    enroll_token?: string
    challenge_token?: string
  }
}

/** Interprète une réponse d'auth (login ou activate) en étape de parcours. */
function toAuthStep(payload: AuthPayload, email: string): AuthStep {
  const d = payload?.data
  // Un statut annoncé sans le jeton correspondant est une réponse cassée :
  // on préfère une erreur explicite à une étape muette qui tournerait dans le vide.
  const required = <T,>(v: T | undefined | null): T => {
    if (v === undefined || v === null) throw new Error('Réponse de connexion invalide')
    return v
  }

  switch (payload?.status) {
    case 'first_login':
      return { step: 'first_login', email }
    case '2fa_setup_required':
      return { step: '2fa_setup', enrollToken: required(d?.enroll_token) }
    case '2fa_required':
      return { step: '2fa_verify', challengeToken: required(d?.challenge_token) }
    case 'success': {
      const user = assertSuperAdmin(d?.user)
      setToken(required(d?.token))
      return { step: 'done', user }
    }
    default:
      throw new Error('Réponse de connexion invalide')
  }
}

export async function login(email: string, password: string): Promise<AuthStep> {
  const res = await api.post('/auth/login', { email, password })
  return toAuthStep(res.data, email)
}

/** Première connexion : échange le mot de passe temporaire contre un mot de passe choisi. */
export async function activate(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthStep> {
  const res = await api.post('/auth/activate', {
    email,
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  })
  return toAuthStep(res.data, email)
}

/** Les tokens 2FA sont limités et éphémères : on les passe explicitement,
 *  sans jamais les stocker comme token de session. */
const bearer = (t: string) => ({ headers: { Authorization: `Bearer ${t}` } })

export async function twoFactorSetup(enrollToken: string) {
  const res = await api.post('/auth/2fa/setup', {}, bearer(enrollToken))
  return res.data.data as { secret: string; otpauth_url: string }
}

export async function twoFactorConfirm(enrollToken: string, code: string) {
  const res = await api.post('/auth/2fa/confirm', { code }, bearer(enrollToken))
  const d = res.data.data
  const user = assertSuperAdmin(d?.user)
  setToken(d.token)
  return { user, recoveryCodes: d.recovery_codes as string[] }
}

export async function twoFactorVerify(challengeToken: string, code: string) {
  const res = await api.post('/auth/2fa/verify', { code }, bearer(challengeToken))
  const d = res.data.data
  const user = assertSuperAdmin(d?.user)
  setToken(d.token)
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
  // Usage plateforme (30j) exposé par le back — optionnel côté front (non rendu
  // sur le dashboard business, et absent du mock dev).
  usage?: {
    utilisateurs_actifs_30j: number
    tickets_ouverts: number
    notifications_30j: number
    nouveaux_clients_30j: number
  }
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

// ── Journal d'audit global cross-tenant (KAN-144) ────────────────────────────
export type AdminAuditLog = {
  id: number
  tenant: { id: number; name: string } | null
  category: string
  action: string
  severity: 'info' | 'warning' | 'sensitive' | 'error'
  target_label: string | null
  user_email: string | null
  ip_address: string | null
  created_at: string
}

export type AuditFilters = {
  tenant_id?: number
  category?: string
  severity?: string
  from?: string
  to?: string
  search?: string
}

const MOCK_AUDIT: AdminAuditLog[] = [
  {
    id: 1,
    tenant: { id: 1, name: 'Gest Syndic SARL' },
    category: 'auth',
    action: 'Auth.failed_login',
    severity: 'warning',
    target_label: null,
    user_email: 'unknown@attacker.fake',
    ip_address: '197.230.45.12',
    created_at: '2026-07-14T03:45:09Z',
  },
  {
    id: 2,
    tenant: null,
    category: 'system',
    action: 'Backoffice.impersonate',
    severity: 'sensitive',
    target_label: 'Cabinet Anfa',
    user_email: 'm.fikri@digitoyou.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-07-13T18:20:00Z',
  },
  {
    id: 3,
    tenant: { id: 2, name: 'Cabinet Anfa' },
    category: 'facturation',
    action: 'Tenant.suspended',
    severity: 'sensitive',
    target_label: 'Cabinet Anfa',
    user_email: 'admin@digitoyou.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-07-12T11:02:18Z',
  },
  {
    id: 4,
    tenant: { id: 1, name: 'Gest Syndic SARL' },
    category: 'paiement',
    action: 'Payment.created',
    severity: 'info',
    target_label: 'Lot A-01 · 850,00 DH',
    user_email: 'salma.bennani@gestsyndic.ma',
    ip_address: '41.92.10.7',
    created_at: '2026-07-12T10:14:22Z',
  },
]

export async function getAdminAuditLogs(
  filters: AuditFilters = {},
): Promise<AdminAuditLog[]> {
  try {
    const res = await api.get<{ data: AdminAuditLog[] }>('/admin/audit', {
      params: filters,
    })
    return res.data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    const q = filters.search?.trim().toLowerCase()
    return MOCK_AUDIT.filter(
      (l) =>
        (!filters.category || l.category === filters.category) &&
        (!filters.severity || l.severity === filters.severity) &&
        (!q ||
          [l.action, l.user_email, l.target_label, l.tenant?.name]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q))),
    )
  }
}

// ── Diffusion / broadcast aux cabinets (KAN-145) ─────────────────────────────
export type BroadcastTarget = 'all' | 'plan' | 'tenant'

export type Broadcast = {
  id: number
  title: string
  message: string
  target: BroadcastTarget
  target_value: string | null
  channels: string[]
  scheduled_at: string | null
  sent_at: string | null
  recipients_count: number
  read_count: number
  created_at: string
}

export type BroadcastInput = {
  title: string
  message: string
  target: BroadcastTarget
  target_value?: string | null
  channels: string[]
  scheduled_at?: string | null
}

const MOCK_BROADCASTS: Broadcast[] = [
  {
    id: 1,
    title: 'Maintenance planifiée',
    message: 'Une maintenance aura lieu dimanche de 2h à 4h.',
    target: 'all',
    target_value: null,
    channels: ['app', 'email'],
    scheduled_at: null,
    sent_at: '2026-07-10T08:00:00Z',
    recipients_count: 24,
    read_count: 17,
    created_at: '2026-07-10T07:50:00Z',
  },
  {
    id: 2,
    title: 'Nouveauté : module budgets',
    message: 'Le module Budgets est disponible pour le plan Business.',
    target: 'plan',
    target_value: 'business',
    channels: ['app'],
    scheduled_at: null,
    sent_at: '2026-07-05T10:00:00Z',
    recipients_count: 12,
    read_count: 9,
    created_at: '2026-07-05T09:40:00Z',
  },
]

export async function getBroadcasts(): Promise<Broadcast[]> {
  try {
    return (await api.get<{ data: Broadcast[] }>('/admin/broadcasts')).data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return MOCK_BROADCASTS
  }
}

export async function sendBroadcast(input: BroadcastInput): Promise<Broadcast> {
  const res = await api.post<{ data: Broadcast }>('/admin/broadcasts', input)
  return res.data.data
}

// ── Feature flags / droits par plan (KAN-142) ────────────────────────────────
export type FeatureFlag = {
  key: string
  label: string
  description: string
  /** Plans où la fonctionnalité est activée par défaut. */
  enabled_plans: string[]
}

export const PLANS = ['starter', 'business', 'premium'] as const

const MOCK_FLAGS: FeatureFlag[] = [
  {
    key: 'ai',
    label: 'Assistant IA (EMARO)',
    description:
      'Chat IA, import IA de factures, suggestions. Désactivé pour l’instant (coût, KAN-111).',
    enabled_plans: [],
  },
  {
    key: 'mobile',
    label: 'Application mobile',
    description: 'Accès au portail résident via l’app iOS/Android.',
    enabled_plans: ['business', 'premium'],
  },
  {
    key: 'budgets_avances',
    label: 'Budgets avancés',
    description: 'Comparatif budget/réel, budgets pluriannuels.',
    enabled_plans: ['business', 'premium'],
  },
  {
    key: 'ocr_factures',
    label: 'OCR des factures',
    description: 'Pré-remplissage des dépenses par lecture de facture.',
    enabled_plans: ['premium'],
  },
  {
    key: 'exports_comptables',
    label: 'Exports comptables (FEC, xlsx)',
    description: 'Journal, grand-livre, balance, FEC.',
    enabled_plans: ['starter', 'business', 'premium'],
  },
]

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return (await api.get<{ data: FeatureFlag[] }>('/admin/feature-flags')).data
      .data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return MOCK_FLAGS
  }
}

export async function updateFeatureFlag(
  key: string,
  enabled_plans: string[],
): Promise<void> {
  try {
    await api.put(`/admin/feature-flags/${key}`, { enabled_plans })
  } catch (err) {
    // En dev sans backend, on conserve l'état optimiste (repli mock).
    if (!import.meta.env.DEV) throw err
  }
}

// ── Supervision technique (KAN-143) ──────────────────────────────────────────
export type Health = {
  services: Record<'database' | 'redis' | 'cache' | 'storage', boolean>
  queue: { failed: number; pending: number }
  integrations: Record<
    'whatsapp_twilio' | 'email_brevo' | 'push_fcm' | 'push_apns' | 'paiement_cmi',
    boolean
  >
  version: string
  environment: string
  last_migration: string | null
}

export type FailedJob = {
  id: string
  connection: string | null
  queue: string | null
  exception: string
  failed_at: string | null
}

const MOCK_HEALTH: Health = {
  services: { database: true, redis: true, cache: true, storage: true },
  queue: { failed: 1, pending: 4 },
  integrations: {
    whatsapp_twilio: false,
    email_brevo: true,
    push_fcm: false,
    push_apns: false,
    paiement_cmi: false,
  },
  version: 'dev',
  environment: 'local',
  last_migration: '2026_07_17_110002_create_invoices_table',
}

const MOCK_FAILED_JOBS: FailedJob[] = [
  {
    id: '9f1c-mock',
    connection: 'redis',
    queue: 'default',
    exception: 'App\\Jobs\\SendNativePushJob — FCM credentials missing',
    failed_at: '2026-07-16T22:14:00Z',
  },
]

export async function getHealth(): Promise<Health> {
  try {
    return (await api.get<{ data: Health }>('/admin/health')).data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return MOCK_HEALTH
  }
}

export async function getFailedJobs(): Promise<FailedJob[]> {
  try {
    return (await api.get<{ data: FailedJob[] }>('/admin/failed-jobs')).data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return MOCK_FAILED_JOBS
  }
}

export async function retryFailedJob(id: string): Promise<void> {
  await api.post(`/admin/failed-jobs/${id}/retry`)
}

// ── Abonnements & facturation (KAN-140) ──────────────────────────────────────
export type Invoice = {
  id: number
  tenant: { id: number; name: string } | null
  numero: string
  montant_dh: number
  remise_pct: number
  statut: 'envoyee' | 'payee' | 'impayee' | 'annulee'
  periode_label: string | null
  date_emission: string | null
  date_echeance: string | null
  date_paiement: string | null
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: 1,
    tenant: { id: 1, name: 'Gest Syndic SARL' },
    numero: 'FA-2026-00001',
    montant_dh: 1200,
    remise_pct: 0,
    statut: 'payee',
    periode_label: 'Juin 2026',
    date_emission: '2026-06-01',
    date_echeance: '2026-07-01',
    date_paiement: '2026-06-12',
  },
  {
    id: 2,
    tenant: { id: 2, name: 'Cabinet Anfa' },
    numero: 'FA-2026-00002',
    montant_dh: 2500,
    remise_pct: 0,
    statut: 'envoyee',
    periode_label: 'Juillet 2026',
    date_emission: '2026-07-01',
    date_echeance: '2026-07-31',
    date_paiement: null,
  },
  {
    id: 3,
    tenant: { id: 3, name: 'Syndic Marina' },
    numero: 'FA-2026-00003',
    montant_dh: 199,
    remise_pct: 0,
    statut: 'impayee',
    periode_label: 'Juin 2026',
    date_emission: '2026-06-01',
    date_echeance: '2026-07-01',
    date_paiement: null,
  },
]

let mockInvoices = [...MOCK_INVOICES]

export async function getInvoices(statut?: string): Promise<Invoice[]> {
  try {
    const res = await api.get<{ data: Invoice[] }>('/admin/invoices', {
      params: { statut: statut || undefined },
    })
    return res.data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return statut ? mockInvoices.filter((i) => i.statut === statut) : mockInvoices
  }
}

async function patchInvoiceStatut(
  id: number,
  path: string,
  statut: Invoice['statut'],
): Promise<void> {
  try {
    await api.post(`/admin/invoices/${id}/${path}`)
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    mockInvoices = mockInvoices.map((i) =>
      i.id === id
        ? {
            ...i,
            statut,
            date_paiement:
              statut === 'payee'
                ? new Date().toISOString().slice(0, 10)
                : i.date_paiement,
          }
        : i,
    )
  }
}

export const markInvoicePaid = (id: number) =>
  patchInvoiceStatut(id, 'mark-paid', 'payee')
export const cancelInvoice = (id: number) =>
  patchInvoiceStatut(id, 'cancel', 'annulee')

// ── Plans commerciaux (offres, tarifs, quotas) — KAN-146 ─────────────────────
export type Plan = {
  id: number
  slug: string
  name: string
  price_dh: number
  period: 'mensuel' | 'annuel'
  quota_residences: number | null
  quota_lots: number | null
  quota_users: number | null
  features: string[] | null
  is_active: boolean
  ordre: number
}

export type PlanInput = Omit<Plan, 'id'>

const MOCK_PLANS: Plan[] = [
  {
    id: 1,
    slug: 'starter',
    name: 'Starter',
    price_dh: 199,
    period: 'mensuel',
    quota_residences: 3,
    quota_lots: 60,
    quota_users: 2,
    features: ['exports_comptables'],
    is_active: true,
    ordre: 1,
  },
  {
    id: 2,
    slug: 'business',
    name: 'Business',
    price_dh: 1200,
    period: 'mensuel',
    quota_residences: 20,
    quota_lots: 500,
    quota_users: 10,
    features: ['exports_comptables', 'mobile', 'budgets_avances'],
    is_active: true,
    ordre: 2,
  },
  {
    id: 3,
    slug: 'premium',
    name: 'Premium',
    price_dh: 2500,
    period: 'mensuel',
    quota_residences: null,
    quota_lots: null,
    quota_users: null,
    features: ['exports_comptables', 'mobile', 'budgets_avances', 'ocr_factures'],
    is_active: true,
    ordre: 3,
  },
]

let mockPlans = [...MOCK_PLANS]

export async function getPlans(): Promise<Plan[]> {
  try {
    return (await api.get<{ data: Plan[] }>('/admin/plans')).data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return mockPlans
  }
}

export async function savePlan(input: PlanInput, id?: number): Promise<Plan> {
  try {
    const res = id
      ? await api.put<{ data: Plan }>(`/admin/plans/${id}`, input)
      : await api.post<{ data: Plan }>('/admin/plans', input)
    return res.data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    // Repli dev : mute la liste mock en mémoire.
    if (id) {
      mockPlans = mockPlans.map((p) => (p.id === id ? { ...p, ...input, id } : p))
      return { ...input, id }
    }
    const created = { ...input, id: Date.now() }
    mockPlans = [...mockPlans, created]
    return created
  }
}

export async function deletePlan(id: number): Promise<void> {
  try {
    await api.delete(`/admin/plans/${id}`)
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    mockPlans = mockPlans.filter((p) => p.id !== id)
  }
}

// ── Sécurité back-office — membres super_admin (KAN-147) ──────────────────────
export type SecurityMember = {
  id: number
  name: string
  email: string | null
  status: 'active' | 'inactive'
  last_login_at: string | null
  created_at: string | null
  two_factor_enabled: boolean
}

const MOCK_MEMBERS: SecurityMember[] = [
  {
    id: 1,
    name: 'Abdellah Jouider',
    email: 'abdellah@imaro.ma',
    status: 'active',
    last_login_at: '2026-07-17T08:30:00Z',
    created_at: '2026-05-13T09:00:00Z',
    two_factor_enabled: false,
  },
  {
    id: 2,
    name: 'Mouad Baamrane',
    email: 'mouad@imaro.ma',
    status: 'active',
    last_login_at: '2026-07-17T10:05:00Z',
    created_at: '2026-05-13T09:00:00Z',
    two_factor_enabled: false,
  },
]

let mockMembers = [...MOCK_MEMBERS]

export async function getMembers(): Promise<SecurityMember[]> {
  try {
    return (await api.get<{ data: SecurityMember[] }>('/admin/security/members'))
      .data.data
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    return mockMembers
  }
}

export async function inviteMember(
  name: string,
  email: string,
): Promise<string> {
  try {
    const res = await api.post<{ data: { temp_password: string } }>(
      '/admin/security/members',
      { name, email },
    )
    return res.data.data.temp_password
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    mockMembers = [
      ...mockMembers,
      {
        id: Date.now(),
        name,
        email,
        status: 'active',
        last_login_at: null,
        created_at: new Date().toISOString(),
        two_factor_enabled: false,
      },
    ]
    return 'Temp' + Math.random().toString(36).slice(2, 10)
  }
}

export async function revokeMember(id: number): Promise<void> {
  try {
    await api.delete(`/admin/security/members/${id}`)
  } catch (err) {
    if (!import.meta.env.DEV) throw err
    mockMembers = mockMembers.map((m) =>
      m.id === id ? { ...m, status: 'inactive' } : m,
    )
  }
}
