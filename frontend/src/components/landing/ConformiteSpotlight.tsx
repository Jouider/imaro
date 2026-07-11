import { useTranslation } from 'react-i18next'
import {
  ShieldCheck,
  ScrollText,
  CalendarCheck,
  FileCheck2,
  Scale,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReveal } from './useReveal'

/** The regulatory annexes Imaro generates (Décret 2.23.700). */
const ANNEXES = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13-1',
  '13-2',
]

const POINTS = [
  { key: 'regime', icon: Scale },
  { key: 'annexes', icon: FileCheck2 },
  { key: 'calendrier', icon: CalendarCheck },
] as const

/**
 * Dark "legal authority" band — Imaro's native compliance with the Moroccan
 * Décret 2.23.700 + Loi 18-00. Left: positioning + 3 proof points. Right: a
 * glass card with the annual compliance calendar phases + the generated annexes.
 */
export function ConformiteSpotlight() {
  const { t } = useTranslation()
  const { ref, shown } = useReveal<HTMLDivElement>()

  const phases = ['operations', 'cloture', 'ag', 'archivage'] as const

  return (
    <section
      id="conformite"
      className="relative overflow-hidden bg-gradient-imaro-dark py-24 text-white"
    >
      {/* Atmospheric grid + aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.7) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.7) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)',
        }}
      />
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute -left-20 top-10 size-72 rounded-full bg-[var(--accent)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-[#3b62d4]/30 blur-3xl"
        style={{ animationDelay: '3s' }}
      />

      <div
        ref={ref}
        className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2"
      >
        {/* Left — positioning */}
        <div className={cn('l-reveal', shown && 'l-shown')}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur">
            <ScrollText className="size-3.5" />
            {t('landing.conformite.eyebrow')}
          </span>
          <h2 className="mt-5 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            {t('landing.conformite.title')}
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/70">
            {t('landing.conformite.subtitle')}
          </p>

          <div className="mt-9 space-y-5">
            {POINTS.map(({ key, icon: Icon }, i) => (
              <div
                key={key}
                style={{ ['--l-delay' as string]: `${0.15 + i * 0.1}s` }}
                className={cn('l-reveal flex gap-4', shown && 'l-shown')}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                  <Icon className="size-5 text-[var(--color-imaro-accent-light)]" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {t(`landing.conformite.points.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {t(`landing.conformite.points.${key}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — compliance card */}
        <div
          style={{ ['--l-delay' as string]: '0.2s' }}
          className={cn('l-reveal-scale', shown && 'l-shown')}
        >
          <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-imaro-success)]/20 ring-1 ring-inset ring-[var(--color-imaro-success)]/30">
                  <ShieldCheck className="size-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {t('landing.conformite.card.title')}
                  </p>
                  <p className="text-xs text-white/55">
                    {t('landing.conformite.card.subtitle')}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                100%
              </span>
            </div>

            {/* Compliance phases timeline */}
            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {t('landing.conformite.card.cycleLabel')}
              </p>
              <ol className="mt-3 space-y-0">
                {phases.map((p, i) => (
                  <li key={p} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < phases.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[11px] top-6 h-full w-px bg-white/15"
                      />
                    )}
                    <span className="z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-imaro-success)] text-[var(--color-imaro-primary-dark)] shadow">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {t(`landing.conformite.phases.${p}`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Annexes chips */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                {t('landing.conformite.card.annexesLabel')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ANNEXES.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-md bg-white/8 px-2 py-1 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/10"
                  >
                    <FileCheck2 className="size-3 text-emerald-300" />
                    {t('landing.conformite.card.annexePrefix')} {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
