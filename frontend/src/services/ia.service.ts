/**
 * IA (intelligence augmentée) — Sprint 8.
 * Notre moat différenciateur vs Kassaba.
 *
 * 3 features:
 *  - runComplianceAudit  : analyse l'état d'un dossier (charges, AG, annexes)
 *                          et produit un rapport de risque légal.
 *  - extractInvoiceData  : OCR + classification d'une facture (PDF/image)
 *                          → renvoie montant, fournisseur, date, compte
 *                          comptable suggéré + niveau de confiance.
 *  - suggestBudget       : à partir des dépenses N-1 et N-2, propose un budget
 *                          prévisionnel N+1 avec justification par poste.
 *
 * Backend (Abdellah, futur):
 *   POST /api/ia/compliance-audit     { residence_id, exercice } → ComplianceAudit
 *   POST /api/ia/extract-invoice      multipart file              → InvoiceExtraction
 *   POST /api/ia/suggest-budget       { residence_id, exercice }  → BudgetSuggestion
 *
 * Les 3 routes appellent l'API Anthropic Claude (claude-sonnet-4.5 + vision)
 * côté serveur pour ne pas exposer la clé. Voir docs/sprint-8-ia.md (à écrire)
 * pour les prompts complets.
 *
 * Pour l'instant tout est mocké côté frontend avec des données réalistes
 * pour permettre la démo immédiate.
 */
import { api, type ApiEnvelope } from '@/lib/axios'

async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS)
    return call()
  try {
    return await call()
  } catch {
    return mock
  }
}

// ─── 1. Audit conformité IA ────────────────────────────────────────────────────

export type ComplianceFindingSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'

export type ComplianceFinding = {
  id: string
  severity: ComplianceFindingSeverity
  category: 'legal' | 'financial' | 'data' | 'process'
  title: string
  description: string
  recommendation: string
  reference?: string // ex: "Loi 18-00 art. 25" ou "Décret 2.23.700"
  impact_estimated?: string // ex: "Risque amende 5 000 DH"
  remediation_effort?: 'simple' | 'moderate' | 'significant'
  affected_count?: number // nb d'éléments concernés
}

export type ComplianceAudit = {
  residence_id: number
  residence_name: string
  exercice: number
  generated_at: string
  overall_score: number // 0-100
  health_status: 'excellent' | 'good' | 'warning' | 'critical'
  summary: string // exécutif 2-3 phrases
  findings: ComplianceFinding[]
  strengths: string[] // ce qui va bien
  metadata: {
    model: string // ex: "claude-sonnet-4.5-mock"
    duration_ms: number
    tokens_used: number
  }
}

