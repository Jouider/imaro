import { api, type ApiEnvelope } from '@/lib/axios'
import type { Banque } from '@/services/pointage.service'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
// In dev, if the backend is unreachable the functions return mock data silently.
// In production, API errors propagate normally.

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type DashboardTopImpaye = {
  coproprietaire: { id: number; name: string }
  lot: string // "C209" — plain string
  montant: number
  jours: number
}

export type DashboardTicketUrgent = {
  id: number
  titre: string
  priorite: string
  statut: string
  residence: { id: number; name: string }
  created_at: string
}

export type DashboardAssemblee = {
  id: number
  titre: string
  date: string
  residence: { name: string }
}

export type DashboardData = {
  kpi: {
    nb_residences: number
    nb_coproprietaires: number
    ca_mensuel: number
    total_impayes: number
  }
  top_impayes: DashboardTopImpaye[]
  tickets_urgents: DashboardTicketUrgent[]
  assemblees_a_venir: DashboardAssemblee[]
}

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
  mode_cotisation?: 'tantieme' | 'fixe' | 'categorie'
  montant_fixe?: number
  /** Jour du mois où les cotisations sont dues (1-28). */
  jour_echeance?: number
  /** Périodicité de génération des appels de fonds (KAN-86). Défaut: trimestriel. */
  periodicite_cotisation?: PeriodiciteCotisation
}

/** Périodicité de cotisation configurable par résidence (KAN-86). */
export type PeriodiciteCotisation =
  | 'mensuel'
  | 'trimestriel'
  | 'semestriel'
  | 'annuel'

export type CreateResidenceInput = {
  name: string
  address: string
  city: string
  mode_cotisation: 'tantieme' | 'fixe' | 'categorie'
  montant_fixe?: number
  jour_echeance?: number
  periodicite_cotisation?: PeriodiciteCotisation
}

/** Catégorie de lot (KAN-93) — cotisation forfaitaire par type de lot. */
export type CategorieLot = {
  id: number
  residence_id: number
  nom: string
  cotisation: number
  nb_lots: number
}

export type UpdateResidenceInput = Partial<CreateResidenceInput>

/** Synthèse financière d'une résidence (onglet Vue d'ensemble). */
export type ResidenceOverview = {
  nb_lots: number
  nb_coproprietaires: number
  taux_recouvrement: number
  paye_ce_mois: number
  en_attente: number
  en_retard: number
  nb_impayes: number
  tresorerie: number
  fonds_reserve: number
}

/**
 * Compte bancaire d'encaissement d'une résidence. Le syndic y renseigne le RIB
 * sur lequel les copropriétaires versent leurs cotisations. Le portail résident
 * affiche le RIB + un QR généré pour faciliter le virement.
 */
export type BankAccount = {
  id: number
  residence_id: number
  banque: Banque
  /** Titulaire du compte (ex: "Syndic Résidence Atlas"). */
  titulaire: string
  /** RIB marocain — 24 chiffres. */
  rib: string
  iban?: string
  /** Compte principal affiché par défaut au résident. */
  is_primary: boolean
}

export type CreateBankAccountInput = {
  banque: Banque
  titulaire: string
  rib: string
  iban?: string
  is_primary?: boolean
}

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>

export type GroupeHabitation = {
  id: number
  nom: string
  code?: string
  residence_id: number
  description?: string | null
  /** Total des tantièmes de la tranche (défaut 1000 côté backend). */
  total_tantieme?: number
  /** Dénormalisé via withCount côté backend. */
  nb_immeubles?: number
}

export type Immeuble = {
  id: number
  nom: string
  groupe_habitation_id?: number | null
  residence_id: number
  nb_lots?: number
}

export type Lot = {
  id: number
  numero: string
  type: string
  etage: number
  superficie: number
  tantieme: number
  /** Titre foncier — obligatoire à la saisie unitaire (KAN-94). */
  titre_foncier?: string
  immeuble_id?: number
  immeuble?: { id: number; nom: string }
  /** Catégorie de lot (KAN-93) — requis si mode_cotisation = categorie. */
  categorie_lot_id?: number | null
  categorie?: { id: number; nom: string; cotisation: number } | null
  coproprietaire: { id: number; name: string; phone: string } | null
}

export type Coproprietaire = {
  id: number
  name: string
  phone: string
  email?: string
  /** Backend returns `solde` (mapped from solde_actuel) */
  solde: number
  lot: { id: number; numero: string; tantieme: number } | null
}

export type CreateCoproprietaireInput = {
  name: string
  phone: string
  email?: string
  residence_id: number
  lot_id: number
  type?: 'proprietaire' | 'locataire'
  date_entree?: string
}

export type CreateCoproprietaireResponse = {
  coproprietaire: Coproprietaire
  /** 8-char alphanumeric temp code, returned directly by the store endpoint, shown once to gestionnaire */
  temp_password: string
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
  montant: number
  mode: string
  reference?: string
  note?: string
  date_paiement: string
  coproprietaire: {
    id: number
    name: string
    phone: string
    lot: { numero: string; tantieme: number }
  }
  ligne: {
    id: number
    montant_du: number
    montant_paye: number
    statut: string
    libelle: string
  }
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
  /** Human-friendly unique reference, e.g. "TKT-2026-0007" (KAN-43). */
  reference: string
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
  /** Satisfaction rating from resident (KAN-90/KAN-91). */
  rating?: 'satisfait' | 'insatisfait'
  /** Gestionnaire assigned to handle the ticket (KAN-88). */
  assignee?: { id: number; name: string }
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
  {
    id: 1,
    numero: 'A-01',
    type: 'appartement',
    etage: 1,
    superficie: 85,
    tantieme: 45,
    coproprietaire: { id: 1, name: 'Hassan Benali', phone: '+212600000010' },
  },
  {
    id: 2,
    numero: 'A-02',
    type: 'appartement',
    etage: 1,
    superficie: 90,
    tantieme: 48,
    coproprietaire: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' },
  },
  {
    id: 3,
    numero: 'B-01',
    type: 'commerce',
    etage: 0,
    superficie: 60,
    tantieme: 35,
    coproprietaire: null,
  },
  {
    id: 4,
    numero: 'P-01',
    type: 'parking',
    etage: -1,
    superficie: 15,
    tantieme: 8,
    coproprietaire: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' },
  },
]

