import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Wallet, MessageSquare, User } from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useThemeStore } from '@/stores/themeStore'

type NavItem = {
  to: string
  end?: boolean
  icon: React.ReactNode
  labelKey: string
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/portail',
    end: true,
    icon: <Home className="size-5" aria-hidden="true" />,
    labelKey: 'portail.nav.home',
  },
  {
    to: '/portail/finances',
    icon: <Wallet className="size-5" aria-hidden="true" />,
    labelKey: 'portail.nav.finances',
  },
  {
    to: '/portail/reclamations',
    icon: <MessageSquare className="size-5" aria-hidden="true" />,
    labelKey: 'portail.nav.reclamations',
  },
  {
    to: '/portail/profil',
    icon: <User className="size-5" aria-hidden="true" />,
    labelKey: 'portail.nav.profil',
  },
]

/**
 * Portail copropriétaire layout — mobile-first, bottom nav, no sidebar.
 */
export function PortailLayout() {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-imaro-surface)] dark:bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 dark:bg-card dark:border-border">
        <Wordmark inverted={theme === 'dark'} className="h-10 w-36" />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Page content — pb-20 leaves room for the fixed bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 w-full border-t bg-white dark:bg-card dark:border-border">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs min-h-12 transition-colors',
                  isActive
                    ? 'text-[var(--color-imaro-primary)]'
                    : 'text-muted-foreground',
                ].join(' ')
              }
            >
              {item.icon}
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
