import { useTranslation } from 'react-i18next'
import {
  Coins,
  ShieldCheck,
  Landmark,
  Calculator,
  Building2,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Feature = {
  key: string
  icon: LucideIcon
  /** Tailwind classes for the gradient ring + icon background */
  tone: string
  /** Optional NEW badge */
  badge?: string
}

const FEATURES: Feature[] = [
  {
    key: 'recouvrement',
    icon: Coins,
    tone: 'from-rose-100 to-rose-50 text-rose-600',
  },
  {
    key: 'conformite',
    icon: ShieldCheck,
    tone: 'from-emerald-100 to-emerald-50 text-emerald-600',
  },
  {
    key: 'pointage',
    icon: Landmark,
    tone: 'from-sky-100 to-sky-50 text-sky-600',
  },
  {
    key: 'comptabilite',
    icon: Calculator,
    tone: 'from-blue-100 to-blue-50 text-blue-600',
  },
  {
    key: 'patrimoine',
    icon: Building2,
    tone: 'from-amber-100 to-amber-50 text-amber-600',
  },
  {
    key: 'ia',
    icon: Sparkles,
    tone: 'from-violet-100 to-violet-50 text-violet-600',
    badge: 'NEW',
  },
]

/**
 * Grille 3×2 des 6 features clés du produit.
 * Chaque card : icône tinted, titre, description, hover lift.
 * Le 6e (IA) porte un badge orange "NEW".
 */
export function FeatureGrid() {
  const { t } = useTranslation()
  return (
    <section id="features" className="bg-slate-50/60 py-24 dark:bg-background">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {t('landing.features.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.features.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.features.subtitle')}
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.key}
                className="group relative rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_0_rgb(29_78_216_/_0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-imaro-primary)]/20 hover:shadow-[0_8px_24px_-8px_rgb(29_78_216_/_0.18)] dark:bg-card"
              >
                {f.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {f.badge}
                  </span>
                )}
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ring-slate-200/50',
                    f.tone,
                  )}
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 font-display text-xl tracking-tight text-[var(--primary)]">
                  {t(`landing.features.${f.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.features.${f.key}.desc`)}
                </p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t('landing.features.learnMore')}
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