const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
  {
    id: 1,
    name: 'Hassan Benali',
    phone: '+212600000010',
    solde: 0,
    lot: { id: 1, numero: 'A-01', tantieme: 45 },
  },
  {
    id: 2,
    name: 'Fatima Chraibi',
    phone: '+212600000011',
    solde: -720,
    lot: { id: 2, numero: 'A-02', tantieme: 48 },
  },
  {
    id: 3,
    name: 'Karim El Fassi',
    phone: '+212600000012',
    solde: -144,
    lot: { id: 4, numero: 'P-01', tantieme: 8 },
  },
]

const MOCK_EXERCICES: Exercice[] = [
  {
    id: 1,
    annee: 2026,
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
    statut: 'actif',
  },
  {
    id: 2,
    annee: 2025,
    date_debut: '2025-01-01',
    date_fin: '2025-12-31',
    statut: 'cloture',
  },
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
  {
    id: 1,
    montant: 810,
    mode: 'virement',
    reference: 'VIR-2026-001',
    date_paiement: '2026-01-15',
    coproprietaire: {
      id: 1,
      name: 'Hassan Benali',
      phone: '+212600000010',
      lot: { numero: 'A-01', tantieme: 100 },
    },
    ligne: {
      id: 1,
      montant_du: 810,
      montant_paye: 810,
      statut: 'paye',
      libelle: 'Charges Q1 2026',
    },
  },
  {
    id: 2,
    montant: 144,
    mode: 'especes',
    date_paiement: '2026-01-20',
    coproprietaire: {
      id: 2,
      name: 'Fatima Chraibi',
      phone: '+212600000011',
      lot: { numero: 'A-02', tantieme: 107 },
    },
    ligne: {
      id: 2,
      montant_du: 864,
      montant_paye: 144,
      statut: 'partiellement_paye',
      libelle: 'Charges Q1 2026',
    },
  },
]

const MOCK_IMPAYES: Impaye[] = [
  {
    coproprietaire: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' },
    lot: { numero: 'A-02' },
    montant_du: 864,
    montant_paye: 144,
    montant_restant: 720,
    jours_retard: 75,
    appel_fonds: { id: 1, titre: 'Charges Q1 2026' },
  },
  {
    coproprietaire: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' },
    lot: { numero: 'P-01' },
    montant_du: 144,
    montant_paye: 0,
    montant_restant: 144,
    jours_retard: 48,
    appel_fonds: { id: 1, titre: 'Charges Q1 2026' },
  },
  {
    coproprietaire: { id: 4, name: 'Nadia Cherkaoui', phone: '+212664004004' },
    lot: { numero: 'A-03' },
    montant_du: 810,
    montant_paye: 0,
    montant_restant: 810,
    jours_retard: 30,
    appel_fonds: { id: 1, titre: 'Charges Q1 2026' },
  },
]