const MOCK_COMPLIANCE_AUDIT: ComplianceAudit = {
  residence_id: 1,
  residence_name: 'Atlas Casablanca',
  exercice: 2026,
  generated_at: new Date().toISOString(),
  overall_score: 72,
  health_status: 'warning',
  summary:
    "L'état général de votre copropriété est correct mais 3 points critiques nécessitent " +
    'une action immédiate pour rester en conformité légale. Les pénalités sont configurées ' +
    "mais n'ont pas été validées en AG, et 2 créances approchent du seuil de prescription.",
  findings: [
    {
      id: 'F-001',
      severity: 'critical',
      category: 'legal',
      title: 'Créance proche de la prescription quinquennale',
      description:
        'La créance de Karim El Fassi (lot B-01, 3 200 DH) date du 15 mars 2022. ' +
        "Elle sera prescrite dans 215 jours selon l'article 25 de la Loi 18-00.",
      recommendation:
        'Envoyer une mise en demeure dans les 30 jours pour interrompre la prescription, ' +
        'ou enclencher une procédure judiciaire.',
      reference: 'Loi 18-00 art. 25 · Code des obligations',
      impact_estimated: 'Perte définitive de 3 200 DH si non interrompue',
      remediation_effort: 'simple',
      affected_count: 1,
    },
    {
      id: 'F-002',
      severity: 'high',
      category: 'legal',
      title: 'Pénalités configurées sans validation AG',
      description:
        'La configuration des pénalités de retard est active (5% / 15j de grâce) mais ' +
        "aucune décision d'assemblée générale n'a été enregistrée pour la valider.",
      recommendation:
        'Soumettre la grille des pénalités au vote de la prochaine AG ordinaire. En attendant, ' +
        'les pénalités appliquées sont juridiquement contestables.',
      reference: 'Loi 18-00 art. 25 al. 2',
      impact_estimated: 'Risque de contentieux + remboursement obligatoire',
      remediation_effort: 'moderate',
      affected_count: 1,
    },
    {
      id: 'F-003',
      severity: 'high',
      category: 'data',
      title: 'Annexes 13-1 et 13-2 non générées pour 2025',
      description:
        "Les annexes comptables requises (bilan + compte de gestion) n'ont pas été générées " +
        "pour l'exercice clos 2025. Le décret 2.23.700 impose leur archivage dans les 6 mois " +
        'suivant la clôture.',
      recommendation:
        'Générer les annexes 10, 13-1 et 13-2 depuis /gestionnaire/annexes en sélectionnant ' +
        "l'exercice 2025 puis cliquer « Régénérer ».",
      reference: 'Décret 2.23.700 art. 4',
      remediation_effort: 'simple',
      affected_count: 3,
    },
    {
      id: 'F-004',
      severity: 'medium',
      category: 'process',
      title: 'Pointage bancaire en retard',
      description:
        "Aucun rapprochement bancaire n'a été effectué depuis 47 jours. Recommandé : " +
        'rapprochement mensuel minimum.',
      recommendation:
        'Importer le relevé bancaire du mois en cours depuis /gestionnaire/pointage. ' +
        'Le rapprochement automatique matche 70%+ des lignes en quelques secondes.',
      remediation_effort: 'simple',
    },
    {
      id: 'F-005',
      severity: 'medium',
      category: 'financial',
      title: 'Écart budgétaire significatif détecté',
      description:
        'Le poste « Services extérieurs » dépasse le budget voté de 14% (7 800 DH réalisé vs ' +
        '7 500 DH voté). À surveiller pour ne pas dériver davantage.',
      recommendation:
        'Vérifier les contrats de maintenance et négocier si possible. Sinon, prévoir un ' +
        "rebudgetage à l'AG.",
      reference: 'Annexe 13-2',
      affected_count: 1,
    },
    {
      id: 'F-006',
      severity: 'low',
      category: 'data',
      title: 'Inventaire équipements incomplet',
      description:
        '4 équipements enregistrés mais aucune photo / numéro de série attachés. ' +
        'Recommandé pour la traçabilité en cas de sinistre.',
      recommendation:
        'Compléter chaque fiche équipement avec photo + numéro de série + contrat de ' +
        'maintenance associé.',
      affected_count: 4,
    },
  ],
  strengths: [
    'Comptabilité tenue en partie double (journal + grand livre à jour)',
    '12 annexes PDF disponibles à la génération en 1 clic',
    '100% des copropriétaires renseignés avec lot associé',
    'Cycle annuel de conformité Décret 2.23.700 suivi à 42%',
  ],
  metadata: {
    model: 'claude-sonnet-4.5-mock',
    duration_ms: 1840,
    tokens_used: 4200,
  },
}

export async function runComplianceAudit(
  residenceId: number,
  exercice: number,
): Promise<ComplianceAudit> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<ComplianceAudit>>(
        '/ia/compliance-audit',
        { residence_id: residenceId, exercice },
      )
      return res.data.data
    },
    { ...MOCK_COMPLIANCE_AUDIT, residence_id: residenceId, exercice },
  )
}

// ─── 2. Extraction facture IA (OCR + classification) ──────────────────────────

