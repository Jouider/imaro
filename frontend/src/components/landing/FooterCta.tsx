import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Bande CTA finale + footer — gradient royal blue, message punchy, 2 CTAs.
 */
export function FooterCta() {
  const { t } = useTranslation()
  return (
    <section
      className="relative overflow-hidden py-24"
      style={{
        background:
          'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 60%, #0b1f4a 100%)',
      }}
    >
      {/* Decorative dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Orange glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/2 size-[600px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(230,126,34,0.5) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
          <Sparkles className="size-3.5 text-[var(--accent)]" />
          {t('landing.cta.eyebrow')}
        </div>

        <h2 className="mt-5 font-display text-4xl leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          {t('landing.cta.title')}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
          {t('landing.cta.subtitle')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 bg-white px-7 text-base font-semibold text-[var(--primary)] shadow-xl hover:bg-white/90"
          >
            <Link to="/login">
              {t('landing.cta.primary')}
              <ArrowRight className="ms-1.5 size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-white/30 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
          >
            <a href="mailto:sales@imaro.ma">{t('landing.cta.secondary')}</a>
          </Button>
        </div>

        <p className="mt-7 text-sm text-white/60">
          {t('landing.cta.fineprint')}
        </p>
      </div>
    </section>
  )
}