const MOCK_TICKETS: Ticket[] = [
  {
    id: 1,
    reference: 'TKT-2026-0001',
    categorie: 'Plomberie',
    description: "Fuite d'eau importante au sous-sol — pompe endommagée",
    priorite: 'urgent',
    statut: 'ouvert',
    images: [],
    closed_at: null,
    created_at: '2026-05-12T08:30:00Z',
    residence: { id: 1, name: 'Atlas Casablanca', city: 'Casablanca' },
    lot: { id: 1, numero: 'A-01' },
    user: { id: 1, name: 'Hassan Benali', phone: '+212600000010' },
    assignee: { id: 2, name: 'Salma Bennani' },
  },
  {
    id: 2,
    reference: 'TKT-2026-0002',
    categorie: 'Électricité',
    description: "Panne d'électricité dans les parties communes — tableau HS",
    priorite: 'urgent',
    statut: 'en_cours',
    images: [],
    closed_at: null,
    created_at: '2026-05-13T14:15:00Z',
    residence: { id: 2, name: 'Blanca Rabat', city: 'Rabat' },
    lot: { id: 5, numero: 'B-01' },
    user: { id: 2, name: 'Fatima Chraibi', phone: '+212600000011' },
    assignee: { id: 2, name: 'Salma Bennani' },
  },
  {
    id: 3,
    reference: 'TKT-2026-0003',
    categorie: 'Sécurité',
    description: 'Portail principal bloqué — accès véhicule impossible',
    priorite: 'normal',
    statut: 'clos',
    images: [],
    closed_at: '2026-05-18T16:00:00Z',
    created_at: '2026-05-11T09:00:00Z',
    residence: { id: 3, name: 'Marina Agadir', city: 'Agadir' },
    lot: { id: 8, numero: 'C-01' },
    user: { id: 3, name: 'Karim El Fassi', phone: '+212600000012' },
    rating: 'satisfait',
  },
  {
    id: 4,
    reference: 'TKT-2026-0004',
    categorie: 'Ascenseur',
    description: 'Ascenseur bloqué entre 2e et 3e étage — câble de sécurité',
    priorite: 'urgent',
    statut: 'resolu',
    images: [],
    closed_at: '2026-05-25T11:00:00Z',
    created_at: '2026-05-20T07:00:00Z',
    residence: { id: 1, name: 'Atlas Casablanca', city: 'Casablanca' },
    lot: { id: 2, numero: 'A-02' },
    user: { id: 4, name: 'Youssef Idrissi', phone: '+212600000013' },
    rating: 'satisfait',
  },
  {
    id: 5,
    reference: 'TKT-2026-0005',
    categorie: 'Propreté',
    description: 'Nettoyage du parking sous-sol non effectué depuis 2 semaines',
    priorite: 'faible',
    statut: 'clos',
    images: [],
    closed_at: '2026-04-22T14:00:00Z',
    created_at: '2026-04-18T10:00:00Z',
    residence: { id: 2, name: 'Blanca Rabat', city: 'Rabat' },
    lot: { id: 6, numero: 'B-02' },
    user: { id: 5, name: 'Amina Raji', phone: '+212600000014' },
    rating: 'insatisfait',
  },
  {
    id: 6,
    reference: 'TKT-2026-0006',
    categorie: 'Plomberie',
    description: 'Robinetterie du couloir 3e étage — fuite visible',
    priorite: 'normal',
    statut: 'ouvert',
    images: [],
    closed_at: null,
    created_at: '2026-06-01T09:15:00Z',
    residence: { id: 1, name: 'Atlas Casablanca', city: 'Casablanca' },
    lot: { id: 3, numero: 'A-03' },
    user: { id: 6, name: 'Nadia Tazi', phone: '+212600000015' },
    assignee: { id: 2, name: 'Salma Bennani' },
  },
  {
    id: 7,
    reference: 'TKT-2026-0007',
    categorie: 'Électricité',
    description: 'Éclairage escalier cage B — ampoules grillées',
    priorite: 'faible',
    statut: 'en_cours',
    images: [],
    closed_at: null,
    created_at: '2026-06-03T11:00:00Z',
    residence: { id: 3, name: 'Marina Agadir', city: 'Agadir' },
    lot: { id: 9, numero: 'C-02' },
    user: { id: 7, name: 'Omar Bensouda', phone: '+212600000016' },
  },
  {
    id: 8,
    reference: 'TKT-2026-0008',
    categorie: 'Sécurité',
    description: 'Digicode entrée principale hors service',
    priorite: 'urgent',
    statut: 'resolu',
    images: [],
    closed_at: '2026-06-08T10:30:00Z',
    created_at: '2026-06-05T08:00:00Z',
    residence: { id: 2, name: 'Blanca Rabat', city: 'Rabat' },
    lot: { id: 7, numero: 'B-03' },
    user: { id: 8, name: 'Leila Mansouri', phone: '+212600000017' },
    rating: 'satisfait',
  },
  {
    id: 9,
    reference: 'TKT-2026-0009',
    categorie: 'Espaces verts',
    description: 'Arrosage jardin commun non fonctionnel',
    priorite: 'faible',
    statut: 'ouvert',
    images: [],
    closed_at: null,
    created_at: '2026-06-10T14:00:00Z',
    residence: { id: 3, name: 'Marina Agadir', city: 'Agadir' },
    lot: { id: 10, numero: 'C-03' },
    user: { id: 9, name: 'Rachid Filali', phone: '+212600000018' },
  },
  {
    id: 10,
    reference: 'TKT-2026-0010',
    categorie: 'Ascenseur',
    description: 'Bouton 5e étage ne répond plus — maintenance requise',
    priorite: 'normal',
    statut: 'clos',
    images: [],
    closed_at: '2026-04-10T09:00:00Z',
    created_at: '2026-04-02T13:00:00Z',
    residence: { id: 1, name: 'Atlas Casablanca', city: 'Casablanca' },
    lot: { id: 4, numero: 'A-04' },
    user: { id: 10, name: 'Zineb Ouali', phone: '+212600000019' },
    rating: 'satisfait',
  },
  {
    id: 11,
    reference: 'TKT-2026-0011',
    categorie: 'Plomberie',
    description: 'WC commun rez-de-chaussée — chasse inopérante',
    priorite: 'normal',
    statut: 'en_cours',
    images: [],
    closed_at: null,
    created_at: '2026-06-12T08:00:00Z',
    residence: { id: 2, name: 'Blanca Rabat', city: 'Rabat' },
    lot: { id: 6, numero: 'B-02' },
    user: { id: 5, name: 'Amina Raji', phone: '+212600000014' },
  },
  {
    id: 12,
    reference: 'TKT-2026-0012',
    categorie: 'Propreté',
    description: 'Dépôt de déchets sauvages à la sortie du parking',
    priorite: 'faible',
    statut: 'clos',
    images: [],
    closed_at: '2026-03-15T10:00:00Z',
    created_at: '2026-03-12T09:00:00Z',
    residence: { id: 3, name: 'Marina Agadir', city: 'Agadir' },
    lot: { id: 11, numero: 'C-04' },
    user: { id: 11, name: 'Mehdi Alaoui', phone: '+212600000020' },
    rating: 'insatisfait',
  },
]

const MOCK_ASSEMBLEES: Assemblee[] = [
  {
    id: 1,
    titre: 'AG Ordinaire 2026',
    type: 'ordinaire',
    residence: { id: 1, name: 'Atlas Casablanca' },
    date: '2026-05-28T10:00:00Z',
    lieu: 'Salle de réunion, RDC, Résidence Atlas',
    statut: 'convoquee',
    quorum_requis: 50,
    participants_count: null,
    ordre_du_jour:
      '1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Travaux façade\n4. Questions diverses',
  },
  {
    id: 2,
    titre: 'AG Extraordinaire — Travaux façade',
    type: 'extraordinaire',
    residence: { id: 2, name: 'Blanca Rabat' },
    date: '2026-06-05T15:00:00Z',
    lieu: 'Salle polyvalente, Résidence Blanca',
    statut: 'convoquee',
    quorum_requis: 66,
    participants_count: null,
    ordre_du_jour:
      '1. Vote des travaux de ravalement de façade\n2. Approbation du devis (320 000 DH)\n3. Financement et appels de fonds exceptionnels',
  },
  {
    id: 3,
    titre: 'AG Ordinaire 2025',
    type: 'ordinaire',
    residence: { id: 1, name: 'Atlas Casablanca' },
    date: '2025-06-10T10:00:00Z',
    lieu: 'Salle de réunion, RDC',
    statut: 'tenue',
    quorum_requis: 50,
    participants_count: 18,
    ordre_du_jour:
      '1. Approbation des comptes 2024\n2. Budget 2025\n3. Renouvellement du contrat de gardiennage',
  },
]

const MOCK_ASSEMBLEES_AG: AG[] = MOCK_ASSEMBLEES.map((a) => ({
  id: a.id,
  titre: a.titre,
  residence_id: a.residence.id,
  residence_name: a.residence.name,
  date: a.date,
  lieu: a.lieu,
}))

