import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, CreditCard, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  MontantDisplay,
  KpiCard,
  LoadingSkeleton,
  EmptyState,
} from '@/components/shared'
import {
  getPortailDashboard,
  getAnnonces,
  type Annonce,
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

  // Compute KPI values from operations when dashboard is available
  const totalPaidThisYear = 1800 // mock: 3 payments × 600 DH
  const pendingAmount = dashboard ? Math.abs(dashboard.balance) : 0

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

      {/* Annonces section */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--color-imaro-primary)]">
          {t('portail.home.annonces')}
        </h2>

        {annoncesLoading ? (
          <LoadingSkeleton variant="card" count={2} />
        ) : !annonces || annonces.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-12" />}
            title={t('portail.home.noAnnonces')}
          />
        ) : (
          <div className="space-y-3">
            {annonces.map((a) => (
              <AnnonceCard key={a.id} annonce={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
