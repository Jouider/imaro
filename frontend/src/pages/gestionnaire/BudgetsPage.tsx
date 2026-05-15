import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, PiggyBank, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import {
  getBudget,
  storePoste,
  updatePoste,
  deletePoste,
  approveBudget,
  createBudget,
  type Budget,
  type BudgetPoste,
} from '@/services/budgets.service'
import {
  getResidences,
  getExercices,
  type Exercice,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
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

const CATEGORIES = [
  'maintenance',
  'nettoyage',
  'gardiennage',
  'electricite',
  'eau',
  'assurance',
  'administratif',
  'travaux',
  'autre',
]

type PosteForm = {
  categorie: string
  description: string
  montant_prevu: string
  montant_realise: string
}

const EMPTY_POSTE_FORM: PosteForm = {
  categorie: 'maintenance',
  description: '',
  montant_prevu: '',
  montant_realise: '0',
}

export function BudgetsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const [residenceId, setResidenceId] = useState<string>('')
  const [exerciceId, setExerciceId] = useState<string>('')
  const [posteDialog, setPosteDialog] = useState<{ mode: 'create' | 'edit'; poste?: BudgetPoste } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetPoste | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [posteForm, setPosteForm] = useState<PosteForm>(EMPTY_POSTE_FORM)

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
    queryKey: ['budget', residenceId, exerciceId],
    queryFn: () => getBudget(Number(residenceId), Number(exerciceId)),
    enabled: !!residenceId && !!exerciceId,
  })

  const createBudgetMutation = useMutation({
    mutationFn: () => createBudget({ residence_id: Number(residenceId), exercice_id: Number(exerciceId) }),
    onSuccess: (newBudget) => {
      qc.setQueryData(['budget', residenceId, exerciceId], newBudget)
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const storePosteMutation = useMutation({
    mutationFn: () =>
      storePoste(budget!.id, {
        categorie: posteForm.categorie,
        description: posteForm.description,
        montant_prevu: Number(posteForm.montant_prevu),
        montant_realise: Number(posteForm.montant_realise),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget', residenceId, exerciceId] })
      setPosteDialog(null)
      setPosteForm(EMPTY_POSTE_FORM)
      toast.success('Poste ajouté')
    },
    onError: () => toast.error('Erreur'),
  })

  const updatePosteMutation = useMutation({
    mutationFn: (posteId: number) =>
      updatePoste(posteId, {
        categorie: posteForm.categorie,
        description: posteForm.description,
        montant_prevu: Number(posteForm.montant_prevu),
        montant_realise: Number(posteForm.montant_realise),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget', residenceId, exerciceId] })
      setPosteDialog(null)
      setPosteForm(EMPTY_POSTE_FORM)
      toast.success('Poste mis à jour')
    },
    onError: () => toast.error('Erreur'),
  })

  const deletePosteMutation = useMutation({
    mutationFn: (posteId: number) => deletePoste(posteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget', residenceId, exerciceId] })
      setDeleteTarget(null)
      toast.success('Poste supprimé')
    },
    onError: () => toast.error('Erreur'),
  })

  const approveMutation = useMutation({
    mutationFn: () => approveBudget(budget!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget', residenceId, exerciceId] })
      setApproveOpen(false)
      toast.success(t('gestionnaire.budgets.approveSuccess'))
    },
    onError: () => toast.error('Erreur'),
  })

  const openCreate = () => {
    setPosteForm(EMPTY_POSTE_FORM)
    setPosteDialog({ mode: 'create' })
  }

  const openEdit = (poste: BudgetPoste) => {
    setPosteForm({
      categorie: poste.categorie,
      description: poste.description,
      montant_prevu: String(poste.montant_prevu),
      montant_realise: String(poste.montant_realise),
    })
    setPosteDialog({ mode: 'edit', poste })
  }

  const handleSavePoste = () => {
    if (posteDialog?.mode === 'edit' && posteDialog.poste) {
      updatePosteMutation.mutate(posteDialog.poste.id)
    } else {
      storePosteMutation.mutate()
    }
  }

  const isPosteFormValid = posteForm.description.trim() && posteForm.montant_prevu
  const isApproved = budget?.statut === 'approuve'
  const isMutating = storePosteMutation.isPending || updatePosteMutation.isPending

  return (
    <div className="p-6">
      <PageHeader
        title={t('gestionnaire.budgets.title')}
        subtitle={t('gestionnaire.budgets.subtitle')}
        actions={
          budget && !isApproved ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="me-1.5 size-4" />
                {t('gestionnaire.budgets.approve')}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="me-1.5 size-4" />
                {t('gestionnaire.budgets.newPoste')}
              </Button>
            </div>
          ) : null
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="w-56">
          <Select value={residenceId} onValueChange={(v) => { setResidenceId(v); setExerciceId('') }}>
            <SelectTrigger>
              <SelectValue placeholder={t('gestionnaire.budgets.selectResidence')} />
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

        {residenceId && (
          <div className="w-48">
            <Select value={exerciceId} onValueChange={setExerciceId} disabled={exercices.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    exercices.length === 0
                      ? t('gestionnaire.budgets.noExercice')
                      : t('gestionnaire.budgets.selectExercice')
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
          </div>
        )}
      </div>

      {/* No selection state */}
      {!residenceId || !exerciceId ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <PiggyBank className="size-12 text-muted-foreground" />
          <p className="font-medium">{t('gestionnaire.budgets.empty')}</p>
          <p className="text-sm text-muted-foreground">{t('gestionnaire.budgets.emptyDesc')}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !budget ? (
        /* No budget yet — offer to create one */
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <PiggyBank className="size-12 text-muted-foreground" />
          <p className="font-medium">{t('gestionnaire.budgets.empty')}</p>
          <Button onClick={() => createBudgetMutation.mutate()} disabled={createBudgetMutation.isPending}>
            <Plus className="me-1.5 size-4" />
            Créer le budget
          </Button>
        </div>
      ) : (
        <BudgetView
          budget={budget}
          t={t}
          onEditPoste={openEdit}
          onDeletePoste={setDeleteTarget}
          isApproved={isApproved}
        />
      )}

      {/* Add / Edit poste dialog */}
      <Dialog open={!!posteDialog} onOpenChange={(open) => !open && setPosteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {posteDialog?.mode === 'edit'
                ? t('gestionnaire.budgets.editPoste')
                : t('gestionnaire.budgets.newPoste')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('gestionnaire.budgets.form.categorie')}</Label>
              <Select
                value={posteForm.categorie}
                onValueChange={(v) => setPosteForm((f) => ({ ...f, categorie: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`gestionnaire.budgets.categories.${c}`, { defaultValue: c })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t('gestionnaire.budgets.form.description')}</Label>
              <Input
                value={posteForm.description}
                onChange={(e) => setPosteForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Maintenance ascenseurs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.budgets.form.montantPrevu')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={posteForm.montant_prevu}
                  onChange={(e) => setPosteForm((f) => ({ ...f, montant_prevu: e.target.value }))}
                  placeholder="18000"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.budgets.form.montantRealise')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={posteForm.montant_realise}
                  onChange={(e) => setPosteForm((f) => ({ ...f, montant_realise: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPosteDialog(null)} disabled={isMutating}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSavePoste} disabled={!isPosteFormValid || isMutating}>
              {isMutating ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        {deleteTarget && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('gestionnaire.budgets.deletePoste')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t('gestionnaire.budgets.deletePosteDesc')}</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deletePosteMutation.isPending}
              >
                {t('actions.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletePosteMutation.mutate(deleteTarget.id)}
                disabled={deletePosteMutation.isPending}
              >
                {deletePosteMutation.isPending ? t('actions.loading') : t('actions.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Approve confirm dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('gestionnaire.budgets.approveConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('gestionnaire.budgets.approveDesc')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={approveMutation.isPending}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? t('actions.loading') : t('actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── BudgetView ───────────────────────────────────────────────────────────────

type BudgetViewProps = {
  budget: Budget
  t: (key: string, options?: Record<string, unknown>) => string
  onEditPoste: (poste: BudgetPoste) => void
  onDeletePoste: (poste: BudgetPoste) => void
  isApproved: boolean
}

function BudgetView({ budget, t, onEditPoste, onDeletePoste, isApproved }: BudgetViewProps) {
  const tauxExecution =
    budget.total_prevu > 0
      ? Math.round((budget.total_realise / budget.total_prevu) * 100)
      : 0

  const statutCls = isApproved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={t('gestionnaire.budgets.totalPrevu')}
          value={`${budget.total_prevu.toLocaleString('fr-MA')} DH`}
        />
        <KpiCard
          label={t('gestionnaire.budgets.totalRealise')}
          value={`${budget.total_realise.toLocaleString('fr-MA')} DH`}
          highlight={budget.total_realise > budget.total_prevu}
        />
        <KpiCard
          label={t('gestionnaire.budgets.tauxExecution')}
          value={`${tauxExecution} %`}
          highlight={tauxExecution > 100}
        />
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Statut</p>
          <Badge className={cn(statutCls, 'border-0')}>
            {t(`gestionnaire.budgets.statut.${budget.statut}`, { defaultValue: budget.statut })}
          </Badge>
        </div>
      </div>

      {/* Postes table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t('gestionnaire.budgets.colCategorie')}</th>
              <th className="px-4 py-3 font-medium">{t('gestionnaire.budgets.colDescription')}</th>
              <th className="px-4 py-3 font-medium text-right">{t('gestionnaire.budgets.colPrevu')}</th>
              <th className="px-4 py-3 font-medium text-right">{t('gestionnaire.budgets.colRealise')}</th>
              <th className="px-4 py-3 font-medium text-right">{t('gestionnaire.budgets.colEcart')}</th>
              <th className="px-4 py-3 font-medium w-32">{t('gestionnaire.budgets.colExecution')}</th>
              {!isApproved && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {budget.postes.map((poste) => {
              const ecart = poste.montant_realise - poste.montant_prevu
              const taux =
                poste.montant_prevu > 0
                  ? Math.min(Math.round((poste.montant_realise / poste.montant_prevu) * 100), 100)
                  : 0
              const over = poste.montant_realise > poste.montant_prevu

              return (
                <tr key={poste.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium capitalize">
                      {t(`gestionnaire.budgets.categories.${poste.categorie}`, {
                        defaultValue: poste.categorie,
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{poste.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {poste.montant_prevu.toLocaleString('fr-MA')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {poste.montant_realise.toLocaleString('fr-MA')}
                  </td>
                  <td className={cn('px-4 py-3 text-right tabular-nums', over ? 'text-red-600' : 'text-green-600')}>
                    {ecart > 0 ? '+' : ''}
                    {ecart.toLocaleString('fr-MA')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-[var(--color-imaro-primary)]')}
                          style={{ width: `${taux}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs w-9 text-right">{taux}%</span>
                    </div>
                  </td>
                  {!isApproved && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => onEditPoste(poste)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => onDeletePoste(poste)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40 font-medium">
              <td className="px-4 py-3" colSpan={2}>Total</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {budget.total_prevu.toLocaleString('fr-MA')}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {budget.total_realise.toLocaleString('fr-MA')}
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right tabular-nums',
                  budget.total_realise > budget.total_prevu ? 'text-red-600' : 'text-green-600',
                )}
              >
                {(() => {
                  const e = budget.total_realise - budget.total_prevu
                  return `${e > 0 ? '+' : ''}${e.toLocaleString('fr-MA')}`
                })()}
              </td>
              <td className="px-4 py-3">
                <span className="tabular-nums text-sm">{tauxExecution}%</span>
              </td>
              {!isApproved && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', highlight && 'text-red-600')}>
        {value}
      </p>
    </div>
  )
}
