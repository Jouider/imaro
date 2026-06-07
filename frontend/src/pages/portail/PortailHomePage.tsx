import { useState } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CreditCard,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Wallet,
  ScanLine,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PaiementSheet } from '@/components/portail/PaiementSheet'
import {
  MontantDisplay,
  KpiCard,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getPortailDashboard,
  getAnnonces,
  getOperations,
  getAssembleesPortail,
  type Annonce,
  type AssembleePortail,
} from '@/services/portail.service'
import { cn } from '@/lib/utils'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullRefreshIndicator } from '@/components/portail/PullRefreshIndicator'

const montantFormatter = new Intl.NumberFormat('fr-MA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatMontant(value: number): string {
  return `${montantFormatter.format(value)} DH`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-MA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function AnnonceCard({ annonce }: { annonce: Annonce }) {
  const isUrgente = annonce.priorite === 'urgente'
  return (
    <Card
      className={cn(
        'overflow-hidden',
        isUrgente && 'border-l-4 border-l-[var(--color-imaro-accent)]',
      )}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-base leading-snug">
            {annonce.titre}
          </p>
          {isUrgente && (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              Urgent
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDate(annonce.date)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {annonce.contenu}
        </p>
      </CardContent>
    </Card>
  )
}

export function PortailHomePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [payOpen, setPayOpen] = useState(false)

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['portail-dashboard'],
    queryFn: getPortailDashboard,
  })

  const { data: annonces, isLoading: annoncesLoading } = useQuery({
    queryKey: ['portail-annonces'],
    queryFn: getAnnonces,
  })

  const { data: operations } = useQuery({
    queryKey: ['portail-operations'],
    queryFn: getOperations,
  })

  const { data: assemblees = [] } = useQuery({
    queryKey: ['portail-assemblees'],
    queryFn: getAssembleesPortail,
  })

  // Pull-to-refresh — refetch all 4 queries in parallel
  const { pullDistance, progress, isRefreshing } = usePullToRefresh({
    onRefresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portail-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['portail-annonces'] }),
        queryClient.invalidateQueries({ queryKey: ['portail-operations'] }),
        queryClient.invalidateQueries({ queryKey: ['portail-assemblees'] }),
      ]),
  })

  const totalPaidThisYear = (operations ?? [])
    .filter((op) => op.type === 'paiement' && op.montant > 0)
    .reduce((sum, op) => sum + op.montant, 0)

  const pendingAmount = dashboard ? Math.abs(dashboard.balance) : 0

  const upcomingAssemblees = assemblees
    .filter((a) => new Date(a.date) >= new Date() && a.statut !== 'annulee')
    .slice(0, 2)

  return (
    <div className="px-4 py-5 space-y-6">
      <PullRefreshIndicator
        pullDistance={pullDistance}
        progress={progress}
        isRefreshing={isRefreshing}
      />

      {/* Hero balance card — royal blue gradient with decorative pattern */}
      {dashLoading ? (
        <div className="h-44 animate-pulse rounded-2xl bg-[var(--color-imaro-primary)]/20" />
      ) : dashboard ? (
        <div
          className="relative overflow-hidden rounded-2xl p-5 shadow-xl shadow-blue-500/20"
          style={{
            background:
              'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
          }}
        >
          {/* Decorative grid pattern */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Soft orange glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(230,126,34,0.6) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            {/* Balance label */}
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {t('portail.home.balance')}
            </p>

            {/* Balance amount — DM Serif */}
            <MontantDisplay
              value={dashboard.balance}
              className="mt-2 block font-display text-4xl leading-none tracking-tight text-white sm:text-5xl"
            />

            {/* Status chip */}
            <div className="mt-4 flex items-center gap-2">
              {dashboard.statut === 'a_jour' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-inset ring-white/20">
                  <CheckCircle2 className="size-3.5 text-emerald-300" />
                  {t('portail.home.aJour')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-imaro-danger)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Clock className="size-3.5" />
                  {t('portail.home.enRetard')}
                </span>
              )}
            </div>

            {/* Pay CTA */}
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[var(--color-imaro-primary)] shadow-sm transition-transform active:scale-[0.98]"
            >
              <Wallet className="size-4" />
              {t('portail.finances.pay')}
            </button>
          </div>
        </div>
      ) : null}

      {/* KPI row */}
      {dashLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<CreditCard className="size-5" />}
            value={formatMontant(totalPaidThisYear)}
            label={t('portail.home.kpiPaidYear')}
          />
          <KpiCard
            icon={<Clock className="size-5" />}
            value={formatMontant(pendingAmount)}
            label={t('portail.home.kpiPending')}
          />
        </div>
      )}

      {/* Prochain paiement reminder card */}
      {!dashLoading && dashboard?.prochain_appel && (
        <ProchainPaiementCard prochain_appel={dashboard.prochain_appel} t={t} />
      )}

      {/* Invite a visitor — informational card (full self-service flow comes in phase 2) */}
      <Card className="overflow-hidden border-[var(--color-imaro-primary)]/15 bg-gradient-to-br from-[var(--color-imaro-primary)]/5 to-transparent">
        <CardContent className="flex items-center gap-3 pt-4">
          <div className="bg-gradient-imaro flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
            <ScanLine className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {t('portail.home.inviteVisitor')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('portail.home.inviteVisitorDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assemblées section */}
      {upcomingAssemblees.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-imaro-primary)]">
              {t('portail.home.assemblees')}
            </h2>
            <Link
              to="/portail/actualites"
              className="flex items-center gap-1 text-xs text-[var(--color-imaro-primary)] font-medium"
            >
              {t('portail.home.voirTout')}
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingAssemblees.map((ag) => (
              <AssembleePreviewCard key={ag.id} ag={ag} />
            ))}
          </div>
        </section>
      )}

      {/* Annonces section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-imaro-primary)]">
            {t('portail.home.annonces')}
          </h2>
          <Link
            to="/portail/actualites"
            className="flex items-center gap-1 text-xs text-[var(--color-imaro-primary)] font-medium"
          >
            {t('portail.home.voirTout')}
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {annoncesLoading ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : !annonces || annonces.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-12" />}
            title={t('portail.home.noAnnonces')}
          />
        ) : (
          <div className="space-y-3">
            {annonces.slice(0, 3).map((a) => (
              <AnnonceCard key={a.id} annonce={a} />
            ))}
            {annonces.length > 3 && (
              <Link
                to="/portail/actualites"
                className="flex items-center justify-center gap-1.5 rounded-xl border bg-card py-3 text-sm text-[var(--color-imaro-primary)] font-medium"
              >
                {t('portail.home.voirTout')} ({annonces.length})
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        )}
      </section>

      <PaiementSheet
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultMontant={pendingAmount > 0 ? pendingAmount : undefined}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ['portail-dashboard'],
          })
          void queryClient.invalidateQueries({
            queryKey: ['portail-operations'],
          })
        }}
      />
    </div>
  )
}

// ─── ProchainPaiementCard ─────────────────────────────────────────────────────

function ProchainPaiementCard({
  prochain_appel,
  t,
}: {
  prochain_appel: { montant: number; date: string }
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const isOverdue = new Date(prochain_appel.date) < new Date()

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-center gap-3',
        isOverdue
          ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/10'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-950/10',
      )}
    >
      {/* Bell icon in circle */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          isOverdue
            ? 'bg-orange-100 text-orange-600'
            : 'bg-blue-100 text-blue-600',
        )}
      >
        <Bell className="size-5" aria-hidden="true" />
      </div>

      {/* Label + amount + date */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {t('portail.home.prochainPaiement', {
            defaultValue: 'Prochain paiement',
          })}
        </p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <MontantDisplay
            value={prochain_appel.montant}
            className="font-semibold text-base"
          />
          <span className="text-xs text-muted-foreground">
            {t('portail.home.le', { defaultValue: 'le' })}{' '}
            {formatDate(prochain_appel.date)}
          </span>
        </div>
      </div>

      {/* CTA */}
      <Link
        to="/portail/finances"
        className={cn(
          'shrink-0 text-sm font-semibold',
          isOverdue
            ? 'text-[var(--color-imaro-accent)]'
            : 'text-[var(--color-imaro-primary)]',
        )}
      >
        {t('portail.home.payer', { defaultValue: 'Payer →' })}
      </Link>
    </div>
  )
}

// ─── AssembleePreviewCard ─────────────────────────────────────────────────────

function AssembleePreviewCard({ ag }: { ag: AssembleePortail }) {
  const { t } = useTranslation()
  const dateObj = new Date(ag.date)
  const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
  const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' })
  const time = dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const isExtraordinaire = ag.type === 'extraordinaire'

  return (
    <Link to="/portail/actualites" className="block">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border bg-card p-3',
          isExtraordinaire &&
            'border-orange-200 bg-orange-50/50 dark:bg-orange-950/10',
        )}
      >
        {/* Date badge */}
        <div
          className={cn(
            'flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white',
            isExtraordinaire
              ? 'bg-orange-500'
              : 'bg-[var(--color-imaro-primary)]',
          )}
        >
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-xs uppercase leading-none mt-0.5">{month}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug truncate">
            {ag.titre}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {ag.lieu.split(',')[0]}
            </span>
            <span>{time}</span>
          </div>
        </div>

        <Badge className="shrink-0 bg-blue-100 text-blue-800 border-0 text-xs">
          {t('portail.home.convoquee')}
        </Badge>
      </div>
    </Link>
  )
}
