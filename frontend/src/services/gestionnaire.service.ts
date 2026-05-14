/**
 * Service gestionnaire — all functions currently return mock data.
 * Replace each mock block with the real api.get() call once the endpoint is ready.
 */

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

export type Impaye = {
  coproprietaire: { id: number; name: string; phone: string }
  lot: { numero: string }
  montant_du: number
  montant_paye: number
  montant_restant: number
  jours_retard: number
  appel_fonds: { id: number; titre: string }
}

export type TicketUrgent = {
  id: number
  categorie: string
  description: string
  priorite: 'urgent' | 'normal' | 'faible'
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'clos'
  created_at: string
  residence: { id: number; name: string }
  lot: { id: number; numero: string }
  user: { id: number; name: string }
}

export type AG = {
  id: number
  titre: string
  residence_id: number
  residence_name: string
  date: string // ISO
  lieu: string
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_RESIDENCES: Residence[] = [
  {
    id: 1,
    name: 'Atlas Casablanca',
    address: 'Bd Zerktouni, Maarif',
    city: 'Casablanca',
    nb_lots: 24,
    total_tantieme: 10000,
    status: 'actif',
    taux_recouvrement: 83,
  },
  {
    id: 2,
    name: 'Blanca Rabat',
    address: 'Av. Fal Ould Oumeir, Agdal',
    city: 'Rabat',
    nb_lots: 18,
    total_tantieme: 10000,
    status: 'actif',
    taux_recouvrement: 72,
  },
  {
    id: 3,
    name: 'Marina Agadir',
    address: 'Bv du 20 Août, Talborjt',
    city: 'Agadir',
    nb_lots: 20,
    total_tantieme: 10000,
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
  1: {
    residences_count: 1,
    lots_count: 24,
    taux_recouvrement: 83,
    montant_recouvre: 9960,
    montant_restant: 2040,
    tickets_ouverts: 2,
    tickets_urgents: 1,
    appels_fonds_actifs: 1,
  },
  2: {
    residences_count: 1,
    lots_count: 18,
    taux_recouvrement: 72,
    montant_recouvre: 7920,
    montant_restant: 3080,
    tickets_ouverts: 1,
    tickets_urgents: 1,
    appels_fonds_actifs: 0,
  },
  3: {
    residences_count: 1,
    lots_count: 20,
    taux_recouvrement: 78,
    montant_recouvre: 6420,
    montant_restant: 1780,
    tickets_ouverts: 1,
    tickets_urgents: 0,
    appels_fonds_actifs: 0,
  },
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

const MOCK_IMPAYES: Impaye[] = [
  {
    coproprietaire: { id: 1, name: 'Rachid Benali', phone: '+212661001001' },
    lot: { numero: 'A-12' },
    montant_du: 2100,
    montant_paye: 0,
    montant_restant: 2100,
    jours_retard: 90,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: {
      id: 2,
      name: 'Fatima Zahra Idrissi',
      phone: '+212662002002',
    },
    lot: { numero: 'B-05' },
    montant_du: 1800,
    montant_paye: 400,
    montant_restant: 1400,
    jours_retard: 75,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 3, name: 'Karim El Fassi', phone: '+212663003003' },
    lot: { numero: 'C-08' },
    montant_du: 1500,
    montant_paye: 200,
    montant_restant: 1300,
    jours_retard: 62,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 4, name: 'Nadia Cherkaoui', phone: '+212664004004' },
    lot: { numero: 'A-03' },
    montant_du: 1200,
    montant_paye: 0,
    montant_restant: 1200,
    jours_retard: 48,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 5, name: 'Omar Bouzidi', phone: '+212665005005' },
    lot: { numero: 'D-14' },
    montant_du: 1000,
    montant_paye: 500,
    montant_restant: 500,
    jours_retard: 40,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 6, name: 'Samira Tazi', phone: '+212666006006' },
    lot: { numero: 'B-11' },
    montant_du: 900,
    montant_paye: 0,
    montant_restant: 900,
    jours_retard: 35,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 7, name: 'Hamid Lahlou', phone: '+212667007007' },
    lot: { numero: 'C-02' },
    montant_du: 1600,
    montant_paye: 800,
    montant_restant: 800,
    jours_retard: 32,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 8, name: 'Leila Bensouda', phone: '+212668008008' },
    lot: { numero: 'A-07' },
    montant_du: 700,
    montant_paye: 0,
    montant_restant: 700,
    jours_retard: 21,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 9, name: 'Youssef Alaoui', phone: '+212669009009' },
    lot: { numero: 'D-06' },
    montant_du: 500,
    montant_paye: 100,
    montant_restant: 400,
    jours_retard: 14,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
  {
    coproprietaire: { id: 10, name: 'Zineb Moufid', phone: '+212670010010' },
    lot: { numero: 'B-09' },
    montant_du: 600,
    montant_paye: 200,
    montant_restant: 400,
    jours_retard: 7,
    appel_fonds: { id: 1, titre: 'Appel Q1 2026' },
  },
]

