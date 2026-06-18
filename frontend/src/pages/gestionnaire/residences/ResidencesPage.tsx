import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowRight,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import {
  getResidences,
  storeResidence,
  updateResidence,
  type CreateResidenceInput,
  type Residence,
} from '@/services/gestionnaire.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ResidenceFormDialog } from '@/components/gestionnaire/ResidenceFormDialog'
import { DeleteResidenceDialog } from '@/components/gestionnaire/DeleteResidenceDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'lots' | 'recouvrement'

function recouvrementColor(taux: number) {
  if (taux >= 80) return 'bg-[var(--color-imaro-success)]'
  if (taux >= 50) return 'bg-[var(--color-imaro-warning)]'
  return 'bg-[var(--color-imaro-danger)]'
}

export function ResidencesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Residence | null>(null)
  const [deleting, setDeleting] = useState<Residence | null>(null)

  const { data: residences = [], isLoading } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const cities = useMemo(
    () => Array.from(new Set(residences.map((r) => r.city))).sort(),
    [residences],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = residences.filter((r) => {
      const matchesQuery =
        q === '' ||
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      const matchesCity = cityFilter === 'all' || r.city === cityFilter
      return matchesQuery && matchesCity
    })
    return [...list].sort((a, b) => {
      if (sortKey === 'lots') return b.nb_lots - a.nb_lots
      if (sortKey === 'recouvrement')
        return b.taux_recouvrement - a.taux_recouvrement
      return a.name.localeCompare(b.name)
    })
  }, [residences, search, cityFilter, sortKey])

  const storeMutation = useMutation({
    mutationFn: (data: CreateResidenceInput) => storeResidence(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['residences'] })
      setFormOpen(false)
      toast.success(t('gestionnaire.residences.toast.created'))
    },
    onError: () => toast.error(t('gestionnaire.residences.toast.createError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateResidenceInput }) =>
      updateResidence(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['residences'] })
      setFormOpen(false)
      setEditing(null)
      toast.success(t('gestionnaire.residences.toast.updated'))
    },
    onError: () => toast.error(t('gestionnaire.residences.toast.updateError')),
  })

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(r: Residence) {
    setEditing(r)
    setFormOpen(true)
  }

  function handleSubmit(data: CreateResidenceInput) {
    if (editing) updateMutation.mutate({ id: editing.id, data })
    else storeMutation.mutate(data)
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.residences.title')}
        subtitle={t('gestionnaire.residences.subtitle')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="me-1.5 size-4" />
            {t('gestionnaire.residences.add')}
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('gestionnaire.residences.searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('gestionnaire.residences.allCities')}
            </SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">
              {t('gestionnaire.residences.sortName')}
            </SelectItem>
            <SelectItem value="lots">
              {t('gestionnaire.residences.sortLots')}
            </SelectItem>
            <SelectItem value="recouvrement">
              {t('gestionnaire.residences.sortRecouvrement')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : residences.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-12 text-muted-foreground" />}
          title={t('gestionnaire.residences.empty')}
          description={t('gestionnaire.residences.emptyDesc')}
          primaryAction={{
            label: t('gestionnaire.residences.add'),
            onClick: openCreate,
            icon: <Plus className="size-4" />,
          }}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          {t('gestionnaire.residences.noMatch')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <ResidenceCard
              key={r.id}
              residence={r}
              onOpen={() => navigate(`/gestionnaire/residences/${r.id}`)}
              onEdit={() => openEdit(r)}
              onDelete={() => setDeleting(r)}
            />
          ))}
        </div>
      )}

      <ResidenceFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditing(null)
        }}
        residence={editing}
        onSubmit={handleSubmit}
        isLoading={storeMutation.isPending || updateMutation.isPending}
      />

      <DeleteResidenceDialog
        residence={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onDeleted={() => {
          void qc.invalidateQueries({ queryKey: ['residences'] })
          setDeleting(null)
        }}
      />
    </div>
  )
}

function ResidenceCard({
  residence: r,
  onOpen,
  onEdit,
  onDelete,
}: {
  residence: Residence
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const isActif = r.status === 'actif'

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-white">
          <Building2 className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg leading-tight text-foreground">
            {r.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{r.city}</span>
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            isActif
              ? 'bg-green-100 text-green-800 ring-green-600/20'
              : 'bg-muted text-muted-foreground ring-border',
          )}
        >
          {isActif
            ? t('gestionnaire.residences.statusActif')
            : t('gestionnaire.residences.statusInactif')}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            {t('gestionnaire.residences.colLots')}
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">
            {r.nb_lots}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            {t('gestionnaire.residences.colRecouvrement')}
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">
            {r.taux_recouvrement.toFixed(0)} %
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              recouvrementColor(r.taux_recouvrement),
            )}
            style={{ width: `${Math.min(r.taux_recouvrement, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center gap-2 border-t pt-3">
        <Button onClick={onOpen} size="sm" className="flex-1">
          {t('gestionnaire.residences.manage')}
          <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          aria-label={t('actions.edit')}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          aria-label={t('actions.delete')}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
