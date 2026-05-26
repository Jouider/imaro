/**
 * Conformité légale — Sprint 4 services.
 * Audit trail, annexes, calendrier conformité, pénalités, recouvrement, occupants.
 * Tous en mode mock jusqu'à livraison des endpoints par Abdellah (cf. docs/sprint-4-conformite-legale.md).
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

// ─── Audit trail ──────────────────────────────────────────────────────────────

export type AuditLogCategory =
  | 'immeuble' | 'lot' | 'coproprietaire' | 'paiement' | 'depense'
  | 'budget' | 'ag' | 'document' | 'user' | 'auth' | 'system'

export type AuditLogSeverity = 'info' | 'warning' | 'sensitive' | 'error'

export type AuditLog = {
  id: number
  category: AuditLogCategory
  action: string
  severity: AuditLogSeverity
  target_type?: string
  target_id?: number
  target_label?: string
  user_email?: string
  payload?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export type AuditFilters = {
  from?: string
  to?: string
  category?: AuditLogCategory
  severity?: AuditLogSeverity
  action?: string
  search?: string
  page?: number
  per_page?: number
}

export type AuditStats = {
  total: number
  errors: number
  sensitive: number
  error_rate: number
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    category: 'immeuble',
    action: 'Building.created',
    severity: 'info',
    target_type: 'Residence',
    target_id: 1,
    target_label: 'Atlas Casablanca',
    user_email: 'a.berrada@imaro.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-05-21T22:32:01Z',
  },
  {
    id: 2,
    category: 'paiement',
    action: 'Payment.created',
    severity: 'info',
    target_type: 'Paiement',
    target_id: 124,
    target_label: 'Lot A-01 · 850,00 DH',
    user_email: 'a.berrada@imaro.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-05-22T10:14:22Z',
  },
  {
    id: 3,
    category: 'coproprietaire',
    action: 'Owner.deleted',
    severity: 'sensitive',
    target_type: 'Coproprietaire',
    target_id: 8,
    target_label: 'Karim El Fassi',
    user_email: 'a.berrada@imaro.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-05-22T15:02:18Z',
  },
  {
    id: 4,
    category: 'auth',
    action: 'Auth.failed_login',
    severity: 'warning',
    user_email: 'unknown@attacker.fake',
    ip_address: '197.230.45.12',
    created_at: '2026-05-23T03:45:09Z',
  },
  {
    id: 5,
    category: 'budget',
    action: 'Budget.locked',
    severity: 'sensitive',
    target_type: 'Budget',
    target_id: 3,
    target_label: 'Budget 2026 — Atlas Casablanca',
    user_email: 'a.berrada@imaro.ma',
    ip_address: '105.66.12.34',
    created_at: '2026-05-23T09:21:44Z',
  },
]

function filterMockLogs(filters: AuditFilters): AuditLog[] {
  let logs = MOCK_AUDIT_LOGS
  if (filters.category) logs = logs.filter((l) => l.category === filters.category)
  if (filters.severity) logs = logs.filter((l) => l.severity === filters.severity)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.user_email ?? '').toLowerCase().includes(q) ||
        (l.target_label ?? '').toLowerCase().includes(q),
    )
  }
  return logs
}

export async function getAuditLogs(
  filters: AuditFilters = {},
): Promise<{ logs: AuditLog[]; stats: AuditStats }> {
  const mockLogs = filterMockLogs(filters)
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ logs: AuditLog[]; stats: AuditStats }>>(
        '/gestionnaire/audit-logs',
        { params: filters },
      )
      return res.data.data
    },
    {
      logs: mockLogs,
      stats: {
        total: MOCK_AUDIT_LOGS.length,
        errors: MOCK_AUDIT_LOGS.filter((l) => l.severity === 'error').length,
        sensitive: MOCK_AUDIT_LOGS.filter((l) => l.severity === 'sensitive').length,
        error_rate: 0,
      },
    },
  )
}

// ─── Annexes ──────────────────────────────────────────────────────────────────

export type AnnexeStatus = {
  num: string
  required: boolean
  available: boolean
  last_generated?: string
}

export type AnnexeList = {
  exercice: number
  regime: 'simplifie' | 'normal'
  annexes: AnnexeStatus[]
}

const MOCK_ANNEXES: AnnexeList = {
  exercice: 2026,
  regime: 'simplifie',
  annexes: [
    { num: '10',   required: true,  available: true, last_generated: '2026-05-20T10:00:00Z' },
    { num: '13-1', required: true,  available: true, last_generated: '2026-05-20T10:01:00Z' },
    { num: '13-2', required: true,  available: true, last_generated: '2026-05-20T10:02:00Z' },
    { num: '3',    required: false, available: true },
    { num: '4',    required: false, available: true },
    { num: '5',    required: false, available: true },
    { num: '6',    required: false, available: true },
    { num: '7',    required: false, available: true },
    { num: '8',    required: false, available: true },
    { num: '9',    required: false, available: true },
    { num: '11',   required: false, available: true },
    { num: '12',   required: false, available: true },
  ],
}

export async function getAnnexes(residenceId: number, exercice: number): Promise<AnnexeList> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<AnnexeList>>(
        `/gestionnaire/residences/${residenceId}/annexes`,
        { params: { exercice } },
      )
      return res.data.data
    },
    { ...MOCK_ANNEXES, exercice },
  )
}

export async function regenerateAnnexe(
  residenceId: number,
  annexeNum: string,
  exercice: number,
): Promise<{ pdf_url: string }> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ pdf_url: string }>>(
        `/gestionnaire/residences/${residenceId}/annexes/${annexeNum}/regenerate`,
        { exercice },
      )
      return res.data.data
    },
    { pdf_url: `#mock-annexe-${annexeNum}-${exercice}` },
  )
}

// ─── Calendrier de conformité ─────────────────────────────────────────────────

export type CompliancePhase =
  | 'operations_mensuelles' | 'cloture_exercice' | 'preparation_ag' | 'archivage'

export type ComplianceTask = {
  id: number
  phase: CompliancePhase
  task_key: string
  task_label: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'done' | 'skipped' | 'overdue'
  completed_at?: string
}

export type ComplianceCalendar = {
  exercice: number
  regime: 'simplifie' | 'normal'
  seuil_recettes: number
  progression_pct: number
  phases: {
    phase: CompliancePhase
    progress_pct: number
    tasks: ComplianceTask[]
  }[]
}

const MOCK_COMPLIANCE_CALENDAR: ComplianceCalendar = {
  exercice: 2026,
  regime: 'simplifie',
  seuil_recettes: 200000,
  progression_pct: 14,
  phases: [
    {
      phase: 'operations_mensuelles',
      progress_pct: 42,
      tasks: [
        { id: 1, phase: 'operations_mensuelles', task_key: 'appel_jan', task_label: 'Appel de fonds émis — Janvier', due_date: '2026-01-31', status: 'done', completed_at: '2026-01-28T10:00:00Z' },
        { id: 2, phase: 'operations_mensuelles', task_key: 'appel_fev', task_label: 'Appel de fonds émis — Février', due_date: '2026-02-28', status: 'done', completed_at: '2026-02-25T10:00:00Z' },
        { id: 3, phase: 'operations_mensuelles', task_key: 'appel_mar', task_label: 'Appel de fonds émis — Mars', due_date: '2026-03-31', status: 'done', completed_at: '2026-03-28T10:00:00Z' },
        { id: 4, phase: 'operations_mensuelles', task_key: 'appel_avr', task_label: 'Appel de fonds émis — Avril', due_date: '2026-04-30', status: 'done', completed_at: '2026-04-27T10:00:00Z' },
        { id: 5, phase: 'operations_mensuelles', task_key: 'appel_mai', task_label: 'Appel de fonds émis — Mai', due_date: '2026-05-31', status: 'in_progress' },
        { id: 6, phase: 'operations_mensuelles', task_key: 'appel_jun', task_label: 'Appel de fonds émis — Juin', due_date: '2026-06-30', status: 'pending' },
        { id: 7, phase: 'operations_mensuelles', task_key: 'appel_jul', task_label: 'Appel de fonds émis — Juillet', due_date: '2026-07-31', status: 'pending' },
        { id: 8, phase: 'operations_mensuelles', task_key: 'appel_aoa', task_label: 'Appel de fonds émis — Août', due_date: '2026-08-31', status: 'pending' },
        { id: 9, phase: 'operations_mensuelles', task_key: 'appel_sep', task_label: 'Appel de fonds émis — Septembre', due_date: '2026-09-30', status: 'pending' },
        { id: 10, phase: 'operations_mensuelles', task_key: 'appel_oct', task_label: 'Appel de fonds émis — Octobre', due_date: '2026-10-31', status: 'pending' },
        { id: 11, phase: 'operations_mensuelles', task_key: 'appel_nov', task_label: 'Appel de fonds émis — Novembre', due_date: '2026-11-30', status: 'pending' },
        { id: 12, phase: 'operations_mensuelles', task_key: 'appel_dec', task_label: 'Appel de fonds émis — Décembre', due_date: '2026-12-31', status: 'pending' },
      ],
    },
    {
      phase: 'cloture_exercice',
      progress_pct: 0,
      tasks: [
        { id: 13, phase: 'cloture_exercice', task_key: 'arret_comptes', task_label: 'Arrêt des comptes 2026', due_date: '2027-03-31', status: 'pending' },
        { id: 14, phase: 'cloture_exercice', task_key: 'audit_interne', task_label: 'Audit interne', due_date: '2027-04-30', status: 'pending' },
        { id: 15, phase: 'cloture_exercice', task_key: 'provisions_creances', task_label: 'Provisions créances douteuses', due_date: '2027-04-30', status: 'pending' },
      ],
    },
    {
      phase: 'preparation_ag',
      progress_pct: 0,
      tasks: [
        { id: 16, phase: 'preparation_ag', task_key: 'convocation_envoyee', task_label: 'Convocations AG envoyées', due_date: '2027-05-15', status: 'pending' },
        { id: 17, phase: 'preparation_ag', task_key: 'documents_disposition', task_label: 'Documents à disposition', due_date: '2027-05-15', status: 'pending' },
        { id: 18, phase: 'preparation_ag', task_key: 'tenue_ag', task_label: 'Tenue de l\'AG', due_date: '2027-05-30', status: 'pending' },
      ],
    },
    {
      phase: 'archivage',
      progress_pct: 0,
      tasks: [
        { id: 19, phase: 'archivage', task_key: 'pv_signe', task_label: 'PV de l\'AG signé', due_date: '2027-06-30', status: 'pending' },
        { id: 20, phase: 'archivage', task_key: 'annexes_generees', task_label: 'Annexes 10, 13-1, 13-2 générées', due_date: '2027-06-30', status: 'pending' },
        { id: 21, phase: 'archivage', task_key: 'archivage_complet', task_label: 'Archivage exercice clôturé', due_date: '2027-07-30', status: 'pending' },
      ],
    },
  ],
}

export async function getComplianceCalendar(
  residenceId: number,
  exercice: number,
): Promise<ComplianceCalendar> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<ComplianceCalendar>>(
        `/gestionnaire/residences/${residenceId}/compliance-calendar`,
        { params: { exercice } },
      )
      return res.data.data
    },
    { ...MOCK_COMPLIANCE_CALENDAR, exercice },
  )
}

// ─── Pénalités ────────────────────────────────────────────────────────────────

export type PenaltyConfig = {
  enabled: boolean
  grace_period_days: number
  rate_type: 'fixed' | 'percentage' | 'daily'
  rate_value: number
  cap_max_montant?: number
  ag_approved_at?: string
}

const MOCK_PENALTY_CONFIG: PenaltyConfig = {
  enabled: false,
  grace_period_days: 15,
  rate_type: 'percentage',
  rate_value: 5,
}

export async function getPenaltyConfig(residenceId: number): Promise<PenaltyConfig> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<PenaltyConfig>>(
        `/gestionnaire/residences/${residenceId}/penalty-config`,
      )
      return res.data.data
    },
    MOCK_PENALTY_CONFIG,
  )
}

export async function updatePenaltyConfig(
  residenceId: number,
  config: PenaltyConfig,
): Promise<PenaltyConfig> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<PenaltyConfig>>(
        `/gestionnaire/residences/${residenceId}/penalty-config`,
        config,
      )
      return res.data.data
    },
    config,
  )
}

// ─── Recouvrement (prescription) ──────────────────────────────────────────────

export type PrescriptionSeverity = 'low' | 'medium' | 'high' | 'critical'

export type PrescriptionRisk = {
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant: number
  date_origine: string
  jours_restants: number
  severite: PrescriptionSeverity
}

export type LotEnRetard = {
  lot_id: number
  lot_numero: string
  coproprietaire_nom: string
  montant_du: number
  montant_penalites: number
  anciennete_jours: number
  statut: 'en_retard' | 'mise_en_demeure' | 'contentieux'
}

export type RecouvrementData = {
  total_impaye: number
  total_penalites: number
  nb_lots_en_retard: number
  prescription_risks: PrescriptionRisk[]
  lots: LotEnRetard[]
}

const MOCK_RECOUVREMENT: RecouvrementData = {
  total_impaye: 12_450,
  total_penalites: 622.50,
  nb_lots_en_retard: 5,
  prescription_risks: [
    {
      coproprietaire_id: 3,
      coproprietaire_nom: 'Karim El Fassi',
      lot_numero: 'B-01',
      montant: 3200,
      date_origine: '2022-03-15',
      jours_restants: 215,
      severite: 'critical',
    },
    {
      coproprietaire_id: 7,
      coproprietaire_nom: 'Saïd Bennani',
      lot_numero: 'P-02',
      montant: 1100,
      date_origine: '2023-08-20',
      jours_restants: 668,
      severite: 'high',
    },
    {
      coproprietaire_id: 12,
      coproprietaire_nom: 'Nadia Berrada',
      lot_numero: 'A-04',
      montant: 850,
      date_origine: '2024-01-10',
      jours_restants: 1131,
      severite: 'medium',
    },
  ],
  lots: [
    { lot_id: 3, lot_numero: 'B-01', coproprietaire_nom: 'Karim El Fassi', montant_du: 3200, montant_penalites: 160, anciennete_jours: 1530, statut: 'contentieux' },
    { lot_id: 7, lot_numero: 'P-02', coproprietaire_nom: 'Saïd Bennani', montant_du: 1100, montant_penalites: 55, anciennete_jours: 1006, statut: 'mise_en_demeure' },
    { lot_id: 12, lot_numero: 'A-04', coproprietaire_nom: 'Nadia Berrada', montant_du: 850, montant_penalites: 42.50, anciennete_jours: 833, statut: 'en_retard' },
    { lot_id: 15, lot_numero: 'C-01', coproprietaire_nom: 'Imane Ouazzani', montant_du: 4200, montant_penalites: 210, anciennete_jours: 95, statut: 'en_retard' },
    { lot_id: 18, lot_numero: 'A-02', coproprietaire_nom: 'Yassine Tazi', montant_du: 3100, montant_penalites: 155, anciennete_jours: 47, statut: 'en_retard' },
  ],
}

export async function getRecouvrement(residenceId: number): Promise<RecouvrementData> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<RecouvrementData>>(
        `/gestionnaire/residences/${residenceId}/recouvrement`,
      )
      return res.data.data
    },
    MOCK_RECOUVREMENT,
  )
}

export async function sendMiseEnDemeure(paiementId: number): Promise<{ pdf_url: string }> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ pdf_url: string }>>(
        `/gestionnaire/paiements/${paiementId}/mise-en-demeure`,
      )
      return res.data.data
    },
    { pdf_url: `#mock-mise-en-demeure-${paiementId}` },
  )
}

// ─── Occupants (Art. 11 Loi 18-00) ────────────────────────────────────────────

export type OccupantType = 'proprietaire_occupant' | 'locataire' | 'usufruitier' | 'autre'

export type Occupant = {
  id: number
  lot_id: number
  coproprietaire_id?: number
  nom: string
  telephone?: string
  email?: string
  type: OccupantType
  date_debut: string
  date_fin?: string
  contact_urgence_nom?: string
  contact_urgence_telephone?: string
  notes?: string
}

export type CreateOccupantInput = Omit<Occupant, 'id'>

const MOCK_OCCUPANTS: Occupant[] = [
  { id: 1, lot_id: 1, nom: 'Hassan Benali',  telephone: '+212600000010', type: 'proprietaire_occupant', date_debut: '2020-01-01' },
  { id: 2, lot_id: 2, nom: 'Mohammed Tazi',  telephone: '+212600000020', type: 'locataire',             date_debut: '2024-09-01', date_fin: '2026-08-31' },
]

export async function getOccupants(lotId: number): Promise<Occupant[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ occupants: Occupant[] }>>(`/gestionnaire/lots/${lotId}/occupants`)
      return res.data.data.occupants
    },
    MOCK_OCCUPANTS.filter((o) => o.lot_id === lotId),
  )
}

/** Vue consolidée par résidence — toutes les occupants en cours. */
export async function getOccupantsByResidence(residenceId: number): Promise<Occupant[]> {
  return withMock(
    async () => {
      const res = await api.get<ApiEnvelope<{ occupants: Occupant[] }>>(
        `/gestionnaire/residences/${residenceId}/occupants`,
      )
      return res.data.data.occupants
    },
    MOCK_OCCUPANTS,
  )
}

