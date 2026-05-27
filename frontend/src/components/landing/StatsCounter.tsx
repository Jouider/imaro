import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Stat = {
  /** Target numeric value to count up to */
  target: number
  /** Suffix appended after value, e.g. "+" or "%" */
  suffix?: string
  /** i18n key for the label */
  labelKey: string
  /** When true, value is rendered as a checkmark instead of number */
  badge?: boolean
}

const STATS: Stat[] = [
  { target: 500, suffix: '+', labelKey: 'landing.stats.residences' },
  { target: 12000, suffix: '+', labelKey: 'landing.stats.copros' },
  { target: 99.9, suffix: '%', labelKey: 'landing.stats.uptime' },
  { target: 0, badge: true, labelKey: 'landing.stats.compliance' },
]

/**
 * 4 KPIs avec compteurs animés (Intersection Observer trigger).
 * Une fois visible, chaque chiffre s'incrémente de 0 à target sur ~1.6s.
 */
export function StatsCounter() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!sectionRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="bg-white py-16 dark:bg-card">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <StatItem
              key={i}
              stat={s}
              active={active}
              delayMs={i * 100}
              t={t}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatItem({
  stat,
  active,
  delayMs,
  t,
}: {
  stat: Stat
  active: boolean
  delayMs: number
  t: (k: string) => string
}) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active || stat.badge) return
    const duration = 1600
    const start = performance.now() + delayMs
    let raf = 0
    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick)
        return
      }
      const progress = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(stat.target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, delayMs, stat.target, stat.badge])

  const formatted = stat.badge
    ? '✓'
    : Number.isInteger(stat.target)
      ? Math.round(value).toLocaleString('fr-FR')
      : value.toFixed(1).replace('.', ',')

  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-display text-5xl leading-none tracking-tight text-[var(--primary)] sm:text-6xl">
          {formatted}
        </span>
        {stat.suffix && !stat.badge && (
          <span className="font-display text-3xl text-[var(--accent)]">
            {stat.suffix}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        {t(stat.labelKey)}
      </p>
    </div>
  )
}
