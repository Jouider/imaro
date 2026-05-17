import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Wallet,
  AlertCircle,
  Plus,
  Download,
  Sparkles,
  BookOpen,
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  getExercicesComptabilite,
  getComptaDashboard,
  getJournal,
  getGrandLivre,
  getBalance,
  getDepenses,
  storeDepense,
  deleteDepense,
  storeEncaissement,
  importFactureIa,
  cloturerExercice,
  getComptesPcg,
  type ExerciceComptable,
  type EcritureComptable,
  type Depense,
  type GrandLivreCompte,
  type ImportIaResult,
} from '@/services/comptabilite.service'
import { getResidences } from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const IMARO_PRIMARY = '#1B4F72'
const IMARO_ACCENT = '#E67E22'

const TYPE_BADGE_STYLES: Record<EcritureComptable['type'], string> = {
  depense: 'bg-red-100 text-red-700',
  encaissement: 'bg-green-100 text-green-700',
  virement: 'bg-blue-100 text-blue-700',
  cloture: 'bg-gray-100 text-gray-600',
  report: 'bg-purple-100 text-purple-700',
}

const MODE_BADGE_STYLES: Record<Depense['mode_paiement'], string> = {
  virement: 'bg-blue-100 text-blue-700',
  cheque: 'bg-purple-100 text-purple-700',
  especes: 'bg-green-100 text-green-700',
  cb: 'bg-orange-100 text-orange-700',
  prelevement: 'bg-cyan-100 text-cyan-700',
  autre: 'bg-gray-100 text-gray-600',
}

const PIE_COLORS = [IMARO_PRIMARY, IMARO_ACCENT, '#27AE60', '#8E44AD', '#95A5A6', '#E74C3C']

const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'dashboard' | 'journal' | 'grandLivre' | 'depenses' | 'cloture'

type DepenseFormState = {
  titre: string
  montant: string
  date: string
  compte_charge: string
  mode_paiement: string
  prestataire: string
  justificatif: File | null
}

type EncaisserFormState = {
  step: 1 | 2
  search: string
  selectedCoproId: number | null
  selectedNom: string
  selectedLot: string
  selectedSolde: number
  montant: string
  date: string
  mode_paiement: 'virement' | 'cheque' | 'especes'
  compte_destination: '5121' | '5122' | '5161'
  reference_cheque: string
}

// Mock créances for encaisser step 1
const MOCK_CREANCES = [
  { id: 2, nom: 'Fatima Chraibi', lot: 'A-02', solde: 720 },
  { id: 3, nom: 'Karim El Fassi', lot: 'P-01', solde: 144 },
  { id: 4, nom: 'Nadia Cherkaoui', lot: 'A-03', solde: 810 },
  { id: 5, nom: 'Omar Bensalem', lot: 'A-04', solde: 900 },
  { id: 6, nom: 'Youssef Alami', lot: 'C-01', solde: 360 },
]

const EMPTY_DEPENSE_FORM: DepenseFormState = {
  titre: '',
  montant: '',
  date: new Date().toISOString().slice(0, 10),
  compte_charge: '',
  mode_paiement: 'virement',
  prestataire: '',
  justificatif: null,
}

const EMPTY_ENCAISSER_FORM: EncaisserFormState = {
  step: 1,
  search: '',
  selectedCoproId: null,
  selectedNom: '',
  selectedLot: '',
  selectedSolde: 0,
  montant: '',
  date: new Date().toISOString().slice(0, 10),
  mode_paiement: 'virement',
  compte_destination: '5121',
  reference_cheque: '',
}

// ─── NouvelleDepenseModal ─────────────────────────────────────────────────────

type NouvelleDepenseModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  exerciceId: number
  exerciceClos: boolean
}