export async function createOccupant(lotId: number, input: CreateOccupantInput): Promise<Occupant> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ occupant: Occupant }>>(
        `/gestionnaire/lots/${lotId}/occupants`, input,
      )
      return res.data.data.occupant
    },
    { id: Date.now(), ...input, lot_id: lotId },
  )
}

export async function updateOccupant(occupantId: number, patch: Partial<CreateOccupantInput>): Promise<Occupant> {
  return withMock(
    async () => {
      const res = await api.put<ApiEnvelope<{ occupant: Occupant }>>(
        `/gestionnaire/occupants/${occupantId}`, patch,
      )
      return res.data.data.occupant
    },
    { id: occupantId, lot_id: 0, nom: '', type: 'autre', date_debut: '', ...patch },
  )
}

export async function deleteOccupant(occupantId: number): Promise<void> {
  return withMock(
    async () => {
      await api.delete(`/gestionnaire/occupants/${occupantId}`)
    },
    undefined,
  )
}

// ─── Annexes — endpoint per-num data ──────────────────────────────────────────

/** Fetch raw annexe payload from backend (for 10, 13-1, 13-2). The frontend uses
 *  these to feed the jsPDF generators. Other annexe nums return 400 from backend
 *  until phase 2 lands. */
export async function getAnnexeData<T = unknown>(
  residenceId: number, annexeNum: string, exercice: number,
): Promise<T> {
  const res = await api.get<ApiEnvelope<T>>(
    `/gestionnaire/residences/${residenceId}/annexes/${annexeNum}`,
    { params: { exercice } },
  )
  return res.data.data
}