const MOCK_IMMEUBLES: Immeuble[] = [
  {
    id: 1,
    nom: 'Bâtiment 1',
    groupe_habitation_id: 1,
    residence_id: 1,
    nb_lots: 12,
  },
  {
    id: 2,
    nom: 'Bâtiment 2',
    groupe_habitation_id: 1,
    residence_id: 1,
    nb_lots: 8,
  },
  {
    id: 3,
    nom: 'Bâtiment 3',
    groupe_habitation_id: 2,
    residence_id: 1,
    nb_lots: 4,
  },
  {
    id: 4,
    nom: 'Tour Principale',
    groupe_habitation_id: 3,
    residence_id: 2,
    nb_lots: 18,
  },
]

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard(
  residenceId?: number,
): Promise<DashboardData> {
  const mock: DashboardData = {
    kpi: {
      nb_residences: MOCK_KPI_ALL.residences_count,
      nb_coproprietaires: MOCK_KPI_ALL.lots_count,
      ca_mensuel: MOCK_KPI_ALL.montant_recouvre,
      total_impayes: MOCK_KPI_ALL.montant_restant,
    },
    top_impayes: MOCK_IMPAYES.slice(0, 5).map((i) => ({
      coproprietaire: { id: i.coproprietaire.id, name: i.coproprietaire.name },
      lot: i.lot.numero,
      montant: i.montant_restant,
      jours: i.jours_retard,
    })),
    tickets_urgents: MOCK_TICKETS.filter((t) => t.priorite === 'urgent')
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        titre: t.description,
        priorite: t.priorite,
        statut: t.statut,
        residence: t.residence,
        created_at: t.created_at,
      })),
    assemblees_a_venir: MOCK_ASSEMBLEES.slice(0, 3).map((a) => ({
      id: a.id,
      titre: a.titre,
      date: a.date,
      residence: { name: a.residence.name },
    })),
  }
  return withMock(async () => {
    const params =
      residenceId !== undefined ? { residence_id: residenceId } : {}
    const res = await api.get<ApiEnvelope<DashboardData>>(
      '/gestionnaire/dashboard',
      { params },
    )
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
    const res = await api.get<ApiEnvelope<{ residences: Residence[] }>>(
      '/gestionnaire/residences',
      { params },
    )
    return res.data.data.residences
  }, MOCK_RESIDENCES)
}

export async function getResidence(id: number): Promise<Residence> {
  const res = await api.get<ApiEnvelope<Residence>>(
    `/gestionnaire/residences/${id}`,
  )
  return res.data.data
}

export async function storeResidence(
  data: CreateResidenceInput,
): Promise<Residence> {
  const res = await api.post<ApiEnvelope<Residence>>(
    '/gestionnaire/residences',
    data,
  )
  return res.data.data
}

export async function updateResidence(
  id: number,
  data: UpdateResidenceInput,
): Promise<Residence> {
  const res = await api.put<ApiEnvelope<Residence>>(
    `/gestionnaire/residences/${id}`,
    data,
  )
  return res.data.data
}

/**
 * Request a one-time code (email/SMS) to authorise deleting a residence
 * (KAN-49). Returns the channel it was sent on so the UI can tell the user.
 *
 * Backend Abdellah (futur) — `POST /api/gestionnaire/residences/:id/deletion-code`.
 * Mock returns `email` so the confirm flow works end-to-end in dev.
 */
export async function requestResidenceDeletionCode(
  id: number,
): Promise<{ channel: 'email' | 'sms' }> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ channel: 'email' | 'sms' }>>(
        `/gestionnaire/residences/${id}/deletion-code`,
        {},
      )
      return res.data.data
    },
    { channel: 'email' },
  )
}

/**
 * Delete a residence. The `code` (KAN-49) is the OTP the user received; the
 * backend must verify it before deleting. In dev the call is mocked so the
 * flow works without a real code.
 */
export async function deleteResidence(
  id: number,
  code?: string,
): Promise<void> {
  if (import.meta.env.DEV) return
  await api.delete(`/gestionnaire/residences/${id}`, {
    data: code ? { code } : undefined,
  })
}

export async function getResidenceOverview(
  id: number,
): Promise<ResidenceOverview> {
  const res = await api.get<ApiEnvelope<ResidenceOverview>>(
    `/gestionnaire/residences/${id}/overview`,
  )
  return res.data.data
}

// ─── Comptes bancaires (encaissement) ──────────────────────────────────────────

const MOCK_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 1,
    residence_id: 1,
    banque: 'attijariwafa',
    titulaire: 'Syndic Résidence Atlas',
    rib: '007 780 0001234567890123 45',
    iban: 'MA64 0077 8000 0123 4567 8901 2345',
    is_primary: true,
  },
  {
    id: 2,
    residence_id: 1,
    banque: 'cih',
    titulaire: 'Syndic Résidence Atlas',
    rib: '230 810 1122334455667788 90',
    is_primary: false,
  },
]

export async function getResidenceBankAccounts(
  residenceId: number,
): Promise<BankAccount[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ comptes: BankAccount[] }>>(
        `/gestionnaire/residences/${residenceId}/comptes-bancaires`,
      )
      return res.data.data.comptes
    },
    MOCK_BANK_ACCOUNTS.filter((c) => c.residence_id === residenceId),
  )
}

export async function storeBankAccount(
  residenceId: number,
  data: CreateBankAccountInput,
): Promise<BankAccount> {
  const mock: BankAccount = {
    id: Date.now(),
    residence_id: residenceId,
    banque: data.banque,
    titulaire: data.titulaire,
    rib: data.rib,
    iban: data.iban,
    is_primary: data.is_primary ?? false,
  }
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<BankAccount>>(
      `/gestionnaire/residences/${residenceId}/comptes-bancaires`,
      data,
    )
    return res.data.data
  }, mock)
}

export async function updateBankAccount(
  residenceId: number,
  accountId: number,
  data: UpdateBankAccountInput,
): Promise<BankAccount> {
  const base =
    MOCK_BANK_ACCOUNTS.find((c) => c.id === accountId) ?? MOCK_BANK_ACCOUNTS[0]
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<BankAccount>>(
        `/gestionnaire/residences/${residenceId}/comptes-bancaires/${accountId}`,
        data,
      )
      return res.data.data
    },
    { ...base, ...data, id: accountId, residence_id: residenceId },
  )
}

