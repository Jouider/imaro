import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import {
  getResidence,
  getLots,
  getCoproprietaires,
  getExercices,
  storeLot,
  updateLot,
  deleteLot,
  type Lot,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
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

type Tab = 'lots' | 'coproprietaires' | 'exercices'

const LOT_TYPES = [
  'appartement',
  'commerce',
  'parking',
  'cave',
  'bureau',
  'autre',
] as const

type LotForm = {
  numero: string
  type: string
  etage: string
  superficie: string
  tantieme: string
}

const EMPTY_FORM: LotForm = {
  numero: '',
  type: 'appartement',
  etage: '0',
  superficie: '',
  tantieme: '',
}

export function ResidencePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const residenceId = Number(id)
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<Tab>('lots')
  const [lotDialogOpen, setLotDialogOpen] = useState(false)
  const [editingLot, setEditingLot] = useState<Lot | null>(null)
  const [deletingLot, setDeletingLot] = useState<Lot | null>(null)
  const [form, setForm] = useState<LotForm>(EMPTY_FORM)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: residence, isLoading: loadingResidence } = useQuery({
    queryKey: ['residence', residenceId],
    queryFn: () => getResidence(residenceId),
    enabled: !!residenceId,
  })

  const { data: lotsData, isLoading: loadingLots } = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId),
    enabled: !!residenceId && activeTab === 'lots',
  })

  const { data: coproprietaires = [], isLoading: loadingCopro } = useQuery({
    queryKey: ['coproprietaires', residenceId],
    queryFn: () => getCoproprietaires(residenceId),
    enabled: !!residenceId && activeTab === 'coproprietaires',
  })

  const { data: exercices = [], isLoading: loadingExercices } = useQuery({
    queryKey: ['exercices', residenceId],
    queryFn: () => getExercices(residenceId),
    enabled: !!residenceId && activeTab === 'exercices',
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const storeMutation = useMutation({
    mutationFn: (data: Parameters<typeof storeLot>[1]) =>
      storeLot(residenceId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setLotDialogOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Lot ajouté')
    },
    onError: () => toast.error("Erreur lors de l'ajout du lot"),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      lotId,
      data,
    }: {
      lotId: number
      data: Parameters<typeof updateLot>[2]
    }) => updateLot(residenceId, lotId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setLotDialogOpen(false)
      setEditingLot(null)
      setForm(EMPTY_FORM)
      toast.success('Lot modifié')
    },
    onError: () => toast.error('Erreur lors de la modification'),
  })

  const deleteMutation = useMutation({
    mutationFn: (lotId: number) => deleteLot(residenceId, lotId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lots', residenceId] })
      setDeletingLot(null)
      toast.success('Lot supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingLot(null)
    setForm(EMPTY_FORM)
    setLotDialogOpen(true)
  }

  function openEdit(lot: Lot) {
    setEditingLot(lot)
    setForm({
      numero: lot.numero,
      type: lot.type,
      etage: String(lot.etage),
      superficie: String(lot.superficie),
      tantieme: String(lot.tantieme),
    })
    setLotDialogOpen(true)
  }

  function handleSubmitLot() {
    const payload = {
      numero: form.numero,
      type: form.type,
      etage: Number(form.etage),
      superficie: Number(form.superficie),
      tantieme: Number(form.tantieme),
    }
    if (editingLot) {
      updateMutation.mutate({ lotId: editingLot.id, data: payload })
    } else {
      storeMutation.mutate(payload)
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────

  const lotsColumns: Column<Lot>[] = [
    { key: 'numero', header: t('gestionnaire.residence.colNumero'), sortable: true },
    {
      key: 'type',
      header: t('gestionnaire.residence.colType'),
      renderCell: (r) => (
        <span className="capitalize">
          {t(`gestionnaire.residence.lotTypes.${r.type}`, { defaultValue: r.type })}
        </span>
      ),
    },
    { key: 'etage', header: t('gestionnaire.residence.colEtage'), sortable: true },
    {
      key: 'superficie',
      header: t('gestionnaire.residence.colSuperficie'),
      renderCell: (r) => (
        <span className="tabular-nums">{r.superficie} m²</span>
      ),
    },
    {
      key: 'tantieme',
      header: t('gestionnaire.residence.colTantieme'),
      sortable: true,
      renderCell: (r) => (
        <span className="tabular-nums">{r.tantieme}</span>
      ),
    },
    {
      key: 'coproprietaire',
      header: t('gestionnaire.residence.colProprietaire'),
      renderCell: (r) =>
        r.coproprietaire ? (
          <span>{r.coproprietaire.name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-20 text-right',
      renderCell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(r)}
            aria-label="Modifier"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingLot(r)}
            className="text-destructive hover:text-destructive"
            aria-label="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  type CoproRow = { id: number; name: string; phone: string; lot_numero: string; solde: number }
  const coproRows: CoproRow[] = coproprietaires.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    lot_numero: c.lot?.numero ?? '',
    solde: c.solde,
  }))

  const coproColumns: Column<CoproRow>[] = [
    { key: 'name', header: t('gestionnaire.residence.colNom'), sortable: true },
    { key: 'phone', header: t('gestionnaire.residence.colTelephone') },
    { key: 'lot_numero', header: 'Lot', sortable: true },
    {
      key: 'solde',
      header: t('gestionnaire.residence.colSolde'),
      sortable: true,
      renderCell: (r) => (
        <MontantDisplay value={r.solde} colorize />
      ),
    },
  ]

  type ExerciceRow = { id: number; annee: number; date_debut: string; date_fin: string; statut: string }
  const exerciceColumns: Column<ExerciceRow>[] = [
    { key: 'annee', header: t('gestionnaire.residence.colAnnee'), sortable: true },
    { key: 'date_debut', header: 'Début', renderCell: (r) => r.date_debut.slice(0, 10) },
    { key: 'date_fin', header: 'Fin', renderCell: (r) => r.date_fin.slice(0, 10) },
    {
      key: 'statut',
      header: t('gestionnaire.residence.colStatut'),
      renderCell: (r) => (
        <Badge
          variant={r.statut === 'actif' ? 'default' : 'secondary'}
          className={
            r.statut === 'actif'
              ? 'bg-green-100 text-green-800 hover:bg-green-100'
              : ''
          }
        >
          {t(`gestionnaire.residence.exerciceStatut.${r.statut}`, {
            defaultValue: r.statut,
          })}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      className: 'w-10 text-right',
      renderCell: (r) =>
        r.statut === 'cloture' ? (
          <Lock className="size-4 text-muted-foreground" />
        ) : null,
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: 'lots', label: t('gestionnaire.residence.tabLots') },
    { key: 'coproprietaires', label: t('gestionnaire.residence.tabCoproprietaires') },
    { key: 'exercices', label: t('gestionnaire.residence.tabExercices') },
  ]

  const isMutating = storeMutation.isPending || updateMutation.isPending

  return (
    <div className="p-6">
      <PageHeader
        breadcrumbs={[
          {
            label: t('gestionnaire.residence.backToList'),
            href: '/gestionnaire/residences',
          },
          { label: residence?.name ?? '…' },
        ]}
        title={loadingResidence ? '…' : (residence?.name ?? '')}
        subtitle={
          residence
            ? `${residence.city} · ${residence.nb_lots} lots`
            : undefined
        }
        actions={
          activeTab === 'lots' ? (
            <Button onClick={openCreate} size="sm">
              <Plus className="me-1.5 size-4" />
              {t('gestionnaire.residence.addLot')}
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
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
      {activeTab === 'lots' && (
        <>
          {lotsData && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t('gestionnaire.residence.totalTantieme', {
                val: lotsData.total_tantieme,
              })}
            </p>
          )}
          <DataTable
            data={lotsData?.lots ?? []}
            columns={lotsColumns}
            rowKey="id"
            isLoading={loadingLots}
            searchable
          />
        </>
      )}

      {activeTab === 'coproprietaires' && (
        <DataTable
          data={coproRows}
          columns={coproColumns}
          rowKey="id"
          isLoading={loadingCopro}
          searchable
          exportable
          exportFilename="coproprietaires"
        />
      )}

      {activeTab === 'exercices' && (
        <DataTable
          data={exercices}
          columns={exerciceColumns}
          rowKey="id"
          isLoading={loadingExercices}
        />
      )}

      {/* Lot form dialog */}
      <Dialog open={lotDialogOpen} onOpenChange={setLotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLot
                ? t('gestionnaire.residence.editLot')
                : t('gestionnaire.residence.addLot')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colNumero')}</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                  placeholder="A-01"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colType')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>
                        {t(`gestionnaire.residence.lotTypes.${tp}`, {
                          defaultValue: tp,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colEtage')}</Label>
                <Input
                  type="number"
                  value={form.etage}
                  onChange={(e) => setForm((f) => ({ ...f, etage: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colSuperficie')} (m²)</Label>
                <Input
                  type="number"
                  value={form.superficie}
                  onChange={(e) => setForm((f) => ({ ...f, superficie: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('gestionnaire.residence.colTantieme')}</Label>
                <Input
                  type="number"
                  value={form.tantieme}
                  onChange={(e) => setForm((f) => ({ ...f, tantieme: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLotDialogOpen(false)}
              disabled={isMutating}
            >
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSubmitLot} disabled={isMutating}>
              {isMutating ? t('actions.loading') : t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deletingLot}
        onOpenChange={(open) => !open && setDeletingLot(null)}
        title={t('gestionnaire.residence.deleteLot')}
        description={t('gestionnaire.residence.deleteLotDesc', {
          numero: deletingLot?.numero ?? '',
        })}
        onConfirm={() => deletingLot && deleteMutation.mutate(deletingLot.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
