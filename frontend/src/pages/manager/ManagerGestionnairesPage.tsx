import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, Plus, Pencil, MoreHorizontal, Mail, Phone } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, LoadingSkeleton, type Column } from '@/components/shared'
import {
  getManagerGestionnaires,
  createManagerGestionnaire,
  updateManagerGestionnaire,
  type ManagerGestionnaire,
} from '@/services/manager.service'

type FormState = {
  name: string
  email: string
  phone: string
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '' }

/**
 * Manager — gestion des gestionnaires : CRUD + toggle actif/inactif.
 */
export function ManagerGestionnairesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['manager', 'gestionnaires'],
    queryFn: () => getManagerGestionnaires(),
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ManagerGestionnaire | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['manager', 'gestionnaires'],
    })
    void queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] })
  }

  const createMut = useMutation({
    mutationFn: createManagerGestionnaire,
    onSuccess: () => {
      toast.success(t('manager.gestionnaires.toast.created'))
      invalidate()
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error(t('manager.gestionnaires.toast.createFailed')),
  })

  const updateMut = useMutation({
    mutationFn: (input: { id: number; data: FormState }) =>
      updateManagerGestionnaire(input.id, {
        name: input.data.name,
        email: input.data.email,
        phone: input.data.phone || null,
      }),
    onSuccess: () => {
      toast.success(t('manager.gestionnaires.toast.updated'))
      invalidate()
      setEditTarget(null)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error(t('manager.gestionnaires.toast.updateFailed')),
  })

  const toggleMut = useMutation({
    mutationFn: (input: { id: number; is_active: boolean }) =>
      updateManagerGestionnaire(input.id, { is_active: input.is_active }),
    onSuccess: () => {
      toast.success(t('manager.gestionnaires.toast.toggled'))
      invalidate()
    },
    onError: () => toast.error(t('manager.gestionnaires.toast.toggleFailed')),
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(g: ManagerGestionnaire) {
    setEditTarget(g)
    setForm({ name: g.name, email: g.email, phone: g.phone ?? '' })
  }

  function submitForm() {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: form })
    } else {
      createMut.mutate({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
      })
    }
  }

  const columns: Column<ManagerGestionnaire>[] = [
    {
      key: 'name',
      header: t('manager.gestionnaires.col.name'),
      sortable: true,
      renderCell: (g) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-xs font-bold text-white">
            {g.name
              .split(' ')
              .map((p) => p.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <span className="font-medium">{g.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('manager.gestionnaires.col.contact'),
      renderCell: (g) => (
        <div className="space-y-0.5 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3.5" />
            {g.email}
          </div>
          {g.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3.5" />
              {g.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'nb_residences',
      header: t('manager.gestionnaires.col.residences'),
      sortable: true,
      renderCell: (g) => (
        <span className="font-mono tabular-nums">{g.nb_residences}</span>
      ),
    },
    {
      key: 'statut',
      header: t('manager.gestionnaires.col.status'),
      renderCell: (g) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={g.statut === 'actif'}
            onCheckedChange={(checked) =>
              toggleMut.mutate({ id: g.id, is_active: checked })
            }
            aria-label={t('manager.gestionnaires.toggleAria')}
          />
          <Badge
            variant="outline"
            className={
              g.statut === 'actif'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }
          >
            {g.statut === 'actif'
              ? t('manager.gestionnaires.statusActive')
              : t('manager.gestionnaires.statusInactive')}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      renderCell: (g) => (
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
            <DropdownMenuItem onClick={() => openEdit(g)}>
              <Pencil className="size-4" />
              {t('manager.actions.edit')}
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
            {t('manager.gestionnaires.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('manager.gestionnaires.subtitle')}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
        >
          <Plus className="size-4" />
          {t('manager.gestionnaires.add')}
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : (
        <DataTable
          data={query.data ?? []}
          columns={columns}
          rowKey="id"
          searchable
          searchPlaceholder={t('manager.gestionnaires.searchPlaceholder')}
          emptyIcon={<Users className="size-12" />}
          emptyTitle={t('manager.gestionnaires.empty')}
          emptyDescription={t('manager.gestionnaires.emptyDesc')}
          emptyActionLabel={t('manager.gestionnaires.add')}
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
                ? t('manager.gestionnaires.editTitle')
                : t('manager.gestionnaires.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('manager.gestionnaires.formDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">
                {t('manager.gestionnaires.form.name')}
              </Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('manager.gestionnaires.form.namePh')}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-email">
                {t('manager.gestionnaires.form.email')}
              </Label>
              <Input
                id="g-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nom@imaro.ma"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-phone">
                {t('manager.gestionnaires.form.phone')}{' '}
                <span className="text-muted-foreground">
                  ({t('manager.optional')})
                </span>
              </Label>
              <Input
                id="g-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+212 6 12 34 56 78"
              />
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
              disabled={!form.name || !form.email}
              className="bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]"
            >
              {editTarget ? t('actions.save') : t('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
