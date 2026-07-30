import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Wallet, MessageSquare, User, QrCode } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useThemeStore } from '@/stores/themeStore'
import { UnreadBadge } from '@/components/portail/UnreadBadge'
import { NotificationCenter } from '@/components/shared/NotificationCenter'
import { InstallPrompt } from '@/components/portail/InstallPrompt'
import { useNativePush } from '@/hooks/useNativePush'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  end?: boolean
  icon: React.ReactNode
  labelKey: string
  /** Optional unread count selector */
  unread?: number
}

// Two tabs each side of the raised center QR button (kenzup-style, KAN-59).
// Tab unread badges are intentionally left unset — there is no real per-tab
// unread source yet, and hardcoded mock counts (previously 2 / 1) showed as
// phantom badges on real devices. `UnreadBadge` renders nothing when unset, so
// the plumbing stays ready for real data without faking it.
const LEFT_ITEMS: NavItem[] = [
  {
    to: '/portail',
    end: true,
    icon: <Home className="size-[22px]" aria-hidden="true" />,
    labelKey: 'portail.nav.home',
  },
  {
    to: '/portail/finances',
    icon: <Wallet className="size-[22px]" aria-hidden="true" />,
    labelKey: 'portail.nav.finances',
  },
]

const RIGHT_ITEMS: NavItem[] = [
  {
    to: '/portail/reclamations',
    icon: <MessageSquare className="size-[22px]" aria-hidden="true" />,
    labelKey: 'portail.nav.reclamations',
  },
  {
    to: '/portail/profil',
    icon: <User className="size-[22px]" aria-hidden="true" />,
    labelKey: 'portail.nav.profil',
  },
]

/** A single bottom-nav tab. */
function NavTab({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[60px]',
          isActive
            ? 'text-[var(--primary)]'
            : 'text-muted-foreground hover:text-[var(--primary)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'relative flex size-9 items-center justify-center rounded-xl transition-all duration-200',
              isActive && 'bg-[var(--color-imaro-primary-tint)] scale-105',
            )}
          >
            {item.icon}
            <UnreadBadge count={item.unread} />
          </span>
          <span
            className={cn(
              'text-[11px] font-medium',
              isActive && 'font-semibold',
            )}
          >
            {t(item.labelKey)}
          </span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Portail copropriétaire layout — mobile-first PWA shell.
 *
 * - Top app bar with Wordmark + bell + theme + language
 * - Bottom nav: 2 tabs · raised center QR button · 2 tabs
 *   (Home, Finances · QR invités/prestataires · Réclamations, Profil)
 *   - "Actualités" merged into Home as a horizontal scroller
 * - Floating Install prompt (after 2nd visit, dismissible)
 * - Safe-area insets respected (notch + home indicator)
 */
export function PortailLayout() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  useNativePush()

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-imaro-surface)] dark:bg-background">
      {/* Top app bar — sticky, blurred */}
      <header
        className="sticky top-0 z-30 border-b border-[var(--color-imaro-primary)]/10 bg-white/85 backdrop-blur-md dark:border-border dark:bg-card/85"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <Wordmark inverted={theme === 'dark'} className="h-9 w-32" />
          <div className="flex items-center gap-0.5">
            <NotificationCenter
              triggerClassName="size-10 rounded-full text-[var(--primary)] hover:bg-[var(--color-imaro-primary-tint)]"
              iconClassName="size-[22px]"
            />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Page content — reserved space for fixed bottom nav (4rem) */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Bottom navigation — 2 tabs · raised center QR button · 2 tabs */}
      <nav
        aria-label={t('portail.nav.bottomBar')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-imaro-primary)]/10 bg-white/95 backdrop-blur-md shadow-[0_-1px_8px_-2px_rgb(29_78_216_/_0.08)] dark:border-border dark:bg-card/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {LEFT_ITEMS.map((item) => (
            <NavTab key={item.to} item={item} />
          ))}

          {/* Center — raised QR generator button (guests & prestataires) */}
          <div className="flex flex-1 justify-center">
            <NavLink
              to="/portail/visiteurs"
              aria-label={t('portail.nav.qr')}
              className="group flex -translate-y-5 flex-col items-center gap-1"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-14 items-center justify-center rounded-full text-white shadow-lg shadow-[var(--color-imaro-primary)]/30 ring-4 ring-[var(--color-imaro-surface)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 dark:ring-background',
                      isActive && 'scale-105',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-imaro-primary-light) 0%, var(--color-imaro-primary) 100%)',
                    }}
                  >
                    <QrCode className="size-7" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      '-mt-1 text-[11px] font-medium',
                      isActive
                        ? 'font-semibold text-[var(--primary)]'
                        : 'text-muted-foreground',
                    )}
                  >
                    {t('portail.nav.qr')}
                  </span>
                </>
              )}
            </NavLink>
          </div>

          {RIGHT_ITEMS.map((item) => (
            <NavTab key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <InstallPrompt />
    </div>
  )
}
