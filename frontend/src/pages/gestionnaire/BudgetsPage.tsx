import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  PiggyBank,
  Plus,
  Trash2,
  Lock,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  getBudgetAnnexe5,
  updateLigneBudget,
  ajouterLigne,
  supprimerLigne,
  soumettreBudgetAg,
  verrouillerBudget,
  getSimulationCotisation,
  getSuggestionsIa,
  createBudget,
  type LigneBudget,
  type SuggestionIa,
} from '@/services/budgets.service'
import {
  getResidences,
  getExercices,
  getPrestataires,
  getContrats,
  type Exercice,
} from '@/services/gestionnaire.service'
import { getComptesPcg } from '@/services/comptabilite.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CLS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-700',
  soumis_ag: 'bg-blue-100 text-blue-700',
  approuve: 'bg-green-100 text-green-800',
  verrouille: 'bg-slate-100 text-slate-700',
}

function barColor(pct: number) {
  if (pct >= 100) return '#E74C3C'
  if (pct >= 80) return '#E67E22'
  return '#27AE60'
}

// ─── SimulationModal ──────────────────────────────────────────────────────────

function SimulationModal({
  budgetId,
  open,
  onOpenChange,
}: {
  budgetId: number
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['simulation-cotisation', budgetId],
    queryFn: () => getSimulationCotisation(budgetId),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('gestionnaire.budget.simulation.title', {
              defaultValue: 'Simulateur de cotisations',
            })}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                {t('gestionnaire.budget.simulation.budgetTotal', {
                  defaultValue: 'Budget charges total',
                })}{' '}
                :{' '}
                <strong className="text-foreground">
                  <MontantDisplay value={data.budget_charges_total} />
                </strong>
              </span>
              <span>·</span>
              <span>
                {t('gestionnaire.budget.simulation.tantiemesTotal', {
                  defaultValue: 'Tantièmes totaux',
                })}{' '}
                : <strong className="text-foreground">1000</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">
                      {t('gestionnaire.budget.simulation.colLot', {
                        defaultValue: 'Lot',
                      })}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t('gestionnaire.budget.simulation.colCopro', {
                        defaultValue: 'Copropriétaire',
                      })}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t('gestionnaire.budget.simulation.colTantieme', {
                        defaultValue: 'Tantième',
                      })}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t('gestionnaire.budget.simulation.colPct', {
                        defaultValue: 'Quote-part',
                      })}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t('gestionnaire.budget.simulation.colAnnuelle', {
                        defaultValue: 'Cotis. annuelle',
                      })}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t('gestionnaire.budget.simulation.colMensuelle', {
                        defaultValue: 'Cotis. mensuelle',
                      })}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t('gestionnaire.budget.simulation.colVariation', {
                        defaultValue: 'Variation vs N-1',
                      })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.lots.map((lot) => (
                    <tr key={lot.lot_numero} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-sm">
                        {lot.lot_numero}
                      </td>
                      <td className="px-4 py-3">{lot.coproprietaire_nom}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {lot.tantieme}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {lot.pct.toFixed(1)} %
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <MontantDisplay value={lot.cotisation_annuelle} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <MontantDisplay value={lot.cotisation_mensuelle} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={cn(
                            'flex items-center justify-end gap-1',
                            lot.variation_vs_n1 > 0
                              ? 'text-red-600'
                              : 'text-green-600',
                          )}
                        >
                          {lot.variation_vs_n1 > 0 ? (
                            <TrendingUp className="size-3.5" />
                          ) : (
                            <TrendingDown className="size-3.5" />
                          )}
                          {Math.abs(lot.variation_vs_n1).toFixed(1)} %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Export en cours...')}
              >
                <Download className="me-1.5 size-4" />
                {t('gestionnaire.budget.simulation.exporter', {
                  defaultValue: 'Exporter PDF',
                })}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ─── IaSuggestionsModal ───────────────────────────────────────────────────────

function IaSuggestionsModal({
  budgetId,
  open,
  onOpenChange,
  onApply,
}: {
  budgetId: number
  open: boolean
  onOpenChange: (o: boolean) => void
  onApply: (selected: SuggestionIa[]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggestions-ia', budgetId],
    queryFn: () => getSuggestionsIa(budgetId),
    enabled: open,
  })

  const toggleSuggestion = (compte: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(compte)) next.delete(compte)
      else next.add(compte)
      return next
    })
  }

  const handleApply = () => {
    const toApply = suggestions.filter((s) => selected.has(s.compte_pcg))
    onApply(toApply)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              {t('gestionnaire.budget.ia.title', {
                defaultValue: 'Suggestions IA',
              })}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y rounded-lg border">
              {suggestions.map((s) => (
                <div
                  key={s.compte_pcg}
                  className="flex items-start gap-3 px-4 py-4"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.compte_pcg)}
                    onChange={() => toggleSuggestion(s.compte_pcg)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {s.compte_pcg}
                      </span>
                      <span className="font-medium text-sm">{s.libelle}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-muted-foreground">
                      <span>
                        N-1 :{' '}
                        <MontantDisplay
                          value={s.montant_n1}
                          className="text-sm"
                        />
                      </span>
                      <span>
                        Suggéré :{' '}
                        <MontantDisplay
                          value={s.montant_suggere}
                          className="text-sm font-medium text-foreground"
                        />
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1',
                          s.variation_pct > 0
                            ? 'text-red-600'
                            : 'text-green-600',
                        )}
                      >
                        {s.variation_pct > 0 ? (
                          <TrendingUp className="size-3.5" />
                        ) : (
                          <TrendingDown className="size-3.5" />
                        )}
                        {Math.abs(s.variation_pct).toFixed(1)} %
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.justification}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {selected.size} ligne(s) sélectionnée(s)
              </span>
              <Button onClick={handleApply} disabled={selected.size === 0}>
                {t('gestionnaire.budget.ia.appliquer', {
                  defaultValue: 'Appliquer les suggestions sélectionnées',
                })}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── LigneRow (inline editable) ──────────────────────────────────────────────

