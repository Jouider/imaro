/**
 * Sprint 7 — Modules dédiés.
 * 5 entités CRUD qui alimentent les annexes PDF déjà générées (Annexes 6, 8, 9)
 * + 2 modules de finances spécialisées.
 *
 * Backend Abdellah (futur) — 5 tables à créer + ~25 endpoints CRUD.
 * Pour l'instant tout est mocké via `withMock`.
 */
import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS) return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── 1. Équipements (Annexe 9 — Immobilisations) ──────────────────────────────

export type EquipementCategorie =
  | 'ascenseur' | 'chauffage' | 'climatisation' | 'securite'
  | 'videosurveillance' | 'plomberie' | 'electricite'
  | 'jardinage' | 'autre'

export const EQUIPEMENT_CATEGORIES: { value: EquipementCategorie; label: string }[] = [
  { value: 'ascenseur',         label: 'Ascenseur' },
  { value: 'chauffage',         label: 'Chauffage' },
  { value: 'climatisation',     label: 'Climatisation' },
  { value: 'securite',          label: 'Sécurité (alarme, portail)' },
  { value: 'videosurveillance', label: 'Vidéosurveillance' },
  { value: 'plomberie',         label: 'Plomberie collective' },
  { value: 'electricite',       label: 'Électricité collective' },
  { value: 'jardinage',         label: 'Espaces verts / Jardinage' },
  { value: 'autre',             label: 'Autre' },
]

export type Equipement = {
  id: number
  residence_id: number
  designation: string
  categorie: EquipementCategorie
  date_acquisition: string
  valeur_acquisition: number
  duree_amortissement_mois: number  // ex: 120 = 10 ans
  valeur_nette: number               // calculée: valeur - cumul amort.
  notes?: string
  actif: boolean                     // si false: hors service
}

export type CreateEquipementInput = Omit<Equipement, 'id' | 'valeur_nette'>

const MOCK_EQUIPEMENTS: Equipement[] = [
  { id: 1, residence_id: 1, designation: 'Ascenseur principal Otis',     categorie: 'ascenseur',         date_acquisition: '2018-03-15', valeur_acquisition: 180000, duree_amortissement_mois: 240, valeur_nette: 120000, actif: true },
  { id: 2, residence_id: 1, designation: 'Système vidéosurveillance Hikvision', categorie: 'videosurveillance', date_acquisition: '2022-09-01', valeur_acquisition:  35000, duree_amortissement_mois:  60, valeur_nette:  18000, actif: true },
  { id: 3, residence_id: 1, designation: 'Pompe de surpression',         categorie: 'plomberie',          date_acquisition: '2020-06-10', valeur_acquisition:  12000, duree_amortissement_mois: 120, valeur_nette:   7500, actif: true },
  { id: 4, residence_id: 1, designation: 'Portail électrique principal', categorie: 'securite',           date_acquisition: '2017-01-20', valeur_acquisition:  28000, duree_amortissement_mois: 180, valeur_nette:  12000, actif: true },
]

export async function getEquipements(residenceId: number): Promise<Equipement[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ equipements: Equipement[] }>>(
        `/gestionnaire/residences/${residenceId}/equipements`,
      )
      return res.data.data.equipements
    },
    MOCK_EQUIPEMENTS.filter((e) => e.residence_id === residenceId),
  )
}

export async function createEquipement(residenceId: number, input: CreateEquipementInput): Promise<Equipement> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ equipement: Equipement }>>(
        `/gestionnaire/residences/${residenceId}/equipements`, input,
      )
      return res.data.data.equipement
    },
    { id: Date.now(), ...input, valeur_nette: input.valeur_acquisition },
  )
}

export async function updateEquipement(id: number, patch: Partial<CreateEquipementInput>): Promise<Equipement> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ equipement: Equipement }>>(
        `/gestionnaire/equipements/${id}`, patch,
      )
      return res.data.data.equipement
    },
    { id, residence_id: 0, designation: '', categorie: 'autre', date_acquisition: '', valeur_acquisition: 0, duree_amortissement_mois: 0, valeur_nette: 0, actif: true, ...patch },
  )
}

