import { api, type ApiEnvelope } from '@/lib/axios'
import type { BankAccount } from '@/services/gestionnaire.service'
import type { AnnonceMedia } from '@/services/annonces.service'

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

export type OperationType = 'appel_fonds' | 'paiement' | 'penalite'
export type OperationStatut = 'paye' | 'impaye' | 'partiel' | 'retard'

export type Operation = {
  id: number
  type: OperationType
  libelle: string
  montant: number // négatif = débit (appel), positif = crédit (paiement)
  date: string
  statut: OperationStatut
  recu_url?: string
}

export type Annonce = {
  id: number
  titre: string
  contenu: string
  date: string
  priorite: 'normale' | 'urgente'
  media?: AnnonceMedia[]
}

export type DashboardData = {
  resident: { name: string; lot: string; residence: string }
  balance: number
  statut: 'a_jour' | 'en_retard'
  prochain_appel: { montant: number; date: string } | null
}

export type ReclamationRating = 'satisfait' | 'insatisfait'

export type Reclamation = {
  id: number
  reference: string
  categorie: string
  sujet: string
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'clos'
  priorite: 'urgent' | 'normal' | 'faible'
  created_at: string
  nb_photos: number
  rating?: ReclamationRating
}

export type ResidentProfile = {
  name: string
  phone: string
  lot: string
  residence: string
  email?: string
}

export type AssembleePortail = {
  id: number
  titre: string
  type: 'ordinaire' | 'extraordinaire'
  date: string
  lieu: string
  statut: 'convoquee' | 'tenue' | 'annulee'
  quorum_requis: number
  participants_count: number | null
  ordre_du_jour: string
  residence_name: string
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_OPERATIONS: Operation[] = [
  {
    id: 1,
    type: 'appel_fonds',
    libelle: 'Appel de fonds — Janvier 2026',
    montant: -750,
    date: '2026-01-05',
    statut: 'paye',
    recu_url: 'https://example.com/recu/1.pdf',
  },
  {
    id: 2,
    type: 'paiement',
    libelle: 'Paiement — Janvier 2026',
    montant: 750,
    date: '2026-01-12',
    statut: 'paye',
    recu_url: 'https://example.com/recu/2.pdf',
  },
  {
    id: 3,
    type: 'appel_fonds',
    libelle: 'Appel de fonds — Février 2026',
    montant: -750,
    date: '2026-02-05',
    statut: 'paye',
    recu_url: 'https://example.com/recu/3.pdf',
  },
  {
    id: 4,
    type: 'paiement',
    libelle: 'Paiement — Février 2026',
    montant: 750,
    date: '2026-02-14',
    statut: 'paye',
    recu_url: 'https://example.com/recu/4.pdf',
  },
  {
    id: 5,
    type: 'appel_fonds',
    libelle: 'Appel de fonds — Mars 2026',
    montant: -750,
    date: '2026-03-05',
    statut: 'paye',
    recu_url: 'https://example.com/recu/5.pdf',
  },
  {
    id: 6,
    type: 'paiement',
    libelle: 'Paiement partiel — Mars 2026',
    montant: 300,
    date: '2026-03-18',
    statut: 'partiel',
  },
  {
    id: 7,
    type: 'appel_fonds',
    libelle: 'Appel de fonds — Avril 2026',
    montant: -750,
    date: '2026-04-05',
    statut: 'impaye',
  },
  {
    id: 8,
    type: 'appel_fonds',
    libelle: 'Appel de fonds — Mai 2026',
    montant: -750,
    date: '2026-05-05',
    statut: 'retard',
  },
]

const MOCK_ANNONCES: Annonce[] = [
  {
    id: 1,
    titre: 'Travaux ascenseur — interruption de service',
    contenu:
      "L'ascenseur sera hors service du 20 au 22 mai 2026 pour maintenance préventive annuelle. Merci de votre compréhension.",
    date: '2026-05-10',
    priorite: 'urgente',
  },
  {
    id: 2,
    titre: 'Assemblée générale ordinaire — convocation',
    contenu:
      "L'assemblée générale ordinaire se tiendra le samedi 31 mai 2026 à 10h00 dans la salle commune du rez-de-chaussée. Ordre du jour : approbation des comptes 2025, budget prévisionnel 2026.",
    date: '2026-05-08',
    priorite: 'normale',
  },
  {
    id: 3,
    titre: 'Nettoyage des parties communes — planning',
    contenu:
      'Le nettoyage renforcé des couloirs et halls aura lieu chaque mercredi matin à partir du 15 mai 2026.',
    date: '2026-05-05',
    priorite: 'normale',
  },
]

const MOCK_DASHBOARD: DashboardData = {
  resident: {
    name: 'Mouad Baamrane',
    lot: 'A-102',
    residence: 'Résidence Al Blanca',
  },
  balance: -450,
  statut: 'en_retard',
  prochain_appel: { montant: 750, date: '2026-06-05' },
}

const MOCK_RECLAMATIONS: Reclamation[] = [
  {
    id: 1,
    reference: 'REC-2026-001',
    categorie: 'Ascenseur',
    sujet: 'Panne ascenseur depuis 3 jours',
    statut: 'resolu',
    priorite: 'urgent',
    created_at: '2026-04-10T09:00:00Z',
    nb_photos: 2,
    rating: undefined,
  },
  {
    id: 2,
    reference: 'REC-2026-002',
    categorie: 'Eau/Plomberie',
    sujet: 'Fuite dans le couloir du 2e étage',
    statut: 'en_cours',
    priorite: 'urgent',
    created_at: '2026-05-02T14:30:00Z',
    nb_photos: 3,
  },
  {
    id: 3,
    reference: 'REC-2026-003',
    categorie: 'Parties communes',
    sujet: "Éclairage défectueux cage d'escalier",
    statut: 'ouvert',
    priorite: 'normal',
    created_at: '2026-05-12T11:00:00Z',
    nb_photos: 1,
  },
]

const MOCK_ASSEMBLEES_PORTAIL: AssembleePortail[] = [
  {
    id: 1,
    titre: 'Assemblée Générale Ordinaire 2026',
    type: 'ordinaire',
    date: '2026-06-15T10:00:00Z',
    lieu: 'Salle de réunion, RDC',
    statut: 'convoquee',
    quorum_requis: 50,
    participants_count: null,
    ordre_du_jour:
      '1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Élection du syndic\n4. Questions diverses',
    residence_name: 'Résidence Al Blanca',
  },
  {
    id: 2,
    titre: 'AG Extraordinaire — Travaux façade',
    type: 'extraordinaire',
    date: '2026-07-05T09:00:00Z',
    lieu: 'Salle commune, 1er étage',
    statut: 'convoquee',
    quorum_requis: 75,
    participants_count: null,
    ordre_du_jour:
      '1. Validation du devis travaux façade\n2. Modalités de financement\n3. Calendrier des travaux',
    residence_name: 'Résidence Al Blanca',
  },
  {
    id: 3,
    titre: 'AG Ordinaire 2025',
    type: 'ordinaire',
    date: '2025-06-20T10:00:00Z',
    lieu: 'Salle de réunion, RDC',
    statut: 'tenue',
    quorum_requis: 50,
    participants_count: 18,
    ordre_du_jour:
      '1. Approbation des comptes 2024\n2. Budget prévisionnel 2025\n3. Questions diverses',
    residence_name: 'Résidence Al Blanca',
  },
]

const MOCK_PROFILE: ResidentProfile = {
  name: 'Mouad Baamrane',
  phone: '+212661000001',
  lot: 'A-102',
  residence: 'Résidence Al Blanca',
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getPortailDashboard(): Promise<DashboardData> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<DashboardData>>('/portail/dashboard')
    return res.data.data
  }, MOCK_DASHBOARD)
}

