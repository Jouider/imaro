import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ArrowRight, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useReveal } from './useReveal'

const INCLUDED = [
  'included1',
  'included2',
  'included3',
  'included4',
  'included5',
  'included6',
] as const

/**
 * Pricing — no rigid grid. Every copropriété is unique, so the offer is
 * built per client ("sur devis"). One premium navy card on a light band:
 * left = positioning + dual CTA, right = everything-included checklist.
 */
export function PricingTable() {
  const { t } = useTranslation()
  const { ref, shown } = useReveal<HTMLDivElement>()

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[#fbfaf7] py-24 dark:bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(0 18 68 / 0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div ref={ref} className="relative mx-auto max-w-5xl px-5 sm:px-8">
        {/* Header */}
        <div
          className={cn(
            'mx-auto max-w-2xl text-center l-reveal',
            shown && 'l-shown',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {t('landing.pricing.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        {/* Devis card */}
        <div
          style={{ ['--l-delay' as string]: '0.15s' }}
          className={cn('l-reveal-scale mt-14', shown && 'l-shown')}
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-imaro-radial p-1 shadow-2xl shadow-[var(--color-imaro-primary)]/25">
            {/* Aurora */}
            <div
              aria-hidden
              className="l-aurora pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[var(--accent)]/25 blur-3xl"
            />
            <div className="relative grid gap-8 rounded-[1.85rem] p-8 sm:p-10 lg:grid-cols-2 lg:gap-12">
              {/* Left — positioning + CTA */}
              <div className="flex flex-col justify-center text-white">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/85 backdrop-blur">
                  <Sparkles className="size-3.5 text-[var(--color-imaro-accent-light)]" />
                  {t('landing.pricing.cardEyebrow')}
                </span>
                <p className="mt-5 font-display text-5xl leading-none tracking-tight sm:text-6xl">
                  {t('landing.pricing.cardPrice')}
                </p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                  {t('landing.pricing.cardDesc')}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 bg-white px-6 text-base font-semibold text-[var(--primary)] shadow-lg hover:bg-white/90"
                  >
                    <Link to="/login">
                      {t('landing.pricing.ctaQuote')}
                      <ArrowRight className="ms-1.5 size-4 rtl:rotate-180" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-white/30 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white"
                  >
                    <a href="mailto:contact@imaro.ma">
                      <MessageCircle className="me-1.5 size-4" />
                      {t('landing.pricing.ctaExpert')}
                    </a>
                  </Button>
                </div>

                <p className="mt-5 text-xs text-white/55">
                  {t('landing.pricing.note')}
                </p>
              </div>

              {/* Right — everything included */}
              <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {t('landing.pricing.includedTitle')}
                </p>
                <ul className="mt-4 space-y-3">
                  {INCLUDED.map((k, i) => (
                    <li
                      key={k}
                      style={{ ['--l-delay' as string]: `${0.25 + i * 0.06}s` }}
                      className={cn(
                        'l-reveal flex items-start gap-3 text-sm text-white/90',
                        shown && 'l-shown',
                      )}
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-imaro-success)]/90 text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {t(`landing.pricing.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
