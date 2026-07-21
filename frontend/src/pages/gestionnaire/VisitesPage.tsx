import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResidenceStore } from '@/stores/residenceStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  UserCheck,
  Plus,
  ScanLine,
  Truck,
  HardHat,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  AlertCircle,
  Copy,
  MessageCircle,
  Smartphone,
  Link as LinkIcon,
  Ban,
  Repeat2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/shared/KpiCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { QrScanner } from '@/components/shared/QrScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { getResidences, getLots } from '@/services/gestionnaire.service'
import {
  getVisites,
  createVisite,
  cancelVisite,
  scanVisite,
  type Visite,
  type VisiteType,
  type VisiteStatus,
  type CreateVisiteInput,
} from '@/services/visites.service'

// ─── Visual maps ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<VisiteType, typeof UserCheck> = {
  visitor: UserCheck,
  delivery: Truck,
  contractor: HardHat,
  prestataire: Wrench,
}

const TYPE_TONE: Record<VisiteType, string> = {
  visitor:
    'border-[var(--color-imaro-primary)]/30 bg-[var(--color-imaro-primary)]/5 text-[var(--color-imaro-primary)]',
  delivery: 'border-orange-200 bg-orange-50 text-orange-700',
  contractor: 'border-purple-200 bg-purple-50 text-purple-700',
  prestataire: 'border-teal-200 bg-teal-50 text-teal-700',
}

const STATUS_META: Record<VisiteStatus, { icon: typeof Clock; cls: string }> = {
  planned: {
    icon: Hourglass,
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400',
  },
  arrived: {
    icon: CheckCircle2,
    cls: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400',
  },
  departed: {
    icon: UserCheck,
    cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-900/40 dark:bg-slate-950/20 dark:text-slate-400',
  },
  expired: {
    icon: AlertCircle,
    cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400',
  },
  cancelled: {
    icon: XCircle,
    cls: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-900/40 dark:bg-gray-950/20 dark:text-gray-400',
  },
}

