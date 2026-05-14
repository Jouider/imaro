// TODO: replace mocks with real API calls once endpoints are ready

export type OperationType = 'appel_fonds' | 'paiement' | 'penalite'
export type OperationStatut = 'paye' | 'impaye' | 'partiel' | 'retard'

export type Operation = {
  id: number
  type: OperationType
  libelle: string
  montant: number // négatif = débit (appel), positif = crédit (paiement)
  date: string // ISO date string
  statut: OperationStatut
  recu_url?: string // present only for 'paye' ops
}

export type Annonce = {
  id: number
  titre: string
  contenu: string
  date: string
  priorite: 'normale' | 'urgente'
}

export type DashboardData = {
  resident: { name: string; lot: string; residence: string }
  balance: number // positive = overpaid/credit, negative = owes money
  statut: 'a_jour' | 'en_retard'
  prochain_appel: { montant: number; date: string } | null
}

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

export async function getPortailDashboard(): Promise<DashboardData> {
  return MOCK_DASHBOARD
}

export async function getOperations(): Promise<Operation[]> {
  return MOCK_OPERATIONS
}

export async function getAnnonces(): Promise<Annonce[]> {
  return MOCK_ANNONCES
}

export async function createReclamation(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: {
    categorie: string
    sujet: string
    description: string
    images?: File[]
  },
): Promise<void> {
  // TODO: POST /api/gestionnaire/tickets — multipart/form-data
  // const fd = new FormData()
  // fd.append('titre', _data.sujet)
  // fd.append('description', _data.description)
  // fd.append('categorie', _data.categorie)
  // _data.images?.forEach((f) => fd.append('images[]', f))
  // await api.post('/gestionnaire/tickets', fd)
  return Promise.resolve()
}