const MOCK_TICKETS_URGENTS: TicketUrgent[] = [
  {
    id: 1,
    categorie: 'Plomberie',
    description:
      "Fuite d'eau importante au niveau du sous-sol — pompe endommagée",
    priorite: 'urgent',
    statut: 'ouvert',
    created_at: '2026-05-12T08:30:00Z',
    residence: { id: 1, name: 'Atlas Casablanca' },
    lot: { id: 5, numero: 'A-12' },
    user: { id: 1, name: 'Rachid Benali' },
  },
  {
    id: 2,
    categorie: 'Électricité',
    description: "Panne d'electricite dans les parties communes — tableau HS",
    priorite: 'urgent',
    statut: 'ouvert',
    created_at: '2026-05-13T14:15:00Z',
    residence: { id: 2, name: 'Blanca Rabat' },
    lot: { id: 12, numero: 'B-05' },
    user: { id: 2, name: 'Fatima Zahra Idrissi' },
  },
  {
    id: 3,
    categorie: 'Sécurité',
    description: 'Portail principal bloqué — accès véhicule impossible',
    priorite: 'urgent',
    statut: 'en_cours',
    created_at: '2026-05-11T09:00:00Z',
    residence: { id: 3, name: 'Marina Agadir' },
    lot: { id: 18, numero: 'C-08' },
    user: { id: 3, name: 'Karim El Fassi' },
  },
]

const MOCK_ASSEMBLEES: AG[] = [
  {
    id: 1,
    titre: 'AG Ordinaire 2026 — Atlas Casablanca',
    residence_id: 1,
    residence_name: 'Atlas Casablanca',
    date: '2026-05-28T10:00:00Z',
    lieu: 'Salle de réunion, RDC, Résidence Atlas',
  },
  {
    id: 2,
    titre: 'AG Extraordinaire — Travaux façade',
    residence_id: 2,
    residence_name: 'Blanca Rabat',
    date: '2026-06-05T15:00:00Z',
    lieu: 'Salle polyvalente, Résidence Blanca',
  },
]

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * GET /api/gestionnaire/dashboard
 * Returns aggregated KPIs. Filter by residenceId when provided.
 */
export async function getDashboardKpis(
  residenceId?: number,
): Promise<DashboardKpi> {
  // TODO: replace once GET /api/gestionnaire/dashboard?residence_id= is available
  await new Promise((r) => setTimeout(r, 400))
  if (residenceId !== undefined && MOCK_KPI_BY_RESIDENCE[residenceId]) {
    return MOCK_KPI_BY_RESIDENCE[residenceId]
  }
  return MOCK_KPI_ALL
}

/**
 * No real endpoint yet — mock 12 months of recouvrement data.
 * TODO: replace once GET /api/gestionnaire/recouvrement-mensuel is available
 */
export async function getRecouvrementMensuel(
  // TODO: pass residenceId to real endpoint once available
  residenceId?: number,
): Promise<RecouvrementMois[]> {
  void residenceId
  await new Promise((r) => setTimeout(r, 350))
  return MOCK_RECOUVREMENT_MENSUEL
}

/**
 * GET /api/gestionnaire/residences
 */
export async function getResidences(): Promise<Residence[]> {
  // TODO: replace once GET /api/gestionnaire/residences is available
  await new Promise((r) => setTimeout(r, 300))
  return MOCK_RESIDENCES
}

/**
 * GET /api/impayés?residence_id=&limit=
 */
export async function getTopImpayes(
  residenceId?: number,
  limit = 10,
): Promise<Impaye[]> {
  // TODO: replace once GET /api/impayés is available
  await new Promise((r) => setTimeout(r, 350))
  const filtered =
    residenceId !== undefined
      ? MOCK_IMPAYES.filter(
          (_, i) =>
            i % MOCK_RESIDENCES.length === residenceId % MOCK_RESIDENCES.length,
        )
      : MOCK_IMPAYES
  return filtered.slice(0, limit)
}

/**
 * GET /api/gestionnaire/tickets?statut=ouvert&priorite=urgent
 */
export async function getTicketsUrgents(
  residenceId?: number,
): Promise<TicketUrgent[]> {
  // TODO: replace once GET /api/gestionnaire/tickets?statut=ouvert&priorite=urgent is available
  await new Promise((r) => setTimeout(r, 300))
  if (residenceId !== undefined) {
    return MOCK_TICKETS_URGENTS.filter((t) => t.residence.id === residenceId)
  }
  return MOCK_TICKETS_URGENTS
}

/**
 * GET /api/assemblees
 */
export async function getAssembleesAvenir(): Promise<AG[]> {
  // TODO: replace once GET /api/assemblees is available
  await new Promise((r) => setTimeout(r, 250))
  return MOCK_ASSEMBLEES
}