type LigneRowProps = {
  ligne: LigneBudget
  verrouille: boolean
  onDelete: () => void
  onUpdate: (ligneId: number, budget_n: number) => void
}

function LigneRow({ ligne, verrouille, onDelete, onUpdate }: LigneRowProps) {
  const { t } = useTranslation()
  const [localVal, setLocalVal] = useState(ligne.budget_n)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (val: string) => {
    setLocalVal(Number(val))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onUpdate(ligne.id, Number(val))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  const rowCls =
    ligne.pct_consomme >= 100
      ? 'bg-red-50 hover:bg-red-100/60'
      : ligne.pct_consomme >= 80
        ? 'bg-orange-50 hover:bg-orange-100/60'
        : 'hover:bg-muted/20'

  return (
    <tr className={cn('transition-colors', rowCls)}>
      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
        {ligne.compte_pcg}
      </td>
      <td className="px-4 py-2.5 text-sm">{ligne.libelle}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-sm text-muted-foreground">
        <MontantDisplay value={ligne.realise_n1} />
      </td>
      <td className="px-4 py-2.5 text-right">
        {verrouille ? (
          <span className="tabular-nums text-sm">
            <MontantDisplay value={localVal} />
          </span>
        ) : (
          <div className="flex items-center justify-end gap-1.5">
            <input
              type="number"
              value={localVal}
              onChange={(e) => handleChange(e.target.value)}
              className="w-28 rounded-md border border-transparent px-2 py-1 text-right text-sm tabular-nums ring-muted transition-all hover:border-input focus:border-[var(--color-imaro-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-imaro-primary)]"
            />
            {saved && (
              <span className="flex items-center gap-0.5 text-xs text-green-600 whitespace-nowrap">
                <CheckCircle2 className="size-3" />
                {t('gestionnaire.budget.annexe5.saved', {
                  defaultValue: 'Sauvegardé ✓',
                })}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-sm">
        <MontantDisplay value={ligne.engagement} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-sm">
        <MontantDisplay value={ligne.realise} />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(ligne.pct_consomme, 100)}%`,
                backgroundColor: barColor(ligne.pct_consomme),
              }}
            />
          </div>
          <span className="tabular-nums text-xs w-9 text-right">
            {ligne.pct_consomme}%
          </span>
        </div>
      </td>
      {!verrouille && (
        <td className="px-4 py-2.5 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </td>
      )}
    </tr>
  )
}

// ─── Section component ────────────────────────────────────────────────────────

type SectionProps = {
  title: string
  lignes: LigneBudget[]
  verrouille: boolean
  onDelete: (id: number) => void
  onUpdate: (id: number, val: number) => void
  onAddLigne: (type: LigneBudget['type']) => void
  type: LigneBudget['type']
  showAdd?: boolean
}

function Section({
  title,
  lignes,
  verrouille,
  onDelete,
  onUpdate,
  onAddLigne,
  type,
  showAdd = true,
}: SectionProps) {
  const { t } = useTranslation()
  const colSpan = verrouille ? 7 : 8

  return (
    <>
      <tr className="bg-muted/60">
        <td
          colSpan={colSpan}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {title}
        </td>
      </tr>
      {lignes.map((l) => (
        <LigneRow
          key={l.id}
          ligne={l}
          verrouille={verrouille}
          onDelete={() => onDelete(l.id)}
          onUpdate={onUpdate}
        />
      ))}
      {!verrouille && showAdd && (
        <tr>
          <td colSpan={colSpan} className="px-4 py-1.5">
            <button
              onClick={() => onAddLigne(type)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3" />
              {t('actions.add', { defaultValue: 'Ajouter une ligne' })}
            </button>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── BudgetsPage ──────────────────────────────────────────────────────────────

export function BudgetsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [residenceId, setResidenceId] = useState<string>('')
  const [exerciceId, setExerciceId] = useState<string>('')
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [iaOpen, setIaOpen] = useState(false)
  const [soumettreOpen, setSoumettreOpen] = useState(false)
  const [verrouillageOpen, setVerrouillageOpen] = useState(false)
  const [addLigneDialog, setAddLigneDialog] = useState<{
    type: LigneBudget['type']
  } | null>(null)
  const [deleteLigneTarget, setDeleteLigneTarget] = useState<number | null>(
    null,
  )
  const [addLigneForm, setAddLigneForm] = useState({
    compte_pcg: '',
    libelle: '',
    budget_n: '',
  })
  const [prestataireOpen, setPrestataireOpen] = useState(false)
  const [prestataireForm, setPrestataireForm] = useState({
    prestataire_id: '',
    contrat_id: '',
    nombre: '',
    prix_unitaire: '',
    date_debut: '',
    date_fin: '',
  })

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const { data: exercices = [] } = useQuery({
    queryKey: ['exercices', residenceId],
    queryFn: () => getExercices(Number(residenceId)),
    enabled: !!residenceId,
  })

  const { data: budget, isLoading } = useQuery({
    queryKey: ['budget-annexe5', residenceId, exerciceId],
    queryFn: () => getBudgetAnnexe5(Number(residenceId), Number(exerciceId)),
    enabled: !!residenceId && !!exerciceId,
  })

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-pcg'],
    queryFn: () => getComptesPcg(),
    enabled: !!addLigneDialog,
  })

  const { data: prestataires = [] } = useQuery({
    queryKey: ['prestataires'],
    queryFn: () => getPrestataires(),
    enabled: !!addLigneDialog && prestataireOpen,
  })

  const selectedPrestataireId = prestataireForm.prestataire_id
    ? Number(prestataireForm.prestataire_id)
    : undefined

  const { data: contrats = [] } = useQuery({
    queryKey: ['contrats', selectedPrestataireId],
    queryFn: () => getContrats(selectedPrestataireId),
    enabled: !!addLigneDialog && prestataireOpen,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createBudgetMutation = useMutation({
    mutationFn: () =>
      createBudget({
        residence_id: Number(residenceId),
        exercice_id: Number(exerciceId),
      }),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      }),
    onError: () => toast.error(t('common.createError')),
  })

  const updateLigneMutation = useMutation({
    mutationFn: ({ id, val }: { id: number; val: number }) =>
      updateLigneBudget(id, val),
    onSuccess: () =>
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      }),
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const resetAddLigneDialog = () => {
    setAddLigneDialog(null)
    setAddLigneForm({ compte_pcg: '', libelle: '', budget_n: '' })
    setPrestataireOpen(false)
    setPrestataireForm({
      prestataire_id: '',
      contrat_id: '',
      nombre: '',
      prix_unitaire: '',
      date_debut: '',
      date_fin: '',
    })
  }

  const ajouterLigneMutation = useMutation({
    mutationFn: (data: Partial<LigneBudget>) => ajouterLigne(budget!.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      })
      resetAddLigneDialog()
      toast.success(t('gestionnaire.budgets.toastLineAdded'))
    },
    onError: () => toast.error('Erreur'),
  })

  const supprimerLigneMutation = useMutation({
    mutationFn: (id: number) => supprimerLigne(id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      })
      setDeleteLigneTarget(null)
      toast.success(t('gestionnaire.budgets.toastLineDeleted'))
    },
    onError: () => toast.error('Erreur'),
  })

  const soumettreMutation = useMutation({
    mutationFn: () => soumettreBudgetAg(budget!.id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      })
      setSoumettreOpen(false)
      toast.success(
        t('gestionnaire.budget.soumettre', {
          defaultValue: "Budget soumis à l'AG",
        }),
      )
    },
    onError: () => toast.error('Erreur'),
  })

  const verrouillerMutation = useMutation({
    mutationFn: () => verrouillerBudget(budget!.id),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['budget-annexe5', residenceId, exerciceId],
      })
      setVerrouillageOpen(false)
      toast.success(
        t('gestionnaire.budget.verrouiller', {
          defaultValue: 'Budget verrouillé',
        }),
      )
    },
    onError: () => toast.error('Erreur'),
  })

  // ── Computed ───────────────────────────────────────────────────────────────

  const verrouille = budget?.statut === 'verrouille'
  const canSubmit =
    budget && budget.statut !== 'approuve' && budget.statut !== 'verrouille'

  const lignes = budget?.lignes ?? []
  const chargesCourantes = lignes.filter((l) => l.type === 'charge_courante')
  const chargesTravaux = lignes.filter((l) => l.type === 'charge_travaux')
  const produitsCourants = lignes.filter((l) => l.type === 'produit_courant')
  const produitsTravaux = lignes.filter((l) => l.type === 'produit_travaux')

  const totalCharges = budget?.total_charges ?? 0
  const totalProduits = budget?.total_produits ?? 0
  const resultat = budget?.resultat ?? 0
  const totalEngage = lignes.reduce((s, l) => s + l.engagement, 0)
  const totalRealise = lignes.reduce((s, l) => s + l.realise, 0)
  const totalPrevu = lignes.reduce((s, l) => {
    if (l.type === 'charge_courante' || l.type === 'charge_travaux')
      return s + l.budget_n
    return s
  }, 0)
  const resteADepenser = totalCharges - totalRealise

  // Bar chart data for charges
  const chargesAll = [...chargesCourantes, ...chargesTravaux]
  const chartData = chargesAll.map((l) => ({
    libelle: l.libelle.length > 20 ? l.libelle.slice(0, 20) + '…' : l.libelle,
    pct: l.pct_consomme,
  }))

  const handleIaApply = async (selected: SuggestionIa[]) => {
    if (!budget) return
    for (const s of selected) {
      const ligne = lignes.find((l) => l.compte_pcg === s.compte_pcg)
      if (ligne) {
        await updateLigneBudget(ligne.id, s.montant_suggere)
      }
    }
    void qc.invalidateQueries({
      queryKey: ['budget-annexe5', residenceId, exerciceId],
    })
    toast.success(`${selected.length} ligne(s) mise(s) à jour`)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.budget.title', {
          defaultValue: 'Budget Prévisionnel',
        })}
        subtitle={
          budget
            ? `Exercice ${budget.exercice.annee} · ${budget.residence.name}`
            : undefined
        }
        actions={
          budget ? (
            <div className="flex flex-wrap gap-2">
              {verrouille && (
                <Badge className="border-0 bg-slate-100 text-slate-700 self-center">
                  <Lock className="me-1 size-3" />
                  {t('gestionnaire.budget.statuts.verrouille', {
                    defaultValue: 'Verrouillé',
                  })}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIaOpen(true)}
              >
                <Sparkles className="me-1.5 size-4 text-amber-500" />
                {t('gestionnaire.budget.ia.title', {
                  defaultValue: 'Suggestion IA',
                })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimulationOpen(true)}
              >
                {t('gestionnaire.budget.simulation.title', {
                  defaultValue: 'Simuler cotisations',
                })}
              </Button>
              {canSubmit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoumettreOpen(true)}
                >
                  <Send className="me-1.5 size-4" />
                  {t('gestionnaire.budget.soumettre', {
                    defaultValue: "Soumettre à l'AG",
                  })}
                </Button>
              )}
              {!verrouille && budget.statut === 'approuve' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerrouillageOpen(true)}
                >
                  <Lock className="me-1.5 size-4" />
                  {t('gestionnaire.budget.verrouiller', {
                    defaultValue: 'Verrouiller',
                  })}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Export en cours...')}
              >
                <Download className="me-1.5 size-4" />
                {t('gestionnaire.budget.exporter', {
                  defaultValue: 'Export PDF',
                })}
              </Button>
            </div>
          ) : null
        }
      />

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={residenceId}
          onValueChange={(v) => {
            setResidenceId(v)
            setExerciceId('')
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue
              placeholder={t('gestionnaire.budgets.selectResidence', {
                defaultValue: 'Résidence',
              })}
            />
          </SelectTrigger>
          <SelectContent>
            {residences.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {residenceId && (
          <Select
            value={exerciceId}
            onValueChange={setExerciceId}
            disabled={exercices.length === 0}
          >
            <SelectTrigger className="w-44">
              <SelectValue
                placeholder={
                  exercices.length === 0 ? 'Aucun exercice' : 'Exercice'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {exercices.map((e: Exercice) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.annee}
                  {e.statut === 'actif' && (
                    <span className="ml-1.5 text-xs text-green-600">●</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {budget && (
          <Badge
            className={cn(STATUT_CLS[budget.statut], 'border-0 self-center')}
          >
            {t(`gestionnaire.budget.statuts.${budget.statut}`, {
              defaultValue: budget.statut,
            })}
          </Badge>
        )}
      </div>

      {/* Empty states */}
      {(!residenceId || !exerciceId) && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <PiggyBank className="size-12 text-muted-foreground" />
          <p className="font-medium">
            {t('gestionnaire.budgets.empty', {
              defaultValue: 'Sélectionnez une résidence et un exercice',
            })}
          </p>
        </div>
      )}

      {residenceId && exerciceId && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {residenceId && exerciceId && !isLoading && !budget && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <PiggyBank className="size-12 text-muted-foreground" />
          <p className="font-medium">{t('gestionnaire.budgets.empty')}</p>
          <Button
            onClick={() => createBudgetMutation.mutate()}
            disabled={createBudgetMutation.isPending}
          >
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.budget.creer', {
              defaultValue: 'Créer le budget',
            })}
          </Button>
        </div>
      )}

      {budget && !isLoading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={<PiggyBank className="size-5" />}
              value={`${totalPrevu.toLocaleString('fr-MA')} DH`}
              label={t('gestionnaire.budget.kpi.prevu', {
                defaultValue: 'Budget prévu',
              })}
            />
            <KpiCard
              icon={<PiggyBank className="size-5" />}
              value={`${totalEngage.toLocaleString('fr-MA')} DH`}
              label={t('gestionnaire.budget.kpi.engage', {
                defaultValue: 'Engagé / Émis',
              })}
            />
            <KpiCard
              icon={<PiggyBank className="size-5" />}
              value={`${totalRealise.toLocaleString('fr-MA')} DH`}
              label={t('gestionnaire.budget.kpi.realise', {
                defaultValue: 'Réalisé',
              })}
            />
            <KpiCard
              icon={<PiggyBank className="size-5" />}
              value={`${resteADepenser.toLocaleString('fr-MA')} DH`}
              label={t('gestionnaire.budget.kpi.reste', {
                defaultValue: 'Reste à dépenser',
              })}
              className={
                resteADepenser < 0 ? '[&_p:last-of-type]:text-red-600' : ''
              }
            />
          </div>

          {/* Main 2-col layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Tableau Annexe 5 (2/3) */}
            <div className="lg:col-span-2 overflow-x-auto rounded-xl border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">
                  {t('gestionnaire.budget.annexe5.title', {
                    defaultValue: 'Tableau Annexe 5',
                  })}
                </p>
                <span className="text-xs text-muted-foreground">
                  v{budget.version}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">
                      {t('gestionnaire.budget.annexe5.colCompte', {
                        defaultValue: 'Compte',
                      })}
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium">
                      {t('gestionnaire.budget.annexe5.colLibelle', {
                        defaultValue: 'Libellé',
                      })}
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      {t('gestionnaire.budget.annexe5.colRealiseN1', {
                        defaultValue: 'Réal. N-1',
                      })}
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      {t('gestionnaire.budget.annexe5.colBudgetN', {
                        defaultValue: 'Budget N',
                      })}
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      {t('gestionnaire.budget.annexe5.colEngage', {
                        defaultValue: 'Engagé',
                      })}
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      {t('gestionnaire.budget.annexe5.colRealise', {
                        defaultValue: 'Réalisé',
                      })}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t('gestionnaire.budget.annexe5.colPct', {
                        defaultValue: '% Cons.',
                      })}
                    </th>
                    {!verrouille && <th className="px-4 py-2.5 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <Section
                    title={t(
                      'gestionnaire.budget.annexe5.sections.chargesCourantes',
                      { defaultValue: 'I — Charges courantes' },
                    )}
                    lignes={chargesCourantes}
                    verrouille={verrouille}
                    onDelete={(id) => setDeleteLigneTarget(id)}
                    onUpdate={(id, val) =>
                      updateLigneMutation.mutate({ id, val })
                    }
                    onAddLigne={(type) => setAddLigneDialog({ type })}
                    type="charge_courante"
                  />
                  <Section
                    title={t(
                      'gestionnaire.budget.annexe5.sections.chargesTravaux',
                      { defaultValue: 'II — Charges travaux' },
                    )}
                    lignes={chargesTravaux}
                    verrouille={verrouille}
                    onDelete={(id) => setDeleteLigneTarget(id)}
                    onUpdate={(id, val) =>
                      updateLigneMutation.mutate({ id, val })
                    }
                    onAddLigne={(type) => setAddLigneDialog({ type })}
                    type="charge_travaux"
                  />

                  {/* Total charges */}
                  <tr className="bg-muted/50 font-semibold border-t-2">
                    <td colSpan={2} className="px-4 py-2.5 text-sm">
                      {t('gestionnaire.budget.annexe5.sections.totalCharges', {
                        defaultValue: 'III — Total charges',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                      <MontantDisplay
                        value={chargesAll.reduce((s, l) => s + l.realise_n1, 0)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                      <MontantDisplay value={totalCharges} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                      <MontantDisplay
                        value={chargesAll.reduce((s, l) => s + l.engagement, 0)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                      <MontantDisplay value={totalRealise} />
                    </td>
                    <td className="px-4 py-2.5" />
                    {!verrouille && <td />}
                  </tr>

                  <Section
                    title={t(
                      'gestionnaire.budget.annexe5.sections.produitsCourants',
                      { defaultValue: 'IV — Produits courants' },
                    )}
                    lignes={produitsCourants}
                    verrouille={verrouille}
                    onDelete={(id) => setDeleteLigneTarget(id)}
                    onUpdate={(id, val) =>
                      updateLigneMutation.mutate({ id, val })
                    }
                    onAddLigne={(type) => setAddLigneDialog({ type })}
                    type="produit_courant"
                  />
                  <Section
                    title={t(
                      'gestionnaire.budget.annexe5.sections.produitsTravaux',
                      { defaultValue: 'V — Produits travaux' },
                    )}
                    lignes={produitsTravaux}
                    verrouille={verrouille}
                    onDelete={(id) => setDeleteLigneTarget(id)}
                    onUpdate={(id, val) =>
                      updateLigneMutation.mutate({ id, val })
                    }
                    onAddLigne={(type) => setAddLigneDialog({ type })}
                    type="produit_travaux"
                  />

                  {/* Total produits */}
                  <tr className="bg-muted/50 font-semibold border-t-2">
                    <td colSpan={2} className="px-4 py-2.5 text-sm">
                      {t('gestionnaire.budget.annexe5.sections.totalProduits', {
                        defaultValue: 'VI — Total produits',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm text-muted-foreground">
                      <MontantDisplay
                        value={[...produitsCourants, ...produitsTravaux].reduce(
                          (s, l) => s + l.realise_n1,
                          0,
                        )}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sm">
                      <MontantDisplay value={totalProduits} />
                    </td>
                    <td colSpan={3} />
                    {!verrouille && <td />}
                  </tr>

                  {/* Résultat */}
                  <tr
                    className={cn(
                      'font-bold border-t-2',
                      resultat >= 0 ? 'bg-green-50' : 'bg-red-50',
                    )}
                  >
                    <td colSpan={3} className="px-4 py-3 text-sm">
                      {t('gestionnaire.budget.annexe5.sections.resultat', {
                        defaultValue: 'VII — Résultat',
                      })}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right tabular-nums text-sm',
                        resultat >= 0 ? 'text-green-700' : 'text-red-700',
                      )}
                    >
                      <MontantDisplay value={resultat} />
                    </td>
                    <td colSpan={3} />
                    {!verrouille && <td />}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bar chart (1/3) */}
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-medium">Consommation par poste</p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="libelle"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={barColor(entry.pct)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aucune donnée
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modals ── */}
      {budget && (
        <>
          <SimulationModal
            budgetId={budget.id}
            open={simulationOpen}
            onOpenChange={setSimulationOpen}
          />
          <IaSuggestionsModal
            budgetId={budget.id}
            open={iaOpen}
            onOpenChange={setIaOpen}
            onApply={handleIaApply}
          />
        </>
      )}

      <ConfirmModal
        open={soumettreOpen}
        onOpenChange={setSoumettreOpen}
        title={t('gestionnaire.budget.soumettre', {
          defaultValue: "Soumettre à l'AG",
        })}
        description="Le budget sera soumis pour approbation lors de la prochaine Assemblée Générale."
        confirmLabel="Soumettre"
        variant="default"
        onConfirm={() => soumettreMutation.mutate()}
        isLoading={soumettreMutation.isPending}
      />

      <ConfirmModal
        open={verrouillageOpen}
        onOpenChange={setVerrouillageOpen}
        title={t('gestionnaire.budget.verrouiller', {
          defaultValue: 'Verrouiller le budget',
        })}
        description="Le budget sera verrouillé et ne pourra plus être modifié."
        confirmLabel="Verrouiller"
        variant="destructive"
        onConfirm={() => verrouillerMutation.mutate()}
        isLoading={verrouillerMutation.isPending}
      />

      <ConfirmModal
        open={deleteLigneTarget !== null}
        onOpenChange={(o) => !o && setDeleteLigneTarget(null)}
        title="Supprimer la ligne"
        description="Cette ligne budgétaire sera supprimée définitivement."
        onConfirm={() =>
          deleteLigneTarget !== null &&
          supprimerLigneMutation.mutate(deleteLigneTarget)
        }
        isLoading={supprimerLigneMutation.isPending}
      />

      {/* Add ligne dialog */}
      <Dialog
        open={!!addLigneDialog}
        onOpenChange={(o) => !o && resetAddLigneDialog()}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une ligne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Compte PCG</Label>
              <Select
                value={addLigneForm.compte_pcg}
                onValueChange={(v) =>
                  setAddLigneForm((f) => ({ ...f, compte_pcg: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {comptes
                    .filter((c) => {
                      if (!addLigneDialog) return false
                      if (addLigneDialog.type.startsWith('charge'))
                        return c.classe === 6
                      return c.classe === 7
                    })
                    .map((c) => (
                      <SelectItem key={c.numero} value={c.numero}>
                        {c.numero} — {c.libelle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('common.libelle')}</Label>
              <Input
                value={addLigneForm.libelle}
                onChange={(e) =>
                  setAddLigneForm((f) => ({ ...f, libelle: e.target.value }))
                }
                placeholder="Description de la ligne"
              />
            </div>
            <div className="space-y-1">
              <Label>Budget N (MAD)</Label>
              <Input
                type="number"
                value={addLigneForm.budget_n}
                onChange={(e) =>
                  setAddLigneForm((f) => ({ ...f, budget_n: e.target.value }))
                }
              />
            </div>

            {/* Prestataire collapsible section */}
            <div className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setPrestataireOpen((o) => !o)}
              >
                <span>Lier un prestataire (optionnel)</span>
                {prestataireOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>

              {prestataireOpen && (
                <div className="border-t px-3 pb-3 pt-3 space-y-3">
                  <div className="space-y-1">
                    <Label>Prestataire</Label>
                    <Select
                      value={prestataireForm.prestataire_id}
                      onValueChange={(v) =>
                        setPrestataireForm((f) => ({
                          ...f,
                          prestataire_id: v,
                          contrat_id: '',
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t(
                            'gestionnaire.budgets.selectPrestataire',
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {prestataires.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.nom}
                            {p.secteur ? ` — ${p.secteur}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Contrat</Label>
                    <Select
                      value={prestataireForm.contrat_id}
                      onValueChange={(v) =>
                        setPrestataireForm((f) => ({ ...f, contrat_id: v }))
                      }
                      disabled={contrats.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            contrats.length === 0
                              ? 'Aucun contrat'
                              : 'Sélectionner un contrat'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {contrats.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Nombre (ex. 12 mois)</Label>
                      <Input
                        type="number"
                        placeholder="12"
                        value={prestataireForm.nombre}
                        onChange={(e) => {
                          const nombre = e.target.value
                          setPrestataireForm((f) => ({ ...f, nombre }))
                          if (nombre && prestataireForm.prix_unitaire) {
                            const computed =
                              Number(nombre) *
                              Number(prestataireForm.prix_unitaire)
                            setAddLigneForm((f) => ({
                              ...f,
                              budget_n: String(computed),
                            }))
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Prix unitaire (DH)</Label>
                      <Input
                        type="number"
                        placeholder="5000"
                        value={prestataireForm.prix_unitaire}
                        onChange={(e) => {
                          const prix_unitaire = e.target.value
                          setPrestataireForm((f) => ({ ...f, prix_unitaire }))
                          if (prestataireForm.nombre && prix_unitaire) {
                            const computed =
                              Number(prestataireForm.nombre) *
                              Number(prix_unitaire)
                            setAddLigneForm((f) => ({
                              ...f,
                              budget_n: String(computed),
                            }))
                          }
                        }}
                      />
                    </div>
                  </div>

                  {prestataireForm.nombre && prestataireForm.prix_unitaire && (
                    <p className="text-xs text-muted-foreground">
                      Montant auto-calculé :{' '}
                      <strong className="text-foreground">
                        {(
                          Number(prestataireForm.nombre) *
                          Number(prestataireForm.prix_unitaire)
                        ).toLocaleString('fr-MA')}{' '}
                        DH
                      </strong>{' '}
                      — modifiable dans le champ Budget N ci-dessus.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{t('common.startDate')}</Label>
                      <Input
                        type="date"
                        value={prestataireForm.date_debut}
                        onChange={(e) =>
                          setPrestataireForm((f) => ({
                            ...f,
                            date_debut: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Date fin</Label>
                      <Input
                        type="date"
                        value={prestataireForm.date_fin}
                        onChange={(e) =>
                          setPrestataireForm((f) => ({
                            ...f,
                            date_fin: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetAddLigneDialog}
              disabled={ajouterLigneMutation.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!addLigneDialog) return
                const payload: Partial<LigneBudget> = {
                  compte_pcg: addLigneForm.compte_pcg,
                  libelle: addLigneForm.libelle,
                  budget_n: Number(addLigneForm.budget_n),
                  type: addLigneDialog.type,
                }
                if (prestataireOpen) {
                  if (prestataireForm.prestataire_id)
                    payload.prestataire_id = Number(
                      prestataireForm.prestataire_id,
                    )
                  if (prestataireForm.contrat_id)
                    payload.contrat_id = Number(prestataireForm.contrat_id)
                  if (prestataireForm.nombre)
                    payload.nombre = Number(prestataireForm.nombre)
                  if (prestataireForm.prix_unitaire)
                    payload.prix_unitaire = Number(
                      prestataireForm.prix_unitaire,
                    )
                  if (prestataireForm.date_debut)
                    payload.date_debut = prestataireForm.date_debut
                  if (prestataireForm.date_fin)
                    payload.date_fin = prestataireForm.date_fin
                }
                ajouterLigneMutation.mutate(payload)
              }}
              disabled={
                !addLigneForm.libelle ||
                !addLigneForm.budget_n ||
                ajouterLigneMutation.isPending
              }
            >
              {ajouterLigneMutation.isPending
                ? t('actions.loading')
                : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
