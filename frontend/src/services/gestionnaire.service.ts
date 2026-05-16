import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
// In dev, if the backend is unreachable the functions return mock data silently.
// In production, API errors propagate normally.

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS) return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type DashboardKpi = {
  residences_count: number
  lots_count: number
  taux_recouvrement: number
  montant_recouvre: number
  montant_restant: number
  tickets_ouverts: number
  tickets_urgents: number
  appels_fonds_actifs: number
}

export type RecouvrementMois = {
  mois: string
  taux: number
  recouvre: number
  restant: number
}

export type Residence = {
  id: number
  name: string
  address: string
  city: string
  nb_lots: number
  total_tantieme: number
  status: string
  taux_recouvrement: number
}

export type Lot = {
  id: number
  numero: string
  type: string
  etage: number
  superficie: number
  tantieme: number
  coproprietaire: { id: number; name: string; phone: string } | null
}

export type Coproprietaire = {
  id: number
  name: string
  phone: string
  lot: { id: number; numero: string; tantieme: number }
  solde_actuel: number
}

export type Exercice = {
  id: number
  annee: number
  date_debut: string
  date_fin: string
  statut: 'actif' | 'cloture'
}

export type AppelFonds = {
  id: number
  titre: string
  residence: { id: number; name: string }
  exercice?: { id: number; annee: number }
  montant_total: number
  statut: string
  date_echeance: string
  taux_recouvrement: number
  montant_recouvre: number
  montant_restant: number
  lignes_count: number
}

export type Paiement = {
  id: number
  lot: { id: number; numero: string }
  coproprietaire: { id: number; name: string }
  appel_fonds: { id: number; titre: string }
  montant_du: number
  montant_paye: number
  statut: string
  date_paiement: string
  mode_paiement: string
  reference?: string
}

export type Impaye = {
  coproprietaire: { id: number; name: string; phone: string }
  lot: { numero: string }
  montant_du: number
  montant_paye: number
  montant_restant: number
  jours_retard: number
  appel_fonds: { id: number; titre: string }
}

export type Ticket = {
  id: number
  categorie: string
  description: string
  priorite: 'urgent' | 'normal' | 'faible'
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'clos'
  images: string[]
  closed_at: string | null
  created_at: string
  residence: { id: number; name: string; city?: string }
  lot: { id: number; numero: string }
  user: { id: number; name: string; phone?: string }
}

export type TicketUrgent = Ticket

export type Assemblee = {
  id: number
  titre: string
  type: 'ordinaire' | 'extraordinaire'
  residence: { id: number; name: string }
  date: string
  lieu: string
  statut: 'convoquee' | 'tenue' | 'annulee'
  quorum_requis: number
  participants_count: number | null
  ordre_du_jour: string
}

