import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  HardHat,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Phone,
  Building2,
  ShieldCheck,
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DataTable,
  LoadingSkeleton,
  ConfirmModal,
  PageHeader,
  type Column,
} from '@/components/shared'
import {
  getResidenceStaff,
  createResidenceStaff,
  updateResidenceStaff,
  deleteResidenceStaff,
  STAFF_POSTES,
  STAFF_PERMISSIONS,
  type ResidenceStaff,
  type StaffPoste,
  type StaffPermission,
} from '@/services/equipe.service'
import { getResidences } from '@/services/gestionnaire.service'

type FormState = {
  name: string
  poste: StaffPoste
  residence_id: string
  phone: string
  permissions: StaffPermission[]
}

const EMPTY_FORM: FormState = {
  name: '',
  poste: 'securite',
  residence_id: '',
  phone: '',
  permissions: ['acces_residence'],
}

const POSTE_STYLES: Record<StaffPoste, string> = {
  securite: 'border-blue-200 bg-blue-50 text-blue-700',
  menage: 'border-teal-200 bg-teal-50 text-teal-700',
  gardien: 'border-amber-200 bg-amber-50 text-amber-700',
  jardinier: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  technicien: 'border-violet-200 bg-violet-50 text-violet-700',
  concierge: 'border-rose-200 bg-rose-50 text-rose-700',
}

/**
 * Gestion du personnel de terrain affecté aux résidences :
 * agent de sécurité, femme de ménage, gardien, jardinier, technicien, concierge.
 * Création avec affectation à une résidence + permissions opérationnelles.
 */