export async function deleteBankAccount(
  residenceId: number,
  accountId: number,
): Promise<void> {
  return withMock(async () => {
    await api.delete(
      `/gestionnaire/residences/${residenceId}/comptes-bancaires/${accountId}`,
    )
  }, undefined)
}

export async function setPrimaryBankAccount(
  residenceId: number,
  accountId: number,
): Promise<void> {
  return withMock(async () => {
    await api.post(
      `/gestionnaire/residences/${residenceId}/comptes-bancaires/${accountId}/primary`,
    )
  }, undefined)
}

// ─── Lots ────────────────────────────────────────────────────────────────────

export async function getLots(
  residenceId: number,
): Promise<{ lots: Lot[]; total_tantieme: number }> {
  return withMock(
    async () => {
      const res = await api.get<
        ApiEnvelope<{ lots: Lot[]; total_tantieme: number }>
      >(`/gestionnaire/residences/${residenceId}/lots`)
      return res.data.data
    },
    {
      lots: MOCK_LOTS,
      total_tantieme: MOCK_LOTS.reduce((s, l) => s + l.tantieme, 0),
    },
  )
}

export async function storeLot(
  residenceId: number,
  data: Pick<
    Lot,
    'numero' | 'type' | 'etage' | 'superficie' | 'tantieme' | 'titre_foncier'
  > & {
    immeuble_id?: number
    categorie_lot_id?: number | null
  },
): Promise<Lot> {
  const mockLot: Lot = {
    id: Date.now(),
    numero: data.numero,
    type: data.type,
    etage: data.etage,
    superficie: data.superficie,
    tantieme: data.tantieme,
    titre_foncier: data.titre_foncier,
    immeuble_id: data.immeuble_id,
    categorie_lot_id: data.categorie_lot_id ?? null,
    coproprietaire: null,
  }
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<Lot>>(
      `/gestionnaire/residences/${residenceId}/lots`,
      data,
    )
    return res.data.data
  }, mockLot)
}

export async function updateLot(
  residenceId: number,
  lotId: number,
  data: Partial<
    Pick<
      Lot,
      'numero' | 'type' | 'etage' | 'superficie' | 'tantieme' | 'titre_foncier'
    >
  > & { immeuble_id?: number; categorie_lot_id?: number | null },
): Promise<Lot> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<Lot>>(
        `/gestionnaire/residences/${residenceId}/lots/${lotId}`,
        data,
      )
      return res.data.data
    },
    { ...MOCK_LOTS[0], ...data, id: lotId },
  )
}

// ─── Catégories de lot (KAN-93) ───────────────────────────────────────────────

const MOCK_CATEGORIES_LOT: CategorieLot[] = [
  { id: 1, residence_id: 1, nom: '3C+S', cotisation: 1500, nb_lots: 4 },
  { id: 2, residence_id: 1, nom: '2C+S', cotisation: 1100, nb_lots: 6 },
  { id: 3, residence_id: 1, nom: 'Commerce', cotisation: 2500, nb_lots: 2 },
]

export async function getCategoriesLot(
  residenceId: number,
): Promise<CategorieLot[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<CategorieLot[]>>(
      `/gestionnaire/residences/${residenceId}/categories-lot`,
    )
    return res.data.data
  }, MOCK_CATEGORIES_LOT)
}

export async function createCategorieLot(
  residenceId: number,
  data: { nom: string; cotisation: number },
): Promise<CategorieLot> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<CategorieLot>>(
        `/gestionnaire/residences/${residenceId}/categories-lot`,
        data,
      )
      return res.data.data
    },
    {
      id: Date.now(),
      residence_id: residenceId,
      nom: data.nom,
      cotisation: data.cotisation,
      nb_lots: 0,
    },
  )
}

export async function updateCategorieLot(
  categorieId: number,
  data: { nom?: string; cotisation?: number },
): Promise<CategorieLot> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<CategorieLot>>(
        `/gestionnaire/categories-lot/${categorieId}`,
        data,
      )
      return res.data.data
    },
    {
      ...(MOCK_CATEGORIES_LOT.find((c) => c.id === categorieId) ??
        MOCK_CATEGORIES_LOT[0]),
      ...data,
      id: categorieId,
    },
  )
}

export async function deleteCategorieLot(categorieId: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/categories-lot/${categorieId}`)
  }, undefined)
}

export async function deleteLot(
  residenceId: number,
  lotId: number,
): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/residences/${residenceId}/lots/${lotId}`)
  }, undefined)
}

// ─── Copropriétaires ─────────────────────────────────────────────────────────

export async function getCoproprietaires(
  residenceId: number,
  search?: string,
): Promise<Coproprietaire[]> {
  return withMock(async () => {
    // The endpoint paginates (default 15/page). We fetch every page so the list
    // shows the full résidence, not just the first 15 (issue #204).
    type Page = {
      coproprietaires: Coproprietaire[]
      meta?: { current_page: number; last_page: number }
    }
    const perPage = 100
    const fetchPage = async (page: number) => {
      const params: Record<string, string> = {
        per_page: String(perPage),
        page: String(page),
      }
      if (search) params.search = search
      const res = await api.get<ApiEnvelope<Page>>(
        `/gestionnaire/residences/${residenceId}/coproprietaires`,
        { params },
      )
      return res.data.data
    }

    const first = await fetchPage(1)
    const lastPage = first.meta?.last_page ?? 1
    const all = [...first.coproprietaires]
    for (let page = 2; page <= lastPage; page++) {
      const next = await fetchPage(page)
      all.push(...next.coproprietaires)
    }
    return all
  }, MOCK_COPROPRIETAIRES)
}

