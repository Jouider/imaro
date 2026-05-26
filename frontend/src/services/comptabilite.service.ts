import { api, type ApiEnvelope } from '@/lib/axios'

// ─── Dev mock fallback ────────────────────────────────────────────────────────
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciceComptable = {
  id: number
  residence_id: number
  annee: number
  statut: 'ouvert' | 'clos'
  date_ouverture: string
  date_cloture: string | null
  seuil_comptable: number
}

export type EcritureComptable = {
  id: number
  exercice_id: number
  date: string
  numero_compte: string
  libelle_compte: string
  description: string
  debit: number
  credit: number
  piece_justificative: string | null
  type: 'depense' | 'encaissement' | 'virement' | 'cloture' | 'report'
  locked: boolean
}

export type ComptePcg = {
  numero: string
  libelle: string
  classe: number
  type: 'capitaux' | 'actif' | 'passif' | 'tresorerie' | 'charge' | 'produit'
  nature: 'courant' | 'non_courant' | 'both'
  est_sous_compte: boolean
  compte_parent: string | null
  utilisable_depense: boolean
  utilisable_budget: boolean
  utilisable_produit: boolean
  ordre: number
}

export type Depense = {
  id: number
  exercice_id: number
  titre: string
  montant: number
  date: string
  prestataire_id: number | null
  prestataire_nom: string | null
  compte_charge: string
  libelle_compte: string
  mode_paiement:
    | 'virement'
    | 'cheque'
    | 'especes'
    | 'cb'
    | 'prelevement'
    | 'autre'
  justificatif_path: string | null
  ecriture_id: number
}

export type Encaissement = {
  id: number
  exercice_id: number
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant: number
  date: string
  mode_paiement: 'virement' | 'cheque' | 'especes'
  reference_cheque: string | null
  compte_destination: '5121' | '5122' | '5161'
  ecriture_id: number
}

export type ComptabiliteDashboard = {
  produits: number
  charges: number
  resultat: number
  tresorerie: number
  creances: number
  taux_recouvrement: number
  couverture_tresorerie: number
  banque_5121: number
  cheque_5122: number
  caisse_5161: number
  evolution: Array<{ mois: string; produits: number; charges: number }>
  charges_par_categorie: Array<{
    categorie: string
    montant: number
    couleur: string
  }>
}

export type GrandLivreCompte = {
  numero: string
  libelle: string
  solde_ouverture: number
  lignes: Array<{
    id: number
    date: string
    description: string
    debit: number
    credit: number
    solde: number
  }>
  solde_final: number
}

export type BalanceLigne = {
  numero: string
  libelle: string
  classe: number
  total_debit: number
  total_credit: number
  solde_debiteur: number
  solde_crediteur: number
}

