import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, CreditCard, Clock, MapPin, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  const totalPaidThisYear = (operations ?? [])
    .filter((op) => op.type === 'paiement' && op.montant > 0)
    .reduce((sum, op) => sum + op.montant, 0)

  const pendingAmount = dashboard ? Math.abs(dashboard.balance) : 0

  const upcomingAssemblees = assemblees
    .filter((a) => new Date(a.date) >= new Date() && a.statut !== 'annulee')
    .slice(0, 2)

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Hero balance card */}
      {dashLoading ? (
        <div className="h-36 animate-pulse rounded-xl bg-[var(--color-imaro-primary)]/20" />
      ) : dashboard ? (
        <div className="rounded-xl bg-[var(--color-imaro-primary)] dark:bg-card p-5 space-y-3">
          {/* Balance label */}
          <p className="text-sm text-white/70 dark:text-muted-foreground">
            {t('portail.home.balance')}
          </p>

          {/* Balance amount */}
          <div>
            <MontantDisplay
              value={dashboard.balance}
              className="text-4xl font-bold text-white dark:text-foreground"
            />
          </div>

          {/* Status chip */}
          {dashboard.statut === 'a_jour' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-imaro-success)] px-3 py-1 text-sm font-medium text-white">
              {t('portail.home.aJour')} ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-imaro-danger)] px-3 py-1 text-sm font-medium text-white">
              {t('portail.home.enRetard')}
            </span>
          )}

          {/* Next call */}
          {dashboard.prochain_appel && (
            <p className="text-sm text-white/70 dark:text-muted-foreground">
              {t('portail.home.prochainAppel')}:{' '}
              <span className="font-semibold text-white dark:text-foreground">
                <MontantDisplay
                  value={dashboard.prochain_appel.montant}
                  className="text-white dark:text-foreground"
                />{' '}
                {t('portail.home.le')}{' '}
                {formatDate(dashboard.prochain_appel.date)}
              </span>
            </p>
          )}
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
    </div>
  )
}

// ─── AssembleePreviewCard ─────────────────────────────────────────────────────

function AssembleePreviewCard({ ag }: { ag: AssembleePortail }) {
  const dateObj = new Date(ag.date)
  const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
  const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' })
  const time = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const isExtraordinaire = ag.type === 'extraordinaire'

  return (
    <Link to="/portail/actualites" className="block">
      <div className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3',
        isExtraordinaire && 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/10',
      )}>
        {/* Date badge */}
        <div className={cn(
          'flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white',
          isExtraordinaire ? 'bg-orange-500' : 'bg-[var(--color-imaro-primary)]',
        )}>
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-xs uppercase leading-none mt-0.5">{month}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug truncate">{ag.titre}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />{ag.lieu.split(',')[0]}
            </span>
            <span>{time}</span>
          </div>
        </div>

        <Badge className="shrink-0 bg-blue-100 text-blue-800 border-0 text-xs">
          Convoquée
        </Badge>
      </div>
    </Link>
  )
}
