import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Plan = {
  key: 'starter' | 'pro' | 'enterprise'
  priceFrom: number | null
  featured?: boolean
  /** 6 boolean flags matching landing.pricing.features.* */
  features: boolean[]
}

const PLANS: Plan[] = [
  {
    key: 'starter',
    priceFrom: 299,
    features: [true, true, true, false, false, false],
  },
  {
    key: 'pro',
    priceFrom: 599,
    featured: true,
    features: [true, true, true, true, true, false],
  },
  {
    key: 'enterprise',
    priceFrom: null, // "Sur devis"
    features: [true, true, true, true, true, true],
  },
]

const FEATURE_KEYS = [
  'residences',
  'copros',
  'support',
  'ia',
  'pointage',
  'multitenant',
] as const

/**
 * Pricing — 3 plans côte à côte. Plan Pro mis en avant avec gradient bleu.
 */
export function PricingTable() {
  const { t } = useTranslation()
  return (
    <section id="pricing" className="bg-slate-50/60 py-24 dark:bg-background">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {t('landing.pricing.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-4">
          {PLANS.map((p) => (
            <article
              key={p.key}
              className={cn(
                'relative flex flex-col rounded-3xl p-7 transition-all duration-300',
                p.featured
                  ? 'border-2 border-[var(--primary)] bg-gradient-to-b from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-white shadow-2xl shadow-blue-500/30 lg:-mt-6 lg:scale-105'
                  : 'border border-slate-200/70 bg-white hover:-translate-y-1 hover:shadow-xl dark:bg-card',
              )}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                  <Sparkles className="size-3" />
                  {t('landing.pricing.popular')}
                </span>
              )}

              {/* Name */}
              <h3
                className={cn(
                  'font-display text-2xl tracking-tight',
                  p.featured ? 'text-white' : 'text-[var(--primary)]',
                )}
              >
                {t(`landing.pricing.${p.key}.name`)}
              </h3>
              <p
                className={cn(
                  'mt-1 text-sm',
                  p.featured ? 'text-white/80' : 'text-muted-foreground',
                )}
              >
                {t(`landing.pricing.${p.key}.tagline`)}
              </p>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1">
                {p.priceFrom === null ? (
                  <span
                    className={cn(
                      'font-display text-4xl tracking-tight',
                      p.featured ? 'text-white' : 'text-[var(--primary)]',
                    )}
                  >
                    {t('landing.pricing.onQuote')}
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        'text-sm',
                        p.featured ? 'text-white/70' : 'text-muted-foreground',
                      )}
                    >
                      {t('landing.pricing.from')}
                    </span>
                    <span
                      className={cn(
                        'font-display text-5xl leading-none tracking-tight',
                        p.featured ? 'text-white' : 'text-[var(--primary)]',
                      )}
                    >
                      {p.priceFrom}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        p.featured ? 'text-white/80' : 'text-muted-foreground',
                      )}
                    >
                      {t('landing.pricing.currency')}
                    </span>
                  </>
                )}
              </div>
              {p.priceFrom !== null && (
                <p
                  className={cn(
                    'mt-1 text-xs',
                    p.featured ? 'text-white/70' : 'text-muted-foreground',
                  )}
                >
                  {t('landing.pricing.perMonth')}
                </p>
              )}

              {/* CTA */}
              <Button
                asChild
                size="lg"
                className={cn(
                  'mt-7 h-11 font-semibold',
                  p.featured
                    ? 'bg-white text-[var(--primary)] hover:bg-white/90'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--color-imaro-primary-dark)]',
                )}
              >
                <Link to="/login">
                  {p.priceFrom === null
                    ? t('landing.pricing.ctaContact')
                    : t('landing.pricing.ctaStart')}
                </Link>
              </Button>

              {/* Features */}
              <ul className="mt-7 space-y-3 border-t pt-6 text-sm">
                {FEATURE_KEYS.map((fk, i) => (
                  <li
                    key={fk}
                    className={cn(
                      'flex items-start gap-2',
                      !p.features[i] && 'opacity-40',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        p.featured
                          ? 'text-[var(--accent)]'
                          : 'text-emerald-500',
                      )}
                    />
                    <span
                      className={cn(
                        p.featured ? 'text-white/90' : 'text-foreground',
                      )}
                    >
                      {t(`landing.pricing.features.${fk}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