export type InvoiceCategory =
  | 'eau'
  | 'electricite'
  | 'gaz'
  | 'fluides'
  | 'nettoyage'
  | 'gardiennage'
  | 'maintenance'
  | 'ascenseur'
  | 'syndic_honoraires'
  | 'assurance'
  | 'banque'
  | 'impots_taxes'
  | 'salaires_charges'
  | 'fournitures'
  | 'autre'

export type InvoiceExtraction = {
  fournisseur: string // raison sociale détectée
  fournisseur_ice?: string // ICE marocain si détecté
  date: string // ISO YYYY-MM-DD
  numero_facture?: string
  montant_ht?: number
  montant_tva?: number
  montant_ttc: number // requis
  devise: string // ex: 'MAD'
  description: string // synthèse
  ligne_items?: { libelle: string; montant: number }[]
  categorie_suggeree: InvoiceCategory
  compte_comptable_suggere: string // ex: '6131' (nettoyage)
  confidence: number // 0-1
  warnings?: string[]
  metadata: {
    model: string
    duration_ms: number
    page_count: number
  }
}

const MOCK_INVOICE: InvoiceExtraction = {
  fournisseur: 'Clean Pro Maroc SARL',
  fournisseur_ice: '001523847000089',
  date: '2026-04-22',
  numero_facture: 'FAC-2026-04-184',
  montant_ht: 1000,
  montant_tva: 200,
  montant_ttc: 1200,
  devise: 'MAD',
  description: 'Prestation de nettoyage des parties communes — avril 2026',
  ligne_items: [
    { libelle: 'Nettoyage hall + escaliers (4 passages)', montant: 600 },
    { libelle: 'Sortie poubelles (quotidien)', montant: 250 },
    { libelle: 'Nettoyage parking sous-sol (1 passage)', montant: 150 },
  ],
  categorie_suggeree: 'nettoyage',
  compte_comptable_suggere: '6131',
  confidence: 0.94,
  warnings: ['ICE non vérifié auprès de la DGI'],
  metadata: {
    model: 'claude-sonnet-4.5-vision-mock',
    duration_ms: 3240,
    page_count: 1,
  },
}

export async function extractInvoiceData(
  file: File,
): Promise<InvoiceExtraction> {
  return withMock(async () => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<ApiEnvelope<InvoiceExtraction>>(
      '/ia/extract-invoice',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data.data
  }, MOCK_INVOICE)
}

// ─── 3. Suggestions budget IA ──────────────────────────────────────────────────

export type BudgetSuggestionLine = {
  compte_numero: string
  compte_libelle: string
  realise_n_minus_2: number // 2 ans avant
  realise_n_minus_1: number // an dernier
  realise_n_partiel?: number // si exercice N en cours
  suggestion_n_plus_1: number
  variation_pct: number // vs N-1
  justification: string // explication IA
  confidence: 'high' | 'medium' | 'low'
}

export type BudgetSuggestion = {
  residence_id: number
  exercice_cible: number
  total_charges_n_minus_1: number
  total_charges_suggere: number
  variation_globale_pct: number
  hypotheses: string[] // ex: "inflation 3.5% sur fluides"
  lignes: BudgetSuggestionLine[]
  metadata: {
    model: string
    duration_ms: number
    tokens_used: number
  }
}