// ─── Compliance task actions ──────────────────────────────────────────────────

export async function completeComplianceTask(taskId: number): Promise<ComplianceTask> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ task: ComplianceTask }>>(
        `/gestionnaire/compliance-tasks/${taskId}/complete`,
      )
      return res.data.data.task
    },
    {
      id: taskId, phase: 'operations_mensuelles', task_key: '', task_label: '',
      status: 'done', completed_at: new Date().toISOString(),
    },
  )
}

export async function skipComplianceTask(taskId: number, reason: string): Promise<ComplianceTask> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ task: ComplianceTask }>>(
        `/gestionnaire/compliance-tasks/${taskId}/skip`, { reason },
      )
      return res.data.data.task
    },
    {
      id: taskId, phase: 'operations_mensuelles', task_key: '', task_label: '',
      status: 'skipped',
    },
  )
}

// ─── Pénalités — batch recalc ─────────────────────────────────────────────────

export async function recalculatePenalties(residenceId: number): Promise<{
  recalculated: number; total_penalty_amount: number
}> {
  return withMock(
    async () => {
      const res = await api.post<ApiEnvelope<{ recalculated: number; total_penalty_amount: number }>>(
        `/gestionnaire/residences/${residenceId}/penalties/recalculate`,
      )
      return res.data.data
    },
    { recalculated: 0, total_penalty_amount: 0 },
  )
}

// ─── Audit trail — export CSV/JSON ────────────────────────────────────────────

export async function exportAuditLogs(
  format: 'csv' | 'json' = 'csv',
  filters: AuditFilters = {},
): Promise<Blob> {
  const res = await api.get('/gestionnaire/audit-logs/export', {
    params: { format, ...filters },
    responseType: 'blob',
  })
  return res.data as Blob
}
