import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { cn } from '@/lib/utils'

type NavLink = { href: string; label: string }

/**
 * Sticky top nav for the marketing landing page.
 * - Transparent over hero, opaque-frosted once scrolled.
 * - Wordmark left · in-page anchor links center (desktop) · Login + CTA right.
 * - Mobile : hamburger collapse.
 */
export function StickyNav() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links: NavLink[] = [
    { href: '#modules', label: t('landing.nav.features') },
    { href: '#conformite', label: t('landing.nav.conformite') },
    { href: '#pricing', label: t('landing.nav.pricing') },
    { href: '#faq', label: t('landing.nav.faq') },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-[var(--color-imaro-primary)]/10 bg-white/85 shadow-[0_1px_8px_-2px_rgb(29_78_216_/_0.10)] backdrop-blur-lg'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center">
          <Wordmark className="h-10 w-40" inverted={!scrolled} />
        </Link>

        {/* Center anchor links — desktop only */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                scrolled
                  ? 'text-[var(--color-imaro-text)] hover:bg-[var(--color-imaro-primary-tint)] hover:text-[var(--primary)]'
                  : 'text-white/85 hover:bg-white/10 hover:text-white',
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={cn(
              'hidden font-medium sm:inline-flex',
              scrolled
                ? 'text-[var(--color-imaro-text)] hover:bg-[var(--color-imaro-primary-tint)]'
                : 'text-white hover:bg-white/10 hover:text-white',
            )}
          >
            <Link to="/login">{t('landing.nav.login')}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-light)] font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 sm:inline-flex"
          >
            <Link to="/login">{t('landing.nav.cta')}</Link>
          </Button>
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              'flex size-9 items-center justify-center rounded-md md:hidden',
              scrolled
                ? 'text-[var(--color-imaro-text)] hover:bg-[var(--color-imaro-primary-tint)]'
                : 'text-white hover:bg-white/10',
            )}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="border-t border-[var(--color-imaro-primary)]/10 bg-white shadow-lg md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--color-imaro-text)] hover:bg-[var(--color-imaro-primary-tint)] hover:text-[var(--primary)]"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-imaro-primary)]/10 pt-3">
              <LanguageSwitcher />
              <Button asChild size="sm" variant="ghost" className="flex-1">
                <Link to="/login">{t('landing.nav.login')}</Link>
              </Button>
            </div>
            <Button
              asChild
              size="sm"
              className="mt-2 w-full bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-light)] font-semibold text-white shadow-md hover:brightness-110"
            >
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                {t('landing.nav.cta')}
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