const MOCK_BUDGET_SUGGESTION: BudgetSuggestion = {
  residence_id: 1,
  exercice_cible: 2027,
  total_charges_n_minus_1: 38500,
  total_charges_suggere: 40430,
  variation_globale_pct: 5.0,
  hypotheses: [
    'Inflation générale au Maroc : +3.2% (HCP 2026)',
    'Hausse tarif eau/électricité Lydec/Redal : +4% prévue Q1 2027',
    'Contrats existants nettoyage et maintenance : renouvellement à tarif identique',
    'Pas de gros travaux prévus dans le budget courant (à voter séparément)',
  ],
  lignes: [
    {
      compte_numero: '6111',
      compte_libelle: 'Eau — compteur général',
      realise_n_minus_2: 3800,
      realise_n_minus_1: 4100,
      realise_n_partiel: 3650,
      suggestion_n_plus_1: 4300,
      variation_pct: 4.9,
      justification: 'Hausse tarif Lydec attendue + consommation stable',
      confidence: 'high',
    },
    {
      compte_numero: '6112',
      compte_libelle: 'Électricité',
      realise_n_minus_2: 5200,
      realise_n_minus_1: 5800,
      realise_n_partiel: 5100,
      suggestion_n_plus_1: 6100,
      variation_pct: 5.2,
      justification:
        'Hausse tarif Redal + LED non encore installées dans le sous-sol',
      confidence: 'high',
    },
    {
      compte_numero: '6131',
      compte_libelle: 'Nettoyage parties communes',
      realise_n_minus_2: 7200,
      realise_n_minus_1: 7800,
      realise_n_partiel: 6900,
      suggestion_n_plus_1: 7800,
      variation_pct: 0,
      justification: 'Contrat Clean Pro Maroc reconduit au même tarif',
      confidence: 'high',
    },
    {
      compte_numero: '6134',
      compte_libelle: 'Contrats de maintenance',
      realise_n_minus_2: 9600,
      realise_n_minus_1: 10200,
      realise_n_partiel: 9450,
      suggestion_n_plus_1: 10700,
      variation_pct: 4.9,
      justification:
        'TechElev: +5% (annoncé). Plomberie: stable. Vidéo: stable.',
      confidence: 'medium',
    },
    {
      compte_numero: '6137',
      compte_libelle: 'Honoraires du syndic',
      realise_n_minus_2: 1800,
      realise_n_minus_1: 1800,
      realise_n_partiel: 1500,
      suggestion_n_plus_1: 1900,
      variation_pct: 5.6,
      justification: 'Indexation contractuelle annuelle',
      confidence: 'high',
    },
    {
      compte_numero: '6136',
      compte_libelle: "Primes d'assurance",
      realise_n_minus_2: 2900,
      realise_n_minus_1: 3050,
      realise_n_partiel: 2800,
      suggestion_n_plus_1: 3200,
      variation_pct: 4.9,
      justification: 'AXA: revalorisation moyenne du secteur',
      confidence: 'medium',
    },
    {
      compte_numero: '6143',
      compte_libelle: 'Autres charges',
      realise_n_minus_2: 1800,
      realise_n_minus_1: 1450,
      realise_n_partiel: 1100,
      suggestion_n_plus_1: 1500,
      variation_pct: 3.4,
      justification: 'Inflation générale, retour à la moyenne historique',
      confidence: 'low',
    },
    {
      compte_numero: '6161',
      compte_libelle: 'Impôts et taxes',
      realise_n_minus_2: 750,
      realise_n_minus_1: 800,
      realise_n_partiel: 800,
      suggestion_n_plus_1: 830,
      variation_pct: 3.8,
      justification:
        'Taxe sur les terrains urbains non bâtis : revalorisation cadastrale',
      confidence: 'medium',
    },
    {
      compte_numero: '6135',
      compte_libelle: 'Entretien courant et réparations',
      realise_n_minus_2: 3200,
      realise_n_minus_1: 3500,
      realise_n_partiel: 3100,
      suggestion_n_plus_1: 4100,
      variation_pct: 17.1,
      justification:
        'Lissage des réparations imprévues : provision conservatrice + état des équipements > 5 ans',
      confidence: 'low',
    },
  ],
  metadata: {
    model: 'claude-sonnet-4.5-mock',
    duration_ms: 4120,
    tokens_used: 8400,
  },
}

export async function suggestBudget(
  residenceId: number,
  exerciceCible: number,
): Promise<BudgetSuggestion> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<BudgetSuggestion>>(
        '/ia/suggest-budget',
        { residence_id: residenceId, exercice: exerciceCible },
      )
      return res.data.data
    },
    {
      ...MOCK_BUDGET_SUGGESTION,
      residence_id: residenceId,
      exercice_cible: exerciceCible,
    },
  )
}
