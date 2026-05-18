import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  PiggyBank,
  BookOpen,
  Wrench,
  CalendarDays,
  Megaphone,
  FileText,
  Hammer,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  UserCircle,
  CreditCard as AbonnementIcon,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem = {
  to: string
  icon: React.ReactNode
  labelKey: string
}

type NavSection = {
  labelKey: string | null
  items: NavItem[]
}

// ─── Navigation sections ──────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: null,
    items: [
      {
        to: '/gestionnaire/dashboard',
        icon: <LayoutDashboard className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.dashboard',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionCopropriete',
    items: [
      {
        to: '/gestionnaire/residences',
        icon: <Building2 className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.residences',
      },
      {
        to: '/gestionnaire/coproprietaires',
        icon: <Users className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.coproprietaires',
      },
      {
        to: '/gestionnaire/prestataires',
        icon: <Hammer className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.prestataires',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionFinances',
    items: [
      {
        to: '/gestionnaire/paiements',
        icon: <CreditCard className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.paiements',
      },
      {
        to: '/gestionnaire/depenses',
        icon: <Receipt className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.depenses',
      },
      {
        to: '/gestionnaire/budgets',
        icon: <PiggyBank className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.budgets',
      },
      {
        to: '/gestionnaire/comptabilite',
        icon: <BookOpen className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.comptabilite',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionOperations',
    items: [
      {
        to: '/gestionnaire/tickets',
        icon: <Wrench className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.tickets',
      },
      {
        to: '/gestionnaire/assemblees',
        icon: <CalendarDays className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.assemblees',
      },
      {
        to: '/gestionnaire/annonces',
        icon: <Megaphone className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.annonces',
      },
      {
        to: '/gestionnaire/documents',
        icon: <FileText className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.documents',
      },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

type SidebarNavProps = {
  onNavClick?: () => void
}

function SidebarNav({ onNavClick }: SidebarNavProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'linear-gradient(180deg, #1a4f72 0%, #153f5c 100%)' }}
    >
      {/* ── Logo ── */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/8">
        <Wordmark inverted className="h-12 w-48" />
      </div>

      {/* ── Navigation ── */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.labelKey && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 select-none">
                  {t(section.labelKey)}
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-white/12 text-white shadow-sm'
                          : 'text-white/55 hover:bg-white/6 hover:text-white/85',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className="absolute start-0 inset-y-1.5 w-[3px] rounded-full bg-[#e67e22]"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={cn(
                            'transition-colors',
                            isActive ? 'text-white' : 'text-white/45 group-hover:text-white/70',
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        {!isActive && (
                          <ChevronRight className="size-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

// ─── UserMenu (avatar dropdown) ───────────────────────────────────────────────

function UserMenu() {
  const navigate = useNavigate()
  const { user, tenant, clear } = useAuthStore()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      setStoredToken(null)
      clear()
      void navigate('/login', { replace: true })
    },
  })

  const initials = user ? getInitials(user.name) : 'G'
  const roleName = user?.role === 'manager' ? 'Manager' : 'Gestionnaire'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menu utilisateur"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-transparent transition-all hover:ring-[#1B4F72]/30 focus:outline-none focus-visible:ring-[#1B4F72]/40"
          style={{ background: 'linear-gradient(135deg, #2980b9 0%, #1b4f72 100%)' }}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
        {/* User info header */}
        <DropdownMenuLabel className="font-normal py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2980b9 0%, #1b4f72 100%)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground leading-tight">
                {user?.name ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {user?.phone ?? roleName}
              </p>
              {tenant && (
                <p className="truncate text-xs text-muted-foreground/70 mt-0.5">
                  {tenant.name}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            onClick={() => void navigate('/gestionnaire/profil')}
          >
            <UserCircle className="size-4 shrink-0 text-muted-foreground" />
            <span>Mon Profil</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            onClick={() => void navigate('/gestionnaire/profil')}
          >
            <AbonnementIcon className="size-4 shrink-0 text-muted-foreground" />
            <span>Abonnement</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2.5 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="size-4 shrink-0" />
          <span>{logoutMutation.isPending ? 'Déconnexion…' : 'Déconnexion'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── TopBar context pill (left side) ─────────────────────────────────────────

function ContextPill() {
  const { tenant } = useAuthStore()

  return (
    <div className="hidden sm:flex items-center gap-2.5">
      {/* Icon */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: 'linear-gradient(135deg, #2980b9 0%, #1b4f72 100%)' }}
      >
        <Building2 className="size-4" aria-hidden="true" />
      </div>
      {/* Name + subtitle */}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-foreground max-w-[160px]">
          {tenant?.name ?? 'Imaro'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Gestionnaire
        </p>
      </div>
    </div>
  )
}

// ─── GestionnaireLayout ───────────────────────────────────────────────────────

export function GestionnaireLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 start-0 hidden w-[240px] lg:block shadow-xl shadow-black/10">
        <SidebarNav />
      </aside>

      {/* ── Mobile overlay sidebar ── */}
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

      {/* ── Main area ── */}
      <div className="flex min-h-svh flex-1 flex-col lg:ms-[240px]">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur-sm dark:border-border dark:bg-card/95">

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Left: context pill (residence / tenant) */}
          <ContextPill />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <button
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Bell className="size-[18px]" />
              {/* Unread dot */}
              <span
                className="absolute end-2 top-2 size-1.5 rounded-full bg-[#E67E22]"
                aria-hidden="true"
              />
            </button>

            {/* Divider */}
            <div className="mx-1 h-5 w-px bg-border" />

            <ThemeToggle />
            <LanguageSwitcher />

            {/* Divider */}
            <div className="mx-1 h-5 w-px bg-border" />

            {/* User avatar dropdown */}
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-[var(--color-imaro-surface)] dark:bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