export type ImportIaResult = {
  titre: string
  montant: number
  date: string
  fournisseur: string | null
  compte_charge_suggere: string
  confiance: 'haute' | 'moyenne' | 'faible'
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EXERCICES: ExerciceComptable[] = [
  {
    id: 1,
    residence_id: 1,
    annee: 2026,
    statut: 'ouvert',
    date_ouverture: '2026-01-01',
    date_cloture: null,
    seuil_comptable: 72000,
  },
  {
    id: 2,
    residence_id: 1,
    annee: 2025,
    statut: 'clos',
    date_ouverture: '2025-01-01',
    date_cloture: '2025-12-31',
    seuil_comptable: 68000,
  },
]

const MOCK_ECRITURES: EcritureComptable[] = [
  {
    id: 1,
    exercice_id: 1,
    date: '2026-01-05',
    numero_compte: '6111',
    libelle_compte: 'Eau',
    description: 'Facture ONEE Eau Janvier 2026',
    debit: 320,
    credit: 0,
    piece_justificative: 'facture-onee-eau-jan26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 2,
    exercice_id: 1,
    date: '2026-01-10',
    numero_compte: '6112',
    libelle_compte: 'Électricité',
    description: 'Facture ONEE Électricité Janvier 2026',
    debit: 850,
    credit: 0,
    piece_justificative: 'facture-onee-elec-jan26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 3,
    exercice_id: 1,
    date: '2026-01-15',
    numero_compte: '6138',
    libelle_compte: 'Autres rémunérations',
    description: 'Gardiennage Janvier 2026 — Sécurité Atlas SARL',
    debit: 3500,
    credit: 0,
    piece_justificative: 'facture-gardiennage-jan26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 4,
    exercice_id: 1,
    date: '2026-02-03',
    numero_compte: '6131',
    libelle_compte: 'Nettoyage des locaux',
    description: 'Nettoyage parties communes Février 2026',
    debit: 1500,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 5,
    exercice_id: 1,
    date: '2026-02-10',
    numero_compte: '6134',
    libelle_compte: 'Contrats de maintenance',
    description: 'Maintenance préventive ascenseurs Février — Kone Maroc',
    debit: 2800,
    credit: 0,
    piece_justificative: 'facture-kone-fev26.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 6,
    exercice_id: 1,
    date: '2026-03-12',
    numero_compte: '7111',
    libelle_compte: 'Provisions sur opérations courantes',
    description: 'Encaissement lot A-01 — Hassan Benali — Mars 2026',
    debit: 0,
    credit: 900,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 7,
    exercice_id: 1,
    date: '2026-03-18',
    numero_compte: '7111',
    libelle_compte: 'Provisions sur opérations courantes',
    description: 'Encaissement lot A-02 — Fatima Chraibi — Mars 2026',
    debit: 0,
    credit: 750,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 8,
    exercice_id: 1,
    date: '2026-04-05',
    numero_compte: '6136',
    libelle_compte: "Primes d'assurances",
    description: 'Prime assurance multirisque immeuble — AXA Maroc',
    debit: 2400,
    credit: 0,
    piece_justificative: 'police-axa-2026.pdf',
    type: 'depense',
    locked: false,
  },
  {
    id: 9,
    exercice_id: 1,
    date: '2026-04-20',
    numero_compte: '6135',
    libelle_compte: 'Entretien et petites réparations',
    description: 'Réparation porte palière étage 3',
    debit: 650,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 10,
    exercice_id: 1,
    date: '2026-05-06',
    numero_compte: '6131',
    libelle_compte: 'Nettoyage des locaux',
    description: 'Nettoyage parties communes Mai 2026',
    debit: 1500,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
  {
    id: 11,
    exercice_id: 1,
    date: '2026-05-14',
    numero_compte: '7111',
    libelle_compte: 'Provisions sur opérations courantes',
    description: 'Encaissement lot B-01 — Karim El Fassi — Mai 2026',
    debit: 0,
    credit: 1100,
    piece_justificative: null,
    type: 'encaissement',
    locked: false,
  },
  {
    id: 12,
    exercice_id: 1,
    date: '2026-05-16',
    numero_compte: '6515',
    libelle_compte: 'Charges non courantes',
    description: 'Frais administratifs divers — Mai 2026',
    debit: 320,
    credit: 0,
    piece_justificative: null,
    type: 'depense',
    locked: false,
  },
]

const MOCK_DEPENSES: Depense[] = [
  {
    id: 1,
    exercice_id: 1,
    titre: 'Gardiennage Janvier 2026',
    montant: 3500,
    date: '2026-01-15',
    prestataire_id: 1,
    prestataire_nom: 'Sécurité Atlas SARL',
    compte_charge: '6138',
    libelle_compte: 'Autres rémunérations',
    mode_paiement: 'virement',
    justificatif_path: 'facture-gardiennage-jan26.pdf',
    ecriture_id: 3,
  },
  {
    id: 2,
    exercice_id: 1,
    titre: 'Nettoyage Janvier 2026',
    montant: 1500,
    date: '2026-02-03',
    prestataire_id: 3,
    prestataire_nom: 'Propreté Plus SARL',
    compte_charge: '6131',
    libelle_compte: 'Nettoyage des locaux',
    mode_paiement: 'virement',
    justificatif_path: null,
    ecriture_id: 4,
  },
  {
    id: 3,
    exercice_id: 1,
    titre: 'Contrats maintenance ascenseur Février 2026',
    montant: 2800,
    date: '2026-02-10',
    prestataire_id: 2,
    prestataire_nom: 'Kone Maroc',
    compte_charge: '6134',
    libelle_compte: 'Contrats de maintenance',
    mode_paiement: 'cheque',
    justificatif_path: 'facture-kone-fev26.pdf',
    ecriture_id: 5,
  },
  {
    id: 4,
    exercice_id: 1,
    titre: 'Électricité Février 2026',
    montant: 1200,
    date: '2026-02-15',
    prestataire_id: null,
    prestataire_nom: 'ONEE',
    compte_charge: '6112',
    libelle_compte: 'Électricité',
    mode_paiement: 'prelevement',
    justificatif_path: 'facture-onee-fev26.pdf',
    ecriture_id: 2,
  },
  {
    id: 5,
    exercice_id: 1,
    titre: 'Entretien porte palière Mars 2026',
    montant: 650,
    date: '2026-03-20',
    prestataire_id: 4,
    prestataire_nom: 'Atlas Serrurerie',
    compte_charge: '6135',
    libelle_compte: 'Entretien et petites réparations',
    mode_paiement: 'especes',
    justificatif_path: null,
    ecriture_id: 9,
  },
  {
    id: 6,
    exercice_id: 1,
    titre: 'Assurance multirisque AXA 2026',
    montant: 2400,
    date: '2026-04-05',
    prestataire_id: null,
    prestataire_nom: 'AXA Maroc',
    compte_charge: '6136',
    libelle_compte: "Primes d'assurances",
    mode_paiement: 'virement',
    justificatif_path: 'police-axa-2026.pdf',
    ecriture_id: 8,
  },
]

const MOCK_ENCAISSEMENTS: Encaissement[] = [
  {
    id: 1,
    exercice_id: 1,
    coproprietaire_id: 1,
    coproprietaire_nom: 'Hassan Benali',
    lot_numero: 'A-01',
    montant: 900,
    date: '2026-03-12',
    mode_paiement: 'virement',
    reference_cheque: null,
    compte_destination: '5121',
    ecriture_id: 6,
  },
  {
    id: 2,
    exercice_id: 1,
    coproprietaire_id: 2,
    coproprietaire_nom: 'Fatima Chraibi',
    lot_numero: 'A-02',
    montant: 750,
    date: '2026-03-18',
    mode_paiement: 'cheque',
    reference_cheque: 'CHQ-12345',
    compte_destination: '5122',
    ecriture_id: 7,
  },
  {
    id: 3,
    exercice_id: 1,
    coproprietaire_id: 3,
    coproprietaire_nom: 'Karim El Fassi',
    lot_numero: 'B-01',
    montant: 1100,
    date: '2026-05-14',
    mode_paiement: 'especes',
    reference_cheque: null,
    compte_destination: '5161',
    ecriture_id: 11,
  },
]

const MOCK_DASHBOARD: ComptabiliteDashboard = {
  produits: 18000,
  charges: 12400,
  resultat: 5600,
  tresorerie: 24800,
  creances: 4500,
  taux_recouvrement: 78,
  couverture_tresorerie: 2.4,
  banque_5121: 18000,
  cheque_5122: 5200,
  caisse_5161: 1600,
  evolution: [
    { mois: 'Jan', produits: 2400, charges: 5550 },
    { mois: 'Fév', produits: 1800, charges: 4300 },
    { mois: 'Mar', produits: 4200, charges: 1200 },
    { mois: 'Avr', produits: 1500, charges: 3050 },
    { mois: 'Mai', produits: 3600, charges: 1320 },
    { mois: 'Jun', produits: 2100, charges: 0 },
    { mois: 'Jul', produits: 0, charges: 0 },
    { mois: 'Aoû', produits: 0, charges: 0 },
    { mois: 'Sep', produits: 0, charges: 0 },
    { mois: 'Oct', produits: 0, charges: 0 },
    { mois: 'Nov', produits: 0, charges: 0 },
    { mois: 'Déc', produits: 0, charges: 0 },
  ],
  charges_par_categorie: [
    {
      categorie: 'Autres rémunérations (Gardiennage)',
      montant: 3500,
      couleur: '#1B4F72',
    },
    { categorie: 'Contrats de maintenance', montant: 2800, couleur: '#E67E22' },
    { categorie: 'Nettoyage des locaux', montant: 3000, couleur: '#27AE60' },
    { categorie: "Primes d'assurances", montant: 2400, couleur: '#8E44AD' },
    { categorie: 'Divers', montant: 320, couleur: '#95A5A6' },
  ],
}

const MOCK_COMPTES_PCG: ComptePcg[] = [
  // CLASSE 1 — CAPITAUX PERMANENTS
  {
    numero: '111',
    libelle: 'Fonds de réserve',
    classe: 1,
    type: 'capitaux',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 10,
  },
  {
    numero: '1111',
    libelle: 'Réserves pour dépenses imprévues',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '111',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 11,
  },
  {
    numero: '1112',
    libelle: 'Réserves pour dépenses prévues à long terme',
    classe: 1,
    type: 'capitaux',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '111',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 12,
  },
  {
    numero: '119',
    libelle: 'Résultat',
    classe: 1,
    type: 'capitaux',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 20,
  },
  {
    numero: '1191',
    libelle: 'Résultat (Excédent)',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '119',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 21,
  },
  {
    numero: '1199',
    libelle: 'Résultat (Déficit)',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '119',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 22,
  },
  {
    numero: '131',
    libelle: 'Subventions',
    classe: 1,
    type: 'capitaux',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 30,
  },
  {
    numero: '1311',
    libelle: 'Subventions reçues',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '131',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 31,
  },
  {
    numero: '151',
    libelle: 'Provisions',
    classe: 1,
    type: 'capitaux',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 40,
  },
  {
    numero: '1511',
    libelle: 'Provisions pour travaux décidés',
    classe: 1,
    type: 'capitaux',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '151',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 41,
  },
  {
    numero: '1512',
    libelle: 'Provisions pour litiges',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '151',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 42,
  },
  {
    numero: '1513',
    libelle: 'Provision pour risque',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '151',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 43,
  },
  {
    numero: '1514',
    libelle: 'Provision pour charge',
    classe: 1,
    type: 'capitaux',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '151',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 44,
  },
  // CLASSE 3 — ACTIF CIRCULANT
  {
    numero: '341',
    libelle: 'Fournisseurs – Débiteur',
    classe: 3,
    type: 'actif',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 100,
  },
  {
    numero: '3411',
    libelle: 'Fournisseurs débiteurs',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '341',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 101,
  },
  {
    numero: '3412',
    libelle: 'Fournisseurs, avances sur travaux',
    classe: 3,
    type: 'actif',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '341',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 102,
  },
  {
    numero: '3413',
    libelle: 'Autres avances',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '341',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 103,
  },
  {
    numero: '342',
    libelle: 'Collectivité des copropriétaires',
    classe: 3,
    type: 'actif',
    nature: 'both',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 110,
  },
  {
    numero: '3421',
    libelle: 'Copropriétaire individualisé',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '342',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 111,
  },
  {
    numero: '3422',
    libelle: 'Copropriétaire – budget prévisionnel',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '342',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 112,
  },
  {
    numero: '3423',
    libelle: 'Copropriétaire – travaux et opérations non courantes',
    classe: 3,
    type: 'actif',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '342',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 113,
  },
  {
    numero: '3424',
    libelle: 'Copropriétaire – créances douteuses',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '342',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 114,
  },
  {
    numero: '345',
    libelle: 'État et autres organismes',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 120,
  },
  {
    numero: '3451',
    libelle: 'État – subventions à recevoir',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '345',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 121,
  },
  {
    numero: '3452',
    libelle: 'État et autres organismes débiteurs',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '345',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 122,
  },
  {
    numero: '348',
    libelle: 'Débiteurs divers',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 130,
  },
  {
    numero: '3481',
    libelle: 'Débiteurs divers',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '348',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 131,
  },
  {
    numero: '349',
    libelle: 'Compte de régularisation débiteur',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 140,
  },
  {
    numero: '3491',
    libelle: "Charges constatées d'avance",
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '349',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 141,
  },
  {
    numero: '3497',
    libelle: "Comptes transitoires ou d'attente débiteurs",
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '349',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 142,
  },
  {
    numero: '394',
    libelle: 'Provision pour dépréciation',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 150,
  },
  {
    numero: '3942',
    libelle: 'Provision pour dépréciation – comptes copropriétaires',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '394',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 151,
  },
  {
    numero: '3943',
    libelle: 'Provision pour dépréciation – autres',
    classe: 3,
    type: 'actif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '394',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 152,
  },
  // CLASSE 4 — PASSIF CIRCULANT
  {
    numero: '441',
    libelle: 'Fournisseurs',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 200,
  },
  {
    numero: '4411',
    libelle: 'Fournisseurs',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '441',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 201,
  },
  {
    numero: '4412',
    libelle: 'Fournisseurs, factures non parvenues',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '441',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 202,
  },
  {
    numero: '4413',
    libelle: 'Autres fournisseurs',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '441',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 203,
  },
  {
    numero: '442',
    libelle: 'Collectivité des copropriétaires créditeurs',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 210,
  },
  {
    numero: '4421',
    libelle: 'Copropriétaire – avances',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '442',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 211,
  },
  {
    numero: '443',
    libelle: 'Personnel',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 220,
  },
  {
    numero: '4431',
    libelle: 'Rémunérations dues',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '443',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 221,
  },
  {
    numero: '444',
    libelle: 'Sécurité sociale et autres organismes sociaux',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 230,
  },
  {
    numero: '4441',
    libelle: 'Sécurité sociale',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '444',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 231,
  },
  {
    numero: '4442',
    libelle: 'Autres organismes sociaux',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '444',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 232,
  },
  {
    numero: '445',
    libelle: 'État et autres organismes',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 240,
  },
  {
    numero: '4452',
    libelle: 'État – impôts et versements assimilés',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '445',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 241,
  },
  {
    numero: '4453',
    libelle: 'État et autres organismes créditeurs',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '445',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 242,
  },
  {
    numero: '448',
    libelle: 'Créditeurs divers',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 250,
  },
  {
    numero: '4481',
    libelle: 'Créditeurs divers',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '448',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 251,
  },
  {
    numero: '449',
    libelle: 'Compte de régularisation créditeur',
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 260,
  },
  {
    numero: '4491',
    libelle: "Compte en attente d'imputation divers créditeur",
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '449',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 261,
  },
  {
    numero: '4492',
    libelle: "Compte de produits encaissés d'avance",
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '449',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 262,
  },
  {
    numero: '4497',
    libelle: "Comptes transitoires ou d'attente créditeurs",
    classe: 4,
    type: 'passif',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '449',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 263,
  },
  // CLASSE 5 — TRÉSORERIE
  {
    numero: '511',
    libelle: 'Fonds placés',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 300,
  },
  {
    numero: '5111',
    libelle: 'Compte à terme',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '511',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 301,
  },
  {
    numero: '5112',
    libelle: 'Autres comptes',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '511',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 302,
  },
  {
    numero: '512',
    libelle: 'Banques',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 310,
  },
  {
    numero: '5121',
    libelle: 'Banques',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '512',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 311,
  },
  {
    numero: '5122',
    libelle: 'Chèques',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '512',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 312,
  },
  {
    numero: '516',
    libelle: 'Caisse',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 320,
  },
  {
    numero: '5161',
    libelle: 'Caisse',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '516',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 321,
  },
  {
    numero: '554',
    libelle: 'Banque (solde créditeur)',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 330,
  },
  {
    numero: '5541',
    libelle: 'Banque (découvert)',
    classe: 5,
    type: 'tresorerie',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '554',
    utilisable_depense: false,
    utilisable_budget: false,
    utilisable_produit: false,
    ordre: 331,
  },
  // CLASSE 6 — CHARGES
  {
    numero: '611',
    libelle: 'Achats de matières et fournitures',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 400,
  },
  {
    numero: '6111',
    libelle: 'Eau',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 401,
  },
  {
    numero: '6112',
    libelle: 'Électricité',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 402,
  },
  {
    numero: '6113',
    libelle: 'Chauffage, énergie et combustibles',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 403,
  },
  {
    numero: '6114',
    libelle: "Achats produits d'entretien et petits équipements",
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 404,
  },
  {
    numero: '6115',
    libelle: 'Petit matériel',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 405,
  },
  {
    numero: '6116',
    libelle: 'Fournitures',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '611',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 406,
  },
  {
    numero: '612',
    libelle: 'Autres charges',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 410,
  },
  {
    numero: '6121',
    libelle: "Remboursement d'emprunts",
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '612',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 411,
  },
  {
    numero: '613',
    libelle: 'Achats de services extérieurs',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 420,
  },
  {
    numero: '6131',
    libelle: 'Nettoyage des locaux',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 421,
  },
  {
    numero: '6132',
    libelle: 'Locations immobilières',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 422,
  },
  {
    numero: '6133',
    libelle: 'Locations mobilières',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 423,
  },
  {
    numero: '6134',
    libelle: 'Contrats de maintenance',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 424,
  },
  {
    numero: '6135',
    libelle: 'Entretien et petites réparations',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 425,
  },
  {
    numero: '6136',
    libelle: "Primes d'assurances",
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 426,
  },
  {
    numero: '6137',
    libelle: 'Rémunérations du syndic sur gestion copropriété',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 427,
  },
  {
    numero: '6138',
    libelle: 'Autres rémunérations',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '613',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 428,
  },
  {
    numero: '614',
    libelle: 'Autres services extérieurs',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 430,
  },
  {
    numero: '6140',
    libelle: 'Frais postaux',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '614',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 431,
  },
  {
    numero: '6141',
    libelle: 'Frais bancaires',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '614',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 432,
  },
  {
    numero: '6142',
    libelle: 'Honoraires',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '614',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 433,
  },
  {
    numero: '6143',
    libelle: 'Autres charges',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '614',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 434,
  },
  {
    numero: '6144',
    libelle: "Charges d'intérêts",
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '614',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 435,
  },
  {
    numero: '616',
    libelle: 'Impôts, taxes et versements assimilés',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 440,
  },
  {
    numero: '6161',
    libelle: 'Impôts et taxes',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '616',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 441,
  },
  {
    numero: '617',
    libelle: 'Frais de personnel',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 450,
  },
  {
    numero: '6171',
    libelle: 'Salaires',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '617',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 451,
  },
  {
    numero: '6172',
    libelle: 'Charges sociales et organismes sociaux',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '617',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 452,
  },
  {
    numero: '6173',
    libelle: 'Autres (médecine du travail, mutuelles, etc.)',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '617',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 453,
  },
  {
    numero: '6174',
    libelle: 'Assurance accident de travail',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '617',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 454,
  },
  {
    numero: '651',
    libelle: 'Charges pour travaux et opérations non courantes',
    classe: 6,
    type: 'charge',
    nature: 'non_courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 460,
  },
  {
    numero: '6511',
    libelle: "Travaux décidés par l'assemblée générale",
    classe: 6,
    type: 'charge',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '651',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 461,
  },
  {
    numero: '6512',
    libelle: 'Travaux urgents',
    classe: 6,
    type: 'charge',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '651',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 462,
  },
  {
    numero: '6513',
    libelle: 'Études techniques, diagnostic, consultation',
    classe: 6,
    type: 'charge',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '651',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 463,
  },
  {
    numero: '6514',
    libelle: 'Pertes sur créances irrécouvrables',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '651',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 464,
  },
  {
    numero: '6515',
    libelle: 'Charges non courantes',
    classe: 6,
    type: 'charge',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '651',
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 465,
  },
  {
    numero: '691',
    libelle: 'Dotations aux dépréciations sur créances douteuses',
    classe: 6,
    type: 'charge',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: true,
    utilisable_budget: true,
    utilisable_produit: false,
    ordre: 470,
  },
  // CLASSE 7 — PRODUITS
  {
    numero: '711',
    libelle: 'Appels de fonds',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 500,
  },
  {
    numero: '7111',
    libelle: 'Provisions sur opérations courantes',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '711',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 501,
  },
  {
    numero: '7112',
    libelle: 'Provisions sur travaux',
    classe: 7,
    type: 'produit',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '711',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 502,
  },
  {
    numero: '7113',
    libelle: 'Avances',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '711',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 503,
  },
  {
    numero: '712',
    libelle: 'Autres produits',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 510,
  },
  {
    numero: '7121',
    libelle: 'Emprunts',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '712',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 511,
  },
  {
    numero: '7122',
    libelle: 'Subventions',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '712',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 512,
  },
  {
    numero: '7123',
    libelle: "Indemnités d'assurances",
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '712',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 513,
  },
  {
    numero: '7124',
    libelle: 'Produits divers',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '712',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 514,
  },
  {
    numero: '7125',
    libelle: 'Produits financiers',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '712',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 515,
  },
  {
    numero: '751',
    libelle: 'Produits pour travaux et opérations non courantes',
    classe: 7,
    type: 'produit',
    nature: 'non_courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 520,
  },
  {
    numero: '7511',
    libelle: "Autres produits décidés par l'assemblée générale",
    classe: 7,
    type: 'produit',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '751',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 521,
  },
  {
    numero: '7512',
    libelle: 'Produits de cession reçus',
    classe: 7,
    type: 'produit',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '751',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 522,
  },
  {
    numero: '7513',
    libelle: 'Dons reçus',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '751',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 523,
  },
  {
    numero: '7514',
    libelle: 'Rentrées sur créances soldées',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: true,
    compte_parent: '751',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 524,
  },
  {
    numero: '7515',
    libelle: 'Autres produits non courants',
    classe: 7,
    type: 'produit',
    nature: 'non_courant',
    est_sous_compte: true,
    compte_parent: '751',
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 525,
  },
  {
    numero: '791',
    libelle: 'Reprises de dépréciations sur créances douteuses',
    classe: 7,
    type: 'produit',
    nature: 'courant',
    est_sous_compte: false,
    compte_parent: null,
    utilisable_depense: false,
    utilisable_budget: true,
    utilisable_produit: true,
    ordre: 530,
  },
]

const MOCK_GRAND_LIVRE_6131: GrandLivreCompte = {
  numero: '6131',
  libelle: 'Nettoyage des locaux',
  solde_ouverture: 0,
  lignes: [
    {
      id: 4,
      date: '2026-02-03',
      description: 'Nettoyage parties communes Février 2026',
      debit: 1500,
      credit: 0,
      solde: 1500,
    },
    {
      id: 10,
      date: '2026-05-06',
      description: 'Nettoyage parties communes Mai 2026',
      debit: 1500,
      credit: 0,
      solde: 3000,
    },
    {
      id: 13,
      date: '2026-05-16',
      description: 'Nettoyage espaces verts Mai 2026',
      debit: 750,
      credit: 0,
      solde: 3750,
    },
  ],
  solde_final: 3750,
}

const MOCK_BALANCE: BalanceLigne[] = [
  {
    numero: '5121',
    libelle: 'Banques',
    classe: 5,
    total_debit: 18000,
    total_credit: 0,
    solde_debiteur: 18000,
    solde_crediteur: 0,
  },
  {
    numero: '5161',
    libelle: 'Caisse',
    classe: 5,
    total_debit: 1600,
    total_credit: 0,
    solde_debiteur: 1600,
    solde_crediteur: 0,
  },
  {
    numero: '6111',
    libelle: 'Eau',
    classe: 6,
    total_debit: 320,
    total_credit: 0,
    solde_debiteur: 320,
    solde_crediteur: 0,
  },
  {
    numero: '6112',
    libelle: 'Électricité',
    classe: 6,
    total_debit: 850,
    total_credit: 0,
    solde_debiteur: 850,
    solde_crediteur: 0,
  },
  {
    numero: '6131',
    libelle: 'Nettoyage des locaux',
    classe: 6,
    total_debit: 3000,
    total_credit: 0,
    solde_debiteur: 3000,
    solde_crediteur: 0,
  },
  {
    numero: '6134',
    libelle: 'Contrats de maintenance',
    classe: 6,
    total_debit: 2800,
    total_credit: 0,
    solde_debiteur: 2800,
    solde_crediteur: 0,
  },
  {
    numero: '6135',
    libelle: 'Entretien et petites réparations',
    classe: 6,
    total_debit: 650,
    total_credit: 0,
    solde_debiteur: 650,
    solde_crediteur: 0,
  },
  {
    numero: '6136',
    libelle: "Primes d'assurances",
    classe: 6,
    total_debit: 2400,
    total_credit: 0,
    solde_debiteur: 2400,
    solde_crediteur: 0,
  },
  {
    numero: '6138',
    libelle: 'Autres rémunérations',
    classe: 6,
    total_debit: 3500,
    total_credit: 0,
    solde_debiteur: 3500,
    solde_crediteur: 0,
  },
  {
    numero: '7111',
    libelle: 'Provisions sur opérations courantes',
    classe: 7,
    total_debit: 0,
    total_credit: 2750,
    solde_debiteur: 0,
    solde_crediteur: 2750,
  },
]

const MOCK_IMPORT_IA: ImportIaResult = {
  titre: 'Facture Gardiennage Juin',
  montant: 3500,
  date: '2026-06-01',
  fournisseur: 'Sécurité Atlas SARL',
  compte_charge_suggere: '6138',
  confiance: 'haute',
}

// ─── Service functions ────────────────────────────────────────────────────────

// Exercices
export async function getExercicesComptabilite(
  residenceId: number,
): Promise<ExerciceComptable[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<ExerciceComptable[]>>(
        `/gestionnaire/residences/${residenceId}/comptabilite/exercices`,
      )
      return res.data.data
    },
    MOCK_EXERCICES.filter((e) => e.residence_id === residenceId),
  )
}