export async function deleteEquipement(id: number): Promise<void> {
  return withMock(
    async () => { await api.delete(`/gestionnaire/equipements/${id}`) },
    undefined,
  )
}

// ─── 2. Emprunts (Annexe 8) ────────────────────────────────────────────────────

export type Emprunt = {
  id: number
  residence_id: number
  libelle: string
  organisme: string                  // ex: Attijariwafa Bank
  date_debut: string
  date_fin: string
  montant_initial: number
  taux_interet: number               // % annuel
  duree_mois: number
  mensualite: number                 // calc: paiement mensuel
  paye_cumule: number                // depuis le début
  paye_exercice: number              // payé cet exercice
  reste: number                      // capital restant dû
  statut: 'actif' | 'rembourse' | 'en_defaut'
  notes?: string
}

export type CreateEmpruntInput = Omit<Emprunt, 'id' | 'paye_cumule' | 'paye_exercice' | 'reste' | 'statut'>

const MOCK_EMPRUNTS: Emprunt[] = [
  {
    id: 1, residence_id: 1,
    libelle: 'Réfection toiture 2023', organisme: 'Banque Populaire',
    date_debut: '2023-09-01', date_fin: '2028-08-31',
    montant_initial: 240000, taux_interet: 4.5, duree_mois: 60,
    mensualite: 4475, paye_cumule: 89500, paye_exercice: 17900, reste: 150500,
    statut: 'actif',
  },
]

export async function getEmprunts(residenceId: number): Promise<Emprunt[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ emprunts: Emprunt[] }>>(
        `/gestionnaire/residences/${residenceId}/emprunts`,
      )
      return res.data.data.emprunts
    },
    MOCK_EMPRUNTS.filter((e) => e.residence_id === residenceId),
  )
}

export async function createEmprunt(residenceId: number, input: CreateEmpruntInput): Promise<Emprunt> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ emprunt: Emprunt }>>(
        `/gestionnaire/residences/${residenceId}/emprunts`, input,
      )
      return res.data.data.emprunt
    },
    { id: Date.now(), ...input, paye_cumule: 0, paye_exercice: 0, reste: input.montant_initial, statut: 'actif' },
  )
}

export async function updateEmprunt(id: number, patch: Partial<CreateEmpruntInput>): Promise<Emprunt> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ emprunt: Emprunt }>>(
        `/gestionnaire/emprunts/${id}`, patch,
      )
      return res.data.data.emprunt
    },
    { id, residence_id: 0, libelle: '', organisme: '', date_debut: '', date_fin: '', montant_initial: 0, taux_interet: 0, duree_mois: 0, mensualite: 0, paye_cumule: 0, paye_exercice: 0, reste: 0, statut: 'actif', ...patch },
  )
}

export async function deleteEmprunt(id: number): Promise<void> {
  return withMock(
    async () => { await api.delete(`/gestionnaire/emprunts/${id}`) },
    undefined,
  )
}

// ─── 3. Travaux exceptionnels (Annexe 6) ──────────────────────────────────────

export type TravauxStatus = 'vote' | 'en_cours' | 'termine' | 'annule'

export type TravauxExceptionnel = {
  id: number
  residence_id: number
  libelle: string
  description?: string
  date_vote_ag: string               // date AG qui a voté les travaux
  ag_id?: number                     // référence à l'AG
  prestataire?: string
  montant_vote: number
  montant_engage: number             // engagé via devis/contrat
  montant_regle: number              // effectivement payé
  date_debut?: string
  date_fin_prevue?: string
  date_fin_reelle?: string
  statut: TravauxStatus
}

export type CreateTravauxInput = Omit<TravauxExceptionnel, 'id'>