const dtFmt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const dtLongFmt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function visitorPassUrl(token: string): string {
  return `${window.location.origin}/v/${token}`
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function VisitesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const globalResidenceId = useResidenceStore((s) => s.residenceId)
  const setResidenceId = useResidenceStore((s) => s.setResidenceId)
  const [createOpen, setCreateOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [detail, setDetail] = useState<Visite | null>(null)
  const [statusFilter, setStatusFilter] = useState<VisiteStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<VisiteType | 'all'>('all')

  const residencesQ = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })
  const realResidenceId = globalResidenceId ?? residencesQ.data?.[0]?.id ?? null
  const residenceId = realResidenceId ?? (import.meta.env.DEV ? 0 : null)

  const visitesQ = useQuery({
    queryKey: ['visites', residenceId],
    queryFn: () => getVisites(residenceId as number),
    enabled: residenceId !== null,
  })

  const visites = useMemo(() => visitesQ.data ?? [], [visitesQ.data])

  // KAN-134 : les KPI sont dérivés de la liste chargée (source de vérité affichée
  // dans le tableau) plutôt que d'un endpoint /stats séparé qui ne renvoyait rien
  // → les compteurs restaient à 0.
  const stats = useMemo(() => {
    const isToday = (iso?: string | null) => {
      if (!iso) return false
      const d = new Date(iso)
      const n = new Date()
      return (
        d.getFullYear() === n.getFullYear() &&
        d.getMonth() === n.getMonth() &&
        d.getDate() === n.getDate()
      )
    }
    return {
      today: visites.filter(
        (v) => isToday(v.planned_at) || isToday(v.arrived_at),
      ).length,
      currently_inside: visites.filter((v) => v.status === 'arrived').length,
      planned: visites.filter((v) => v.status === 'planned').length,
      expired_today: visites.filter(
        (v) => v.status === 'expired' && isToday(v.planned_at),
      ).length,
    }
  }, [visites])

  const filtered = visites.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    if (typeFilter !== 'all' && v.type !== typeFilter) return false
    return true
  })

  // ── Columns ──
  const columns: Column<Visite>[] = useMemo(
    () => [
      {
        key: 'visitor_name',
        header: t('gestionnaire.visites.colVisitor'),
        sortable: true,
        renderCell: (v) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {v.visitor_name}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {v.visitor_phone}
            </span>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('gestionnaire.visites.colType'),
        renderCell: (v) => {
          const Icon = TYPE_ICON[v.type]
          return (
            <Badge
              variant="outline"
              className={cn('gap-1 text-[10px]', TYPE_TONE[v.type])}
            >
              <Icon className="size-3" />
              {t(`gestionnaire.visites.type.${v.type}`)}
            </Badge>
          )
        },
      },
      {
        key: 'host_name',
        header: t('gestionnaire.visites.colHost'),
        renderCell: (v) => (
          <div className="flex flex-col text-sm">
            <span>{v.host_name ?? '—'}</span>
            {v.host_lot_numero && (
              <span className="text-xs text-muted-foreground">
                Lot {v.host_lot_numero}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'planned_at',
        header: t('gestionnaire.visites.colPlanned'),
        sortable: true,
        renderCell: (v) =>
          v.planned_at ? (
            <span className="text-sm tabular-nums">
              {dtFmt.format(new Date(v.planned_at))}
            </span>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              walk-in
            </span>
          ),
      },
      {
        key: 'arrived_at',
        header: t('gestionnaire.visites.colArrived'),
        renderCell: (v) =>
          v.arrived_at ? (
            <span className="text-sm tabular-nums text-green-700 dark:text-green-400">
              {dtFmt.format(new Date(v.arrived_at))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'left_at',
        header: t('gestionnaire.visites.colLeft'),
        renderCell: (v) =>
          v.left_at ? (
            <span className="text-sm tabular-nums text-muted-foreground">
              {dtFmt.format(new Date(v.left_at))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'status',
        header: t('gestionnaire.visites.colStatus'),
        renderCell: (v) => {
          const meta = STATUS_META[v.status]
          const Icon = meta.icon
          return (
            <Badge
              variant="outline"
              className={cn('gap-1 text-[10px]', meta.cls)}
            >
              <Icon className="size-3" />
              {t(`gestionnaire.visites.status.${v.status}`)}
            </Badge>
          )
        },
      },
      {
        key: 'id',
        header: '',
        className: 'w-20 text-right',
        renderCell: (v) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDetail(v)}
          >
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={t('gestionnaire.visites.title')}
        subtitle={t('gestionnaire.visites.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setScanOpen(true)}
            >
              <ScanLine className="size-4" />
              {t('gestionnaire.visites.scanQr')}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              {t('gestionnaire.visites.newVisite')}
            </Button>
          </div>
        }
      />

      {/* Residence + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={residenceId ? String(residenceId) : ''}
          onValueChange={(v) => setResidenceId(Number(v))}
        >
          <SelectTrigger className="w-60">
            <SelectValue
              placeholder={t('gestionnaire.visites.selectResidence')}
            />
          </SelectTrigger>
          <SelectContent>
            {(residencesQ.data ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as VisiteStatus | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('gestionnaire.visites.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('gestionnaire.visites.filterAll')}
            </SelectItem>
            {(
              [
                'planned',
                'arrived',
                'departed',
                'expired',
                'cancelled',
              ] as const
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`gestionnaire.visites.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as VisiteType | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('gestionnaire.visites.filterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('gestionnaire.visites.filterAll')}
            </SelectItem>
            {(
              ['visitor', 'delivery', 'contractor', 'prestataire'] as const
            ).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`gestionnaire.visites.type.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Clock className="size-5" />}
          value={stats?.today ?? 0}
          label={t('gestionnaire.visites.kpiToday')}
        />
        <KpiCard
          icon={<CheckCircle2 className="size-5" />}
          value={stats?.currently_inside ?? 0}
          label={t('gestionnaire.visites.kpiInside')}
        />
        <KpiCard
          icon={<Hourglass className="size-5" />}
          value={stats?.planned ?? 0}
          label={t('gestionnaire.visites.kpiPlanned')}
        />
        <KpiCard
          icon={<AlertCircle className="size-5" />}
          value={stats?.expired_today ?? 0}
          label={t('gestionnaire.visites.kpiExpired')}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card">
        <DataTable
          data={filtered}
          columns={columns}
          rowKey="id"
          isLoading={visitesQ.isLoading}
          searchable
          emptyIcon={<UserCheck className="size-12 text-muted-foreground" />}
          emptyTitle={t('gestionnaire.visites.empty')}
          emptyDescription={t('gestionnaire.visites.emptyDesc')}
        />
      </div>

      {/* Dialogs */}
      <CreateVisiteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        residenceId={residenceId}
        onCreated={(v) => {
          setCreateOpen(false)
          setDetail(v)
          // Les KPI dérivent de ['visites'] → une seule invalidation suffit.
          void qc.invalidateQueries({ queryKey: ['visites', residenceId] })
        }}
      />

      <ScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanned={() => {
          void qc.invalidateQueries({ queryKey: ['visites', residenceId] })
        }}
      />

      <DetailDialog
        visit={detail}
        onClose={() => setDetail(null)}
        onCancelled={() => {
          setDetail(null)
          void qc.invalidateQueries({ queryKey: ['visites', residenceId] })
        }}
      />
    </div>
  )
}

// ─── Create dialog ─────────────────────────────────────────────────────────

function CreateVisiteDialog({
  open,
  onOpenChange,
  residenceId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  residenceId: number | null
  onCreated: (v: Visite) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisiteType>('visitor')
  const [purpose, setPurpose] = useState('')
  const [hostLotId, setHostLotId] = useState<string>('')
  const [plannedAt, setPlannedAt] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrence, setRecurrence] = useState('')

  // KAN-132 : `!!residenceId` excluait la résidence 0 (fallback dev) → la liste
  // des lots/hôtes restait vide. Aligné sur le reste de la page (`!== null`).
  const lotsQ = useQuery({
    queryKey: ['lots', residenceId],
    queryFn: () => getLots(residenceId as number),
    enabled: residenceId !== null && open,
  })

  const mut = useMutation({
    mutationFn: (input: CreateVisiteInput) => createVisite(input),
    onSuccess: (v) => {
      toast.success(t('gestionnaire.visites.create.success'))
      onCreated(v)
      // reset
      setName('')
      setPhone('')
      setType('visitor')
      setPurpose('')
      setHostLotId('')
      setPlannedAt('')
      setIsRecurring(false)
      setRecurrence('')
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t('gestionnaire.visites.form.validationName'))
      return
    }
    if (!phone.trim()) {
      toast.error(t('gestionnaire.visites.form.validationPhone'))
      return
    }
    mut.mutate({
      residence_id: residenceId ?? 0,
      visitor_name: name.trim(),
      visitor_phone: phone.trim(),
      type,
      purpose: purpose.trim() || undefined,
      host_lot_id: hostLotId ? Number(hostLotId) : undefined,
      planned_at: plannedAt ? new Date(plannedAt).toISOString() : undefined,
      is_recurring: isRecurring || undefined,
      recurrence:
        isRecurring && recurrence.trim() ? recurrence.trim() : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('gestionnaire.visites.form.title')}</DialogTitle>
          <DialogDescription>
            {t('gestionnaire.visites.form.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="v-name">
                {t('gestionnaire.visites.form.visitorName')}
              </Label>
              <Input
                id="v-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  'gestionnaire.visites.form.visitorNamePlaceholder',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-phone">
                {t('gestionnaire.visites.form.visitorPhone')}
              </Label>
              <Input
                id="v-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('gestionnaire.visites.form.phonePlaceholder')}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('gestionnaire.visites.form.type')}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as VisiteType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'visitor',
                      'delivery',
                      'contractor',
                      'prestataire',
                    ] as const
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`gestionnaire.visites.type.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('gestionnaire.visites.form.host')}</Label>
              <Select value={hostLotId} onValueChange={setHostLotId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('gestionnaire.visites.form.hostPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(lotsQ.data?.lots ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.numero}
                      {l.coproprietaire ? ` — ${l.coproprietaire.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-purpose">
              {t('gestionnaire.visites.form.purpose')}
            </Label>
            <Input
              id="v-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('gestionnaire.visites.form.purposePlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-planned">
              {t('gestionnaire.visites.form.plannedAt')}
            </Label>
            <Input
              id="v-planned"
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.visites.form.plannedAtHint')}
            </p>
          </div>

          {/* Recurring prestataire pass */}
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label htmlFor="v-recurring" className="text-sm font-medium">
                  {t('gestionnaire.visites.form.recurring')}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('gestionnaire.visites.form.recurringHint')}
                </p>
              </div>
              <Switch
                id="v-recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            {isRecurring && (
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="v-recurrence" className="text-xs">
                  {t('gestionnaire.visites.form.recurrence')}
                </Label>
                <Input
                  id="v-recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  placeholder={t(
                    'gestionnaire.visites.form.recurrencePlaceholder',
                  )}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mut.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={mut.isPending}>
            {mut.isPending
              ? t('gestionnaire.visites.form.submitting')
              : t('gestionnaire.visites.form.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Detail dialog (with QR + share) ───────────────────────────────────────

function DetailDialog({
  visit,
  onClose,
  onCancelled,
}: {
  visit: Visite | null
  onClose: () => void
  onCancelled: () => void
}) {
  const { t } = useTranslation()
  const qrQ = useQuery({
    queryKey: ['qr-dataurl', visit?.qr_token ?? null],
    queryFn: () =>
      QRCode.toDataURL(visitorPassUrl(visit!.qr_token), {
        margin: 1,
        width: 320,
        color: { dark: '#0f172a', light: '#ffffff' },
      }),
    enabled: !!visit?.qr_token,
    staleTime: Infinity,
  })
  const qrDataUrl = qrQ.data ?? null

  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelVisite(id),
    onSuccess: () => {
      toast.success(t('gestionnaire.visites.detail.cancelled'))
      onCancelled()
    },
  })

  if (!visit) return null

  const url = visitorPassUrl(visit.qr_token)
  const status = STATUS_META[visit.status]
  const StatusIcon = status.icon
  const TypeIcon = TYPE_ICON[visit.type]

  const copyLink = () => {
    void navigator.clipboard.writeText(url)
    toast.success(t('gestionnaire.visites.detail.linkCopied'))
  }

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      t('gestionnaire.visites.detail.waMessage', {
        name: visit.visitor_name,
        url,
      }),
    )
    window.open(
      `https://wa.me/${visit.visitor_phone.replace(/\D/g, '')}?text=${msg}`,
      '_blank',
    )
  }

  const shareSms = () => {
    const msg = encodeURIComponent(
      t('gestionnaire.visites.detail.waMessage', {
        name: visit.visitor_name,
        url,
      }),
    )
    window.open(`sms:${visit.visitor_phone}?body=${msg}`, '_blank')
  }

  const canCancel = visit.status === 'planned' || visit.status === 'arrived'

  return (
    <Dialog open={!!visit} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="size-5 text-[var(--color-imaro-primary)]" />
            {visit.visitor_name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('gap-1 text-[10px]', status.cls)}
            >
              <StatusIcon className="size-3" />
              {t(`gestionnaire.visites.status.${visit.status}`)}
            </Badge>
            <Badge
              variant="outline"
              className={cn('gap-1 text-[10px]', TYPE_TONE[visit.type])}
            >
              <TypeIcon className="size-3" />
              {t(`gestionnaire.visites.type.${visit.type}`)}
            </Badge>
            {visit.is_recurring && (
              <Badge
                variant="outline"
                className="gap-1 border-teal-200 bg-teal-50 text-[10px] text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-400"
              >
                <Repeat2 className="size-3" />
                {t('gestionnaire.visites.detail.recurringBadge')}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* QR */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('gestionnaire.visites.detail.qrLabel')}
            </p>
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-white p-2 shadow-sm">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    className="size-32 sm:size-40"
                  />
                ) : (
                  <div className="size-32 animate-pulse rounded bg-muted sm:size-40" />
                )}
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  {t('gestionnaire.visites.detail.qrHint')}
                </p>
                <code className="block break-all rounded bg-background px-2 py-1 text-[10px] text-muted-foreground">
                  {visit.qr_token}
                </code>
              </div>
            </div>
          </div>

          {/* Visit info */}
          <div className="grid gap-2 text-sm">
            <Row label={t('gestionnaire.visites.form.visitorPhone')}>
              <a
                href={`tel:${visit.visitor_phone}`}
                className="font-medium hover:underline"
                dir="ltr"
              >
                {visit.visitor_phone}
              </a>
            </Row>
            {visit.host_name && (
              <Row label={t('gestionnaire.visites.colHost')}>
                <span>
                  {visit.host_name}
                  {visit.host_lot_numero && (
                    <span className="ms-1 text-xs text-muted-foreground">
                      (Lot {visit.host_lot_numero})
                    </span>
                  )}
                </span>
              </Row>
            )}
            {visit.purpose && (
              <Row label={t('gestionnaire.visites.form.purpose')}>
                {visit.purpose}
              </Row>
            )}
            {visit.planned_at && (
              <Row label={t('gestionnaire.visites.colPlanned')}>
                <span className="tabular-nums">
                  {dtLongFmt.format(new Date(visit.planned_at))}
                </span>
              </Row>
            )}
            {visit.arrived_at && (
              <Row label={t('gestionnaire.visites.colArrived')}>
                <span className="tabular-nums text-green-700 dark:text-green-400">
                  {dtLongFmt.format(new Date(visit.arrived_at))}
                </span>
              </Row>
            )}
            {visit.left_at && (
              <Row label={t('gestionnaire.visites.colLeft')}>
                <span className="tabular-nums text-muted-foreground">
                  {dtLongFmt.format(new Date(visit.left_at))}
                </span>
              </Row>
            )}
            {visit.is_recurring && visit.recurrence && (
              <Row label={t('gestionnaire.visites.detail.recurrenceLabel')}>
                {visit.recurrence}
              </Row>
            )}
            {visit.photo_url && (
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t('gestionnaire.visites.detail.photoCaptured')}
                </span>
                <img
                  src={visit.photo_url}
                  alt="visitor"
                  className="max-h-40 w-full max-w-[200px] rounded-lg border object-cover"
                />
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t('gestionnaire.visites.detail.createdBy', {
                name: visit.created_by_name,
              })}
              {' · '}
              {t('gestionnaire.visites.detail.createdOn', {
                date: dtFmt.format(new Date(visit.created_at)),
              })}
            </p>
          </div>

          {/* Share */}
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('gestionnaire.visites.detail.linkLabel')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                {url}
              </code>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={copyLink}
                >
                  <Copy className="size-3.5" />
                  {t('gestionnaire.visites.detail.copyLink')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={shareWhatsApp}
                >
                  <MessageCircle className="size-3.5" />
                  {t('gestionnaire.visites.detail.shareWa')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={shareSms}
                >
                  <Smartphone className="size-3.5" />
                  {t('gestionnaire.visites.detail.shareSms')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 sm:justify-between">
          {canCancel ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              size="sm"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (confirm(t('gestionnaire.visites.detail.cancelConfirm')))
                  cancelMut.mutate(visit.id)
              }}
            >
              <Ban className="me-1.5 size-3.5" />
              {t('gestionnaire.visites.detail.cancel')}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Scan dialog (manual token input, webcam Phase 2) ──────────────────────

function ScanDialog({
  open,
  onOpenChange,
  onScanned,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onScanned: () => void
}) {
  const { t } = useTranslation()
  const [token, setToken] = useState('')

  const mut = useMutation({
    mutationFn: (tok: string) => scanVisite(tok),
    onSuccess: (res) => {
      if (res.action === 'rejected') {
        toast.error(t('gestionnaire.visites.scan.rejected'))
        return
      }
      const name = res.visit.visitor_name
      if (res.action === 'check_in') {
        toast.success(t('gestionnaire.visites.scan.successCheckIn', { name }))
      } else {
        toast.success(t('gestionnaire.visites.scan.successCheckOut', { name }))
      }
      setToken('')
      onScanned()
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-[var(--color-imaro-primary)]" />
            {t('gestionnaire.visites.scan.title')}
          </DialogTitle>
          <DialogDescription>
            {t('gestionnaire.visites.scan.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Real webcam scanner — falls back to manual entry on no-camera/deny */}
          {open && (
            <QrScanner
              onDecode={(text) => {
                if (mut.isPending) return
                // Accept full URL or raw token
                const m = text.trim().match(/\/v\/([\w-]+)$/)
                mut.mutate(m?.[1] ?? text.trim())
              }}
              paused={mut.isPending}
              className="max-h-[60vh]"
            />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="manual-token">
              {t('gestionnaire.visites.scan.manualToken')}
            </Label>
            <Input
              id="manual-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('gestionnaire.visites.scan.manualPlaceholder')}
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mut.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={() => mut.mutate(token.trim())}
            disabled={!token.trim() || mut.isPending}
            className="gap-1.5"
          >
            <LinkIcon className="size-4" />
            {t('gestionnaire.visites.scan.manualSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
