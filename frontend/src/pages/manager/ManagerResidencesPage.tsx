import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DataTable,
  ConfirmModal,
  LoadingSkeleton,
  type Column,
} from '@/components/shared'
import {
  getManagerResidences,
  getManagerGestionnaires,
  createManagerResidence,
  updateManagerResidence,
  deleteManagerResidence,
  assignGestionnaireToResidence,
  type ManagerResidence,
} from '@/services/manager.service'

const NO_GESTIONNAIRE = '__none__'

type FormState = {
  name: string
  address: string
  city: string
  gestionnaire_id: string
}

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  city: '',
  gestionnaire_id: NO_GESTIONNAIRE,
}

/**
 * Manager — gestion des résidences : CRUD + assignation gestionnaire.
 */
export function ManagerResidencesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const residencesQuery = useQuery({
    queryKey: ['manager', 'residences'],
    queryFn: () => getManagerResidences(),
  })

  const gestionnairesQuery = useQuery({
    queryKey: ['manager', 'gestionnaires'],
    queryFn: () => getManagerGestionnaires(),
  })

  const [editTarget, setEditTarget] = useState<ManagerResidence | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ManagerResidence | null>(
    null,
  )
  const [assignTarget, setAssignTarget] = useState<ManagerResidence | null>(
    null,
  )
  const [assignChoice, setAssignChoice] = useState<string>('')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['manager', 'residences'] })
    void queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] })
  }

  const createMut = useMutation({
    mutationFn: createManagerResidence,
    onSuccess: () => {
      toast.success(t('manager.residences.toast.created'))
      invalidate()
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error(t('manager.residences.toast.createFailed')),
  })

  const updateMut = useMutation({
    mutationFn: (input: { id: number; data: Partial<FormState> }) =>
      updateManagerResidence(input.id, {
        name: input.data.name,
        address: input.data.address,
        city: input.data.city,
        gestionnaire_id:
          input.data.gestionnaire_id === NO_GESTIONNAIRE
            ? null
            : Number(input.data.gestionnaire_id),
      }),
    onSuccess: () => {
      toast.success(t('manager.residences.toast.updated'))
      invalidate()
      setEditTarget(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error(t('manager.residences.toast.updateFailed')),
  })

  const deleteMut = useMutation({
    mutationFn: deleteManagerResidence,
    onSuccess: () => {
      toast.success(t('manager.residences.toast.deleted'))
      invalidate()
      setDeleteTarget(null)
    },
    onError: () => toast.error(t('manager.residences.toast.deleteFailed')),
  })

  const assignMut = useMutation({
    mutationFn: (input: { residenceId: number; gestionnaireId: number }) =>
      assignGestionnaireToResidence(input.residenceId, input.gestionnaireId),
    onSuccess: () => {
      toast.success(t('manager.residences.toast.assigned'))
      invalidate()
      setAssignTarget(null)
    },
    onError: () => toast.error(t('manager.residences.toast.assignFailed')),
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(r: ManagerResidence) {
    setEditTarget(r)
    setForm({
      name: r.name,
      address: r.adresse,
      city: r.ville,
      gestionnaire_id:
        r.gestionnaire_id !== null
          ? String(r.gestionnaire_id)
          : NO_GESTIONNAIRE,
    })
  }

  function submitForm() {
    const data = {
      name: form.name,
      address: form.address,
      city: form.city,
      gestionnaire_id:
        form.gestionnaire_id === NO_GESTIONNAIRE
          ? null
          : Number(form.gestionnaire_id),
    }
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: form })
    } else {
      createMut.mutate(data)
    }
  }

  const gestionnaires = gestionnairesQuery.data ?? []

  const columns: Column<ManagerResidence>[] = [
    { key: 'name', header: t('manager.residences.col.name'), sortable: true },
    {
      key: 'ville',
      header: t('manager.residences.col.city'),
      sortable: true,
      renderCell: (r) => (
        <span className="text-muted-foreground">
          {r.adresse}, {r.ville}
        </span>
      ),
    },
    {
      key: 'nb_lots',
      header: t('manager.residences.col.lots'),
      sortable: true,
      renderCell: (r) => (
        <span className="font-mono tabular-nums">
          {r.nb_lots} / {r.nb_coproprietaires}
        </span>
      ),
    },
    {
      key: 'gestionnaire_nom',
      header: t('manager.residences.col.gestionnaire'),
      renderCell: (r) =>
        r.gestionnaire_nom ? (
          <span className="text-sm font-medium">{r.gestionnaire_nom}</span>
        ) : (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700"
          >
            {t('manager.residences.unassigned')}
          </Badge>
        ),
    },
    {
      key: 'statut',
      header: t('manager.residences.col.status'),
      renderCell: (r) => (
        <Badge
          variant="outline"
          className={
            r.statut === 'active'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }
        >
          {r.statut}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      renderCell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              aria-label={t('manager.actions.menu')}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(r)}>
              <Pencil className="size-4" />
              {t('manager.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setAssignTarget(r)
                setAssignChoice(
                  r.gestionnaire_id !== null ? String(r.gestionnaire_id) : '',
                )
              }}
            >
              <UserCog className="size-4" />
              {t('manager.residences.actions.assign')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(r)}
              className="text-[var(--destructive)] focus:text-[var(--destructive)]"
            >
              <Trash2 className="size-4" />
              {t('manager.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-[var(--primary)]">
            {t('manager.residences.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('manager.residences.subtitle')}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
        >
          <Plus className="size-4" />
          {t('manager.residences.add')}
        </Button>
      </div>

      {residencesQuery.isLoading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <DataTable
          data={residencesQuery.data ?? []}
          columns={columns}
          rowKey="id"
          searchable
          searchPlaceholder={t('manager.residences.searchPlaceholder')}
          exportable
          exportFilename="residences"
          emptyIcon={<Building2 className="size-12" />}
          emptyTitle={t('manager.residences.empty')}
          emptyDescription={t('manager.residences.emptyDesc')}
          emptyActionLabel={t('manager.residences.add')}
          onEmptyAction={openCreate}
        />
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={createOpen || editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditTarget(null)
            setForm(EMPTY_FORM)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget
                ? t('manager.residences.editTitle')
                : t('manager.residences.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('manager.residences.formDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">
                {t('manager.residences.form.name')}
              </Label>
              <Input
                id="r-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('manager.residences.form.namePh')}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-address">
                {t('manager.residences.form.address')}
              </Label>
              <Input
                id="r-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('manager.residences.form.addressPh')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-city">
                {t('manager.residences.form.city')}
              </Label>
              <Input
                id="r-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t('manager.residences.form.cityPh')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-gest">
                {t('manager.residences.form.gestionnaire')}
              </Label>
              <Select
                value={form.gestionnaire_id}
                onValueChange={(v) => setForm({ ...form, gestionnaire_id: v })}
              >
                <SelectTrigger id="r-gest">
                  <SelectValue
                    placeholder={t('manager.residences.unassigned')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GESTIONNAIRE}>
                    {t('manager.residences.unassigned')}
                  </SelectItem>
                  {gestionnaires
                    .filter((g) => g.statut === 'actif')
                    .map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setEditTarget(null)
              }}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={submitForm}
              disabled={!form.name || !form.address || !form.city}
              className="bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
            >
              {editTarget ? t('actions.save') : t('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog
        open={assignTarget !== null}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manager.residences.assignTitle')}</DialogTitle>
            <DialogDescription>
              {assignTarget?.name} · {assignTarget?.ville}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{t('manager.residences.form.gestionnaire')}</Label>
            <Select value={assignChoice} onValueChange={setAssignChoice}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t('manager.residences.pickGestionnaire')}
                />
              </SelectTrigger>
              <SelectContent>
                {gestionnaires
                  .filter((g) => g.statut === 'actif')
                  .map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} · {g.nb_residences}{' '}
                      {t('manager.residences.residences')}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              {t('actions.cancel')}
            </Button>
            <Button
              disabled={!assignChoice || assignMut.isPending}
              onClick={() =>
                assignMut.mutate({
                  residenceId: assignTarget!.id,
                  gestionnaireId: Number(assignChoice),
                })
              }
              className="bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
            >
              {t('manager.residences.actions.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('manager.residences.deleteTitle')}
        description={
          <>
            {t('manager.residences.deleteDesc')}{' '}
            <strong>{deleteTarget?.name}</strong>.
          </>
        }
        confirmLabel={t('actions.delete')}
        onConfirm={() => deleteMut.mutate(deleteTarget!.id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