export async function createExercice(
  residenceId: number,
  data: { annee: number; date_ouverture: string },
): Promise<ExerciceComptable> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ExerciceComptable>>(
        `/gestionnaire/residences/${residenceId}/comptabilite/exercices`,
        data,
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      residence_id: residenceId,
      annee: data.annee,
      statut: 'ouvert' as const,
      date_ouverture: data.date_ouverture,
      date_cloture: null,
      seuil_comptable: 0,
    },
  )
}

// Dashboard
export async function getComptaDashboard(
  exerciceId: number,
): Promise<ComptabiliteDashboard> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<ComptabiliteDashboard>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/dashboard`,
    )
    return res.data.data
  }, MOCK_DASHBOARD)
}

// Écritures
export async function getJournal(
  exerciceId: number,
  params?: { from?: string; to?: string; search?: string },
): Promise<EcritureComptable[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<EcritureComptable[]>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/journal`,
        { params },
      )
      return res.data.data
    },
    MOCK_ECRITURES.filter((e) => e.exercice_id === exerciceId),
  )
}

export async function getGrandLivre(
  exerciceId: number,
  compte: string,
): Promise<GrandLivreCompte> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<GrandLivreCompte>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/grand-livre/${compte}`,
      )
      return res.data.data
    },
    compte === '6131'
      ? MOCK_GRAND_LIVRE_6131
      : {
          numero: compte,
          libelle:
            MOCK_COMPTES_PCG.find((c) => c.numero === compte)?.libelle ??
            compte,
          solde_ouverture: 0,
          lignes: [],
          solde_final: 0,
        },
  )
}

export async function getBalance(exerciceId: number): Promise<BalanceLigne[]> {
  return withMock(async () => {
    const res = await api.get<ApiEnvelope<BalanceLigne[]>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/balance`,
    )
    return res.data.data
  }, MOCK_BALANCE)
}

