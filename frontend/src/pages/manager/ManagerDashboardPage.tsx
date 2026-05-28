import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { KpiCard, LoadingSkeleton, MontantDisplay } from '@/components/shared'
import { useAuthStore } from '@/stores/authStore'
import { getManagerDashboard } from '@/services/manager.service'

/**
 * Manager dashboard — 5 KPI cards : résidences, gestionnaires, encaissements,
 * dépenses, solde. Solde coloré (vert si positif, rouge si négatif).
 */
export function ManagerDashboardPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { data, isLoading } = useQuery({
    queryKey: ['manager', 'dashboard'],
    queryFn: () => getManagerDashboard(),
  })

  const hour = new Date().getHours()
  const greetingKey =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const firstName = (user?.name ?? '').split(' ')[0] || ''

  return (
    <div className="p-6 space-y-6">
      {/* Greeting hero */}
      <div>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-[var(--primary)] sm:text-4xl">
          {firstName
            ? t(`manager.dashboard.greeting.${greetingKey}WithName`, {
                name: firstName,
              })
            : t(`manager.dashboard.greeting.${greetingKey}`)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('manager.dashboard.subtitle')}
        </p>
      </div>

      {/* KPI grid — 5 cards */}
      {isLoading || !data ? (
        <LoadingSkeleton variant="kpi" count={5} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            icon={<Building2 className="size-5" />}
            value={data.nb_residences.toString()}
            label={t('manager.dashboard.kpi.residences')}
          />
          <KpiCard
            icon={<Users className="size-5" />}
            value={data.nb_gestionnaires.toString()}
            label={t('manager.dashboard.kpi.gestionnaires')}
          />
          <KpiCard
            icon={<TrendingUp className="size-5" />}
            value={formatMad(data.total_encaissements)}
            label={t('manager.dashboard.kpi.encaissements')}
          />
          <KpiCard
            icon={<TrendingDown className="size-5" />}
            value={formatMad(data.total_depenses)}
            label={t('manager.dashboard.kpi.depenses')}
          />
          <KpiCard
            icon={<Wallet className="size-5" />}
            value={formatMad(data.solde)}
            label={t('manager.dashboard.kpi.solde')}
            className={
              data.solde >= 0
                ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 dark:from-card dark:to-emerald-950/20'
                : 'border-rose-200 bg-gradient-to-br from-white to-rose-50/40 dark:from-card dark:to-rose-950/20'
            }
          />
        </div>
      )}

      {/* Highlight card — solde */}
      {data && (
        <div
          className="relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm dark:bg-card"
          style={{
            background:
              data.solde >= 0
                ? 'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)'
                : 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">
              {t('manager.dashboard.soldeGlobal')}
            </p>
            <MontantDisplay
              value={data.solde}
              className="mt-2 block font-display text-4xl leading-none tracking-tight text-white sm:text-5xl"
            />
            <p className="mt-3 max-w-md text-sm text-white/75">
              {data.solde >= 0
                ? t('manager.dashboard.soldePositif')
                : t('manager.dashboard.soldeNegatif')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatMad(value: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + ' DH'
  )
}
