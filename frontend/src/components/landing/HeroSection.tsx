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
      {/* Masked grid — fades toward edges so it never reads as flat wallpaper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 60px)
          `,
          maskImage:
            'radial-gradient(ellipse 90% 80% at 60% 30%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 80% at 60% 30%, black 30%, transparent 80%)',
        }}
      />
      {/* Animated aurora blobs — give the hero life instead of a static slab */}
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(99,134,217,0.55) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute -left-40 bottom-[-10%] size-[480px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(230,126,34,0.4) 0%, transparent 70%)',
          animationDelay: '4s',
        }}
      />
      <div
        aria-hidden
        className="l-aurora pointer-events-none absolute left-1/2 top-1/4 size-[360px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(45,212,191,0.35) 0%, transparent 70%)',
          animationDelay: '2s',
        }}
      />
      {/* Fine grain overlay for texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
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
          <h1 className="l-fade-up l-d-100 mt-5 font-display text-5xl leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[5rem]">
            {t('landing.hero.title1')}
            <br />
            <span className="relative inline-block">
              {/* Soft glow behind the accent word */}
              <span
                aria-hidden
                className="absolute -inset-x-4 inset-y-0 -z-10 rounded-full bg-[var(--accent)]/25 blur-2xl"
              />
              <span className="l-drift bg-gradient-to-r from-amber-200 via-[var(--color-imaro-accent-light)] to-[var(--accent)] bg-clip-text text-transparent">
                {t('landing.hero.title2')}
              </span>
              {/* Hand-drawn underline stroke */}
              <svg
                aria-hidden
                viewBox="0 0 300 18"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full"
              >
                <path
                  d="M3 12 C 60 4, 120 4, 160 9 S 250 15, 297 6"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: 'landing-dash 1.1s ease 0.6s forwards',
                  }}
                />
              </svg>
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
        <svg
          viewBox="0 0 200 56"
          preserveAspectRatio="none"
          className="h-14 w-full"
        >
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-imaro-primary-light)"
                stopOpacity="0.45"
              />
              <stop
                offset="100%"
                stopColor="var(--color-imaro-primary-light)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {/* baseline grid */}
          {[14, 28, 42].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="200"
              y2={y}
              stroke="rgb(0 18 68 / 0.06)"
              strokeWidth="1"
            />
          ))}
          {/* area fill */}
          <path
            d="M6 32 L43 27 L80 23 L117 18 L154 21 L194 14 L194 50 L6 50 Z"
            fill="url(#hero-area)"
          />
          {/* recouvré line */}
          <path
            d="M6 32 L43 27 L80 23 L117 18 L154 21 L194 14"
            fill="none"
            stroke="var(--color-imaro-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* data points */}
          {[
            [6, 32],
            [43, 27],
            [80, 23],
            [117, 18],
            [154, 21],
            [194, 14],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 5 ? 3.5 : 2}
              fill="white"
              stroke="var(--color-imaro-primary)"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400">
          {['Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai'].map((m) => (
            <span key={m}>{m}</span>
          ))}
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