// Dépenses
export async function getDepenses(exerciceId: number): Promise<Depense[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Depense[]>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/depenses`,
      )
      return res.data.data
    },
    MOCK_DEPENSES.filter((d) => d.exercice_id === exerciceId),
  )
}

export async function storeDepense(
  exerciceId: number,
  data: FormData,
): Promise<Depense> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<Depense>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/depenses`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      exercice_id: exerciceId,
      titre: (data.get('titre') as string) ?? 'Nouvelle dépense',
      montant: Number(data.get('montant') ?? 0),
      date:
        (data.get('date') as string) ?? new Date().toISOString().slice(0, 10),
      prestataire_id: null,
      prestataire_nom: (data.get('prestataire') as string) || null,
      compte_charge: (data.get('compte_charge') as string) ?? '6135',
      libelle_compte:
        MOCK_COMPTES_PCG.find((c) => c.numero === data.get('compte_charge'))
          ?.libelle ?? 'Entretien et petites réparations',
      mode_paiement: ((data.get('mode_paiement') as string) ??
        'virement') as Depense['mode_paiement'],
      justificatif_path: null,
      ecriture_id: Math.floor(Math.random() * 1000) + 100,
    },
  )
}

export async function deleteDepense(id: number): Promise<void> {
  return withMock(async () => {
    await api.delete(`/gestionnaire/comptabilite/depenses/${id}`)
  }, undefined)
}