/** Legacy AG type — kept for DashboardPage compat. */
export type AG = {
  id: number
  titre: string
  residence_id: number
  residence_name: string
  date: string
  lieu: string
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_RESIDENCES: Residence[] = [
  {
    id: 1,
    name: 'Atlas Casablanca',
    address: 'Bd Zerktouni, Maarif',
    city: 'Casablanca',
    nb_lots: 24,
    total_tantieme: 1000,
    status: 'actif',
    taux_recouvrement: 83,
  },
  {
    id: 2,
    name: 'Blanca Rabat',
    address: 'Av. Fal Ould Oumeir, Agdal',
    city: 'Rabat',
    nb_lots: 18,
    total_tantieme: 1000,
    status: 'actif',
    taux_recouvrement: 72,
  },
  {
    id: 3,
    name: 'Marina Agadir',
    address: 'Bv du 20 Août, Talborjt',
    city: 'Agadir',
    nb_lots: 20,
    total_tantieme: 1000,
    status: 'actif',
    taux_recouvrement: 78,
  },
]

const MOCK_KPI_ALL: DashboardKpi = {
  residences_count: 3,
  lots_count: 62,
  taux_recouvrement: 78,
  montant_recouvre: 24300,
  montant_restant: 6900,
  tickets_ouverts: 4,
  tickets_urgents: 2,
  appels_fonds_actifs: 1,
}

const MOCK_KPI_BY_RESIDENCE: Record<number, DashboardKpi> = {
  1: { residences_count: 1, lots_count: 24, taux_recouvrement: 83, montant_recouvre: 9960, montant_restant: 2040, tickets_ouverts: 2, tickets_urgents: 1, appels_fonds_actifs: 1 },
  2: { residences_count: 1, lots_count: 18, taux_recouvrement: 72, montant_recouvre: 7920, montant_restant: 3080, tickets_ouverts: 1, tickets_urgents: 1, appels_fonds_actifs: 0 },
  3: { residences_count: 1, lots_count: 20, taux_recouvrement: 78, montant_recouvre: 6420, montant_restant: 1780, tickets_ouverts: 1, tickets_urgents: 0, appels_fonds_actifs: 0 },
}

const MOCK_RECOUVREMENT_MENSUEL: RecouvrementMois[] = [
  { mois: 'Jan', taux: 68, recouvre: 16320, restant: 7680 },
  { mois: 'Fév', taux: 72, recouvre: 17280, restant: 6720 },
  { mois: 'Mar', taux: 75, recouvre: 18000, restant: 6000 },
  { mois: 'Avr', taux: 80, recouvre: 19200, restant: 4800 },
  { mois: 'Mai', taux: 78, recouvre: 18720, restant: 5280 },
  { mois: 'Jun', taux: 83, recouvre: 19920, restant: 4080 },
  { mois: 'Jul', taux: 60, recouvre: 14400, restant: 9600 },
  { mois: 'Aoû', taux: 65, recouvre: 15600, restant: 8400 },
  { mois: 'Sep', taux: 85, recouvre: 20400, restant: 3600 },
  { mois: 'Oct', taux: 90, recouvre: 21600, restant: 2400 },
  { mois: 'Nov', taux: 88, recouvre: 21120, restant: 2880 },
  { mois: 'Déc', taux: 95, recouvre: 22800, restant: 1200 },
]

const MOCK_LOTS: Lot[] = [
  { id: 1, numero: 'A-01', type: 'appartement', etage: 1, superficie: 85, tantieme: 45, coproprietaire: { id: 1, name: 'Hassan Benali', phone: '+212600000010' } },
  { id: 2, numero: 'A-02', type: 'appartement', etage: 1, superficie: 90, tantieme: 48, coproprietaire: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' } },
  { id: 3, numero: 'B-01', type: 'commerce', etage: 0, superficie: 60, tantieme: 35, coproprietaire: null },
  { id: 4, numero: 'P-01', type: 'parking', etage: -1, superficie: 15, tantieme: 8, coproprietaire: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' } },
]

const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
  { id: 1, name: 'Hassan Benali', phone: '+212600000010', lot: { id: 1, numero: 'A-01', tantieme: 45 }, solde_actuel: 0 },
  { id: 2, name: 'Fatima Chraibi', phone: '+212600000011', lot: { id: 2, numero: 'A-02', tantieme: 48 }, solde_actuel: -720 },
  { id: 3, name: 'Karim El Fassi', phone: '+212600000012', lot: { id: 4, numero: 'P-01', tantieme: 8 }, solde_actuel: -144 },
]

const MOCK_EXERCICES: Exercice[] = [
  { id: 1, annee: 2026, date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'actif' },
  { id: 2, annee: 2025, date_debut: '2025-01-01', date_fin: '2025-12-31', statut: 'cloture' },
]

const MOCK_APPELS_FONDS: AppelFonds[] = [
  {
    id: 1,
    titre: 'Charges Q1 2026',
    residence: { id: 1, name: 'Atlas Casablanca' },
    exercice: { id: 1, annee: 2026 },
    montant_total: 18000,
    statut: 'publie',
    date_echeance: '2026-03-31',
    taux_recouvrement: 83,
    montant_recouvre: 14940,
    montant_restant: 3060,
    lignes_count: 24,
  },
  {
    id: 2,
    titre: 'Charges Q2 2026',
    residence: { id: 2, name: 'Blanca Rabat' },
    exercice: { id: 1, annee: 2026 },
    montant_total: 13500,
    statut: 'brouillon',
    date_echeance: '2026-06-30',
    taux_recouvrement: 0,
    montant_recouvre: 0,
    montant_restant: 13500,
    lignes_count: 18,
  },
]

const MOCK_PAIEMENTS: Paiement[] = [
  { id: 1, lot: { id: 1, numero: 'A-01' }, coproprietaire: { id: 1, name: 'Hassan Benali' }, appel_fonds: { id: 1, titre: 'Charges Q1 2026' }, montant_du: 810, montant_paye: 810, statut: 'payé', date_paiement: '2026-01-15', mode_paiement: 'virement', reference: 'VIR-2026-001' },
  { id: 2, lot: { id: 2, numero: 'A-02' }, coproprietaire: { id: 2, name: 'Fatima Chraibi' }, appel_fonds: { id: 1, titre: 'Charges Q1 2026' }, montant_du: 864, montant_paye: 144, statut: 'partiel', date_paiement: '2026-01-20', mode_paiement: 'especes' },
]

const MOCK_IMPAYES: Impaye[] = [
  { coproprietaire: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' }, lot: { numero: 'A-02' }, montant_du: 864, montant_paye: 144, montant_restant: 720, jours_retard: 75, appel_fonds: { id: 1, titre: 'Charges Q1 2026' } },
  { coproprietaire: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' }, lot: { numero: 'P-01' }, montant_du: 144, montant_paye: 0, montant_restant: 144, jours_retard: 48, appel_fonds: { id: 1, titre: 'Charges Q1 2026' } },
  { coproprietaire: { id: 4, name: 'Nadia Cherkaoui', phone: '+212664004004' }, lot: { numero: 'A-03' }, montant_du: 810, montant_paye: 0, montant_restant: 810, jours_retard: 30, appel_fonds: { id: 1, titre: 'Charges Q1 2026' } },
]

const MOCK_TICKETS: Ticket[] = [
  { id: 1, categorie: 'Plomberie', description: "Fuite d'eau importante au sous-sol — pompe endommagée", priorite: 'urgent', statut: 'ouvert', images: [], closed_at: null, created_at: '2026-05-12T08:30:00Z', residence: { id: 1, name: 'Atlas Casablanca', city: 'Casablanca' }, lot: { id: 1, numero: 'A-01' }, user: { id: 1, name: 'Hassan Benali', phone: '+212600000010' } },
  { id: 2, categorie: 'Électricité', description: "Panne d'électricité dans les parties communes — tableau HS", priorite: 'urgent', statut: 'en_cours', images: [], closed_at: null, created_at: '2026-05-13T14:15:00Z', residence: { id: 2, name: 'Blanca Rabat', city: 'Rabat' }, lot: { id: 5, numero: 'B-01' }, user: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' } },
  { id: 3, categorie: 'Sécurité', description: 'Portail principal bloqué — accès véhicule impossible', priorite: 'normal', statut: 'resolu', images: [], closed_at: null, created_at: '2026-05-11T09:00:00Z', residence: { id: 3, name: 'Marina Agadir', city: 'Agadir' }, lot: { id: 8, numero: 'C-01' }, user: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' } },
]

const MOCK_ASSEMBLEES: Assemblee[] = [
  { id: 1, titre: 'AG Ordinaire 2026', type: 'ordinaire', residence: { id: 1, name: 'Atlas Casablanca' }, date: '2026-05-28T10:00:00Z', lieu: 'Salle de réunion, RDC, Résidence Atlas', statut: 'convoquee', quorum_requis: 50, participants_count: null, ordre_du_jour: "1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Travaux façade\n4. Questions diverses" },
  { id: 2, titre: 'AG Extraordinaire — Travaux façade', type: 'extraordinaire', residence: { id: 2, name: 'Blanca Rabat' }, date: '2026-06-05T15:00:00Z', lieu: 'Salle polyvalente, Résidence Blanca', statut: 'convoquee', quorum_requis: 66, participants_count: null, ordre_du_jour: "1. Vote des travaux de ravalement de façade\n2. Approbation du devis (320 000 DH)\n3. Financement et appels de fonds exceptionnels" },
  { id: 3, titre: 'AG Ordinaire 2025', type: 'ordinaire', residence: { id: 1, name: 'Atlas Casablanca' }, date: '2025-06-10T10:00:00Z', lieu: 'Salle de réunion, RDC', statut: 'tenue', quorum_requis: 50, participants_count: 18, ordre_du_jour: "1. Approbation des comptes 2024\n2. Budget 2025\n3. Renouvellement du contrat de gardiennage" },
]

const MOCK_ASSEMBLEES_AG: AG[] = MOCK_ASSEMBLEES.map((a) => ({
  id: a.id,
  titre: a.titre,
  residence_id: a.residence.id,
  residence_name: a.residence.name,
  date: a.date,
  lieu: a.lieu,
}))

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardKpis(residenceId?: number): Promise<DashboardKpi> {
  const mock = residenceId !== undefined
    ? (MOCK_KPI_BY_RESIDENCE[residenceId] ?? MOCK_KPI_ALL)
    : MOCK_KPI_ALL
  return withMock(async () => {
    const params = residenceId !== undefined ? { residence_id: residenceId } : {}
    const res = await api.get<ApiEnvelope<DashboardKpi>>('/gestionnaire/dashboard', { params })
    return res.data.data
  }, mock)
}

/** No real endpoint yet — always returns mock. */
export async function getRecouvrementMensuel(): Promise<RecouvrementMois[]> {
  return MOCK_RECOUVREMENT_MENSUEL
}

// ─── Résidences ──────────────────────────────────────────────────────────────

export async function getResidences(search?: string): Promise<Residence[]> {
  return withMock(async () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    const res = await api.get<ApiEnvelope<{ residences: Residence[] }>>('/gestionnaire/residences', { params })
    return res.data.data.residences
  }, MOCK_RESIDENCES)
}

export async function getResidence(id: number): Promise<Residence> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Residence>>(`/gestionnaire/residences/${id}`)
    return res.data.data
  }, MOCK_RESIDENCES.find((r) => r.id === id) ?? MOCK_RESIDENCES[0])
}

export async function updateResidence(id: number, data: Partial<Pick<Residence, 'name' | 'address' | 'city'>>): Promise<Residence> {
  const res = await api.put<ApiEnvelope<Residence>>(`/gestionnaire/residences/${id}`, data)
  return res.data.data
}

// ─── Lots ────────────────────────────────────────────────────────────────────

export async function getLots(residenceId: number): Promise<{ lots: Lot[]; total_tantieme: number }> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ lots: Lot[]; total_tantieme: number }>>(`/gestionnaire/residences/${residenceId}/lots`)
    return res.data.data
  }, { lots: MOCK_LOTS, total_tantieme: MOCK_LOTS.reduce((s, l) => s + l.tantieme, 0) })
}