export async function createCoproprietaire(
  input: CreateCoproprietaireInput,
): Promise<CreateCoproprietaireResponse> {
  const mock: CreateCoproprietaireResponse = {
    coproprietaire: {
      id: Date.now(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      solde: 0,
      lot: { id: input.lot_id, numero: '—', tantieme: 0 },
    },
    temp_password: Math.random().toString(36).slice(-8).toUpperCase(),
  }
  return withMock(async () => {
    // temp_password is returned directly in the store response — no separate generate-code call needed
    const res = await api.post<ApiEnvelope<CreateCoproprietaireResponse>>(
      '/gestionnaire/coproprietaires',
      { ...input, type: input.type ?? 'proprietaire' },
    )
    return res.data.data
  }, mock)
}

/** Editable fields of a coproprietaire (KAN-50: fix a typo after creation). */
export type UpdateCoproprietaireInput = {
  name?: string
  phone?: string
  email?: string
}

/**
 * Update a coproprietaire's contact info after creation (KAN-50).
 *
 * Backend Abdellah (futur) — `PATCH /api/gestionnaire/coproprietaires/:id`.
 * Until it lands the call is mocked so the edit flow works end-to-end.
 */
export async function updateCoproprietaire(
  id: number,
  patch: UpdateCoproprietaireInput,
): Promise<Coproprietaire> {
  const mock: Coproprietaire = {
    id,
    name: patch.name ?? '',
    phone: patch.phone ?? '',
    email: patch.email,
    solde: 0,
    lot: null,
  }
  return withMock(async () => {
    const res = await api.patch<ApiEnvelope<Coproprietaire>>(
      `/gestionnaire/coproprietaires/${id}`,
      patch,
    )
    return res.data.data
  }, mock)
}

// ─── Exercices ───────────────────────────────────────────────────────────────

export async function getExercices(residenceId: number): Promise<Exercice[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<Exercice[]>>(
      `/gestionnaire/residences/${residenceId}/exercices`,
    )
    return res.data.data
  }, MOCK_EXERCICES)
}

export async function storeExercice(
  residenceId: number,
  data: { annee: number; date_debut: string; date_fin: string },
): Promise<Exercice> {
  const res = await api.post<ApiEnvelope<Exercice>>(
    `/gestionnaire/residences/${residenceId}/exercices`,
    data,
  )
  return res.data.data
}

export async function clotureExercice(
  residenceId: number,
  exerciceId: number,
): Promise<Exercice> {
  const res = await api.post<ApiEnvelope<Exercice>>(
    `/gestionnaire/residences/${residenceId}/exercices/${exerciceId}/cloture`,
  )
  return res.data.data
}

// ─── Appels de fonds ─────────────────────────────────────────────────────────

export async function getAppelsFonds(params?: {
  residence_id?: number
  statut?: string
}): Promise<AppelFonds[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ appels_fonds: AppelFonds[] }>>(
      '/gestionnaire/appels-fonds',
      { params },
    )
    return res.data.data.appels_fonds
  }, MOCK_APPELS_FONDS)
}

export async function storeAppelFonds(data: {
  titre: string
  residence_id: number
  montant_total: number
  date_echeance: string
  description?: string
  groupe_habitation_id?: number
}): Promise<AppelFonds> {
  const res = await api.post<ApiEnvelope<{ appel_fonds: AppelFonds }>>(
    '/gestionnaire/appels-fonds',
    data,
  )
  return res.data.data.appel_fonds
}

export async function updateAppelFonds(
  id: number,
  data: Partial<Pick<AppelFonds, 'titre' | 'montant_total' | 'date_echeance'>>,
): Promise<AppelFonds> {
  const res = await api.put<ApiEnvelope<AppelFonds>>(
    `/gestionnaire/appels-fonds/${id}`,
    data,
  )
  return res.data.data
}

export async function envoyerAppelFonds(id: number): Promise<void> {
  await api.post(`/gestionnaire/appels-fonds/${id}/envoyer`)
}

// ─── Paiements ───────────────────────────────────────────────────────────────

export async function getPaiements(params?: {
  residence_id?: number
  statut?: string
}): Promise<Paiement[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ paiements: Paiement[] }>>(
      '/gestionnaire/paiements',
      { params },
    )
    return res.data.data.paiements
  }, MOCK_PAIEMENTS)
}

export async function storePaiement(data: {
  appel_fonds_ligne_id: number
  montant: number
  date_paiement: string
  mode: string
  reference?: string
  note?: string
}): Promise<Paiement> {
  const res = await api.post<ApiEnvelope<Paiement>>(
    '/gestionnaire/paiements',
    data,
  )
  return res.data.data
}

// ─── Impayés ─────────────────────────────────────────────────────────────────

export async function getImpayes(params?: {
  residence_id?: number
}): Promise<Impaye[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ impayes: Impaye[] }>>(
      '/gestionnaire/impayes',
      { params },
    )
    return res.data.data.impayes
  }, MOCK_IMPAYES)
}

export async function getTopImpayes(
  residenceId?: number,
  limit = 10,
): Promise<Impaye[]> {
  const impayes = await getImpayes(
    residenceId !== undefined ? { residence_id: residenceId } : undefined,
  )
  return impayes.slice(0, limit)
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export async function getTickets(params?: {
  residence_id?: number
  statut?: string
  priorite?: string
  categorie?: string
  /** Recherche par référence (TKT-…) ou description — KAN-105. */
  search?: string
}): Promise<Ticket[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ tickets: Ticket[] }>>(
        '/gestionnaire/tickets',
        { params },
      )
      return res.data.data.tickets
    },
    // Mock fallback mirrors the backend `search` (réf. ou description).
    (() => {
      const q = params?.search?.trim().toLowerCase()
      if (!q) return MOCK_TICKETS
      return MOCK_TICKETS.filter(
        (ticket) =>
          ticket.reference.toLowerCase().includes(q) ||
          ticket.description.toLowerCase().includes(q),
      )
    })(),
  )
}

export async function getTicket(id: number): Promise<Ticket> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Ticket>>(
        `/gestionnaire/tickets/${id}`,
      )
      return res.data.data
    },
    MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0],
  )
}

