import { useTranslation } from 'react-i18next'
import {
  Calculator,
  Landmark,
  Scale,
  Wallet,
  Gavel,
  Building2,
  Smartphone,
  ShieldCheck,
  FolderOpen,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReveal } from './useReveal'

type Tile = {
  key: string
  icon: LucideIcon
  /** lg column span (1 or 2) */
  span: 1 | 2
  /** Dark navy-gradient feature tile (white text) */
  feature?: boolean
  /** Optional badge label key under landing.modules.badges.* */
  badge?: 'new' | 'killer' | 'mobile'
  /** Tailwind classes for the icon chip tint (light tiles only) */
  tone?: string
}

const TILES: Tile[] = [
  {
    key: 'comptabilite',
    icon: Calculator,
    span: 2,
    feature: true,
  },
  {
    key: 'pointage',
    icon: Landmark,
    span: 1,
    badge: 'killer',
    tone: 'from-sky-100 to-sky-50 text-sky-700',
  },
  {
    key: 'recouvrement',
    icon: Scale,
    span: 1,
    tone: 'from-rose-100 to-rose-50 text-rose-600',
  },
  {
    key: 'appels',
    icon: Wallet,
    span: 1,
    tone: 'from-emerald-100 to-emerald-50 text-emerald-700',
  },
  {
    key: 'patrimoine',
    icon: Building2,
    span: 1,
    tone: 'from-amber-100 to-amber-50 text-amber-700',
  },
  {
    key: 'assemblees',
    icon: Gavel,
    span: 2,
    tone: 'from-indigo-100 to-indigo-50 text-indigo-700',
  },
  {
    key: 'portail',
    icon: Smartphone,
    span: 1,
    badge: 'mobile',
    tone: 'from-cyan-100 to-cyan-50 text-cyan-700',
  },
  {
    key: 'conformite',
    icon: ShieldCheck,
    span: 1,
    tone: 'from-teal-100 to-teal-50 text-teal-700',
  },
  {
    key: 'documents',
    icon: FolderOpen,
    span: 1,
    tone: 'from-violet-100 to-violet-50 text-violet-700',
  },
  {
    key: 'imports',
    icon: Upload,
    span: 1,
    tone: 'from-fuchsia-100 to-fuchsia-50 text-fuchsia-700',
  },
]

/**
 * Bento grid showcasing the full Imaro module surface.
 * Asymmetric tiles (two span-2) with one dark navy "feature" tile for
 * internal contrast. Each tile reveals on scroll with a staggered delay.
 */
export function ModulesShowcase() {
  const { t } = useTranslation()
  const { ref, shown } = useReveal<HTMLDivElement>()

  return (
    <section
      id="modules"
      className="relative overflow-hidden bg-[#fbfaf7] py-24 dark:bg-background"
    >
      {/* Soft warm grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(0 18 68 / 0.06) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div ref={ref} className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div
          className={cn(
            'mx-auto max-w-2xl text-center l-reveal',
            shown && 'l-shown',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {t('landing.modules.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-[var(--primary)] sm:text-5xl">
            {t('landing.modules.title')}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {t('landing.modules.subtitle')}
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-16 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon
            const delay = `${0.06 * (i + 1)}s`

            if (tile.feature) {
              return (
                <article
                  key={tile.key}
                  style={{ ['--l-delay' as string]: delay }}
                  className={cn(
                    'l-reveal-scale group relative flex flex-col justify-between overflow-hidden rounded-3xl p-7 text-white shadow-xl shadow-[var(--color-imaro-primary)]/20',
                    'bg-gradient-imaro-radial',
                    tile.span === 2 && 'sm:col-span-2',
                    shown && 'l-shown',
                  )}
                >
                  {/* Aurora glow */}
                  <div
                    aria-hidden
                    className="l-aurora pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[var(--accent)]/30 blur-3xl"
                  />
                  <div className="relative">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-5 font-display text-2xl tracking-tight">
                      {t(`landing.modules.items.${tile.key}.title`)}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
                      {t(`landing.modules.items.${tile.key}.desc`)}
                    </p>
                  </div>
                  <div className="relative mt-6 flex flex-wrap gap-2">
                    {['tag1', 'tag2', 'tag3'].map((tg) => (
                      <span
                        key={tg}
                        className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/85 ring-1 ring-inset ring-white/15"
                      >
                        {t(`landing.modules.items.${tile.key}.${tg}`)}
                      </span>
                    ))}
                  </div>
                </article>
              )
            }

            return (
              <article
                key={tile.key}
                style={{ ['--l-delay' as string]: delay }}
                className={cn(
                  'l-reveal-scale group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_1px_3px_0_rgb(0_18_68_/_0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-imaro-primary)]/25 hover:shadow-[0_16px_40px_-16px_rgb(0_18_68_/_0.22)] dark:border-border dark:bg-card',
                  tile.span === 2 && 'sm:col-span-2',
                  shown && 'l-shown',
                )}
              >
                {tile.badge && (
                  <span className="absolute right-5 top-5 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {t(`landing.modules.badges.${tile.badge}`)}
                  </span>
                )}
                <div
                  className={cn(
                    'flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ring-slate-200/60',
                    tile.tone,
                  )}
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-5 font-display text-xl tracking-tight text-[var(--primary)]">
                  {t(`landing.modules.items.${tile.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.modules.items.${tile.key}.desc`)}
                </p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                  {['tag1', 'tag2'].map((tg) => (
                    <span
                      key={tg}
                      className="rounded-md bg-[var(--color-imaro-primary)]/[0.06] px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                    >
                      {t(`landing.modules.items.${tile.key}.${tg}`)}
                    </span>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
