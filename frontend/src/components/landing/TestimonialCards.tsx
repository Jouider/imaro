import { useTranslation } from 'react-i18next'
import { Quote, Star } from 'lucide-react'

type Testimonial = {
  key: string
  initials: string
  /** Tailwind gradient for the avatar background */
  gradient: string
  residences: number
}

const TESTIMONIALS: Testimonial[] = [
  {
    key: 't1',
    initials: 'HA',
    gradient: 'from-blue-500 to-blue-700',
    residences: 24,
  },
  {
    key: 't2',
    initials: 'SB',
    gradient: 'from-emerald-500 to-emerald-700',
    residences: 12,
  },
  {
    key: 't3',
    initials: 'KE',
    gradient: 'from-amber-500 to-amber-700',
    residences: 38,
  },
]

/**
 * 3 testimonials de syndics (placeholders fictifs).
 * Avatar dégradé + quote + nom + nombre de résidences gérées.
 */
export function TestimonialCards() {
  const { t } = useTranslation()
  return (
    <section className="bg-white py-24 dark:bg-card">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            {t('landing.testimonials.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.testimonials.title')}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((tm) => (
            <article
              key={tm.key}
              className="relative flex flex-col rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/40 p-7 shadow-[0_2px_10px_-3px_rgb(29_78_216_/_0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-imaro-primary)]/20 hover:shadow-xl dark:from-card dark:to-background"
            >
              <Quote className="size-7 text-[var(--color-imaro-primary)]/15" />

              {/* Stars */}
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="size-4 fill-[var(--accent)] text-[var(--accent)]"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[var(--color-imaro-text)] dark:text-foreground">
                "{t(`landing.testimonials.${tm.key}.quote`)}"
              </p>

              {/* Footer */}
              <div className="mt-6 flex items-center gap-3 border-t border-slate-200/60 pt-5">
                <div
                  className={`flex size-11 items-center justify-center rounded-full bg-gradient-to-br ${tm.gradient} font-display text-base font-bold text-white`}
                >
                  {tm.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {t(`landing.testimonials.${tm.key}.name`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`landing.testimonials.${tm.key}.role`)} · {tm.residences}{' '}
                    {t('landing.testimonials.residences')}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