export async function updateTicket(
  id: number,
  data: { statut?: string; priorite?: string; cout_estime?: number },
): Promise<Ticket> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ ticket: Ticket }>>(
        `/gestionnaire/tickets/${id}`,
        data,
      )
      return res.data.data.ticket
    },
    {
      ...(MOCK_TICKETS.find((t) => t.id === id) ?? MOCK_TICKETS[0]),
      ...data,
    } as Ticket,
  )
}

export async function closTicket(id: number): Promise<void> {
  return withMock(async () => {
    await api.post(`/gestionnaire/tickets/${id}/clos`)
  }, undefined)
}

/** Assign (or unassign) a ticket to a gestionnaire (KAN-88). */
export async function assignTicket(
  ticketId: number,
  gestionnaireId: number | null,
): Promise<void> {
  await withMock(async () => {
    await api.patch(`/gestionnaire/tickets/${ticketId}/assign`, {
      gestionnaire_id: gestionnaireId,
    })
  }, undefined)
}

export type CreateTicketInput = {
  residence_id: number
  lot_id: number
  categorie: string
  priorite: 'urgent' | 'normal' | 'faible'
  description: string
}

/**
 * Create a ticket from the gestionnaire side (KAN-43). The backend assigns the
 * unique `reference` (the mock generates one so the flow works in dev).
 */
export async function createTicket(data: CreateTicketInput): Promise<Ticket> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ ticket: Ticket }>>(
        '/gestionnaire/tickets',
        data,
      )
      return res.data.data.ticket
    },
    (() => {
      const id = Math.floor(Math.random() * 9000) + 1000
      const residence = MOCK_RESIDENCES.find((r) => r.id === data.residence_id)
      const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
      return {
        id,
        reference: `TKT-${new Date().getFullYear()}-${seq}`,
        categorie: data.categorie,
        description: data.description,
        priorite: data.priorite,
        statut: 'ouvert',
        images: [],
        closed_at: null,
        created_at: new Date().toISOString(),
        residence: {
          id: data.residence_id,
          name: residence?.name ?? 'Résidence',
          city: residence?.city,
        },
        lot: { id: data.lot_id, numero: '—' },
        user: { id: 0, name: 'Gestionnaire' },
      }
    })(),
  )
}

export async function getTicketsUrgents(
  residenceId?: number,
): Promise<Ticket[]> {
  return getTickets({
    residence_id: residenceId,
    statut: 'ouvert',
    priorite: 'urgent',
  })
}

// ─── Assemblées ──────────────────────────────────────────────────────────────

export async function getAssemblees(params?: {
  residence_id?: number
  statut?: string
}): Promise<Assemblee[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ assemblees: Assemblee[] }>>(
      '/gestionnaire/assemblees',
      { params },
    )
    return res.data.data.assemblees
  }, MOCK_ASSEMBLEES)
}

export async function storeAssemblee(data: {
  titre: string
  type: string
  residence_id: number
  date: string
  lieu: string
  quorum_requis: number
  ordre_du_jour: string
}): Promise<Assemblee> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ assemblee: Assemblee }>>(
        '/gestionnaire/assemblees',
        data,
      )
      return res.data.data.assemblee
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      titre: data.titre,
      type: data.type as 'ordinaire' | 'extraordinaire',
      residence: MOCK_RESIDENCES.find((r) => r.id === data.residence_id) ?? {
        id: data.residence_id,
        name: 'Résidence',
      },
      date: data.date,
      lieu: data.lieu,
      statut: 'convoquee' as const,
      quorum_requis: data.quorum_requis,
      participants_count: null,
      ordre_du_jour: data.ordre_du_jour,
    },
  )
}

/** Legacy — kept for DashboardPage compat. */
export async function getAssembleesAvenir(): Promise<AG[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ assemblees: AG[] }>>(
        '/gestionnaire/assemblees',
      )
      return res.data.data.assemblees
    },
    MOCK_ASSEMBLEES_AG.filter((a) => new Date(a.date) > new Date()),
  )
}

// ─── Groupes d'habitation (Tranches) ─────────────────────────────────────────

type GroupeHabitationInput = {
  nom?: string
  code?: string
  description?: string | null
  total_tantieme?: number
}

export async function getGroupesHabitations(
  residenceId: number,
): Promise<GroupeHabitation[]> {
  const res = await api.get<
    ApiEnvelope<{ groupes_habitations: GroupeHabitation[] }>
  >(`/gestionnaire/residences/${residenceId}/groupes-habitations`)
  return res.data.data.groupes_habitations
}

export async function storeGroupeHabitation(
  residenceId: number,
  data: GroupeHabitationInput & { nom: string },
): Promise<GroupeHabitation> {
  const res = await api.post<ApiEnvelope<GroupeHabitation>>(
    `/gestionnaire/residences/${residenceId}/groupes-habitations`,
    data,
  )
  return res.data.data
}

export async function updateGroupeHabitation(
  residenceId: number,
  ghId: number,
  data: GroupeHabitationInput,
): Promise<GroupeHabitation> {
  const res = await api.put<ApiEnvelope<GroupeHabitation>>(
    `/gestionnaire/residences/${residenceId}/groupes-habitations/${ghId}`,
    data,
  )
  return res.data.data
}

export async function deleteGroupeHabitation(
  residenceId: number,
  ghId: number,
): Promise<void> {
  await api.delete(
    `/gestionnaire/residences/${residenceId}/groupes-habitations/${ghId}`,
  )
}

// ─── Immeubles ───────────────────────────────────────────────────────────────

export async function getImmeubles(residenceId: number): Promise<Immeuble[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ immeubles: Immeuble[] }>>(
        `/gestionnaire/residences/${residenceId}/immeubles`,
      )
      return res.data.data.immeubles
    },
    MOCK_IMMEUBLES.filter((im) => im.residence_id === residenceId),
  )
}

export async function storeImmeuble(
  residenceId: number,
  data: { nom: string; groupe_habitation_id?: number },
): Promise<Immeuble> {
  const mockImmeuble: Immeuble = {
    id: Date.now(),
    nom: data.nom,
    groupe_habitation_id: data.groupe_habitation_id ?? null,
    residence_id: residenceId,
    nb_lots: 0,
  }
  return withMock(async () => {
    const res = await api.post<ApiEnvelope<Immeuble>>(
      `/gestionnaire/residences/${residenceId}/immeubles`,
      data,
    )
    return res.data.data
  }, mockImmeuble)
}

