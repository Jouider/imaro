import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/components/Wordmark'

/**
 * Footer riche — wordmark, baseline, 4 colonnes de liens, copyright.
 */
export function LandingFooter() {
  const { t } = useTranslation()

  const sections = [
    {
      title: t('landing.footer.col.product'),
      links: [
        { label: t('landing.footer.link.features'), href: '#modules' },
        { label: t('landing.footer.link.pricing'), href: '#pricing' },
        { label: t('landing.footer.link.security'), href: '#' },
      ],
    },
    {
      title: t('landing.footer.col.company'),
      links: [
        { label: t('landing.footer.link.about'), href: '#' },
        { label: t('landing.footer.link.careers'), href: '#' },
        {
          label: t('landing.footer.link.contact'),
          href: 'mailto:contact@imaro.ma',
        },
        { label: t('landing.footer.link.blog'), href: '#' },
      ],
    },
    {
      title: t('landing.footer.col.resources'),
      links: [
        { label: t('landing.footer.link.docs'), href: '#' },
        {
          label: t('landing.footer.link.manual'),
          href: '/docs/Imaro-Manuel-Utilisateur.pdf',
        },
        { label: t('landing.footer.link.help'), href: '#' },
        { label: t('landing.footer.link.status'), href: '#' },
      ],
    },
    {
      title: t('landing.footer.col.legal'),
      links: [
        { label: t('landing.footer.link.terms'), href: '#' },
        { label: t('landing.footer.link.privacy'), href: '#' },
        { label: t('landing.footer.link.compliance'), href: '#' },
        { label: t('landing.footer.link.cookies'), href: '#' },
      ],
    },
  ]

  return (
    <footer className="border-t border-slate-200/70 bg-white py-16 dark:bg-card">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-10 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          {/* Brand column — full width on mobile, 1 col on desktop */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex">
              <Wordmark className="h-10 w-40" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('landing.footer.tagline')}
            </p>
            <p className="mt-6 text-xs text-muted-foreground">
              📍 {t('landing.footer.address')}
            </p>
          </div>

          {/* Link columns — 2-up on mobile, inline on desktop */}
          {sections.map((s) => (
            <div key={s.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
                {s.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {s.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-[var(--primary)]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-200/60 pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-start">
          <span>{t('landing.footer.copyright')}</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full bg-[var(--color-imaro-primary-tint)] px-2.5 py-1 font-medium text-[var(--primary)]">
              {t('landing.footer.compliance')}
            </span>
            <span>{t('landing.footer.maroc')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
