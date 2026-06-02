import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, ArrowRight, Rocket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { getResidences } from '@/services/gestionnaire.service'
import { cn } from '@/lib/utils'

/**
 * Dashboard "finish your setup" card. Shown to the syndic owner until the
 * tenant's onboarding is marked complete. Mirrors the wizard steps and reflects
 * real data (a residence exists? lots exist?), with a button to resume the
 * wizard. Non-blocking — the syndic can ignore it.
 */
export function OnboardingChecklist() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const openWizard = useOnboardingStore((s) => s.openWizard)
  const closeWizard = useOnboardingStore((s) => s.closeWizard)

  const { data: residences = [] } = useQuery({
    queryKey: ['residences'],
    queryFn: () => getResidences(),
  })

  // Only the syndic owner (manager) sees setup, until it's marked complete.
  // super_admin is Digitoyou staff, not a real cabinet — excluded (backend 403s).
  if (user?.role !== 'manager' || tenant?.onboarding_completed_at) return null

  const hasResidence = residences.length > 0
  const hasLots = residences.some((r) => (r.nb_lots ?? 0) > 0)

  const steps = [
    { key: 'residence', done: hasResidence },
    { key: 'lots', done: hasLots },
    { key: 'copros', done: false },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="bg-gradient-imaro-dark relative overflow-hidden rounded-2xl p-6 text-white shadow-lg">
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-[var(--accent)]/25 blur-3xl"
      />
      {/* Dismiss for the session */}
      <button
        type="button"
        onClick={closeWizard}
        aria-label={t('actions.close')}
        className="absolute end-4 top-4 flex size-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="size-4" />
      </button>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
              <Rocket className="size-5" />
            </span>
            <h2 className="font-display text-xl">
              {t('onboarding.checklist.title')}
            </h2>
          </div>
          <p className="mt-2 text-sm text-white/70">
            {t('onboarding.checklist.subtitle')}
          </p>

          {/* Progress */}
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[var(--color-imaro-accent-light)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              {t('onboarding.checklist.progress', {
                done: doneCount,
                total: steps.length,
              })}
            </p>
          </div>
        </div>

        {/* Steps */}
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full',
                  s.done
                    ? 'bg-[var(--color-imaro-success)] text-white'
                    : 'bg-white/10 text-white/40 ring-1 ring-inset ring-white/20',
                )}
              >
                {s.done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  s.done ? 'text-white/60 line-through' : 'text-white/90',
                )}
              >
                {t(`onboarding.checklist.step.${s.key}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        onClick={openWizard}
        className="relative mt-5 bg-white font-semibold text-[var(--primary)] shadow-sm hover:bg-white/90"
      >
        {hasResidence
          ? t('onboarding.checklist.resume')
          : t('onboarding.checklist.start')}
        <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
      </Button>
    </div>
  )
}