// Encaissements
export async function getEncaissements(
  exerciceId: number,
): Promise<Encaissement[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<Encaissement[]>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/encaissements`,
      )
      return res.data.data
    },
    MOCK_ENCAISSEMENTS.filter((e) => e.exercice_id === exerciceId),
  )
}

export async function storeEncaissement(
  exerciceId: number,
  data: {
    coproprietaire_id: number
    montant: number
    date: string
    mode_paiement: 'virement' | 'cheque' | 'especes'
    compte_destination: '5121' | '5122' | '5161'
    reference_cheque?: string
  },
): Promise<Encaissement> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<Encaissement>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/encaissements`,
        data,
      )
      return res.data.data
    },
    {
      id: Math.floor(Math.random() * 1000) + 100,
      exercice_id: exerciceId,
      coproprietaire_id: data.coproprietaire_id,
      coproprietaire_nom: 'Copropriétaire',
      lot_numero: 'A-XX',
      montant: data.montant,
      date: data.date,
      mode_paiement: data.mode_paiement,
      reference_cheque: data.reference_cheque ?? null,
      compte_destination: data.compte_destination,
      ecriture_id: Math.floor(Math.random() * 1000) + 100,
    },
  )
}

// Import IA
export async function importFactureIa(
  exerciceId: number,
  file: File,
): Promise<ImportIaResult> {
  return withMock(async () => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<ApiEnvelope<ImportIaResult>>(
      `/gestionnaire/comptabilite/exercices/${exerciceId}/import-ia`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  }, MOCK_IMPORT_IA)
}

