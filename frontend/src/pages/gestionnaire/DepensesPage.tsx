import { useState } from 'react'
import { AxiosError } from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Loader2,
  Receipt,
  Sparkles,
  Settings2,
  Download,
  Trash2,
  CheckCircle,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  getDepensesFinance,
  getDepensesStats,
  storeDepenseFinance,
  deleteDepenseFinance,
  importFactureIa,
  getModelesRecurrents,
  storeModeleRecurrent,
  toggleModeleRecurrent,
  approuverDepense,
  rejeterDepense,
  type DepenseFinance,
  type ImportIaDepense,
} from '@/services/depenses.service'
import { getComptesPcg } from '@/services/comptabilite.service'
import {
  getResidences,
  getExercices,
  type Exercice,
} from '@/services/gestionnaire.service'
import { useResidenceStore } from '@/stores/residenceStore'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

// ─── Colors ───────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  'var(--color-imaro-primary)',
  '#E67E22',
  '#27AE60',
  '#8E44AD',
  '#E74C3C',
  '#2ECC71',
]

const APPROBATION_CLS: Record<string, string> = {
  approuve: 'bg-green-100 text-green-800',
  en_attente: 'bg-orange-100 text-orange-800',
  rejete: 'bg-red-100 text-red-800',
}

// ─── NouvelleDepenseModal ─────────────────────────────────────────────────────

type DepenseFormState = {
  residence_id: string
  exercice_id: string
  titre: string
  montant: string
  date: string
  compte_charge: string
  mode_paiement: string
  prestataire: string
  justificatif: File | null
}

const EMPTY_FORM: DepenseFormState = {
  residence_id: '',
  exercice_id: '',
  titre: '',
  montant: '',
  date: new Date().toISOString().slice(0, 10),
  compte_charge: '',
  mode_paiement: 'virement',
  prestataire: '',
  justificatif: null,
}

/** Surface the backend's real error message instead of a generic toast. */
function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosError<{ message?: string }>
  return e?.response?.data?.message ?? fallback
}

function NouvelleDepenseModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<DepenseFormState>(EMPTY_FORM)
  const [iaFile, setIaFile] = useState<File | null>(null)
  const [iaResult, setIaResult] = useState<ImportIaDepense | null>(null)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaExpanded, setIaExpanded] = useState(false)

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: () => getComptesPcg(),
    enabled: open,
  })
  const compteClasse6 = comptes.filter((c) => c.classe === 6)

  // A dépense must be tied to a résidence + exercice (required by the API,
  // POST /gestionnaire/depenses-finance). Without them the backend rejects the
  // create with a 422 — the root cause of the "Erreur lors de la création".
  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
    enabled: open,
  })
  // Effective résidence = explicit choice, else auto-pick when there's only
  // one (derived, not stored — avoids set-state-in-effect).
  const residenceId =
    form.residence_id ||
    (residences.length === 1 ? String(residences[0].id) : '')

  const { data: exercices = [] } = useQuery({
    queryKey: ['exercices', residenceId],
    queryFn: () => getExercices(Number(residenceId)),
    enabled: open && !!residenceId,
  })

  // Effective exercice = explicit choice, else the active one (or the first).
  const activeExercice =
    exercices.find((e: Exercice) => e.statut === 'actif') ?? exercices[0]
  const exerciceId =
    form.exercice_id || (activeExercice ? String(activeExercice.id) : '')

  const storeMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('residence_id', residenceId)
      fd.append('exercice_id', exerciceId)
      fd.append('titre', form.titre)
      fd.append('montant', form.montant)
      fd.append('date', form.date)
      fd.append('compte_charge', form.compte_charge)
      fd.append('mode_paiement', form.mode_paiement)
      if (form.prestataire) fd.append('prestataire', form.prestataire)
      if (form.justificatif) fd.append('justificatif', form.justificatif)
      return storeDepenseFinance(fd)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses-finance'] })
      void qc.invalidateQueries({ queryKey: ['depenses-stats'] })
      toast.success(
        t('gestionnaire.depenses.saveSuccess', {
          defaultValue: 'Dépense enregistrée',
        }),
      )
      setForm(EMPTY_FORM)
      setIaResult(null)
      onOpenChange(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('common.saveError'))),
  })

  const handleAnalyseIa = async () => {
    if (!iaFile) return
    setIaLoading(true)
    try {
      const result = await importFactureIa(iaFile)
      setIaResult(result)
    } catch {
      toast.error(t('gestionnaire.depenses.analyzeError'))
    } finally {
      setIaLoading(false)
    }
  }

  const handleUseIaData = () => {
    if (!iaResult) return
    setForm((f) => ({
      ...f,
      titre: iaResult.titre,
      montant: String(iaResult.montant),
      date: iaResult.date,
      compte_charge: iaResult.compte_charge_suggere,
      prestataire: iaResult.fournisseur ?? '',
    }))
    setIaExpanded(false)
  }

  const montantNum = Number(form.montant) || 0
  const needsApproval = montantNum > 5000

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.depenses.add', {
              defaultValue: 'Ajouter une dépense',
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* IA Section */}
          <div className="rounded-lg border border-dashed border-muted-foreground/30">
            <button
              type="button"
              onClick={() => setIaExpanded((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="size-4 text-amber-500" />
              {t('gestionnaire.depenses.form.scanner', {
                defaultValue: "Analyser avec l'IA",
              })}
            </button>

            {iaExpanded && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setIaFile(e.target.files?.[0] ?? null)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyseIa}
                    disabled={!iaFile || iaLoading}
                  >
                    {iaLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Analyser'
                    )}
                  </Button>
                </div>

                {iaResult && (
                  <div className="rounded-md bg-muted/40 p-3 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{iaResult.titre}</span>
                      <Badge
                        className={cn(
                          'border-0 text-xs',
                          iaResult.confiance === 'haute'
                            ? 'bg-green-100 text-green-800'
                            : iaResult.confiance === 'moyenne'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800',
                        )}
                      >
                        {iaResult.confiance}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {iaResult.montant.toLocaleString('fr-MA')} MAD ·{' '}
                      {iaResult.date} · Compte {iaResult.compte_charge_suggere}
                    </p>
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleUseIaData}
                    >
                      {t('gestionnaire.depenses.form.utiliser', {
                        defaultValue: 'Utiliser ces données',
                      })}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {needsApproval && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <span className="mt-0.5">⚠</span>
              <span>
                {t('gestionnaire.depenses.form.seuilWarning', {
                  defaultValue:
                    'Cette dépense nécessite une approbation du conseil syndical',
                })}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('common.residence')}</Label>
              <Select
                value={residenceId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, residence_id: v, exercice_id: '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.selectResidence')} />
                </SelectTrigger>
                <SelectContent>
                  {residences.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('common.exercice')}</Label>
              <Select
                value={exerciceId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, exercice_id: v }))
                }
                disabled={!residenceId || exercices.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.selectExercice')} />
                </SelectTrigger>
                <SelectContent>
                  {exercices.map((e: Exercice) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.annee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              {t('gestionnaire.depenses.form.titre', { defaultValue: 'Titre' })}
            </Label>
            <Input
              value={form.titre}
              onChange={(e) =>
                setForm((f) => ({ ...f, titre: e.target.value }))
              }
              placeholder="Gardiennage Juin 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>
                {t('gestionnaire.depenses.form.montant', {
                  defaultValue: 'Montant (MAD)',
                })}
              </Label>
              <Input
                type="number"
                value={form.montant}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montant: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t('gestionnaire.depenses.form.date', { defaultValue: 'Date' })}
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>
              {t('gestionnaire.depenses.form.compte', {
                defaultValue: 'Compte de charge',
              })}
            </Label>
            <Select
              value={form.compte_charge}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, compte_charge: v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={t('gestionnaire.depenses.selectAccount')}
                />
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
            <Label>
              {t('gestionnaire.depenses.form.mode', {
                defaultValue: 'Mode de paiement',
              })}
            </Label>
            <Select
              value={form.mode_paiement}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, mode_paiement: v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    'virement',
                    'cheque',
                    'especes',
                    'cb',
                    'prelevement',
                    'autre',
                  ] as const
                ).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>
              {t('gestionnaire.depenses.form.prestataire', {
                defaultValue: 'Prestataire (optionnel)',
              })}
            </Label>
            <Input
              value={form.prestataire}
              onChange={(e) =>
                setForm((f) => ({ ...f, prestataire: e.target.value }))
              }
              placeholder={t('gestionnaire.depenses.beneficiaryPlaceholder')}
            />
          </div>

          <div className="space-y-1">
            <Label>
              {t('gestionnaire.depenses.form.justificatif', {
                defaultValue: 'Pièce justificative',
              })}
            </Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  justificatif: e.target.files?.[0] ?? null,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={storeMutation.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => storeMutation.mutate()}
            disabled={
              !residenceId ||
              !exerciceId ||
              !form.titre ||
              !form.montant ||
              !form.compte_charge ||
              storeMutation.isPending
            }
          >
            {storeMutation.isPending ? t('actions.loading') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ModèlesRecurrentsModal ───────────────────────────────────────────────────

function ModelesRecurrentsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [newModeleOpen, setNewModeleOpen] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    montant: '',
    compte_charge: '',
    prestataire_nom: '',
    frequence: 'mensuelle',
    jour_emission: '1',
    date_debut: new Date().toISOString().slice(0, 10),
    date_fin: '',
  })

  const { data: modeles = [], isLoading } = useQuery({
    queryKey: ['modeles-recurrents'],
    queryFn: () => getModelesRecurrents(),
    enabled: open,
  })

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: () => getComptesPcg(),
    enabled: open,
  })
  const compteClasse6 = comptes.filter((c) => c.classe === 6)

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleModeleRecurrent(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['modeles-recurrents'] }),
  })

  const storeMutation = useMutation({
    mutationFn: () =>
      storeModeleRecurrent({
        titre: form.titre,
        montant: Number(form.montant),
        compte_charge: form.compte_charge,
        prestataire_nom: form.prestataire_nom || null,
        frequence: form.frequence,
        jour_emission: Number(form.jour_emission),
        date_debut: form.date_debut,
        date_fin: form.date_fin || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['modeles-recurrents'] })
      setNewModeleOpen(false)
      toast.success(t('gestionnaire.depenses.toastModelCreated'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const FREQ_LABELS: Record<string, string> = {
    mensuelle: t('gestionnaire.depenses.recurrentModal.frequences.mensuelle', {
      defaultValue: 'Mensuelle',
    }),
    trimestrielle: t(
      'gestionnaire.depenses.recurrentModal.frequences.trimestrielle',
      { defaultValue: 'Trimestrielle' },
    ),
    semestrielle: t(
      'gestionnaire.depenses.recurrentModal.frequences.semestrielle',
      { defaultValue: 'Semestrielle' },
    ),
    annuelle: t('gestionnaire.depenses.recurrentModal.frequences.annuelle', {
      defaultValue: 'Annuelle',
    }),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {t('gestionnaire.depenses.recurrentModal.title', {
                defaultValue: 'Dépenses récurrentes',
              })}
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setNewModeleOpen(true)}
            >
              {t('gestionnaire.depenses.recurrentModal.nouveau', {
                defaultValue: 'Nouveau modèle',
              })}
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {modeles.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.titre}</span>
                    <Badge className="border-0 bg-blue-100 text-blue-800 text-xs">
                      {FREQ_LABELS[m.frequence] ?? m.frequence}
                    </Badge>
                    {!m.actif && (
                      <Badge className="border-0 bg-gray-100 text-gray-600 text-xs">
                        Inactif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <MontantDisplay value={m.montant} className="text-xs" />
                    {m.prestataire_nom && ` · ${m.prestataire_nom}`}
                    {' · '}
                    {t('gestionnaire.depenses.recurrentModal.prochaine', {
                      defaultValue: 'Prochaine',
                    })}{' '}
                    : {m.prochaine_emission}
                  </p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate(m.id)}
                  disabled={toggleMutation.isPending}
                  className="ml-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {m.actif ? (
                    <ToggleRight className="size-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="size-6" />
                  )}
                </button>
              </div>
            ))}
            {modeles.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('gestionnaire.depenses.noModele')}
              </p>
            )}
          </div>
        )}

        {/* New modele sub-form */}
        {newModeleOpen && (
          <div className="rounded-lg border border-dashed p-4 space-y-3 mt-4">
            <p className="text-sm font-medium">
              {t('gestionnaire.depenses.newModel')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Titre</Label>
                <Input
                  value={form.titre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titre: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('common.montantMad')}</Label>
                <Input
                  type="number"
                  value={form.montant}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, montant: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Compte PCG</Label>
              <Select
                value={form.compte_charge}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, compte_charge: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t('gestionnaire.depenses.compteCharge')}
                  />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  {t('gestionnaire.depenses.recurrentModal.jourEmission', {
                    defaultValue: "Jour d'émission",
                  })}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.jour_emission}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jour_emission: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.depenses.frequency')}</Label>
                <Select
                  value={form.frequence}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, frequence: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        'mensuelle',
                        'trimestrielle',
                        'semestrielle',
                        'annuelle',
                      ] as const
                    ).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('common.startDate')}</Label>
                <Input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date_debut: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.depenses.dateFinOptional')}</Label>
                <Input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date_fin: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewModeleOpen(false)}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => storeMutation.mutate()}
                disabled={
                  !form.titre ||
                  !form.montant ||
                  !form.compte_charge ||
                  storeMutation.isPending
                }
              >
                {storeMutation.isPending
                  ? t('actions.loading')
                  : t('actions.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── DepensesPage ─────────────────────────────────────────────────────────────

export function DepensesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [recurrentesOpen, setRecurrentesOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DepenseFinance | null>(null)
  const [rejetTarget, setRejetTarget] = useState<DepenseFinance | null>(null)
  const [rejetMotif, setRejetMotif] = useState('')

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterCompte, setFilterCompte] = useState('tous')
  const [filterApprobation, setFilterApprobation] = useState('tous')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // ── Queries ────────────────────────────────────────────────────────────────

  const residenceId = useResidenceStore((s) => s.residenceId)

  const { data: depenses = [], isLoading } = useQuery({
    queryKey: ['depenses-finance'],
    queryFn: () => getDepensesFinance(),
  })

  const { data: stats } = useQuery({
    queryKey: ['depenses-stats'],
    queryFn: () => getDepensesStats(),
  })

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: () => getComptesPcg(),
  })
  const compteClasse6 = comptes.filter((c) => c.classe === 6)

  // ── Mutations ─────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDepenseFinance(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses-finance'] })
      void qc.invalidateQueries({ queryKey: ['depenses-stats'] })
      setDeleteTarget(null)
      toast.success(t('gestionnaire.depenses.toastDeleted'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const approuverMutation = useMutation({
    mutationFn: (id: number) => approuverDepense(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses-finance'] })
      toast.success(t('gestionnaire.depenses.toastApproved'))
    },
    onError: () => toast.error(t('common.error')),
  })

  const rejeterMutation = useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) =>
      rejeterDepense(id, motif),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['depenses-finance'] })
      setRejetTarget(null)
      setRejetMotif('')
      toast.success(t('gestionnaire.depenses.toastRejected'))
    },
    onError: () => toast.error(t('common.error')),
  })

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered = depenses.filter((d) => {
    // Global residence scope (KAN-47): null = all residences.
    if (residenceId !== null && d.residence_id !== residenceId) return false
    if (filterCompte !== 'tous' && d.compte_charge !== filterCompte)
      return false
    if (
      filterApprobation !== 'tous' &&
      d.statut_approbation !== filterApprobation
    )
      return false
    if (filterFrom && d.date < filterFrom) return false
    if (filterTo && d.date > filterTo) return false
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      if (
        !d.titre.toLowerCase().includes(q) &&
        !(d.prestataire_nom ?? '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<DepenseFinance>[] = [
    {
      key: 'date',
      header: t('gestionnaire.depenses.cols.date', { defaultValue: 'Date' }),
      sortable: true,
      renderCell: (r) => r.date.slice(0, 10),
    },
    {
      key: 'titre',
      header: t('gestionnaire.depenses.cols.titre', { defaultValue: 'Titre' }),
      sortable: true,
    },
    {
      key: 'prestataire_nom',
      header: t('gestionnaire.depenses.cols.prestataire', {
        defaultValue: 'Prestataire',
      }),
      renderCell: (r) =>
        r.prestataire_nom ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'compte_charge',
      header: t('gestionnaire.depenses.cols.compte', {
        defaultValue: 'Compte PCG',
      }),
      renderCell: (r) => (
        <Badge className="border-0 bg-slate-100 text-slate-700 text-xs font-mono">
          {r.compte_charge}
        </Badge>
      ),
    },
    {
      key: 'montant',
      header: t('gestionnaire.depenses.cols.montant', {
        defaultValue: 'Montant',
      }),
      sortable: true,
      renderCell: (r) => <MontantDisplay value={r.montant} />,
    },
    {
      key: 'mode_paiement',
      header: t('gestionnaire.depenses.cols.mode', { defaultValue: 'Mode' }),
      renderCell: (r) => (
        <span className="text-sm capitalize">{r.mode_paiement}</span>
      ),
    },
    {
      key: 'justificatif_path',
      header: 'Justificatif',
      renderCell: (r) =>
        r.justificatif_path ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => toast.info(t('gestionnaire.depenses.downloading'))}
          >
            <Download className="size-3.5" />
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'statut_approbation',
      header: t('gestionnaire.depenses.cols.approbation', {
        defaultValue: 'Approbation',
      }),
      renderCell: (r) =>
        r.statut_approbation ? (
          <Badge
            className={cn(
              APPROBATION_CLS[r.statut_approbation],
              'border-0 text-xs',
            )}
          >
            {t(`gestionnaire.depenses.approbation.${r.statut_approbation}`, {
              defaultValue: r.statut_approbation,
            })}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-32 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          {r.statut_approbation === 'en_attente' && (
            <>
              <Button
                size="sm"
                className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
                disabled={approuverMutation.isPending}
                onClick={() => approuverMutation.mutate(r.id)}
              >
                <CheckCircle className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-red-300 text-xs text-red-600 hover:bg-red-50"
                onClick={() => setRejetTarget(r)}
              >
                <X className="size-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.depenses.title', { defaultValue: 'Dépenses' })}
        subtitle={t('gestionnaire.depenses.subtitle', {
          defaultValue: 'Suivi des charges de copropriété',
        })}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info(t('gestionnaire.depenses.importIa'))
                setAddOpen(true)
              }}
            >
              <Sparkles className="me-1.5 size-4 text-amber-500" />
              {t('gestionnaire.depenses.importIa', {
                defaultValue: 'Import IA',
              })}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Receipt className="me-1.5 size-4" />
              {t('gestionnaire.depenses.add', {
                defaultValue: 'Ajouter une dépense',
              })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecurrentesOpen(true)}
            >
              <Settings2 className="me-1.5 size-4" />
              {t('gestionnaire.depenses.recurrentes', {
                defaultValue: 'Récurrentes',
              })}
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<Receipt className="size-5" />}
          value={
            stats ? `${stats.total_periode.toLocaleString('fr-MA')} DH` : '—'
          }
          label={t('gestionnaire.depenses.kpi.total', {
            defaultValue: 'Total période',
          })}
        />
        <KpiCard
          icon={<Receipt className="size-5" />}
          value={stats?.nb_depenses ?? '—'}
          label={t('gestionnaire.depenses.kpi.nb', {
            defaultValue: 'Nb dépenses',
          })}
        />
        <KpiCard
          icon={<Receipt className="size-5" />}
          value={
            stats ? `${stats.montant_moyen.toLocaleString('fr-MA')} DH` : '—'
          }
          label={t('gestionnaire.depenses.kpi.moyen', {
            defaultValue: 'Montant moyen',
          })}
        />
        <KpiCard
          icon={<Receipt className="size-5" />}
          value={stats?.en_attente_approbation ?? '—'}
          label={t('gestionnaire.depenses.kpi.enAttente', {
            defaultValue: 'En attente approbation',
          })}
        />
      </div>

      {/* Charts row */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Bar chart: évolution mensuelle */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-medium">
              {t('gestionnaire.depenses.evolutionMensuelle')}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.evolution_mensuelle} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v) => `${Number(v).toLocaleString('fr-MA')} DH`}
                />
                <Bar
                  dataKey="montant"
                  fill="var(--color-imaro-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart: répartition par compte PCG */}
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-medium">
              {t('gestionnaire.depenses.repartitionPcg')}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.top_comptes}
                  dataKey="montant"
                  nameKey="libelle"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {stats.top_comptes.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs">{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(v) => `${Number(v).toLocaleString('fr-MA')} DH`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top prestataires */}
      {stats && stats.top_prestataires.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">Top prestataires</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Prestataire</th>
                <th className="py-2 text-right font-medium">
                  {t('gestionnaire.depenses.totalMad')}
                </th>
                <th className="py-2 text-right font-medium">Factures</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.top_prestataires.map((p, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="py-2">{p.nom}</td>
                  <td className="py-2 text-right tabular-nums">
                    <MontantDisplay value={p.montant} />
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {p.nb}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters + table */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t('gestionnaire.depenses.searchTitle')}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterCompte} onValueChange={setFilterCompte}>
            <SelectTrigger className="w-48">
              <SelectValue
                placeholder={t('gestionnaire.depenses.allAccounts')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">
                {t('gestionnaire.depenses.allAccounts')}
              </SelectItem>
              {compteClasse6.map((c) => (
                <SelectItem key={c.numero} value={c.numero}>
                  {c.numero} — {c.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterApprobation}
            onValueChange={setFilterApprobation}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Approbation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">
                {t('gestionnaire.depenses.allStatuses')}
              </SelectItem>
              <SelectItem value="approuve">
                {t('gestionnaire.depenses.approbation.approuve', {
                  defaultValue: 'Approuvé',
                })}
              </SelectItem>
              <SelectItem value="en_attente">
                {t('gestionnaire.depenses.approbation.en_attente', {
                  defaultValue: 'En attente',
                })}
              </SelectItem>
              <SelectItem value="rejete">
                {t('gestionnaire.depenses.approbation.rejete', {
                  defaultValue: 'Rejeté',
                })}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-40"
          />
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          rowKey="id"
          isLoading={isLoading}
          pageSize={10}
          emptyIcon={<Receipt className="size-12 text-muted-foreground" />}
          emptyTitle="Aucune dépense"
        />
      </div>

      {/* ── Modals ── */}
      <NouvelleDepenseModal open={addOpen} onOpenChange={setAddOpen} />

      <ModelesRecurrentsModal
        open={recurrentesOpen}
        onOpenChange={setRecurrentesOpen}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('gestionnaire.depenses.deleteTitle')}
        description={
          deleteTarget
            ? `La dépense "${deleteTarget.titre}" sera supprimée définitivement.`
            : ''
        }
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />

      <Dialog
        open={!!rejetTarget}
        onOpenChange={(o) => !o && setRejetTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.depenses.rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>{t('gestionnaire.depenses.motifRejet')}</Label>
            <Input
              value={rejetMotif}
              onChange={(e) => setRejetMotif(e.target.value)}
              placeholder="Ex: Justificatif insuffisant"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejetTarget(null)
                setRejetMotif('')
              }}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejetTarget &&
                rejeterMutation.mutate({
                  id: rejetTarget.id,
                  motif: rejetMotif,
                })
              }
              disabled={!rejetMotif.trim() || rejeterMutation.isPending}
            >
              {rejeterMutation.isPending ? t('actions.loading') : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