function NouvelleDepenseModal({
  open,
  onOpenChange,
  exerciceId,
  exerciceClos,
}: NouvelleDepenseModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<DepenseFormState>(EMPTY_DEPENSE_FORM)
  const [showIa, setShowIa] = useState(false)
  const [iaFile, setIaFile] = useState<File | null>(null)
  const [iaResult, setIaResult] = useState<ImportIaResult | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [compteSearch, setCompteSearch] = useState('')

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: getComptesPcg,
  })

  const compteClasse6 = comptes.filter(
    (c) => c.classe === 6 && c.libelle.toLowerCase().includes(compteSearch.toLowerCase()),
  )

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('titre', form.titre)
      fd.append('montant', form.montant)
      fd.append('date', form.date)
      fd.append('compte_charge', form.compte_charge)
      fd.append('mode_paiement', form.mode_paiement)
      if (form.prestataire) fd.append('prestataire', form.prestataire)
      if (form.justificatif) fd.append('justificatif', form.justificatif)
      return storeDepense(exerciceId, fd)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses', exerciceId] })
      void qc.invalidateQueries({ queryKey: ['journal', exerciceId] })
      void qc.invalidateQueries({ queryKey: ['dashboard-compta', exerciceId] })
      onOpenChange(false)
      setForm(EMPTY_DEPENSE_FORM)
      setIaResult(null)
      setShowIa(false)
      toast.success(t('gestionnaire.comptabilite.depenses.add', { defaultValue: 'Dépense ajoutée' }))
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  async function handleAnalyseIa() {
    if (!iaFile) return
    setIaLoading(true)
    try {
      const result = await importFactureIa(exerciceId, iaFile)
      setIaResult(result)
    } catch {
      toast.error('Erreur analyse IA')
    } finally {
      setIaLoading(false)
    }
  }

  function handleUtiliserIa() {
    if (!iaResult) return
    setForm((f) => ({
      ...f,
      titre: iaResult.titre,
      montant: String(iaResult.montant),
      date: iaResult.date,
      compte_charge: iaResult.compte_charge_suggere,
      prestataire: iaResult.fournisseur ?? f.prestataire,
    }))
    setShowIa(false)
  }

  const isValid = form.titre.trim() && form.montant && form.date && form.compte_charge

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {t('gestionnaire.comptabilite.depenses.add', { defaultValue: 'Nouvelle dépense' })}
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIa((v) => !v)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="size-3.5 text-purple-500" />
              {t('gestionnaire.comptabilite.depenses.form.importIa', { defaultValue: 'Import IA' })}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* IA section */}
          {showIa && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
              <p className="mb-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                {t('gestionnaire.comptabilite.depenses.form.importIa', { defaultValue: 'Import IA' })} — Analysez une facture automatiquement
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setIaFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!iaFile || iaLoading}
                  onClick={() => void handleAnalyseIa()}
                >
                  {iaLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    t('gestionnaire.comptabilite.depenses.form.analyser', { defaultValue: 'Analyser' })
                  )}
                </Button>
              </div>
              {iaResult && (
                <div className="mt-2 space-y-1 rounded border bg-white p-2 text-xs dark:bg-card">
                  <p>
                    <strong>{t('gestionnaire.comptabilite.depenses.form.titre', { defaultValue: 'Titre' })}:</strong> {iaResult.titre}
                  </p>
                  <p>
                    <strong>Montant:</strong> {fmt.format(iaResult.montant)} DH
                  </p>
                  <p>
                    <strong>Compte suggéré:</strong> {iaResult.compte_charge_suggere}
                  </p>
                  <p>
                    <strong>{t('gestionnaire.comptabilite.depenses.form.confiance', { defaultValue: 'Confiance' })}:</strong>{' '}
                    <span
                      className={cn(
                        'font-medium',
                        iaResult.confiance === 'haute'
                          ? 'text-green-600'
                          : iaResult.confiance === 'moyenne'
                            ? 'text-orange-600'
                            : 'text-red-600',
                      )}
                    >
                      {iaResult.confiance}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUtiliserIa}
                    className="mt-1"
                  >
                    {t('gestionnaire.comptabilite.depenses.form.utiliser', { defaultValue: 'Utiliser ces données' })}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>{t('gestionnaire.comptabilite.depenses.form.titre', { defaultValue: 'Titre' })}</Label>
            <Input
              value={form.titre}
              onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
              placeholder="Gardiennage Juin 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('gestionnaire.comptabilite.depenses.form.montant', { defaultValue: 'Montant (MAD)' })}</Label>
              <Input
                type="number"
                value={form.montant}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                placeholder="3500"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('gestionnaire.comptabilite.depenses.form.date', { defaultValue: 'Date' })}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('gestionnaire.comptabilite.depenses.form.compte', { defaultValue: 'Compte de charge' })}</Label>
            <Input
              value={compteSearch}
              onChange={(e) => setCompteSearch(e.target.value)}
              placeholder="Rechercher un compte..."
              className="mb-1"
            />
            <Select
              value={form.compte_charge}
              onValueChange={(v) => setForm((f) => ({ ...f, compte_charge: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un compte..." />
              </SelectTrigger>
              <SelectContent>
                {compteClasse6.map((c) => (
                  <SelectItem key={c.numero} value={c.numero}>
                    {c.numero} — {c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('gestionnaire.comptabilite.depenses.form.mode', { defaultValue: 'Mode de paiement' })}</Label>
            <Select
              value={form.mode_paiement}
              onValueChange={(v) => setForm((f) => ({ ...f, mode_paiement: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre'] as const).map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`gestionnaire.comptabilite.depenses.modes.${m}`, { defaultValue: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('gestionnaire.comptabilite.depenses.form.prestataire', { defaultValue: 'Prestataire (optionnel)' })}</Label>
            <Input
              value={form.prestataire}
              onChange={(e) => setForm((f) => ({ ...f, prestataire: e.target.value }))}
              placeholder="Nom du prestataire"
            />
          </div>

          <div className="space-y-1">
            <Label>{t('gestionnaire.comptabilite.depenses.form.justificatif', { defaultValue: 'Pièce justificative' })}</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) =>
                setForm((f) => ({ ...f, justificatif: e.target.files?.[0] ?? null }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending || exerciceClos}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending || exerciceClos}
          >
            {mutation.isPending ? t('actions.loading') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── EncaisserModal ───────────────────────────────────────────────────────────

type EncaisserModalProps = {
  open: boolean
  onOpenChange: (o: boolean) => void
  exerciceId: number
}

function EncaisserModal({ open, onOpenChange, exerciceId }: EncaisserModalProps) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<EncaisserFormState>(EMPTY_ENCAISSER_FORM)

  const filteredCreances = MOCK_CREANCES.filter(
    (c) =>
      c.nom.toLowerCase().includes(form.search.toLowerCase()) ||
      c.lot.toLowerCase().includes(form.search.toLowerCase()),
  )

  const mutation = useMutation({
    mutationFn: () =>
      storeEncaissement(exerciceId, {
        coproprietaire_id: form.selectedCoproId ?? 0,
        montant: Number(form.montant),
        date: form.date,
        mode_paiement: form.mode_paiement,
        compte_destination: form.compte_destination,
        reference_cheque: form.mode_paiement === 'cheque' ? form.reference_cheque : undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['encaissements', exerciceId] })
      void qc.invalidateQueries({ queryKey: ['journal', exerciceId] })
      void qc.invalidateQueries({ queryKey: ['dashboard-compta', exerciceId] })
      onOpenChange(false)
      setForm(EMPTY_ENCAISSER_FORM)
      toast.success(t('gestionnaire.comptabilite.encaissement.title', { defaultValue: 'Encaissement enregistré' }))
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })

  function selectCreance(c: (typeof MOCK_CREANCES)[number]) {
    setForm((f) => ({
      ...f,
      step: 2,
      selectedCoproId: c.id,
      selectedNom: c.nom,
      selectedLot: c.lot,
      selectedSolde: c.solde,
      montant: String(c.solde),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.comptabilite.encaissement.title', { defaultValue: 'Encaisser un paiement' })}
          </DialogTitle>
        </DialogHeader>

        {form.step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {t('gestionnaire.comptabilite.encaissement.step1', { defaultValue: 'Sélectionner créance' })}
            </p>
            <Input
              value={form.search}
              onChange={(e) => setForm((f) => ({ ...f, search: e.target.value }))}
              placeholder={t('gestionnaire.comptabilite.encaissement.recherche', {
                defaultValue: 'Rechercher copropriétaire ou N° lot',
              })}
            />
            <div className="max-h-60 overflow-y-auto rounded-lg border">
              {filteredCreances.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Aucune créance</p>
              ) : (
                filteredCreances.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCreance(c)}
                    className="flex w-full items-center justify-between border-b px-4 py-3 text-sm transition-colors hover:bg-muted last:border-0"
                  >
                    <div className="text-left">
                      <p className="font-medium">{c.nom}</p>
                      <p className="text-xs text-muted-foreground">Lot {c.lot}</p>
                    </div>
                    <span className="font-semibold text-red-600">{fmt.format(c.solde)} DH</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="font-medium">{form.selectedNom}</p>
              <p className="text-sm text-muted-foreground">Lot {form.selectedLot}</p>
              <p className="mt-1 text-sm">
                {t('gestionnaire.comptabilite.encaissement.soldeImpaye', { defaultValue: 'Solde impayé' })}:{' '}
                <span className="font-semibold text-red-600">{fmt.format(form.selectedSolde)} DH</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.comptabilite.encaissement.montant', { defaultValue: 'Montant' })}</Label>
                <Input
                  type="number"
                  value={form.montant}
                  onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.comptabilite.encaissement.date', { defaultValue: 'Date' })}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('gestionnaire.comptabilite.encaissement.mode', { defaultValue: 'Mode de paiement' })}</Label>
              <Select
                value={form.mode_paiement}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, mode_paiement: v as EncaisserFormState['mode_paiement'] }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">
                    {t('gestionnaire.comptabilite.depenses.modes.virement', { defaultValue: 'Virement' })}
                  </SelectItem>
                  <SelectItem value="cheque">
                    {t('gestionnaire.comptabilite.depenses.modes.cheque', { defaultValue: 'Chèque' })}
                  </SelectItem>
                  <SelectItem value="especes">
                    {t('gestionnaire.comptabilite.depenses.modes.especes', { defaultValue: 'Espèces' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t('gestionnaire.comptabilite.encaissement.compteDestination', { defaultValue: 'Compte destination' })}</Label>
              <Select
                value={form.compte_destination}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, compte_destination: v as EncaisserFormState['compte_destination'] }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5121">
                    {t('gestionnaire.comptabilite.encaissement.comptes.5121', { defaultValue: 'Banque principale (5121)' })}
                  </SelectItem>
                  <SelectItem value="5122">
                    {t('gestionnaire.comptabilite.encaissement.comptes.5122', { defaultValue: 'Compte chèques (5122)' })}
                  </SelectItem>
                  <SelectItem value="5161">
                    {t('gestionnaire.comptabilite.encaissement.comptes.5161', { defaultValue: 'Caisse (5161)' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.mode_paiement === 'cheque' && (
              <div className="space-y-1">
                <Label>{t('gestionnaire.comptabilite.encaissement.refCheque', { defaultValue: 'Référence chèque' })}</Label>
                <Input
                  value={form.reference_cheque}
                  onChange={(e) => setForm((f) => ({ ...f, reference_cheque: e.target.value }))}
                  placeholder="CHQ-XXXXX"
                />
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, step: 1 }))}
              className="text-xs text-muted-foreground"
            >
              ← Retour
            </Button>
          </div>
        )}

        {form.step === 2 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!form.montant || mutation.isPending}
            >
              {mutation.isPending ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── ExportDropdown ───────────────────────────────────────────────────────────

function ExportDropdown() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const items = [
    { icon: '📊', label: t('gestionnaire.comptabilite.export.excelJournal', { defaultValue: 'Excel — Journal complet' }) },
    { icon: '📊', label: t('gestionnaire.comptabilite.export.excelGrandLivre', { defaultValue: 'Excel — Grand-Livre' }) },
    { icon: '📋', label: t('gestionnaire.comptabilite.export.sageFec', { defaultValue: 'Sage FEC' }) },
    { icon: '📄', label: t('gestionnaire.comptabilite.export.pdfJournal', { defaultValue: 'PDF — Journal' }) },
    { icon: '📄', label: t('gestionnaire.comptabilite.export.pdfBalance', { defaultValue: 'PDF — Balance' }) },
  ]

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Download className="me-1.5 size-4" />
        {t('gestionnaire.comptabilite.export.title', { defaultValue: 'Exporter' })}
        <ChevronDown className="ms-1 size-3.5" />
      </Button>
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute end-0 top-full z-20 mt-1 w-56 rounded-lg border bg-white p-1 shadow-lg dark:bg-card">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false)
                  toast.success('Export en cours...')
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Tableau de bord ─────────────────────────────────────────────────────

function TabDashboard({ exerciceId }: { exerciceId: number }) {
  const { t } = useTranslation()

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard-compta', exerciceId],
    queryFn: () => getComptaDashboard(exerciceId),
  })

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dash) return null

  const kpiFmt = (v: number) => `${fmt.format(v)} DH`

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<TrendingUp className="size-5" />}
          value={kpiFmt(dash.produits)}
          label={t('gestionnaire.comptabilite.kpi.produits', { defaultValue: 'Produits' })}
          className="border-green-200"
        />
        <KpiCard
          icon={<TrendingDown className="size-5" />}
          value={kpiFmt(dash.charges)}
          label={t('gestionnaire.comptabilite.kpi.charges', { defaultValue: 'Charges' })}
          className="border-red-200"
        />
        <KpiCard
          icon={<BarChart2 className="size-5" />}
          value={kpiFmt(dash.resultat)}
          label={t('gestionnaire.comptabilite.kpi.resultat', { defaultValue: 'Résultat net' })}
          className={dash.resultat >= 0 ? 'border-blue-200' : 'border-red-300'}
        />
        <KpiCard
          icon={<Wallet className="size-5" />}
          value={kpiFmt(dash.tresorerie)}
          label={t('gestionnaire.comptabilite.kpi.tresorerie', { defaultValue: 'Trésorerie' })}
          className="border-sky-200"
        />
        <KpiCard
          icon={<AlertCircle className="size-5" />}
          value={kpiFmt(dash.creances)}
          label={t('gestionnaire.comptabilite.kpi.creances', { defaultValue: 'Créances' })}
          className="border-orange-200"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('gestionnaire.comptabilite.tabs.dashboard', { defaultValue: 'Produits vs Charges' })} — 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dash.evolution} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => {
                    const n = typeof v === 'number' ? v : 0
                    return `${fmt.format(n)} DH`
                  }}
                />
                <Legend />
                <Bar
                  dataKey="produits"
                  fill={IMARO_PRIMARY}
                  name={t('gestionnaire.comptabilite.kpi.produits', { defaultValue: 'Produits' })}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="charges"
                  fill={IMARO_ACCENT}
                  name={t('gestionnaire.comptabilite.kpi.charges', { defaultValue: 'Charges' })}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('gestionnaire.comptabilite.kpi.charges', { defaultValue: 'Répartition des charges' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dash.charges_par_categorie}
                  dataKey="montant"
                  nameKey="categorie"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={false}
                >
                  {dash.charges_par_categorie.map((entry, i) => (
                    <Cell key={entry.categorie} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => {
                    const n = typeof v === 'number' ? v : 0
                    return [`${fmt.format(n)} DH`, String(name)]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trésorerie detail + recouvrement */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('gestionnaire.comptabilite.tresorerie.title', { defaultValue: 'Détail trésorerie' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Banque 5121 */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  🏦 {t('gestionnaire.comptabilite.tresorerie.banque', { defaultValue: 'Banques (5121)' })}
                </p>
                <p className="text-xs text-muted-foreground">{fmt.format(dash.banque_5121)} DH</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="text-xs">
                  {t('gestionnaire.comptabilite.tresorerie.depot', { defaultValue: 'Dépôt' })}
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  {t('gestionnaire.comptabilite.tresorerie.retrait', { defaultValue: 'Retrait' })}
                </Button>
              </div>
            </div>
            {/* Cheques 5122 */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  📄 {t('gestionnaire.comptabilite.tresorerie.cheque', { defaultValue: 'Chèques (5122)' })}
                </p>
                <p className="text-xs text-muted-foreground">{fmt.format(dash.cheque_5122)} DH</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                {t('gestionnaire.comptabilite.tresorerie.remise', { defaultValue: 'Remise' })}
              </Button>
            </div>
            {/* Caisse 5161 */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  💵 {t('gestionnaire.comptabilite.tresorerie.caisse', { defaultValue: 'Caisse (5161)' })}
                </p>
                <p className="text-xs text-muted-foreground">{fmt.format(dash.caisse_5161)} DH</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="text-xs">Entrée</Button>
                <Button variant="outline" size="sm" className="text-xs">Sortie</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicateurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Taux recouvrement */}
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t('gestionnaire.comptabilite.recouvrement', { defaultValue: 'Taux de recouvrement' })}</span>
                <span className="font-semibold">{dash.taux_recouvrement}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--color-imaro-primary)]"
                  style={{ width: `${dash.taux_recouvrement}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{dash.taux_recouvrement}% des charges recouvrées</p>
            </div>

            {/* Couverture trésorerie */}
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-sm text-muted-foreground">
                {t('gestionnaire.comptabilite.couverture', { defaultValue: 'Couverture trésorerie' })}
              </p>
              <p className="text-2xl font-bold text-[var(--color-imaro-primary)]">
                {dash.couverture_tresorerie.toFixed(1)}{' '}
                <span className="text-base font-normal text-muted-foreground">
                  {t('gestionnaire.comptabilite.mois', { defaultValue: 'mois' })}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Journal ─────────────────────────────────────────────────────────────

function TabJournal({ exerciceId }: { exerciceId: number }) {
  const { t } = useTranslation()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')

  const { data: ecritures = [], isLoading } = useQuery({
    queryKey: ['journal', exerciceId, from, to, search],
    queryFn: () =>
      getJournal(exerciceId, {
        from: from || undefined,
        to: to || undefined,
        search: search || undefined,
      }),
  })

  const totalDebit = ecritures.reduce((s, e) => s + e.debit, 0)
  const totalCredit = ecritures.reduce((s, e) => s + e.credit, 0)

  const columns: Column<EcritureComptable>[] = [
    {
      key: 'date',
      header: t('gestionnaire.comptabilite.journal.date', { defaultValue: 'Date' }),
      sortable: true,
      renderCell: (r) => r.date.slice(0, 10),
    },
    {
      key: 'numero_compte',
      header: t('gestionnaire.comptabilite.journal.compte', { defaultValue: 'Compte' }),
      renderCell: (r) => (
        <span className="font-mono text-sm">
          {r.numero_compte} <span className="font-sans text-muted-foreground">— {r.libelle_compte}</span>
        </span>
      ),
    },
    {
      key: 'description',
      header: t('gestionnaire.comptabilite.journal.description', { defaultValue: 'Description' }),
      renderCell: (r) => (
        <span className="max-w-[220px] truncate text-sm" title={r.description}>
          {r.description}
        </span>
      ),
    },
    {
      key: 'type',
      header: t('gestionnaire.comptabilite.journal.type', { defaultValue: 'Type' }),
      renderCell: (r) => {
        const cls = TYPE_BADGE_STYLES[r.type]
        const label = t(`gestionnaire.comptabilite.journal.types.${r.type}`, { defaultValue: r.type })
        return <Badge className={`${cls} border-0`}>{label}</Badge>
      },
    },
    {
      key: 'debit',
      header: t('gestionnaire.comptabilite.journal.debit', { defaultValue: 'Débit' }),
      sortable: true,
      renderCell: (r) =>
        r.debit > 0 ? <MontantDisplay value={r.debit} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'credit',
      header: t('gestionnaire.comptabilite.journal.credit', { defaultValue: 'Crédit' }),
      sortable: true,
      renderCell: (r) =>
        r.credit > 0 ? (
          <MontantDisplay value={r.credit} className="text-green-700" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'piece_justificative',
      header: t('gestionnaire.comptabilite.journal.piece', { defaultValue: 'Pièce' }),
      renderCell: (r) =>
        r.piece_justificative ? (
          <a
            href={`/storage/${r.piece_justificative}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Download className="size-3.5" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Du</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Au</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
          />
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-48"
        />
      </div>

      <DataTable
        data={ecritures}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        pageSize={15}
        emptyIcon={<BookOpen className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.comptabilite.journal.titre', { defaultValue: 'Aucune écriture' })}
      />

      {/* Footer totals */}
      <div className="flex justify-end gap-6 rounded-lg border bg-muted/30 px-4 py-2 text-sm font-medium">
        <span>
          {t('gestionnaire.comptabilite.journal.totalDebit', { defaultValue: 'Total débit' })}:{' '}
          <MontantDisplay value={totalDebit} />
        </span>
        <span>
          {t('gestionnaire.comptabilite.journal.totalCredit', { defaultValue: 'Total crédit' })}:{' '}
          <MontantDisplay value={totalCredit} className="text-green-700" />
        </span>
      </div>
    </div>
  )
}

// ─── Tab: Grand-Livre ─────────────────────────────────────────────────────────

type GrandLivreLigne = GrandLivreCompte['lignes'][number]

function TabGrandLivre({ exerciceId }: { exerciceId: number }) {
  const { t } = useTranslation()
  const [selectedCompte, setSelectedCompte] = useState<string>('')
  const [compteSearch, setCompteSearch] = useState('')

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: getComptesPcg,
  })

  const { data: grandLivre, isLoading } = useQuery({
    queryKey: ['grand-livre', exerciceId, selectedCompte],
    queryFn: () => getGrandLivre(exerciceId, selectedCompte),
    enabled: !!selectedCompte,
  })

  const filteredComptes = comptes.filter(
    (c) =>
      c.numero.includes(compteSearch) ||
      c.libelle.toLowerCase().includes(compteSearch.toLowerCase()),
  )

  const glColumns: Column<GrandLivreLigne>[] = [
    {
      key: 'date',
      header: t('gestionnaire.comptabilite.journal.date', { defaultValue: 'Date' }),
      sortable: true,
      renderCell: (r) => r.date.slice(0, 10),
    },
    {
      key: 'description',
      header: t('gestionnaire.comptabilite.journal.description', { defaultValue: 'Description' }),
      renderCell: (r) => (
        <span className="max-w-[240px] truncate text-sm">{r.description}</span>
      ),
    },
    {
      key: 'debit',
      header: t('gestionnaire.comptabilite.journal.debit', { defaultValue: 'Débit' }),
      sortable: true,
      renderCell: (r) =>
        r.debit > 0 ? <MontantDisplay value={r.debit} /> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'credit',
      header: t('gestionnaire.comptabilite.journal.credit', { defaultValue: 'Crédit' }),
      sortable: true,
      renderCell: (r) =>
        r.credit > 0 ? (
          <MontantDisplay value={r.credit} className="text-green-700" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'solde',
      header: 'Solde',
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.solde} colorize />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Compte selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>{t('gestionnaire.comptabilite.grandLivre.title', { defaultValue: 'Compte PCG' })}</Label>
          <Input
            value={compteSearch}
            onChange={(e) => setCompteSearch(e.target.value)}
            placeholder="Filtrer les comptes..."
            className="mb-1 w-52"
          />
          <Select value={selectedCompte} onValueChange={setSelectedCompte}>
            <SelectTrigger className="w-72">
              <SelectValue
                placeholder={t('gestionnaire.comptabilite.grandLivre.selectCompte', {
                  defaultValue: 'Sélectionner un compte...',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {filteredComptes.map((c) => (
                <SelectItem key={c.numero} value={c.numero}>
                  {c.numero} — {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedCompte ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.comptabilite.grandLivre.hint', {
              defaultValue: 'Sélectionnez un compte PCG pour afficher le détail des écritures.',
            })}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : grandLivre ? (
        <div className="space-y-3">
          {/* Header card */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="font-semibold">
              {grandLivre.numero} — {grandLivre.libelle}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('gestionnaire.comptabilite.grandLivre.soldeOuverture', { defaultValue: 'Solde d\'ouverture' })}:{' '}
              <MontantDisplay value={grandLivre.solde_ouverture} />
            </p>
          </div>

          <DataTable
            data={grandLivre.lignes}
            columns={glColumns}
            rowKey="id"
            pageSize={15}
            emptyTitle="Aucune écriture pour ce compte"
          />

          {/* Footer */}
          <div className="flex justify-end rounded-lg border bg-muted/30 px-4 py-2 text-sm font-bold">
            {t('gestionnaire.comptabilite.grandLivre.soldeFinal', { defaultValue: 'Solde final' })}:{' '}
            <MontantDisplay value={grandLivre.solde_final} className="ms-1" colorize />
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── Tab: Dépenses ────────────────────────────────────────────────────────────

function TabDepenses({
  exerciceId,
  exerciceClos,
  onOpenDepenseModal,
}: {
  exerciceId: number
  exerciceClos: boolean
  onOpenDepenseModal: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Depense | null>(null)

  const { data: depenses = [], isLoading } = useQuery({
    queryKey: ['depenses', exerciceId],
    queryFn: () => getDepenses(exerciceId),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDepense(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses', exerciceId] })
      void qc.invalidateQueries({ queryKey: ['journal', exerciceId] })
      setDeleteTarget(null)
      toast.success('Dépense supprimée')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const columns: Column<Depense>[] = [
    {
      key: 'date',
      header: t('gestionnaire.comptabilite.depenses.colDate', { defaultValue: 'Date' }),
      sortable: true,
      renderCell: (r) => r.date.slice(0, 10),
    },
    {
      key: 'titre',
      header: t('gestionnaire.comptabilite.depenses.colTitre', { defaultValue: 'Titre' }),
      sortable: true,
    },
    {
      key: 'compte_charge',
      header: t('gestionnaire.comptabilite.depenses.colCompte', { defaultValue: 'Compte' }),
      renderCell: (r) => (
        <span className="font-mono text-xs">{r.compte_charge} — {r.libelle_compte}</span>
      ),
    },
    {
      key: 'prestataire_nom',
      header: t('gestionnaire.comptabilite.depenses.colPrestataire', { defaultValue: 'Prestataire' }),
      renderCell: (r) => r.prestataire_nom ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'mode_paiement',
      header: t('gestionnaire.comptabilite.depenses.colMode', { defaultValue: 'Mode' }),
      renderCell: (r) => {
        const cls = MODE_BADGE_STYLES[r.mode_paiement]
        const label = t(`gestionnaire.comptabilite.depenses.modes.${r.mode_paiement}`, {
          defaultValue: r.mode_paiement,
        })
        return <Badge className={`${cls} border-0 text-xs`}>{label}</Badge>
      },
    },
    {
      key: 'montant',
      header: t('gestionnaire.comptabilite.depenses.colMontant', { defaultValue: 'Montant' }),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant} />,
    },
    {
      key: 'justificatif_path',
      header: 'Pièce',
      renderCell: (r) =>
        r.justificatif_path ? (
          <a
            href={`/storage/${r.justificatif_path}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            <Download className="size-4" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-10 text-right',
      renderCell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700"
          onClick={() => setDeleteTarget(r)}
          disabled={exerciceClos}
        >
          <Trash2 className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onOpenDepenseModal} disabled={exerciceClos}>
          <Plus className="me-1.5 size-4" />
          {t('gestionnaire.comptabilite.depenses.add', { defaultValue: 'Nouvelle dépense' })}
        </Button>
      </div>

      <DataTable
        data={depenses}
        columns={columns}
        rowKey="id"
        isLoading={isLoading}
        searchable
        exportable
        exportFilename="depenses"
        emptyIcon={<FileText className="size-12 text-muted-foreground" />}
        emptyTitle={t('gestionnaire.comptabilite.depenses.title', { defaultValue: 'Aucune dépense' })}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer la dépense"
        description={`La dépense "${deleteTarget?.titre ?? ''}" sera supprimée définitivement.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Tab: Clôture ─────────────────────────────────────────────────────────────

function TabCloture({
  exercice,
  exerciceId,
}: {
  exercice: ExerciceComptable | undefined
  exerciceId: number
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: ecritures = [] } = useQuery({
    queryKey: ['journal', exerciceId],
    queryFn: () => getJournal(exerciceId),
  })

  const { data: balance = [] } = useQuery({
    queryKey: ['balance', exerciceId],
    queryFn: () => getBalance(exerciceId),
  })

  const clotureMutation = useMutation({
    mutationFn: () => cloturerExercice(exerciceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['exercices-comptabilite'] })
      setConfirmOpen(false)
      toast.success('Exercice clôturé avec succès')
    },
    onError: () => toast.error('Erreur lors de la clôture'),
  })

  const totalDebit = ecritures.reduce((s, e) => s + e.debit, 0)
  const totalCredit = ecritures.reduce((s, e) => s + e.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const hasClasse6 = balance.some((b) => b.classe === 6 && b.total_debit > 0)
  const hasClasse7 = balance.some((b) => b.classe === 7 && b.total_credit > 0)
  const hasEcritures = ecritures.length > 0
  const allChecksPass = isBalanced && hasClasse6 && hasClasse7 && hasEcritures

  if (exercice?.statut === 'clos') {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-12 text-green-600" />
            <p className="text-lg font-semibold text-green-800 dark:text-green-200">
              {t('gestionnaire.comptabilite.cloture.already_clos', { defaultValue: 'Exercice clôturé' })}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('gestionnaire.comptabilite.cloture.clos_msg', { defaultValue: 'Cet exercice a été clôturé le' })}{' '}
              <strong>{exercice.date_cloture ?? '—'}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
      {ok ? (
        <CheckCircle2 className="size-5 shrink-0 text-green-600" />
      ) : (
        <XCircle className="size-5 shrink-0 text-red-500" />
      )}
      <span className={cn('text-sm', ok ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('gestionnaire.comptabilite.cloture.checklist', { defaultValue: 'Checklist pré-clôture' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CheckItem
            ok={isBalanced}
            label={t('gestionnaire.comptabilite.cloture.equilibre', {
              defaultValue: 'Écritures équilibrées (Débit = Crédit)',
            })}
          />
          <CheckItem
            ok={hasClasse6}
            label={t('gestionnaire.comptabilite.cloture.classe6', {
              defaultValue: 'Comptes de charges (cl. 6) mouvementés',
            })}
          />
          <CheckItem
            ok={hasClasse7}
            label={t('gestionnaire.comptabilite.cloture.classe7', {
              defaultValue: 'Comptes de produits (cl. 7) mouvementés',
            })}
          />
          <CheckItem
            ok={hasEcritures}
            label={t('gestionnaire.comptabilite.cloture.hasEcritures', {
              defaultValue: 'Au moins une écriture enregistrée',
            })}
          />
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {t('gestionnaire.comptabilite.cloture.totalDebit', { defaultValue: 'Total Débit' })}
          </p>
          <MontantDisplay value={totalDebit} className="text-lg font-bold" />
        </div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {t('gestionnaire.comptabilite.cloture.totalCredit', { defaultValue: 'Total Crédit' })}
          </p>
          <MontantDisplay value={totalCredit} className="text-lg font-bold text-green-700" />
        </div>
      </div>

      {/* Warning */}
      <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
        ⚠️ {t('gestionnaire.comptabilite.cloture.warning', {
          defaultValue: 'Attention — après clôture, aucune écriture ne peut être modifiée.',
        })}
      </p>

      {/* Clôture button */}
      <Button
        className="w-full bg-[var(--color-imaro-primary)] text-white hover:bg-[#154066]"
        disabled={!allChecksPass || clotureMutation.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {t('gestionnaire.comptabilite.cloture.btn', { defaultValue: 'Clôturer l\'exercice' })}
      </Button>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('gestionnaire.comptabilite.cloture.confirmTitle', { defaultValue: 'Confirmer la clôture' })}
        description={t('gestionnaire.comptabilite.cloture.confirmMsg', {
          defaultValue: 'Cette action est irréversible. Toutes les écritures seront verrouillées. Continuer ?',
        })}
        confirmLabel={t('gestionnaire.comptabilite.cloture.btn', { defaultValue: 'Clôturer' })}
        variant="destructive"
        onConfirm={() => clotureMutation.mutate()}
        isLoading={clotureMutation.isPending}
      />
    </div>
  )
}

// ─── ComptabilitePage ─────────────────────────────────────────────────────────

export function ComptabilitePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [depenseModalOpen, setDepenseModalOpen] = useState(false)
  const [encaisserModalOpen, setEncaisserModalOpen] = useState(false)

  // Residence: default to 1 (Atlas Casablanca)
  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const [residenceId] = useState(1)

  const { data: exercices = [] } = useQuery({
    queryKey: ['exercices-comptabilite', residenceId],
    queryFn: () => getExercicesComptabilite(residenceId),
  })

  // Default to first open exercice, else first one
  const defaultExercice = exercices.find((e) => e.statut === 'ouvert') ?? exercices[0]
  const [selectedExerciceId, setSelectedExerciceId] = useState<number | null>(null)

  const exerciceId = selectedExerciceId ?? defaultExercice?.id ?? 1
  const currentExercice = exercices.find((e) => e.id === exerciceId)
  const exerciceClos = currentExercice?.statut === 'clos'

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'dashboard', label: t('gestionnaire.comptabilite.tabs.dashboard', { defaultValue: 'Tableau de bord' }) },
    { key: 'journal', label: t('gestionnaire.comptabilite.tabs.journal', { defaultValue: 'Journal' }) },
    { key: 'grandLivre', label: t('gestionnaire.comptabilite.tabs.grandLivre', { defaultValue: 'Grand-Livre' }) },
    { key: 'depenses', label: t('gestionnaire.comptabilite.tabs.depenses', { defaultValue: 'Dépenses' }) },
    { key: 'cloture', label: t('gestionnaire.comptabilite.tabs.cloture', { defaultValue: 'Clôture' }) },
  ]

  const pageTitle = useMemo(() => {
    const base = t('gestionnaire.comptabilite.title', { defaultValue: 'Comptabilité' })
    if (currentExercice) return `${base} — ${currentExercice.annee}`
    return base
  }, [t, currentExercice])

  return (
    <div className="p-6">
      <PageHeader
        title={pageTitle}
        subtitle={
          currentExercice
            ? `${t('gestionnaire.comptabilite.exercice', { defaultValue: 'Exercice' })} ${currentExercice.annee} — ${t(`gestionnaire.comptabilite.statut.${currentExercice.statut}`, { defaultValue: currentExercice.statut })}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setDepenseModalOpen(true)}
              disabled={exerciceClos}
            >
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.comptabilite.depenses.add', { defaultValue: 'Nouvelle dépense' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEncaisserModalOpen(true)}
              disabled={exerciceClos}
            >
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.comptabilite.encaissement.title', { defaultValue: 'Encaisser' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                setDepenseModalOpen(true)
              }}
              disabled={exerciceClos}
            >
              <Sparkles className="me-1.5 size-4" />
              {t('gestionnaire.comptabilite.depenses.form.importIa', { defaultValue: 'Import IA' })}
            </Button>
            <ExportDropdown />
          </div>
        }
      />

      {/* Exercice selector */}
      <div className="mb-6 flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">
          {t('gestionnaire.comptabilite.exercice', { defaultValue: 'Exercice' })} :
        </Label>
        <Select
          value={String(exerciceId)}
          onValueChange={(v) => setSelectedExerciceId(Number(v))}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exercices.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.annee}{' '}
                <span className="text-muted-foreground">
                  ({t(`gestionnaire.comptabilite.statut.${e.statut}`, { defaultValue: e.statut })})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Residence selector (for future multi-residence) */}
        {residences.length > 1 && (
          <Select value={String(residenceId)} onValueChange={() => {}}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {residences.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-[var(--color-imaro-primary)] text-[var(--color-imaro-primary)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <TabDashboard exerciceId={exerciceId} />}
      {activeTab === 'journal' && <TabJournal exerciceId={exerciceId} />}
      {activeTab === 'grandLivre' && <TabGrandLivre exerciceId={exerciceId} />}
      {activeTab === 'depenses' && (
        <TabDepenses
          exerciceId={exerciceId}
          exerciceClos={exerciceClos}
          onOpenDepenseModal={() => setDepenseModalOpen(true)}
        />
      )}
      {activeTab === 'cloture' && (
        <TabCloture exercice={currentExercice} exerciceId={exerciceId} />
      )}

      {/* Modals */}
      <NouvelleDepenseModal
        open={depenseModalOpen}
        onOpenChange={setDepenseModalOpen}
        exerciceId={exerciceId}
        exerciceClos={exerciceClos}
      />
      <EncaisserModal
        open={encaisserModalOpen}
        onOpenChange={setEncaisserModalOpen}
        exerciceId={exerciceId}
      />
    </div>
  )
}