// Clôture
export async function cloturerExercice(
  exerciceId: number,
): Promise<ExerciceComptable> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ExerciceComptable>>(
        `/gestionnaire/comptabilite/exercices/${exerciceId}/cloture`,
      )
      return res.data.data
    },
    {
      ...(MOCK_EXERCICES.find((e) => e.id === exerciceId) ?? MOCK_EXERCICES[0]),
      statut: 'clos' as const,
      date_cloture: new Date().toISOString().slice(0, 10),
    },
  )
}

// Plan comptable
export async function getComptesPcg(params?: {
  utilisable_depense?: boolean
  utilisable_produit?: boolean
  utilisable_budget?: boolean
  classe?: number
}): Promise<ComptePcg[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<ComptePcg[]>>(
        '/gestionnaire/comptabilite/comptes-pcg',
        { params },
      )
      return res.data.data
    },
    (() => {
      let data = MOCK_COMPTES_PCG
      if (params?.utilisable_depense === true)
        data = data.filter((c) => c.utilisable_depense)
      if (params?.utilisable_produit === true)
        data = data.filter((c) => c.utilisable_produit)
      if (params?.utilisable_budget === true)
        data = data.filter((c) => c.utilisable_budget)
      if (params?.classe !== undefined)
        data = data.filter((c) => c.classe === params.classe)
      return data
    })(),
  )
}