export async function getOperations(): Promise<Operation[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ operations: Operation[] }>>(
      '/portail/operations',
    )
    return res.data.data.operations
  }, MOCK_OPERATIONS)
}

export async function getAnnonces(): Promise<Annonce[]> {
  return withMock(async () => {
    const res =
      await api.get<ApiEnvelope<{ annonces: Annonce[] }>>('/portail/annonces')
    return res.data.data.annonces
  }, MOCK_ANNONCES)
}

export async function getAssembleesPortail(): Promise<AssembleePortail[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ assemblees: AssembleePortail[] }>>(
      '/portail/assemblees',
    )
    return res.data.data.assemblees
  }, MOCK_ASSEMBLEES_PORTAIL)
}

export async function getMyReclamations(): Promise<Reclamation[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ reclamations: Reclamation[] }>>(
      '/portail/reclamations',
    )
    return res.data.data.reclamations
  }, MOCK_RECLAMATIONS)
}

export async function getProfile(): Promise<ResidentProfile> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ResidentProfile>>('/portail/profil')
    return res.data.data
  }, MOCK_PROFILE)
}

export async function updateProfile(
  data: Partial<Pick<ResidentProfile, 'name' | 'email'>>,
): Promise<ResidentProfile> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<ResidentProfile>>(
        '/portail/profil',
        data,
      )
      return res.data.data
    },
    { ...MOCK_PROFILE, ...data },
  )
}