const MOCK_TRAVAUX: TravauxExceptionnel[] = [
  {
    id: 1, residence_id: 1,
    libelle: 'Ravalement façade nord',
    description: 'Réfection complète enduit + peinture façade nord',
    date_vote_ag: '2025-06-12',
    prestataire: 'Atlas Travaux SARL',
    montant_vote: 95000, montant_engage: 92000, montant_regle: 60000,
    date_debut: '2025-09-01', date_fin_prevue: '2025-12-15',
    statut: 'en_cours',
  },
  {
    id: 2, residence_id: 1,
    libelle: 'Remplacement chaudière collective',
    date_vote_ag: '2024-11-20',
    prestataire: 'ProClim Maroc',
    montant_vote: 140000, montant_engage: 138000, montant_regle: 138000,
    date_debut: '2025-01-10', date_fin_prevue: '2025-02-15', date_fin_reelle: '2025-02-20',
    statut: 'termine',
  },
]

export async function getTravauxExceptionnels(residenceId: number): Promise<TravauxExceptionnel[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ travaux: TravauxExceptionnel[] }>>(
        `/gestionnaire/residences/${residenceId}/travaux-exceptionnels`,
      )
      return res.data.data.travaux
    },
    MOCK_TRAVAUX.filter((t) => t.residence_id === residenceId),
  )
}

export async function createTravaux(residenceId: number, input: CreateTravauxInput): Promise<TravauxExceptionnel> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ travaux: TravauxExceptionnel }>>(
        `/gestionnaire/residences/${residenceId}/travaux-exceptionnels`, input,
      )
      return res.data.data.travaux
    },
    { id: Date.now(), ...input },
  )
}

export async function updateTravaux(id: number, patch: Partial<CreateTravauxInput>): Promise<TravauxExceptionnel> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ travaux: TravauxExceptionnel }>>(
        `/gestionnaire/travaux-exceptionnels/${id}`, patch,
      )
      return res.data.data.travaux
    },
    { id, residence_id: 0, libelle: '', date_vote_ag: '', montant_vote: 0, montant_engage: 0, montant_regle: 0, statut: 'vote', ...patch },
  )
}

export async function deleteTravaux(id: number): Promise<void> {
  return withMock(
    async () => { await api.delete(`/gestionnaire/travaux-exceptionnels/${id}`) },
    undefined,
  )
}

// ─── 4. Autres recettes ────────────────────────────────────────────────────────

export type RecetteCategorie =
  | 'location_parking' | 'location_salle' | 'location_antenne'
  | 'subvention' | 'indemnite_assurance' | 'penalite_retard'
  | 'produits_financiers' | 'autre'

export const RECETTE_CATEGORIES: { value: RecetteCategorie; label: string }[] = [
  { value: 'location_parking',    label: 'Location parking' },
  { value: 'location_salle',      label: 'Location salle commune' },
  { value: 'location_antenne',    label: 'Location antenne (Orange/IAM)' },
  { value: 'subvention',          label: 'Subvention' },
  { value: 'indemnite_assurance', label: "Indemnité d'assurance" },
  { value: 'penalite_retard',     label: 'Pénalité de retard reçue' },
  { value: 'produits_financiers', label: 'Produits financiers (intérêts)' },
  { value: 'autre',               label: 'Autre' },
]

export type AutreRecette = {
  id: number
  residence_id: number
  exercice: number
  date: string
  libelle: string
  categorie: RecetteCategorie
  montant: number
  payeur?: string                    // qui paie (ex: nom locataire parking)
  reference?: string                  // ref chèque/virement
  notes?: string
}

export type CreateRecetteInput = Omit<AutreRecette, 'id'>

const MOCK_RECETTES: AutreRecette[] = [
  { id: 1, residence_id: 1, exercice: 2026, date: '2026-01-05', libelle: 'Loyer parking C-12 janvier', categorie: 'location_parking', montant:  450, payeur: 'Karim El Fassi' },
  { id: 2, residence_id: 1, exercice: 2026, date: '2026-01-15', libelle: 'Loyer antenne Orange Q1',     categorie: 'location_antenne', montant: 1200, payeur: 'Orange Maroc' },
  { id: 3, residence_id: 1, exercice: 2026, date: '2026-02-08', libelle: 'Indemnité dégât des eaux',    categorie: 'indemnite_assurance', montant: 3500, payeur: 'AXA Assurances' },
]

