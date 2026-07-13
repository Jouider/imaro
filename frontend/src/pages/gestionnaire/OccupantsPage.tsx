import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Home,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getResidences, getLots } from '@/services/gestionnaire.service'
import {
  getOccupantsByResidence,
  createOccupant,
  updateOccupant,
  deleteOccupant,
  type Occupant,
  type OccupantType,
  type CreateOccupantInput,
} from '@/services/conformite.service'

const TYPE_META: Record<
  OccupantType,
  { label: string; cls: string; icon: typeof Home }
> = {
  proprietaire_occupant: {
    label: 'Propriétaire occupant',
    cls: 'border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/5 text-[var(--color-imaro-primary)]',
    icon: Home,
  },
  usufruitier: {
    label: 'Usufruitier',
    cls: 'border-purple-200 bg-purple-50 text-purple-700',
    icon: UserCheck,
  },
  autre: {
    label: 'Autre',
    cls: 'border-gray-200 bg-gray-50 text-gray-700',
    icon: UserCheck,
  },
}

const dt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function OccupantsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const globalResidenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Occupant | null>(null)
  const [draft, setDraft] = useState<CreateOccupantInput>({
    lot_id: 0,
    nom: '',
    telephone: '',
    email: '',
    type: 'proprietaire_occupant',
    date_debut: new Date().toISOString().slice(0, 10),
    date_fin: '',
  })

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  const residenceId = globalResidenceId ?? residencesQ.data?.[0]?.id ?? null

  const occupantsQ = useQuery({
    queryKey: ['occupants', residenceId],
    queryFn: () => getOccupantsByResidence(residenceId!),
    enabled: !!residenceId,
  })

  const lotsQ = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId!),
    enabled: !!residenceId,
  })

  const lots = lotsQ.data?.lots ?? []

  const createMut = useMutation({
    mutationFn: ({
      lotId,
      input,
    }: {
      lotId: number
      input: CreateOccupantInput
    }) => createOccupant(lotId, input),
    onSuccess: () => {
      toast.success(t('gestionnaire.occupants.toastAdded'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['occupants', residenceId],
      })
    },
    onError: () => toast.error(t('common.createFailed')),
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number
      patch: Partial<CreateOccupantInput>
    }) => updateOccupant(id, patch),
    onSuccess: () => {
      toast.success(t('gestionnaire.occupants.toastUpdated'))
      setModalOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ['occupants', residenceId],
      })
    },
    onError: () => toast.error(t('common.updateFailed')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOccupant(id),
    onSuccess: () => {
      toast.success(t('gestionnaire.occupants.toastDeleted'))
      void queryClient.invalidateQueries({
        queryKey: ['occupants', residenceId],
      })
    },
    onError: () => toast.error(t('common.deleteFailed')),
  })

  const openCreateModal = () => {
    setEditing(null)
    setDraft({
      lot_id: lots[0]?.id ?? 0,
      nom: '',
      telephone: '',
      email: '',
      type: 'proprietaire_occupant',
      date_debut: new Date().toISOString().slice(0, 10),
      date_fin: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (o: Occupant) => {
    setEditing(o)
    setDraft({
      lot_id: o.lot_id,
      coproprietaire_id: o.coproprietaire_id,
      nom: o.nom,
      telephone: o.telephone ?? '',
      email: o.email ?? '',
      type: o.type,
      date_debut: o.date_debut,
      date_fin: o.date_fin ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!draft.nom.trim()) {
      toast.error(t('common.nameRequired'))
      return
    }
    if (!draft.lot_id) {
      toast.error(t('common.lotRequired'))
      return
    }
    // Strip empty date_fin
    const cleaned = { ...draft, date_fin: draft.date_fin || undefined }
    if (editing) updateMut.mutate({ id: editing.id, patch: cleaned })
    else createMut.mutate({ lotId: draft.lot_id, input: cleaned })
  }

  const occupants = occupantsQ.data ?? []
  const byType = {
    proprietaire_occupant: occupants.filter(
      (o) => o.type === 'proprietaire_occupant',
    ).length,
    other: occupants.filter(
      (o) => o.type === 'usufruitier' || o.type === 'autre',
    ).length,
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-gradient-imaro flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-[var(--color-imaro-primary)]/20">
          <UserCheck className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {t('gestionnaire.occupants.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('gestionnaire.occupants.subtitle')}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={openCreateModal}
          disabled={lots.length === 0}
        >
          <Plus className="size-4" />
          {t('actions.add')}
        </Button>
      </div>

      {/* Residence selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">{t('common.residence')}</label>
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setResidenceId(Number(v))}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Home className="size-4 text-[var(--color-imaro-primary)]" />
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.occupants.kpiOwners')}
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {byType.proprietaire_occupant}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <UserCheck className="size-4 text-purple-600" />
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.occupants.kpiOthers')}
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight">{byType.other}</p>
        </div>
      </div>

      {/* Legal note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>{t('gestionnaire.occupants.bannerTitle')}</strong>{' '}
          {t('gestionnaire.occupants.bannerBody')}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('gestionnaire.occupants.colLot')}</TableHead>
              <TableHead>{t('gestionnaire.occupants.colNom')}</TableHead>
              <TableHead>{t('common.type')}</TableHead>
              <TableHead>{t('common.phone')}</TableHead>
              <TableHead>{t('common.periode')}</TableHead>
              <TableHead className="text-right">
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occupantsQ.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {t('actions.loading')}
                </TableCell>
              </TableRow>
            ) : occupants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {t('gestionnaire.occupants.emptyRow')}
                </TableCell>
              </TableRow>
            ) : (
              occupants.map((o) => {
                const meta = TYPE_META[o.type] ?? TYPE_META.autre
                const lot = lots.find((l) => l.id === o.lot_id)
                const Icon = meta.icon
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">
                      {lot?.numero ?? `Lot #${o.lot_id}`}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {o.nom}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] gap-1', meta.cls)}
                      >
                        <Icon className="size-3" />
                        {t(`gestionnaire.occupants.type.${o.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {o.telephone ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dt.format(new Date(o.date_debut))}
                      {o.date_fin && <> → {dt.format(new Date(o.date_fin))}</>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEditModal(o)}
                          title={t('actions.edit')}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            if (
                              confirm(
                                t('gestionnaire.occupants.confirmDelete', {
                                  nom: o.nom,
                                }),
                              )
                            )
                              deleteMut.mutate(o.id)
                          }}
                          title={t('actions.delete')}
                        >
                          <Trash2 className="size-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('gestionnaire.occupants.modalEdit')
                : t('gestionnaire.occupants.modalNew')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="lot">{t('gestionnaire.occupants.colLot')}</Label>
              <Select
                value={String(draft.lot_id || '')}
                onValueChange={(v) => setDraft({ ...draft, lot_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('gestionnaire.occupants.chooseLot')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.numero} — {l.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nom">
                {t('gestionnaire.occupants.colNom')} *
              </Label>
              <Input
                id="nom"
                value={draft.nom}
                onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tel">{t('common.phone')}</Label>
                <Input
                  id="tel"
                  value={draft.telephone}
                  onChange={(e) =>
                    setDraft({ ...draft, telephone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">{t('common.type')}</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft({ ...draft, type: v as OccupantType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as OccupantType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`gestionnaire.occupants.type.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="debut">{t('common.startDate')}</Label>
                <Input
                  id="debut"
                  type="date"
                  value={draft.date_debut}
                  onChange={(e) =>
                    setDraft({ ...draft, date_debut: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fin">
                  {t('gestionnaire.occupants.dateFinOptional')}
                </Label>
                <Input
                  id="fin"
                  type="date"
                  value={draft.date_fin ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, date_fin: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? t('common.update') : t('actions.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