export async function storeLot(residenceId: number, data: Pick<Lot, 'numero' | 'type' | 'etage' | 'superficie' | 'tantieme'>): Promise<Lot> {
  const res = await api.post<ApiEnvelope<Lot>>(`/gestionnaire/residences/${residenceId}/lots`, data)
  return res.data.data
}

export async function updateLot(residenceId: number, lotId: number, data: Partial<Pick<Lot, 'numero' | 'type' | 'etage' | 'superficie' | 'tantieme'>>): Promise<Lot> {
  const res = await api.put<ApiEnvelope<Lot>>(`/gestionnaire/residences/${residenceId}/lots/${lotId}`, data)
  return res.data.data
}

export async function deleteLot(residenceId: number, lotId: number): Promise<void> {
  await api.delete(`/gestionnaire/residences/${residenceId}/lots/${lotId}`)
}

// ─── Copropriétaires ─────────────────────────────────────────────────────────

export async function getCoproprietaires(residenceId: number, search?: string): Promise<Coproprietaire[]> {
  return withMock(async () => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    const res = await api.get<ApiEnvelope<{ coproprietaires: Coproprietaire[] }>>(`/gestionnaire/residences/${residenceId}/coproprietaires`, { params })
    return res.data.data.coproprietaires
  }, MOCK_COPROPRIETAIRES)
}

