import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Receipt,
  CreditCard,
  Wrench,
  CalendarDays,
  Smartphone,
  Users,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────
   Animation keyframes injected via a <style> tag.
   We avoid external animation libraries and keep
   everything inside this single file.
───────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
.anim-fade-in-up {
  animation: fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.anim-fade-in {
  animation: fadeIn 0.6s ease both;
}
.anim-float {
  animation: float 3s ease-in-out infinite;
}
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }
.delay-700 { animation-delay: 0.7s; }
`

/* ─────────────────────────────────────────────
   Feature card data — icon + i18n key
───────────────────────────────────────────── */
type FeatureItem = {
  key: string
  icon: React.ElementType
  color: string
  bg: string
}

const FEATURES: FeatureItem[] = [
  {
    key: 'residences',
    icon: Building2,
    color: 'text-[#1B4F72]',
    bg: 'bg-[#1B4F72]/10',
  },
  {
    key: 'appels',
    icon: Receipt,
    color: 'text-[#E67E22]',
    bg: 'bg-[#E67E22]/10',
  },
  {
    key: 'paiements',
    icon: CreditCard,
    color: 'text-[#27AE60]',
    bg: 'bg-[#27AE60]/10',
  },
  {
    key: 'tickets',
    icon: Wrench,
    color: 'text-[#1B4F72]',
    bg: 'bg-[#1B4F72]/10',
  },
  {
    key: 'assemblees',
    icon: CalendarDays,
    color: 'text-[#E67E22]',
    bg: 'bg-[#E67E22]/10',
  },
  {
    key: 'portail',
    icon: Smartphone,
    color: 'text-[#27AE60]',
    bg: 'bg-[#27AE60]/10',
  },
]

/* ─────────────────────────────────────────────
   How-it-works step data
───────────────────────────────────────────── */
type StepItem = {
  key: string
  num: string
  icon: React.ElementType
}

const STEPS: StepItem[] = [
  { key: 'step1', num: '1', icon: Building2 },
  { key: 'step2', num: '2', icon: Users },
  { key: 'step3', num: '3', icon: LayoutDashboard },
]

/* ─────────────────────────────────────────────
   Stats data
───────────────────────────────────────────── */
type StatItem = {
  value: string
  key: string
}

const STATS: StatItem[] = [
  { value: '500+', key: 'residences' },
  { value: '12 000+', key: 'coproprietaires' },
  { value: '99.9%', key: 'dispo' },
  { value: '✓', key: 'loi' },
]

/* ═══════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════ */
export function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      {/* Inject keyframe CSS */}
      <style>{KEYFRAMES}</style>

      <div className="scroll-smooth">
        {/* ══════════════════════════════════════
            1. STICKY NAVBAR
        ══════════════════════════════════════ */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1B4F72] shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            {/* Logo */}
            <Wordmark className="h-11 w-44" inverted />

            {/* Desktop nav actions */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              {/* Gestionnaire — navy outline (white border on dark bg) */}
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/login">{t('home.nav.gestionnaire')}</Link>
              </Button>

              {/* Copropriétaire — solid orange */}
              <Button
                asChild
                size="sm"
                className="bg-[#E67E22] text-white hover:bg-[#ba6118]"
              >
                <Link to="/portail/login">{t('home.nav.coproprietaire')}</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════
            2. HERO
        ══════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, #1B4F72 0%, #154360 60%, #0e2d41 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 90%, 0 100%)',
            paddingBottom: '6rem',
          }}
        >
          {/* Grid overlay pattern */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  rgba(255,255,255,0.05) 0px,
                  rgba(255,255,255,0.05) 1px,
                  transparent 1px,
                  transparent 60px
                ),
                repeating-linear-gradient(
                  90deg,
                  rgba(255,255,255,0.05) 0px,
                  rgba(255,255,255,0.05) 1px,
                  transparent 1px,
                  transparent 60px
                )
              `,
            }}
          />

          <div className="relative mx-auto max-w-4xl px-6 pb-10 pt-24 text-center">
            {/* Headline */}
            <h1
              className={cn(
                'anim-fade-in-up font-display text-5xl leading-tight text-white sm:text-6xl lg:text-7xl',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('home.hero.headline1')}
              <br />
              <span className="text-[#E67E22]">{t('home.hero.headline2')}</span>
            </h1>

            {/* Subheadline */}
            <p
              className="anim-fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {t('home.hero.sub')}
            </p>

            {/* CTA buttons */}
            <div className="anim-fade-in-up delay-400 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {/* Gestionnaire — white bg */}
              <Button
                asChild
                size="lg"
                className="min-w-[200px] bg-white font-semibold text-[#1B4F72] shadow-lg hover:bg-white/90"
              >
                <Link to="/login">
                  {t('home.hero.ctaGestionnaire')}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>

              {/* Copropriétaire — orange */}
              <Button
                asChild
                size="lg"
                className="min-w-[200px] bg-[#E67E22] font-semibold text-white shadow-lg hover:bg-[#ba6118]"
              >
                <Link to="/portail/login">
                  {t('home.hero.ctaCoproprietaire')}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>

            {/* Floating compliance badge */}
            <div
              aria-label={t('home.hero.badge')}
              className={cn(
                'anim-float delay-700',
                'mt-14 inline-flex items-center gap-2 rounded-full border border-[#E67E22]/60',
                'bg-[#E67E22]/20 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm',
              )}
            >
              <CheckCircle2 className="size-4 text-[#E67E22]" />
              {t('home.hero.badge')}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            3. STATS BAR
        ══════════════════════════════════════ */}
        <section
          className="relative -mt-8 bg-[#F8F9FA]"
          style={{ zIndex: 10 }}
        >
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="flex flex-col items-center justify-around gap-6 sm:flex-row">
              {STATS.map((stat, i) => (
                <div
                  key={stat.key}
                  className={cn(
                    'anim-fade-in flex flex-1 flex-col items-center px-4 text-center',
                    i < STATS.length - 1
                      ? 'border-b border-[#1B4F72]/15 pb-6 sm:border-b-0 sm:border-r sm:pb-0'
                      : '',
                  )}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span
                    className="text-3xl font-extrabold tracking-tight text-[#1B4F72]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {stat.value}
                  </span>
                  <span className="mt-1 text-sm text-[#7f8c8d]">
                    {t(`home.stats.${stat.key}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            4. FEATURES GRID
        ══════════════════════════════════════ */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            {/* Section header */}
            <div className="mb-12 text-center">
              <h2
                className="font-display text-3xl font-bold text-[#1B4F72] sm:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('home.features.title')}
              </h2>
              <p className="mt-3 text-[#7f8c8d]">{t('home.features.sub')}</p>
            </div>

            {/* Grid */}
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {FEATURES.map((feat) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.key}
                    className={cn(
                      'group rounded-xl border border-gray-100 bg-white p-6 shadow-sm',
                      'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
                    )}
                  >
                    {/* Icon circle */}
                    <div
                      className={cn(
                        'mb-4 flex size-11 items-center justify-center rounded-full',
                        feat.bg,
                      )}
                    >
                      <Icon className={cn('size-5', feat.color)} />
                    </div>

                    <h3 className="text-base font-semibold text-[#2c3e50]">
                      {t(`home.features.${feat.key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#7f8c8d]">
                      {t(`home.features.${feat.key}.desc`)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            5. HOW IT WORKS
        ══════════════════════════════════════ */}
        <section className="bg-[#F8F9FA] py-20">
          <div className="mx-auto max-w-5xl px-6">
            {/* Header */}
            <div className="mb-14 text-center">
              <h2
                className="font-display text-3xl font-bold text-[#1B4F72] sm:text-4xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('home.howItWorks.title')}
              </h2>
              <p className="mt-3 text-[#7f8c8d]">{t('home.howItWorks.sub')}</p>
            </div>

            {/* Steps */}
            <div className="relative flex flex-col items-start gap-10 md:flex-row md:items-start">
              {STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center text-center">
                    {/* Step number + icon */}
                    <div className="relative mb-5 flex size-20 items-center justify-center rounded-full bg-[#1B4F72] shadow-lg">
                      {/* Large background number */}
                      <span
                        className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-[#E67E22] text-xs font-extrabold text-white shadow"
                        aria-hidden
                      >
                        {step.num}
                      </span>
                      <Icon className="size-8 text-white" />
                    </div>

                    <h3 className="text-base font-bold text-[#1B4F72]">
                      {t(`home.howItWorks.${step.key}.title`)}
                    </h3>
                    <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-[#7f8c8d]">
                      {t(`home.howItWorks.${step.key}.desc`)}
                    </p>

                    {/* Arrow between steps — desktop only */}
                    {i < STEPS.length - 1 && (
                      <div
                        aria-hidden
                        className="mt-10 hidden text-[#1B4F72]/30 md:absolute md:flex"
                        style={{
                          left: `calc(${(i + 1) * (100 / STEPS.length)}% - 12px)`,
                          top: '38px',
                        }}
                      >
                        <ArrowRight className="size-6" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            6. DUAL PORTAL CARDS
        ══════════════════════════════════════ */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex flex-col gap-6 md:flex-row">
              {/* Gestionnaire card — navy */}
              <div className="flex flex-1 flex-col items-start rounded-2xl bg-[#1B4F72] p-8 shadow-xl">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/15">
                  <Building2 className="size-6 text-white" />
                </div>
                <h3
                  className="font-display text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t('home.portals.gestionnaire.title')}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/75">
                  {t('home.portals.gestionnaire.desc')}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 border-white/70 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">{t('home.portals.gestionnaire.cta')}</Link>
                </Button>
              </div>

              {/* Copropriétaire card — orange */}
              <div className="flex flex-1 flex-col items-start rounded-2xl bg-[#E67E22] p-8 shadow-xl">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white/20">
                  <Users className="size-6 text-white" />
                </div>
                <h3
                  className="font-display text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {t('home.portals.coproprietaire.title')}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/80">
                  {t('home.portals.coproprietaire.desc')}
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 border-white/70 bg-transparent font-semibold text-white hover:bg-white/20 hover:text-white"
                >
                  <Link to="/portail/login">
                    {t('home.portals.coproprietaire.cta')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            7. FOOTER
        ══════════════════════════════════════ */}
        <footer className="bg-[#154360] py-12">
          <div className="mx-auto max-w-6xl px-6">
            {/* Logo + tagline */}
            <div className="flex flex-col items-center text-center">
              <Wordmark className="h-11 w-44" inverted />
              <p className="mt-3 text-sm text-white/60">
                {t('home.footer.tagline')}
              </p>
            </div>

            {/* Divider */}
            <hr className="my-8 border-white/10" />

            {/* Bottom row */}
            <div className="flex flex-col items-center justify-between gap-2 text-xs text-white/50 sm:flex-row">
              <span>{t('home.footer.copyright')}</span>
              <span>{t('home.footer.legal')}</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
