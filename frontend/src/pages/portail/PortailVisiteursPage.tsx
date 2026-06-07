import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import {
  Plus,
  ScanLine,
  UserCheck,
  Truck,
  HardHat,
  Wrench,
  Clock,
  Hourglass,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  MessageCircle,
  Smartphone,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { EmptyState } from '@/components/shared/EmptyState'
import {
  createMyVisite,
  getMyVisites,
  type Visite,
  type VisiteStatus,
  type VisiteType,
} from '@/services/visites.service'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<VisiteType, typeof UserCheck> = {
  visitor: UserCheck,
  delivery: Truck,
  contractor: HardHat,
  prestataire: Wrench,
}

const STATUS_TONE: Record<VisiteStatus, string> = {
  planned:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400',
  arrived:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400',
  departed:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-900/40 dark:bg-slate-950/20 dark:text-slate-400',
  expired:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400',
  cancelled:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-900/40 dark:bg-gray-950/20 dark:text-gray-400',
}

const STATUS_ICON: Record<VisiteStatus, typeof Clock> = {
  planned: Hourglass,
  arrived: CheckCircle2,
  departed: UserCheck,
  expired: AlertCircle,
  cancelled: XCircle,
}

const dtFmt = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function visitorPassUrl(token: string): string {
  return `${window.location.origin}/v/${token}`
}

export function PortailVisiteursPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState<Visite | null>(null)

  const visitesQ = useQuery({
    queryKey: ['portail-my-visites'],
    queryFn: () => getMyVisites(),
  })

  const upcoming = (visitesQ.data ?? []).filter((v) =>
    ['planned', 'arrived'].includes(v.status),
  )
  const past = (visitesQ.data ?? []).filter((v) =>
    ['departed', 'expired', 'cancelled'].includes(v.status),
  )

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <Link
          to="/portail"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-imaro-primary)] hover:underline"
        >
          <ArrowLeft className="size-3" />
          {t('portail.visiteurs.back')}
        </Link>
        <h1 className="text-xl font-bold text-foreground">
          {t('portail.visiteurs.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('portail.visiteurs.subtitle')}
        </p>
      </div>

      {/* Primary CTA */}
      <Button
        size="lg"
        className="h-14 w-full justify-start gap-3 bg-[var(--color-imaro-primary)] text-white"
        onClick={() => setCreateOpen(true)}
      >
        <div className="flex size-9 items-center justify-center rounded-lg bg-white/15">
          <Plus className="size-5" />
        </div>
        <span className="text-base font-semibold">
          {t('portail.visiteurs.newInvite')}
        </span>
      </Button>

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('portail.visiteurs.list.upcoming')}
          </h2>
          <div className="space-y-2">
            {upcoming.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                onShare={() => setShareTarget(v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past list */}
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('portail.visiteurs.list.past')}
          </h2>
          <div className="space-y-2">
            {past.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                onShare={() => setShareTarget(v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!visitesQ.isLoading && upcoming.length === 0 && past.length === 0 && (
        <EmptyState
          icon={<UserCheck className="size-12" />}
          title={t('portail.visiteurs.empty')}
          description={t('portail.visiteurs.emptyDesc')}
        />
      )}

      {/* Dialogs */}
      <CreateInviteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(v) => {
          setCreateOpen(false)
          void qc.invalidateQueries({ queryKey: ['portail-my-visites'] })
          // Immediately open the share sheet so the resident sends the QR.
          setShareTarget(v)
        }}
      />

      <ShareDialog visit={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  )
}

// ─── Visit card ────────────────────────────────────────────────────────────

function VisitCard({ visit, onShare }: { visit: Visite; onShare: () => void }) {
  const { t } = useTranslation()
  const TypeIcon = TYPE_ICON[visit.type]
  const StatusIcon = STATUS_ICON[visit.status]
  const showShare = visit.status === 'planned' || visit.status === 'arrived'

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 pt-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-imaro-primary)]/10 text-[var(--color-imaro-primary)]">
          <TypeIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{visit.visitor_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {visit.purpose ?? t(`gestionnaire.visites.type.${visit.type}`)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge
              variant="outline"
              className={cn('gap-1', STATUS_TONE[visit.status])}
            >
              <StatusIcon className="size-3" />
              {t(`gestionnaire.visites.status.${visit.status}`)}
            </Badge>
            {visit.planned_at && (
              <span className="text-muted-foreground">
                · {dtFmt.format(new Date(visit.planned_at))}
              </span>
            )}
          </div>
        </div>
        {showShare && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 gap-1.5"
            onClick={onShare}
          >
            <ScanLine className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Create dialog (resident-side, simplified) ─────────────────────────────

function CreateInviteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (v: Visite) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisiteType>('visitor')
  const [purpose, setPurpose] = useState('')
  const [plannedAt, setPlannedAt] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      createMyVisite({
        visitor_name: name.trim(),
        visitor_phone: phone.trim(),
        type,
        purpose: purpose.trim() || undefined,
        planned_at: plannedAt ? new Date(plannedAt).toISOString() : undefined,
      }),
    onSuccess: (v) => {
      toast.success(t('portail.visiteurs.form.success'))
      onCreated(v)
      setName('')
      setPhone('')
      setType('visitor')
      setPurpose('')
      setPlannedAt('')
    },
  })

  const submit = () => {
    if (!name.trim()) {
      toast.error(t('gestionnaire.visites.form.validationName'))
      return
    }
    if (!phone.trim()) {
      toast.error(t('gestionnaire.visites.form.validationPhone'))
      return
    }
    mut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('portail.visiteurs.form.title')}</DialogTitle>
          <DialogDescription>
            {t('portail.visiteurs.form.desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pv-name">
              {t('gestionnaire.visites.form.visitorName')}
            </Label>
            <Input
              id="pv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'gestionnaire.visites.form.visitorNamePlaceholder',
              )}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-phone">
              {t('gestionnaire.visites.form.visitorPhone')}
            </Label>
            <Input
              id="pv-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('gestionnaire.visites.form.phonePlaceholder')}
              dir="ltr"
              inputMode="tel"
            />
          </div>
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
                  ['visitor', 'delivery', 'contractor', 'prestataire'] as const
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`gestionnaire.visites.type.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-purpose">
              {t('gestionnaire.visites.form.purpose')}
            </Label>
            <Input
              id="pv-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('gestionnaire.visites.form.purposePlaceholder')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pv-planned">
              {t('gestionnaire.visites.form.plannedAt')}
            </Label>
            <Input
              id="pv-planned"
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('gestionnaire.visites.form.plannedAtHint')}
            </p>
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
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending
              ? t('portail.visiteurs.form.submitting')
              : t('portail.visiteurs.form.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Share dialog (QR + WA/SMS/copy) ───────────────────────────────────────

function ShareDialog({
  visit,
  onClose,
}: {
  visit: Visite | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  const qrQ = useQuery({
    queryKey: ['portail-qr', visit?.qr_token],
    queryFn: () =>
      QRCode.toDataURL(visitorPassUrl(visit!.qr_token), {
        margin: 1,
        width: 320,
        color: { dark: '#0f172a', light: '#ffffff' },
      }),
    enabled: !!visit?.qr_token,
    staleTime: Infinity,
  })

  if (!visit) return null
  const url = visitorPassUrl(visit.qr_token)

  const waMsg = encodeURIComponent(
    t('portail.visiteurs.share.waMessage', {
      name: visit.visitor_name,
      url,
    }),
  )
  const phoneClean = visit.visitor_phone.replace(/\D/g, '')

  const copy = () => {
    void navigator.clipboard.writeText(url)
    toast.success(t('gestionnaire.visites.detail.linkCopied'))
  }

  return (
    <Dialog open={!!visit} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('portail.visiteurs.share.title')}</DialogTitle>
          <DialogDescription>{visit.visitor_name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            {qrQ.data ? (
              <img src={qrQ.data} alt="QR" className="size-44" />
            ) : (
              <div className="size-44 animate-pulse rounded bg-muted" />
            )}
          </div>
          <code className="block break-all rounded bg-muted px-2 py-1 text-center text-[10px] text-muted-foreground">
            {url}
          </code>

          <div className="grid w-full grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={copy}
            >
              <Copy className="size-3.5" />
              {t('portail.visiteurs.share.copyLink')}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a
                href={`https://wa.me/${phoneClean}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-3.5" />
                {t('portail.visiteurs.share.whatsapp')}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={`sms:${visit.visitor_phone}?body=${waMsg}`}>
                <Smartphone className="size-3.5" />
                {t('portail.visiteurs.share.sms')}
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