export async function getAutresRecettes(residenceId: number, exercice?: number): Promise<AutreRecette[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ recettes: AutreRecette[] }>>(
        `/gestionnaire/residences/${residenceId}/autres-recettes`,
        { params: exercice !== undefined ? { exercice } : {} },
      )
      return res.data.data.recettes
    },
    MOCK_RECETTES.filter((r) => r.residence_id === residenceId && (exercice === undefined || r.exercice === exercice)),
  )
}

export async function createAutreRecette(residenceId: number, input: CreateRecetteInput): Promise<AutreRecette> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ recette: AutreRecette }>>(
        `/gestionnaire/residences/${residenceId}/autres-recettes`, input,
      )
      return res.data.data.recette
    },
    { id: Date.now(), ...input },
  )
}

export async function updateAutreRecette(id: number, patch: Partial<CreateRecetteInput>): Promise<AutreRecette> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ recette: AutreRecette }>>(
        `/gestionnaire/autres-recettes/${id}`, patch,
      )
      return res.data.data.recette
    },
    { id, residence_id: 0, exercice: 0, date: '', libelle: '', categorie: 'autre', montant: 0, ...patch },
  )
}

export async function deleteAutreRecette(id: number): Promise<void> {
  return withMock(
    async () => { await api.delete(`/gestionnaire/autres-recettes/${id}`) },
    undefined,
  )
}

// ─── 5. Remboursements ─────────────────────────────────────────────────────────

export type RemboursementStatus = 'demande' | 'approuve' | 'paye' | 'rejete'
export type RemboursementMotif = 'trop_percu' | 'erreur_appel' | 'indemnite' | 'autre'

export type Remboursement = {
  id: number
  residence_id: number
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero?: string
  motif: RemboursementMotif
  description?: string
  montant: number
  date_demande: string
  date_paiement?: string
  mode_paiement?: 'virement' | 'cheque' | 'especes'
  reference?: string
  statut: RemboursementStatus
}

export type CreateRemboursementInput = Omit<Remboursement, 'id'>

const MOCK_REMBOURSEMENTS: Remboursement[] = [
  {
    id: 1, residence_id: 1, coproprietaire_id: 5, coproprietaire_nom: 'Fatima Chraibi', lot_numero: 'A-02',
    motif: 'trop_percu', description: 'Double versement appel Q1 2026', montant: 850,
    date_demande: '2026-04-22', statut: 'approuve',
  },
  {
    id: 2, residence_id: 1, coproprietaire_id: 12, coproprietaire_nom: 'Hassan Benali', lot_numero: 'A-01',
    motif: 'indemnite', description: 'Dégât eau facturé à tort', montant: 1200,
    date_demande: '2026-03-15', date_paiement: '2026-03-28', mode_paiement: 'virement', reference: 'VIR-2026-128',
    statut: 'paye',
  },
]

export async function getRemboursements(residenceId: number): Promise<Remboursement[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ remboursements: Remboursement[] }>>(
        `/gestionnaire/residences/${residenceId}/remboursements`,
      )
      return res.data.data.remboursements
    },
    MOCK_REMBOURSEMENTS.filter((r) => r.residence_id === residenceId),
  )
}

export async function createRemboursement(residenceId: number, input: CreateRemboursementInput): Promise<Remboursement> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ remboursement: Remboursement }>>(
        `/gestionnaire/residences/${residenceId}/remboursements`, input,
      )
      return res.data.data.remboursement
    },
    { id: Date.now(), ...input },
  )
}

export async function updateRemboursement(id: number, patch: Partial<CreateRemboursementInput>): Promise<Remboursement> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ remboursement: Remboursement }>>(
        `/gestionnaire/remboursements/${id}`, patch,
      )
      return res.data.data.remboursement
    },
    { id, residence_id: 0, coproprietaire_id: 0, coproprietaire_nom: '', motif: 'autre', montant: 0, date_demande: '', statut: 'demande', ...patch },
  )
}

export async function deleteRemboursement(id: number): Promise<void> {
  return withMock(
    async () => { await api.delete(`/gestionnaire/remboursements/${id}`) },
    undefined,
  )
}
