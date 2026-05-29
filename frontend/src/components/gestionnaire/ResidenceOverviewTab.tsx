import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  getResidenceOverview,
  type Residence,
} from '@/services/gestionnaire.service'
import { KpiCard } from '@/components/shared/KpiCard'
import { MontantDisplay } from '@/components/shared/MontantDisplay'
import { Button } from '@/components/ui/button'
import { cn, formatMontant } from '@/lib/utils'

type Props = {
  residenceId: number
  residence: Residence
  immeublesCount: number
  onGoToImmeubles: () => void
  onGoToLots: () => void
  onGoToCoproprietaires: () => void
}

function recouvrementColor(taux: number) {
  if (taux >= 80) return 'text-[var(--color-imaro-success)]'
  if (taux >= 50) return 'text-[var(--color-imaro-warning)]'
  return 'text-[var(--color-imaro-danger)]'
}

export function ResidenceOverviewTab({
  residenceId,
  residence,
  immeublesCount,
  onGoToImmeubles,
  onGoToLots,
  onGoToCoproprietaires,
}: Props) {
  const { t } = useTranslation()
  const [checklistDismissed, setChecklistDismissed] = useState(false)

  const { data: overview, isLoading } = useQuery({
    queryKey: ['residence-overview', residenceId],
    queryFn: () => getResidenceOverview(residenceId),
    enabled: !!residenceId,
  })

  const steps = [
    {
      key: 'immeuble',
      label: t('gestionnaire.residence.checklist.immeuble'),
      done: immeublesCount > 0,
      onClick: onGoToImmeubles,
    },
    {
      key: 'lots',
      label: t('gestionnaire.residence.checklist.lots'),
      done: residence.nb_lots > 0,
      onClick: onGoToLots,
    },
    {
      key: 'coproprietaires',
      label: t('gestionnaire.residence.checklist.coproprietaires'),
      done: (overview?.nb_coproprietaires ?? 0) > 0,
      onClick: onGoToCoproprietaires,
    },
    {
      key: 'cotisation',
      label: t('gestionnaire.residence.checklist.cotisation'),
      done: residence.mode_cotisation != null,
      onClick: undefined,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length
  const progressPct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="space-y-6">
      {/* Onboarding checklist */}
      {!allDone && !checklistDismissed && (
        <div className="relative rounded-xl border bg-gradient-to-br from-[var(--color-imaro-primary-tint)] to-card p-5">
          <button
            onClick={() => setChecklistDismissed(true)}
            className="absolute end-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label={t('actions.close', { defaultValue: 'Fermer' })}
          >
            <X className="size-4" />
          </button>
          <h3 className="font-display text-lg text-foreground">
            {t('gestionnaire.residence.checklist.title')}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('gestionnaire.residence.checklist.subtitle')}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--color-imaro-primary)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {t('gestionnaire.residence.checklist.progress', {
                done: doneCount,
                total: steps.length,
              })}
            </span>
          </div>

          <ul className="mt-4 space-y-1">
            {steps.map((step) => (
              <li key={step.key}>
                <button
                  onClick={step.onClick}
                  disabled={!step.onClick}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors',
                    step.onClick && 'hover:bg-muted/60',
                    !step.onClick && 'cursor-default',
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--color-imaro-success)]" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span
                    className={cn(
                      'flex-1',
                      step.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {step.label}
                  </span>
                  {!step.done && step.onClick && (
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Building2 className="size-5" />}
          value={isLoading ? '…' : (overview?.nb_lots ?? residence.nb_lots)}
          label={t('gestionnaire.residence.overview.kpiLots')}
        />
        <KpiCard
          icon={<Users className="size-5" />}
          value={isLoading ? '…' : (overview?.nb_coproprietaires ?? 0)}
          label={t('gestionnaire.residence.overview.kpiCopros')}
        />
        <KpiCard
          icon={<TrendingUp className="size-5" />}
          value={
            isLoading
              ? '…'
              : `${(overview?.taux_recouvrement ?? 0).toFixed(0)} %`
          }
          label={t('gestionnaire.residence.overview.kpiRecouvrement')}
          className={recouvrementColor(overview?.taux_recouvrement ?? 0)}
        />
        <KpiCard
          icon={<Wallet className="size-5" />}
          value={isLoading ? '…' : formatMontant(overview?.tresorerie ?? 0)}
          label={t('gestionnaire.residence.overview.kpiTresorerie')}
        />
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payments summary */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-display text-lg text-foreground">
            {t('gestionnaire.residence.overview.paymentsTitle')}
          </h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.payeCeMois')}
              </dt>
              <dd className="font-semibold text-[var(--color-imaro-success)]">
                <MontantDisplay value={overview?.paye_ce_mois ?? 0} />
              </dd>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.enAttente')}
              </dt>
              <dd className="font-semibold text-[var(--color-imaro-warning)]">
                <MontantDisplay value={overview?.en_attente ?? 0} />
              </dd>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.enRetard')}
              </dt>
              <dd className="font-semibold text-[var(--color-imaro-danger)]">
                <MontantDisplay value={overview?.en_retard ?? 0} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.nbImpayes')}
              </dt>
              <dd className="font-semibold tabular-nums">
                {overview?.nb_impayes ?? 0}
              </dd>
            </div>
          </dl>
        </div>

        {/* Treasury */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-display text-lg text-foreground">
            {t('gestionnaire.residence.overview.treasuryTitle')}
          </h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.tresorerie')}
              </dt>
              <dd className="font-semibold">
                <MontantDisplay value={overview?.tresorerie ?? 0} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">
                {t('gestionnaire.residence.overview.fondsReserve')}
              </dt>
              <dd className="font-semibold">
                <MontantDisplay value={overview?.fonds_reserve ?? 0} />
              </dd>
            </div>
          </dl>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={onGoToCoproprietaires}
          >
            {t('gestionnaire.residence.overview.viewCopros')}
            <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  )
}
