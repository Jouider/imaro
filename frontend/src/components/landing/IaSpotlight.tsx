import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from 'lucide-react'

/**
 * Spotlight section #1 — Assistant IA.
 * Left : copy + features. Right : animated audit report card with a score ring
 * that fills up from 0 to 87 once visible.
 */
export function IaSpotlight() {
  const { t } = useTranslation()
  return (
    <section
      id="ia"
      className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-blue-50 py-24 dark:from-background dark:via-background dark:to-background"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
        {/* Left — copy */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            <Sparkles className="size-3.5" />
            {t('landing.ia.eyebrow')}
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.ia.title')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('landing.ia.subtitle')}
          </p>

          <ul className="mt-8 space-y-4">
            {(['audit', 'ocr', 'budget'] as const).map((k) => (
              <li key={k} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                  <Zap className="size-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-[var(--primary)]">
                    {t(`landing.ia.${k}.title`)}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`landing.ia.${k}.desc`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — animated audit report card */}
        <div className="relative">
          <IaAuditMock />
          {/* Decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-violet-200/40 blur-3xl"
          />
        </div>
      </div>
    </section>
  )
}

function IaAuditMock() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement | null>(null)
  const [score, setScore] = useState(0)
  const TARGET = 87

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const duration = 1800
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setScore(Math.round(TARGET * eased))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        obs.disconnect()
      },
      { threshold: 0.4 },
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  // Circle arc geometry
  const R = 56
  const C = 2 * Math.PI * R
  const dash = (score / 100) * C

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-md rounded-2xl border border-violet-200/60 bg-white p-6 shadow-2xl shadow-violet-300/40 dark:bg-card"
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-display text-base text-[var(--primary)]">
              {t('landing.ia.report.title')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('landing.ia.report.subtitle')}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {t('landing.ia.report.status')}
        </span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            className="-rotate-90"
          >
            <circle
              cx="64"
              cy="64"
              r={R}
              stroke="rgb(237 233 254)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r={R}
              stroke="url(#ia-gradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
              style={{ transition: 'stroke-dasharray 0.05s linear' }}
            />
            <defs>
              <linearGradient id="ia-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl text-[var(--primary)]">
              {score}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              / 100
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          <ScoreLine
            severity="warning"
            label={t('landing.ia.report.f1')}
            count="3"
          />
          <ScoreLine
            severity="info"
            label={t('landing.ia.report.f2')}
            count="2"
          />
          <ScoreLine
            severity="success"
            label={t('landing.ia.report.f3')}
            count="14"
          />
        </div>
      </div>

      {/* Findings preview */}
      <div className="mt-5 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-background">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-[11px] font-semibold text-[var(--primary)]">
              {t('landing.ia.report.finding1.title')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t('landing.ia.report.finding1.desc')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-[11px] font-semibold text-[var(--primary)]">
              {t('landing.ia.report.finding2.title')}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t('landing.ia.report.finding2.desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreLine({
  severity,
  label,
  count,
}: {
  severity: 'warning' | 'info' | 'success'
  label: string
  count: string
}) {
  const tone = {
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-emerald-100 text-emerald-700',
  }[severity]
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}
      >
        {count}
      </span>
    </div>
  )
}