// ─── Exercices ───────────────────────────────────────────────────────────────

export async function getExercices(residenceId: number): Promise<Exercice[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Exercice[]>>(`/gestionnaire/residences/${residenceId}/exercices`)
    return res.data.data
  }, MOCK_EXERCICES)
}

export async function storeExercice(residenceId: number, data: { annee: number; date_debut: string; date_fin: string }): Promise<Exercice> {
  const res = await api.post<ApiEnvelope<Exercice>>(`/gestionnaire/residences/${residenceId}/exercices`, data)
  return res.data.data
}

export async function clotureExercice(residenceId: number, exerciceId: number): Promise<Exercice> {
  const res = await api.post<ApiEnvelope<Exercice>>(`/gestionnaire/residences/${residenceId}/exercices/${exerciceId}/cloture`)
  return res.data.data
}

// ─── Appels de fonds ─────────────────────────────────────────────────────────

export async function getAppelsFonds(params?: { residence_id?: number; statut?: string }): Promise<AppelFonds[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ appels_fonds: AppelFonds[] }>>('/gestionnaire/appels-fonds', { params })
    return res.data.data.appels_fonds
  }, MOCK_APPELS_FONDS)
}

export async function storeAppelFonds(data: { titre: string; residence_id: number; montant_total: number; date_echeance: string; description?: string }): Promise<AppelFonds> {
  const res = await api.post<ApiEnvelope<{ appel_fonds: AppelFonds }>>('/gestionnaire/appels-fonds', data)
  return res.data.data.appel_fonds
}

