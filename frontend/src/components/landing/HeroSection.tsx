import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Hero — H1 DM Serif + subtitle + dual CTA + floating product mockup card.
 * Background = royal blue gradient + subtle grid overlay + soft radial glow.
 */
export function HeroSection() {
  const { t } = useTranslation()
  return (
    <section
      id="hero"
      className="relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-32 lg:pt-40"
      style={{
        background:
          'linear-gradient(135deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 60%, #0b1f4a 100%)',
      }}
    >
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 64px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 64px)
          `,
        }}
      />
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 size-[600px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 size-[400px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(230,126,34,0.3) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        {/* Left — copy + CTA */}
        <div className="flex flex-col justify-center">
          {/* Eyebrow badge */}
          <div className="l-fade-up inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-[var(--accent)]" />
            {t('landing.hero.eyebrow')}
          </div>

          {/* Headline */}
          <h1 className="l-fade-up l-d-100 mt-5 font-display text-5xl leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {t('landing.hero.title1')}
            <br />
            <span className="bg-gradient-to-r from-white via-blue-100 to-[var(--accent)] bg-clip-text text-transparent">
              {t('landing.hero.title2')}
            </span>
          </h1>

          {/* Subhead */}
          <p className="l-fade-up l-d-200 mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {t('landing.hero.subtitle')}
          </p>

          {/* CTA row */}
          <div className="l-fade-up l-d-300 mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-white px-7 text-base font-semibold text-[var(--primary)] shadow-xl shadow-blue-950/20 hover:bg-white/90"
            >
              <Link to="/login">
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="ms-1.5 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/30 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
            >
              <a href="#features">{t('landing.hero.ctaSecondary')}</a>
            </Button>
          </div>

          {/* Trust signals */}
          <div className="l-fade-up l-d-400 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-[var(--accent)]" />
              {t('landing.hero.trust1')}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-[var(--accent)]" />
              {t('landing.hero.trust2')}
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-[var(--accent)]" />
              {t('landing.hero.trust3')}
            </span>
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="l-fade-up l-d-500 relative hidden lg:flex lg:items-center lg:justify-center">
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

/**
 * Floating Imaro dashboard mockup — pure CSS, no images.
 * Dense, credible snapshot of the gestionnaire dashboard with real-looking
 * mock data: 3 KPIs + chart + module grid + impayé alert + recent activity.
 */
function HeroMockup() {
  return (
    <div className="l-float relative w-full max-w-md rounded-2xl border border-white/10 bg-white p-3.5 shadow-2xl shadow-blue-950/50 backdrop-blur-sm dark:bg-card">
      {/* Window chrome */}
      <div className="mb-3 flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <div className="ms-2 flex-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-mono text-slate-500">
          app.imaro.ma/gestionnaire/dashboard
        </div>
      </div>

      {/* Header strip */}
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <p className="font-display text-sm leading-tight text-[var(--primary)]">
            Bonjour, Hassan
          </p>
          <p className="text-[10px] text-slate-500">
            12 résidences · 3 actions urgentes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <svg viewBox="0 0 16 16" fill="none" className="size-3">
              <path
                d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5v3l-1 1.5h11l-1-1.5V6A4.5 4.5 0 0 0 8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.5 12.5a1.5 1.5 0 0 0 3 0"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center rounded-full bg-[var(--accent)] text-[7px] font-bold text-white">
              3
            </span>
          </span>
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-[10px] font-bold text-white">
            HA
          </span>
        </div>
      </div>

      {/* 3 KPI row */}
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-[var(--color-imaro-primary)]/10 bg-gradient-to-br from-white to-[var(--color-imaro-primary-tint)]/40 p-2">
          <p className="text-[8px] font-medium uppercase tracking-wide text-slate-500">
            CA mensuel
          </p>
          <p className="font-display text-base leading-none tracking-tight text-[var(--primary)]">
            48,2K
          </p>
          <p className="mt-0.5 text-[8px] font-semibold text-emerald-600">
            ↑ 12,5 %
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-imaro-primary)]/10 bg-gradient-to-br from-white to-orange-50 p-2">
          <p className="text-[8px] font-medium uppercase tracking-wide text-slate-500">
            Impayés
          </p>
          <p className="font-display text-base leading-none tracking-tight text-[var(--primary)]">
            18,2K
          </p>
          <p className="mt-0.5 text-[8px] font-semibold text-rose-600">
            ↓ 5,1 %
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-imaro-primary)]/10 bg-gradient-to-br from-white to-emerald-50/60 p-2">
          <p className="text-[8px] font-medium uppercase tracking-wide text-slate-500">
            Trésorerie
          </p>
          <p className="font-display text-base leading-none tracking-tight text-[var(--primary)]">
            312K
          </p>
          <p className="mt-0.5 text-[8px] font-semibold text-emerald-600">
            ↑ 8,3 %
          </p>
        </div>
      </div>

      {/* Recouvrement mini-chart */}
      <div className="mb-2.5 rounded-lg border border-slate-200/70 bg-slate-50/60 p-2">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-600">
            Recouvrement 6 mois
          </p>
          <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] font-bold text-emerald-700">
            87 %
          </span>
        </div>
        <div className="flex h-10 items-end gap-1">
          {[
            { p: 62, r: 38 },
            { p: 70, r: 30 },
            { p: 75, r: 25 },
            { p: 82, r: 18 },
            { p: 78, r: 22 },
            { p: 87, r: 13 },
          ].map((bar, i) => (
            <div key={i} className="relative flex-1">
              <div
                className="absolute inset-x-0 bottom-0 rounded-sm bg-rose-300"
                style={{ height: `${bar.p + bar.r}%` }}
              />
              <div
                className="absolute inset-x-0 bottom-0 rounded-sm bg-gradient-to-t from-[var(--primary)] to-[var(--color-imaro-primary-light)]"
                style={{ height: `${bar.p}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[8px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-sm bg-[var(--primary)]" />
            Recouvré
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-sm bg-rose-300" />
            Restant
          </span>
        </div>
      </div>

      {/* Modules grid — 3×2 with mini stats */}
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        {[
          {
            label: 'IA',
            stat: '87/100',
            sub: 'Score',
            color: 'from-violet-500 to-violet-600',
            pulse: true,
          },
          {
            label: 'Conformité',
            stat: '11/12',
            sub: 'Tâches',
            color: 'from-emerald-500 to-emerald-600',
          },
          {
            label: 'Recouvrement',
            stat: '8',
            sub: 'Relances',
            color: 'from-rose-500 to-rose-600',
          },
          {
            label: 'Pointage',
            stat: '42/48',
            sub: 'Match auto',
            color: 'from-sky-500 to-sky-600',
          },
          {
            label: 'Patrimoine',
            stat: '24',
            sub: 'Équipements',
            color: 'from-amber-500 to-amber-600',
          },
          {
            label: 'Annexes',
            stat: '12',
            sub: 'Générées',
            color: 'from-slate-500 to-slate-600',
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`relative overflow-hidden rounded-md bg-gradient-to-br ${m.color} p-1.5 text-white shadow-sm`}
          >
            <p className="text-[7px] font-semibold uppercase tracking-wider opacity-80">
              {m.label}
            </p>
            <p className="mt-0.5 font-display text-sm leading-none tracking-tight">
              {m.stat}
            </p>
            <p className="text-[7px] opacity-70">{m.sub}</p>
            {m.pulse && (
              <span className="l-pulse-ring absolute right-1 top-1 size-1.5 rounded-full bg-white" />
            )}
          </div>
        ))}
      </div>

      {/* Bottom activity row */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
            !
          </span>
          <p className="flex-1 text-[9px] font-medium text-amber-800">
            3 mises en demeure à envoyer
          </p>
          <span className="rounded bg-white px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 shadow-sm">
            Voir
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[8px]">
            ✓
          </span>
          <p className="flex-1 text-[9px] text-slate-700">
            Pointage Attijariwafa terminé
          </p>
          <span className="text-[8px] text-slate-400">il y a 2 min</span>
        </div>
      </div>
    </div>
  )
}