export async function createReclamation(data: {
  categorie: string
  sujet: string
  description: string
  images?: File[]
}): Promise<void> {
  const fd = new FormData()
  fd.append('categorie', data.categorie)
  fd.append('sujet', data.sujet)
  fd.append('description', data.description)
  fd.append('priorite', 'normale')
  data.images?.forEach((f) => fd.append('images[]', f))

  await withMock(async () => {
    // Resident route — a copropriétaire has role `resident`, so it must NOT hit
    // /gestionnaire/* (that requires role:gestionnaire → 403). See issue #210.
    await api.post('/portail/reclamations', fd)
  }, undefined)
}

/** Submit satisfaction rating after ticket resolution (KAN-90). */
export async function rateReclamation(
  id: number,
  rating: ReclamationRating,
): Promise<void> {
  await withMock(async () => {
    await api.patch(`/portail/reclamations/${id}/rating`, { rating })
  }, undefined)
}

// ─── Portail Documents ────────────────────────────────────────────────────────

export type PortailDocumentType =
  | 'reglement'
  | 'pv_ag'
  | 'contrat_facture'
  | 'autre'

export type PortailDocument = {
  id: number
  nom: string
  type: PortailDocumentType
  date: string
  url: string
  taille_ko: number
}

const MOCK_PORTAIL_DOCUMENTS: PortailDocument[] = [
  {
    id: 1,
    nom: 'Règlement de copropriété — Résidence Al Blanca',
    type: 'reglement',
    date: '2023-03-01',
    url: 'https://example.com/docs/reglement.pdf',
    taille_ko: 1240,
  },
  {
    id: 2,
    nom: 'PV Assemblée Générale Ordinaire 2025',
    type: 'pv_ag',
    date: '2025-06-22',
    url: 'https://example.com/docs/pv-ago-2025.pdf',
    taille_ko: 340,
  },
  {
    id: 3,
    nom: 'PV Assemblée Générale Ordinaire 2024',
    type: 'pv_ag',
    date: '2024-07-10',
    url: 'https://example.com/docs/pv-ago-2024.pdf',
    taille_ko: 290,
  },
  {
    id: 4,
    nom: 'Contrat entretien ascenseur 2026',
    type: 'contrat_facture',
    date: '2026-01-15',
    url: 'https://example.com/docs/contrat-ascenseur-2026.pdf',
    taille_ko: 185,
  },
]

export async function getPortailDocuments(): Promise<PortailDocument[]> {
  return withMock(async () => {
    const res =
      await api.get<ApiEnvelope<{ documents: PortailDocument[] }>>(
        '/portail/documents',
      )
    return res.data.data.documents
  }, MOCK_PORTAIL_DOCUMENTS)
}

// ─── Portail Paiement (déclaration de virement) ────────────────────────────────

/** Comptes bancaires de la résidence du copropriétaire connecté. */
export type PortailBankAccount = Pick<
  BankAccount,
  'id' | 'banque' | 'titulaire' | 'rib' | 'iban' | 'is_primary'
>

export type PaiementMethode = 'virement' | 'versement' | 'cheque' | 'especes'

export type DeclarePaiementInput = {
  montant: number
  date: string
  methode: PaiementMethode
  reference?: string
  justificatif?: File
}

const MOCK_PORTAIL_BANK_ACCOUNTS: PortailBankAccount[] = [
  {
    id: 1,
    banque: 'attijariwafa',
    titulaire: 'Syndic Résidence Al Blanca',
    rib: '007 780 0001234567890123 45',
    iban: 'MA64 0077 8000 0123 4567 8901 2345',
    is_primary: true,
  },
  {
    id: 2,
    banque: 'cih',
    titulaire: 'Syndic Résidence Al Blanca',
    rib: '230 810 0009876543210987 65',
    is_primary: false,
  },
]

/** Comptes sur lesquels le copropriétaire peut régler sa cotisation. */
export async function getMyResidenceBankAccounts(): Promise<
  PortailBankAccount[]
> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<{ comptes: PortailBankAccount[] }>>(
      '/portail/comptes-bancaires',
    )
    return res.data.data.comptes
  }, MOCK_PORTAIL_BANK_ACCOUNTS)
}

/**
 * Déclare un paiement effectué (virement, versement…) avec justificatif.
 * Crée un virement « en attente » côté gestionnaire (cf. paiements.service).
 */
export async function declarePaiement(
  data: DeclarePaiementInput,
): Promise<void> {
  const fd = new FormData()
  fd.append('montant', String(data.montant))
  fd.append('date', data.date)
  fd.append('methode', data.methode)
  if (data.reference) fd.append('reference', data.reference)
  if (data.justificatif) fd.append('justificatif', data.justificatif)

  await withMock(async () => {
    await api.post('/portail/paiements', fd)
  }, undefined)
}