export function PersonnelPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['equipe', 'personnel'],
    queryFn: () => getResidenceStaff(),
  })

  const residencesQuery = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const residences = residencesQuery.data ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ResidenceStaff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResidenceStaff | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const isEdit = editTarget !== null
  const dialogOpen = createOpen || isEdit

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['equipe', 'personnel'] })

  const residenceNom = (id: number) =>
    residences.find((r) => r.id === id)?.name ?? ''

  const createMut = useMutation({
    mutationFn: (data: FormState) =>
      createResidenceStaff(
        {
          name: data.name,
          poste: data.poste,
          residence_id: Number(data.residence_id),
          phone: data.phone || null,
          permissions: data.permissions,
        },
        residenceNom(Number(data.residence_id)),
      ),
    onSuccess: () => {
      toast.success(t('equipe.personnel.toast.created'))
      invalidate()
      closeDialog()
    },
    onError: () => toast.error(t('equipe.personnel.toast.createFailed')),
  })

  const updateMut = useMutation({
    mutationFn: (input: { id: number; data: FormState }) =>
      updateResidenceStaff(
        input.id,
        {
          name: input.data.name,
          poste: input.data.poste,
          residence_id: Number(input.data.residence_id),
          phone: input.data.phone || null,
          permissions: input.data.permissions,
        },
        residenceNom(Number(input.data.residence_id)),
      ),
    onSuccess: () => {
      toast.success(t('equipe.personnel.toast.updated'))
      invalidate()
      closeDialog()
    },
    onError: () => toast.error(t('equipe.personnel.toast.updateFailed')),
  })

  const toggleMut = useMutation({
    mutationFn: (input: { id: number; is_active: boolean }) =>
      updateResidenceStaff(input.id, { is_active: input.is_active }),
    onSuccess: () => {
      toast.success(t('equipe.personnel.toast.toggled'))
      invalidate()
    },
    onError: () => toast.error(t('equipe.personnel.toast.toggleFailed')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteResidenceStaff(id),
    onSuccess: () => {
      toast.success(t('equipe.personnel.toast.deleted'))
      invalidate()
      setDeleteTarget(null)
    },
    onError: () => toast.error(t('equipe.personnel.toast.deleteFailed')),
  })

  function closeDialog() {
    setCreateOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      residence_id: residences[0] ? String(residences[0].id) : '',
    })
    setCreateOpen(true)
  }

  function openEdit(s: ResidenceStaff) {
    setEditTarget(s)
    setForm({
      name: s.name,
      poste: s.poste,
      residence_id: String(s.residence_id),
      phone: s.phone ?? '',
      permissions: [...s.permissions],
    })
  }

  function togglePermission(perm: StaffPermission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  function submitForm() {
    if (isEdit) {
      updateMut.mutate({ id: editTarget.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  const columns: Column<ResidenceStaff>[] = [
    {
      key: 'name',
      header: t('equipe.personnel.col.name'),
      sortable: true,
      renderCell: (s) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-xs font-bold text-white">
            {s.name
              .split(' ')
              .map((p) => p.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <span className="font-medium">{s.name}</span>
        </div>
      ),
    },
    {
      key: 'poste',
      header: t('equipe.personnel.col.poste'),
      sortable: true,
      renderCell: (s) => (
        <Badge
          variant="outline"
          className={`${POSTE_STYLES[s.poste]} dark:bg-transparent`}
        >
          {t(`equipe.personnel.poste.${s.poste}`)}
        </Badge>
      ),
    },
    {
      key: 'residence_nom',
      header: t('equipe.personnel.col.residence'),
      sortable: true,
      renderCell: (s) => (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Building2 className="size-3.5 text-muted-foreground" />
          {s.residence_nom}
        </span>
      ),
    },
    {
      key: 'phone',
      header: t('equipe.personnel.col.contact'),
      renderCell: (s) =>
        s.phone ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="size-3.5" />
            {s.phone}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'permissions',
      header: t('equipe.personnel.col.permissions'),
      renderCell: (s) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          {t('equipe.personnel.nbPermissions', { count: s.permissions.length })}
        </span>
      ),
    },
    {
      key: 'statut',
      header: t('equipe.personnel.col.status'),
      renderCell: (s) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={s.statut === 'actif'}
            onCheckedChange={(checked) =>
              toggleMut.mutate({ id: s.id, is_active: checked })
            }
            aria-label={t('equipe.personnel.toggleAria')}
          />
          <Badge
            variant="outline"
            className={
              s.statut === 'actif'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400'
            }
          >
            {s.statut === 'actif'
              ? t('equipe.statusActive')
              : t('equipe.statusInactive')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      renderCell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0"
              aria-label={t('equipe.actions.menu')}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(s)}>
              <Pencil className="size-4" />
              {t('equipe.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteTarget(s)}
              className="text-[var(--destructive)] focus:text-[var(--destructive)]"
            >
              <Trash2 className="size-4" />
              {t('equipe.actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('equipe.personnel.title')}
        subtitle={t('equipe.personnel.subtitle')}
        actions={
          <Button
            onClick={openCreate}
            className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
          >
            <Plus className="size-4" />
            {t('equipe.personnel.add')}
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <DataTable
          data={query.data ?? []}
          columns={columns}
          rowKey="id"
          searchable
          searchPlaceholder={t('equipe.personnel.searchPlaceholder')}
          emptyIcon={<HardHat className="size-12" />}
          emptyTitle={t('equipe.personnel.empty')}
          emptyDescription={t('equipe.personnel.emptyDesc')}
          emptyActionLabel={t('equipe.personnel.add')}
          onEmptyAction={openCreate}
        />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? t('equipe.personnel.editTitle')
                : t('equipe.personnel.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('equipe.personnel.formDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">{t('equipe.personnel.form.name')}</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('equipe.personnel.form.namePh')}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-poste">
                  {t('equipe.personnel.form.poste')}
                </Label>
                <Select
                  value={form.poste}
                  onValueChange={(v) =>
                    setForm({ ...form, poste: v as StaffPoste })
                  }
                >
                  <SelectTrigger id="s-poste">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_POSTES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`equipe.personnel.poste.${p}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-residence">
                  {t('equipe.personnel.form.residence')}
                </Label>
                <Select
                  value={form.residence_id}
                  onValueChange={(v) => setForm({ ...form, residence_id: v })}
                >
                  <SelectTrigger id="s-residence">
                    <SelectValue
                      placeholder={t('equipe.personnel.form.residencePh')}
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
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-phone">
                {t('equipe.personnel.form.phone')}{' '}
                <span className="text-muted-foreground">
                  ({t('equipe.optional')})
                </span>
              </Label>
              <Input
                id="s-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+212 6 12 34 56 78"
              />
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>{t('equipe.personnel.form.permissions')}</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {STAFF_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    htmlFor={`sperm-${perm}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`sperm-${perm}`}
                      checked={form.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {t(`equipe.staffPerm.${perm}`)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={submitForm}
              disabled={
                !form.name ||
                !form.residence_id ||
                createMut.isPending ||
                updateMut.isPending
              }
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              {isEdit ? t('actions.save') : t('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmModal
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t('equipe.personnel.deleteTitle')}
        description={
          <>
            {t('equipe.personnel.deleteDesc')}{' '}
            <strong>{deleteTarget?.name}</strong>
          </>
        }
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
