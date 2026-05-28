import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  UserCircle,
  ChevronRight,
} from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuthStore } from '@/stores/authStore'
import { setStoredToken } from '@/lib/axios'
import { logout } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  end?: boolean
  icon: React.ReactNode
  labelKey: string
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/manager/dashboard',
    icon: <LayoutDashboard className="size-[18px]" aria-hidden="true" />,
    labelKey: 'manager.nav.dashboard',
  },
  {
    to: '/manager/residences',
    icon: <Building2 className="size-[18px]" aria-hidden="true" />,
    labelKey: 'manager.nav.residences',
  },
  {
    to: '/manager/gestionnaires',
    icon: <Users className="size-[18px]" aria-hidden="true" />,
    labelKey: 'manager.nav.gestionnaires',
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Manager workspace shell — sidebar gauche + topbar.
 * 3 onglets : Dashboard, Résidences, Gestionnaires.
 */
export function ManagerLayout() {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 hidden w-[240px] lg:block shadow-xl shadow-black/10">
        <SidebarNav />
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-[240px] lg:hidden shadow-2xl">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
              <SidebarNav onNavClick={() => setMobileOpen(false)} />
            </div>
          </aside>
        </>
      )}

      <div className="flex min-h-svh flex-1 flex-col lg:ms-[240px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur-sm dark:border-border dark:bg-card/95">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('manager.nav.openMenu')}
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-[var(--primary)] sm:inline">
              {t('manager.workspace')}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="mx-1.5 h-5 w-px bg-border" />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 bg-[var(--color-imaro-surface)] dark:bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav
      className="flex h-full flex-col"
      style={{
        background:
          'linear-gradient(180deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
      }}
    >
      {/* Logo */}
      <div className="border-b border-white/10 px-5 py-4">
        <Wordmark inverted className="h-10 w-40" />
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
          {t('manager.workspace')}
        </p>
      </div>

      {/* Items */}
      <ul className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-white/75 hover:bg-white/8 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-[var(--accent)]" />
                  )}
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/login', { replace: true })
    },
  })

  const name = user?.name ?? 'Manager'
  const initials = getInitials(name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('manager.nav.userMenu')}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-imaro-primary)] to-[var(--color-imaro-primary-dark)] text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-semibold text-[var(--primary)]">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {user?.phone ?? t('manager.workspace')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/manager/dashboard" className="flex items-center gap-2">
            <UserCircle className="size-4" />
            {t('manager.nav.workspace')}
            <ChevronRight className="ms-auto size-3.5 text-muted-foreground" />
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="text-[var(--destructive)] focus:text-[var(--destructive)]"
        >
          <LogOut className="size-4" />
          {t('manager.nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