export async function updateImmeuble(
  residenceId: number,
  immeubleId: number,
  data: { nom?: string; groupe_habitation_id?: number },
): Promise<Immeuble> {
  const existing = MOCK_IMMEUBLES.find((im) => im.id === immeubleId) ?? {
    id: immeubleId,
    nom: data.nom ?? '',
    residence_id: residenceId,
  }
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<Immeuble>>(
        `/gestionnaire/residences/${residenceId}/immeubles/${immeubleId}`,
        data,
      )
      return res.data.data
    },
    { ...existing, ...data } as Immeuble,
  )
}

export async function deleteImmeuble(
  residenceId: number,
  immeubleId: number,
): Promise<void> {
  return withMock(async () => {
    await api.delete(
      `/gestionnaire/residences/${residenceId}/immeubles/${immeubleId}`,
    )
  }, undefined)
}

export async function getLotsByImmeuble(
  immeubleId: number,
): Promise<{ lots: Lot[]; total_tantieme: number }> {
  const mockLots = MOCK_LOTS.filter((l) => l.immeuble_id === immeubleId)
  return withMock(
    async () => {
      const res = await api.get<
        ApiEnvelope<{ lots: Lot[]; total_tantieme: number }>
      >(`/gestionnaire/immeubles/${immeubleId}/lots`)
      return res.data.data
    },
    {
      lots: mockLots,
      total_tantieme: mockLots.reduce((s, l) => s + l.tantieme, 0),
    },
  )
}

// ─── Prestataires ─────────────────────────────────────────────────────────────

export type Prestataire = {
  id: number
  nom: string
  secteur?: string
}

export type Contrat = {
  id: number
  prestataire_id: number
  titre: string
  date_debut?: string
  date_fin?: string
}

const MOCK_PRESTATAIRES: Prestataire[] = [
  { id: 1, nom: 'Kone Maroc', secteur: 'Ascenseurs' },
  { id: 2, nom: 'CleanPro', secteur: 'Nettoyage' },
  { id: 3, nom: 'Securitas', secteur: 'Gardiennage' },
]

const MOCK_CONTRATS: Contrat[] = [
  {
    id: 1,
    prestataire_id: 1,
    titre: 'Maintenance ascenseurs 2026',
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
  },
  {
    id: 2,
    prestataire_id: 2,
    titre: 'Nettoyage parties communes 2026',
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
  },
  {
    id: 3,
    prestataire_id: 3,
    titre: 'Gardiennage 24h/24 2026',
    date_debut: '2026-01-01',
    date_fin: '2026-12-31',
  },
]

export async function getPrestataires(): Promise<Prestataire[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ prestataires: Prestataire[] }>>(
      '/gestionnaire/prestataires',
    )
    return res.data.data.prestataires
  }, MOCK_PRESTATAIRES)
}

export async function getContrats(prestataireId?: number): Promise<Contrat[]> {
  return withMock(
    async () => {
      const params =
        prestataireId !== undefined ? { prestataire_id: prestataireId } : {}
      const res = await api.get<ApiEnvelope<{ contrats: Contrat[] }>>(
        '/gestionnaire/contrats',
        { params },
      )
      return res.data.data.contrats
    },
    prestataireId !== undefined
      ? MOCK_CONTRATS.filter((c) => c.prestataire_id === prestataireId)
      : MOCK_CONTRATS,
  )
}

// ─── Bulk import functions ──────────────────────────────────────────────────

type BulkResult = { created: number; errors: string[] }
type ImportResult = { imported: number; errors: string[] }

export async function bulkStoreLots(
  residenceId: number,
  lots: Record<string, unknown>[],
): Promise<BulkResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BulkResult>>(
        `/gestionnaire/residences/${residenceId}/lots/bulk`,
        { lots },
      )
      return res.data.data
    },
    { created: lots.length, errors: [] },
  )
}

export async function bulkStoreCoproprietaires(
  coproprietaires: Record<string, unknown>[],
): Promise<BulkResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BulkResult>>(
        '/gestionnaire/coproprietaires/bulk',
        { coproprietaires },
      )
      return res.data.data
    },
    { created: coproprietaires.length, errors: [] },
  )
}

export async function importSoldes(
  residenceId: number,
  soldes: Record<string, unknown>[],
): Promise<ImportResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ImportResult>>(
        `/gestionnaire/residences/${residenceId}/import-soldes`,
        { soldes },
      )
      return res.data.data
    },
    { imported: soldes.length, errors: [] },
  )
}

export async function importPaiements(
  residenceId: number,
  paiements: Record<string, unknown>[],
): Promise<ImportResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ImportResult>>(
        `/gestionnaire/residences/${residenceId}/import-paiements`,
        { paiements },
      )
      return res.data.data
    },
    { imported: paiements.length, errors: [] },
  )
}

export async function bulkStorePrestataires(
  prestataires: Record<string, unknown>[],
): Promise<BulkResult> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BulkResult>>(
        '/gestionnaire/prestataires/bulk',
        { prestataires },
      )
      return res.data.data
    },
    { created: prestataires.length, errors: [] },
  )
}

// ─── Profil gestionnaire — consentement CNDP (loi 09-08) ─────────────────────

export type GestionnaireProfil = {
  cndp_consent_at: string | null
  cndp_policy_version?: string | null
}

/**
 * PATCH /api/gestionnaire/profil — records the CNDP (loi 09-08) consent
 * (issue #230). The backend stamps `cndp_consent_at` + its own policy version.
 */
export async function updateGestionnaireProfil(payload: {
  cndp_consent?: boolean
}): Promise<GestionnaireProfil> {
  return withMock(
    async () => {
      const res = await api.patch<ApiEnvelope<{ profil: GestionnaireProfil }>>(
        '/gestionnaire/profil',
        payload,
      )
      return res.data.data.profil
    },
    { cndp_consent_at: new Date().toISOString(), cndp_policy_version: '1.0' },
  )
}