export async function updateAppelFonds(id: number, data: Partial<Pick<AppelFonds, 'titre' | 'montant_total' | 'date_echeance'>>): Promise<AppelFonds> {
  const res = await api.put<ApiEnvelope<AppelFonds>>(`/gestionnaire/appels-fonds/${id}`, data)
  return res.data.data
}

export async function envoyerAppelFonds(id: number): Promise<void> {
  await api.post(`/gestionnaire/appels-fonds/${id}/envoyer`)
}

// ─── Paiements ───────────────────────────────────────────────────────────────

export async function getPaiements(params?: { residence_id?: number; statut?: string }): Promise<Paiement[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ paiements: Paiement[] }>>('/gestionnaire/paiements', { params })
    return res.data.data.paiements
  }, MOCK_PAIEMENTS)
}

export async function storePaiement(data: { appel_fonds_ligne_id: number; montant: number; date_paiement: string; mode_paiement: string; reference?: string; notes?: string }): Promise<Paiement> {
  const res = await api.post<ApiEnvelope<Paiement>>('/gestionnaire/paiements', data)
  return res.data.data
}

// ─── Impayés ─────────────────────────────────────────────────────────────────

export async function getImpayes(params?: { residence_id?: number }): Promise<Impaye[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ impayes: Impaye[] }>>('/gestionnaire/impayes', { params })
    return res.data.data.impayes
  }, MOCK_IMPAYES)
}

export async function getTopImpayes(residenceId?: number, limit = 10): Promise<Impaye[]> {
  const impayes = await getImpayes(residenceId !== undefined ? { residence_id: residenceId } : undefined)
  return impayes.slice(0, limit)
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function getTickets(params?: { residence_id?: number; statut?: string; priorite?: string; categorie?: string }): Promise<Ticket[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ tickets: Ticket[] }>>('/gestionnaire/tickets', { params })
    return res.data.data.tickets
  }, MOCK_TICKETS)
}

export async function getTicket(id: number): Promise<Ticket> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Ticket>>(`/gestionnaire/tickets/${id}`)
    return res.data.data
  }, MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0])
}

export async function updateTicket(id: number, data: { statut?: string; priorite?: string; cout_estime?: number }): Promise<Ticket> {
  return withMock(async () => {
    const res = await api.put<ApiEnvelope<{ ticket: Ticket }>>(`/gestionnaire/tickets/${id}`, data)
    return res.data.data.ticket
  }, { ...(MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0]), ...data } as Ticket)
}

export async function closTicket(id: number): Promise<void> {
  return withMock(async () => {
    await api.post(`/gestionnaire/tickets/${id}/clos`)
  }, undefined)
}

export async function getTicketsUrgents(residenceId?: number): Promise<Ticket[]> {
  return getTickets({ residence_id: residenceId, statut: 'ouvert', priorite: 'urgent' })
}

// ─── Assemblées ──────────────────────────────────────────────────────────────

export async function getAssemblees(params?: { residence_id?: number; statut?: string }): Promise<Assemblee[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ assemblees: Assemblee[] }>>('/gestionnaire/assemblees', { params })
    return res.data.data.assemblees
  }, MOCK_ASSEMBLEES)
}

export async function storeAssemblee(data: { titre: string; type: string; residence_id: number; date: string; lieu: string; quorum_requis: number; ordre_du_jour: string }): Promise<Assemblee> {
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<{ assemblee: Assemblee }>>('/gestionnaire/assemblees', data)
    return res.data.data.assemblee
  }, {
    id: Math.floor(Math.random() * 1000) + 100,
    titre: data.titre,
    type: data.type as 'ordinaire' | 'extraordinaire',
    residence: MOCK_RESIDENCES.find((r) => r.id === data.residence_id) ?? { id: data.residence_id, name: 'Résidence' },
    date: data.date,
    lieu: data.lieu,
    statut: 'convoquee' as const,
    quorum_requis: data.quorum_requis,
    participants_count: null,
    ordre_du_jour: data.ordre_du_jour,
  })
}

/** Legacy — kept for DashboardPage compat. */
export async function getAssembleesAvenir(): Promise<AG[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ assemblees: AG[] }>>('/gestionnaire/assemblees')
    return res.data.data.assemblees
  }, MOCK_ASSEMBLEES_AG.filter((a) => new Date(a.date) > new Date()))
}
