import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  Phone,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Wallet,
  Repeat2,
} from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getVisitePublic,
  getWalletLinks,
  type Visite,
  type VisiteStatus,
} from '@/services/visites.service'

const STATUS_META: Record<
  VisiteStatus,
  { icon: typeof Clock; cls: string; key: string }
> = {
  planned: {
    icon: Hourglass,
    cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
    key: 'public.visitorPass.statusPlanned',
  },
  arrived: {
    icon: CheckCircle2,
    cls: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300',
    key: 'public.visitorPass.statusArrived',
  },
  departed: {
    icon: CheckCircle2,
    cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-900/40 dark:bg-slate-950/30 dark:text-slate-300',
    key: 'public.visitorPass.statusDeparted',
  },
  expired: {
    icon: AlertCircle,
    cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
    key: 'public.visitorPass.statusExpired',
  },
  cancelled: {
    icon: XCircle,
    cls: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-900/40 dark:bg-gray-950/30 dark:text-gray-400',
    key: 'public.visitorPass.statusCancelled',
  },
}

const dtFmt = new Intl.DateTimeFormat('fr-MA', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export function VisitorPassPage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['visite-public', token],
    queryFn: () => getVisitePublic(token!),
    enabled: !!token,
  })

  // Render QR (encoding the current page URL itself, so the guardian scan
  // resolves to the same token).
  const qrQ = useQuery({
    queryKey: ['visitor-pass-qr', token],
    queryFn: () =>
      QRCode.toDataURL(window.location.href, {
        margin: 1,
        width: 480,
        color: { dark: '#0f172a', light: '#ffffff' },
      }),
    enabled: !!token,
    staleTime: Infinity,
  })
  const qrUrl = qrQ.data ?? null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark,#154360)] p-4">
        <div className="mx-auto max-w-md animate-pulse space-y-4 pt-12">
          <div className="h-12 rounded bg-white/20" />
          <div className="h-80 rounded-2xl bg-white/30" />
          <div className="h-24 rounded-2xl bg-white/20" />
        </div>
      </div>
    )
  }

  if (!data) {
    return <NotFound />
  }

  return <Pass visit={data} qrUrl={qrUrl} t={t} />
}

function Pass({
  visit,
  qrUrl,
  t,
}: {
  visit: Visite
  qrUrl: string | null
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const status = STATUS_META[visit.status]
  const StatusIcon = status.icon

  // Wallet links — lazy fetch only when the visit is still actionable
  const walletQ = useQuery({
    queryKey: ['wallet-links', visit.qr_token],
    queryFn: () => getWalletLinks(visit.qr_token),
    enabled:
      visit.status === 'planned' ||
      visit.status === 'arrived' ||
      !!visit.is_recurring,
    staleTime: 5 * 60_000,
  })

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{
        background:
          'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark, #154360) 100%)',
      }}
    >
      <div className="mx-auto max-w-md space-y-4">
        {/* Brand bar */}
        <div className="flex items-center justify-between pt-2">
          <Wordmark inverted className="h-9 w-32" />
          <LanguageSwitcher />
        </div>

        {/* Title */}
        <div className="text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {t('public.visitorPass.subtitle')}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
            {t('public.visitorPass.title')}
          </h1>
        </div>

        {/* Status banner */}
        <Badge
          variant="outline"
          className={cn(
            'w-full justify-center gap-1.5 py-2 text-sm font-semibold',
            status.cls,
          )}
        >
          <StatusIcon className="size-4" />
          {t(status.key)}
        </Badge>

        {/* Recurring pass badge */}
        {visit.is_recurring && (
          <div className="flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Repeat2 className="size-3.5" />
            {t('public.visitorPass.recurringPass')}
            {visit.recurrence && (
              <span className="text-white/70">· {visit.recurrence}</span>
            )}
          </div>
        )}

        {/* QR card */}
        <div className="rounded-2xl bg-white p-5 shadow-xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('public.visitorPass.showAtEntrance')}
          </p>
          <div className="mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR"
                className="size-full"
                draggable={false}
              />
            ) : (
              <div className="size-full animate-pulse rounded bg-muted" />
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {t('public.visitorPass.scanByGuardian')}
          </p>
        </div>

        {/* Visit info */}
        <div className="rounded-2xl bg-white/95 p-5 shadow-lg backdrop-blur dark:bg-card">
          <Row
            icon={<Building2 className="size-4" />}
            label={t('public.visitorPass.visitor')}
            value={visit.visitor_name}
          />
          {visit.host_name && (
            <Row
              icon={<Phone className="size-4" />}
              label={t('public.visitorPass.host')}
              value={
                visit.host_lot_numero
                  ? `${visit.host_name} · Lot ${visit.host_lot_numero}`
                  : visit.host_name
              }
            />
          )}
          {visit.planned_at && (
            <Row
              icon={<Calendar className="size-4" />}
              label={t('public.visitorPass.scheduled')}
              value={dtFmt.format(new Date(visit.planned_at))}
            />
          )}
          {visit.purpose && (
            <Row
              icon={<MessageSquare className="size-4" />}
              label={t('public.visitorPass.purpose')}
              value={visit.purpose}
            />
          )}
        </div>

        {/* Wallet buttons */}
        {walletQ.data && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              className="w-full bg-black text-white hover:bg-black/90 hover:text-white"
            >
              <a href={walletQ.data.apple_url} target="_blank" rel="noreferrer">
                <Wallet className="me-1.5 size-4" />
                {t('public.visitorPass.addToAppleWallet')}
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full bg-white/90 backdrop-blur hover:bg-white"
            >
              <a
                href={walletQ.data.google_url}
                target="_blank"
                rel="noreferrer"
              >
                <Wallet className="me-1.5 size-4" />
                {t('public.visitorPass.addToGoogleWallet')}
              </a>
            </Button>
          </div>
        )}

        {/* Actions */}
        {visit.host_name && (
          <Button
            asChild
            variant="outline"
            className="w-full bg-white/90 backdrop-blur hover:bg-white"
          >
            <a href={`tel:${visit.visitor_phone}`}>
              <Phone className="me-1.5 size-4" />
              {t('public.visitorPass.contactHost')}
            </a>
          </Button>
        )}

        {/* Footer note */}
        <p className="mx-auto flex items-center justify-center gap-1.5 px-4 text-center text-[11px] text-white/70">
          <ShieldAlert className="size-3" />
          {t('public.visitorPass.expiresAfterScan')}
        </p>
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 border-b py-2 last:border-0 last:pb-0">
      <div className="mt-0.5 text-[var(--color-imaro-primary)]">{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-card">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <XCircle className="size-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="font-display text-2xl">
          {t('public.visitorPass.notFound')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('public.visitorPass.notFoundDesc')}
        </p>
      </div>
    </div>
  )
}
