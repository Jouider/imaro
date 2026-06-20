import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Building2,
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
  ResidenceFilter,
  type Column,
} from '@/components/shared'
import {
  getAppUsers,
  createAppUser,
  updateAppUser,
  deleteAppUser,
  generatePassword,
  APP_ROLES,
  APP_PERMISSIONS,
  ROLE_PERMISSION_PRESETS,
  type AppUser,
  type AppRole,
  type AppPermission,
} from '@/services/equipe.service'
import { getResidences } from '@/services/gestionnaire.service'

type FormState = {
  name: string
  email: string
  cin: string
  role: AppRole
  password: string
  permissions: AppPermission[]
  residence_ids: number[]
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  cin: '',
  role: 'gestionnaire',
  password: '',
  permissions: [...ROLE_PERMISSION_PRESETS.gestionnaire],
  residence_ids: [],
}

/**
 * Gestion des utilisateurs de l'application (membres qui opèrent Imaro) :
 * syndic, syndic adjoint, administrateur, comptable, gestionnaire.
 * Création avec email + mot de passe généré + permissions modulaires.
 */
export function UtilisateursPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['equipe', 'utilisateurs'],
    queryFn: () => getAppUsers(),
  })

  const residencesQuery = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const residences = residencesQuery.data ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [copied, setCopied] = useState(false)

  const isEdit = editTarget !== null
  const dialogOpen = createOpen || isEdit

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['equipe', 'utilisateurs'] })

  const createMut = useMutation({
    mutationFn: createAppUser,
    onSuccess: () => {
      toast.success(t('equipe.utilisateurs.toast.created'))
      invalidate()
      closeDialog()
    },
    onError: () => toast.error(t('equipe.utilisateurs.toast.createFailed')),
  })

  const updateMut = useMutation({
    mutationFn: (input: { id: number; data: FormState }) =>
      updateAppUser(input.id, {
        name: input.data.name,
        email: input.data.email,
        cin: input.data.cin,
        role: input.data.role,
        permissions: input.data.permissions,
        residence_ids: input.data.residence_ids,
        ...(input.data.password ? { password: input.data.password } : {}),
      }),
    onSuccess: () => {
      toast.success(t('equipe.utilisateurs.toast.updated'))
      invalidate()
      closeDialog()
    },
    onError: () => toast.error(t('equipe.utilisateurs.toast.updateFailed')),
  })

  const toggleMut = useMutation({
    mutationFn: (input: { id: number; is_active: boolean }) =>
      updateAppUser(input.id, { is_active: input.is_active }),
    onSuccess: () => {
      toast.success(t('equipe.utilisateurs.toast.toggled'))
      invalidate()
    },
    onError: () => toast.error(t('equipe.utilisateurs.toast.toggleFailed')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAppUser(id),
    onSuccess: () => {
      toast.success(t('equipe.utilisateurs.toast.deleted'))
      invalidate()
      setDeleteTarget(null)
    },
    onError: () => toast.error(t('equipe.utilisateurs.toast.deleteFailed')),
  })

  function closeDialog() {
    setCreateOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setCopied(false)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, password: generatePassword() })
    setCreateOpen(true)
  }

  function openEdit(u: AppUser) {
    setEditTarget(u)
    setForm({
      name: u.name,
      email: u.email,
      cin: u.cin,
      role: u.role,
      password: '',
      permissions: [...u.permissions],
      residence_ids: [...u.residence_ids],
    })
  }

  /** Changer de rôle pré-coche les permissions du preset (restant éditables). */
  function changeRole(role: AppRole) {
    setForm((f) => ({
      ...f,
      role,
      permissions: [...ROLE_PERMISSION_PRESETS[role]],
    }))
  }

  function togglePermission(perm: AppPermission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  function toggleResidence(id: number) {
    setForm((f) => ({
      ...f,
      residence_ids: f.residence_ids.includes(id)
        ? f.residence_ids.filter((r) => r !== id)
        : [...f.residence_ids, id],
    }))
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(form.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('equipe.utilisateurs.toast.copyFailed'))
    }
  }

  function submitForm() {
    if (isEdit) {
      updateMut.mutate({ id: editTarget.id, data: form })
    } else {
      createMut.mutate({
        name: form.name,
        email: form.email,
        cin: form.cin,
        password: form.password,
        role: form.role,
        permissions: form.permissions,
        residence_ids: form.residence_ids,
      })
    }
  }

  const columns: Column<AppUser>[] = [
    {
      key: 'name',
      header: t('equipe.utilisateurs.col.name'),
      sortable: true,
      renderCell: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-xs font-bold text-white">
            {u.name
              .split(' ')
              .map((p) => p.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('equipe.utilisateurs.col.role'),
      sortable: true,
      renderCell: (u) => (
        <Badge
          variant="outline"
          className="border-[var(--color-imaro-primary)]/20 bg-[var(--color-imaro-primary-tint)]/50 text-[var(--primary)]"
        >
          {t(`equipe.utilisateurs.role.${u.role}`)}
        </Badge>
      ),
    },
    {
      key: 'residences',
      header: t('equipe.utilisateurs.col.residences'),
      renderCell: (u) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="size-3.5" />
          {u.residence_ids.length === 0
            ? t('equipe.utilisateurs.allResidences')
            : t('equipe.utilisateurs.nbResidences', {
                count: u.residence_ids.length,
              })}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: t('equipe.utilisateurs.col.permissions'),
      renderCell: (u) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          {u.permissions.length === APP_PERMISSIONS.length
            ? t('equipe.utilisateurs.allAccess')
            : t('equipe.utilisateurs.nbPermissions', {
                count: u.permissions.length,
              })}
        </span>
      ),
    },
    {
      key: 'statut',
      header: t('equipe.utilisateurs.col.status'),
      renderCell: (u) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={u.statut === 'actif'}
            onCheckedChange={(checked) =>
              toggleMut.mutate({ id: u.id, is_active: checked })
            }
            aria-label={t('equipe.utilisateurs.toggleAria')}
          />
          <Badge
            variant="outline"
            className={
              u.statut === 'actif'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400'
            }
          >
            {u.statut === 'actif'
              ? t('equipe.statusActive')
              : t('equipe.statusInactive')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      renderCell: (u) => (
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
            <DropdownMenuItem onClick={() => openEdit(u)}>
              <Pencil className="size-4" />
              {t('equipe.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteTarget(u)}
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
        title={t('equipe.utilisateurs.title')}
        subtitle={t('equipe.utilisateurs.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <ResidenceFilter />
            <Button
              onClick={openCreate}
              className="bg-gradient-imaro text-white shadow-sm hover:brightness-110"
            >
              <Plus className="size-4" />
              {t('equipe.utilisateurs.add')}
            </Button>
          </div>
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
          searchPlaceholder={t('equipe.utilisateurs.searchPlaceholder')}
          emptyIcon={<Users className="size-12" />}
          emptyTitle={t('equipe.utilisateurs.empty')}
          emptyDescription={t('equipe.utilisateurs.emptyDesc')}
          emptyActionLabel={t('equipe.utilisateurs.add')}
          onEmptyAction={openCreate}
        />
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? t('equipe.utilisateurs.editTitle')
                : t('equipe.utilisateurs.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('equipe.utilisateurs.formDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">
                  {t('equipe.utilisateurs.form.name')}
                </Label>
                <Input
                  id="u-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('equipe.utilisateurs.form.namePh')}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-role">
                  {t('equipe.utilisateurs.form.role')}
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => changeRole(v as AppRole)}
                >
                  <SelectTrigger id="u-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`equipe.utilisateurs.role.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-email">
                {t('equipe.utilisateurs.form.email')}
              </Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nom@imaro.ma"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-cin">
                {t('equipe.cin')}{' '}
                <span className="text-[var(--color-imaro-danger)]">*</span>
              </Label>
              <Input
                id="u-cin"
                value={form.cin}
                onChange={(e) => setForm({ ...form, cin: e.target.value })}
                placeholder={t('equipe.cinPlaceholder')}
                aria-invalid={form.cin.trim() === ''}
              />
            </div>

            {/* Password — auto-generated, copyable, regenerable */}
            <div className="space-y-1.5">
              <Label htmlFor="u-password">
                {isEdit
                  ? t('equipe.utilisateurs.form.resetPassword')
                  : t('equipe.utilisateurs.form.password')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="u-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={
                    isEdit ? t('equipe.utilisateurs.form.passwordKeep') : ''
                  }
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setForm({ ...form, password: generatePassword() })
                  }
                  aria-label={t('equipe.utilisateurs.form.regenerate')}
                  title={t('equipe.utilisateurs.form.regenerate')}
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  disabled={!form.password}
                  aria-label={t('equipe.utilisateurs.form.copy')}
                  title={t('equipe.utilisateurs.form.copy')}
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t('equipe.utilisateurs.form.passwordHint')}
                </p>
              )}
            </div>

            {/* Résidences assignées */}
            <div className="space-y-2">
              <Label>{t('equipe.utilisateurs.form.residences')}</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-3">
                {residences.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t('equipe.utilisateurs.form.noResidences')}
                  </p>
                ) : (
                  residences.map((r) => (
                    <label
                      key={r.id}
                      htmlFor={`res-${r.id}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`res-${r.id}`}
                        checked={form.residence_ids.includes(r.id)}
                        onCheckedChange={() => toggleResidence(r.id)}
                      />
                      {r.name}
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('equipe.utilisateurs.form.residencesHint')}
              </p>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label>{t('equipe.utilisateurs.form.permissions')}</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {APP_PERMISSIONS.map((perm) => (
                  <label
                    key={perm}
                    htmlFor={`perm-${perm}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={form.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    {t(`equipe.permissions.${perm}`)}
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
                !form.email ||
                !form.cin.trim() ||
                (!isEdit && !form.password) ||
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
        title={t('equipe.utilisateurs.deleteTitle')}
        description={
          <>
            {t('equipe.utilisateurs.deleteDesc')}{' '}
            <strong>{deleteTarget?.name}</strong>
          </>
        }
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
