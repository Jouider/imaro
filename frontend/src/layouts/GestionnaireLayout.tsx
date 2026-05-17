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
} from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type NavItem = {
  to: string
  icon: React.ReactNode
  labelKey: string
}

type NavSection = {
  labelKey: string | null   // null → no section header (used for Dashboard)
  items: NavItem[]
}

// ─── Navigation structure ─────────────────────────────────────────────────────
// Grouped into 4 meaningful sections so the sidebar is scannable at a glance.

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: null,
    items: [
      {
        to: '/gestionnaire/dashboard',
        icon: <LayoutDashboard className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.dashboard',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionCopropriete',
    items: [
      {
        to: '/gestionnaire/residences',
        icon: <Building2 className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.residences',
      },
      {
        to: '/gestionnaire/coproprietaires',
        icon: <Users className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.coproprietaires',
      },
      {
        to: '/gestionnaire/prestataires',
        icon: <Hammer className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.prestataires',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionFinances',
    items: [
      {
        to: '/gestionnaire/paiements',
        icon: <CreditCard className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.paiements',
      },
      {
        to: '/gestionnaire/depenses',
        icon: <Receipt className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.depenses',
      },
      {
        to: '/gestionnaire/budgets',
        icon: <PiggyBank className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.budgets',
      },
      {
        to: '/gestionnaire/comptabilite',
        icon: <BookOpen className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.comptabilite',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionOperations',
    items: [
      {
        to: '/gestionnaire/tickets',
        icon: <Wrench className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.tickets',
      },
      {
        to: '/gestionnaire/assemblees',
        icon: <CalendarDays className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.assemblees',
      },
      {
        to: '/gestionnaire/annonces',
        icon: <Megaphone className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.annonces',
      },
      {
        to: '/gestionnaire/documents',
        icon: <FileText className="size-5" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.documents',
      },
    ],
  },
]

// ─── SidebarNav ───────────────────────────────────────────────────────────────

type SidebarNavProps = {
  onNavClick?: () => void
}

function SidebarNav({ onNavClick }: SidebarNavProps) {
  const { t } = useTranslation()
  const { user, clear } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clear()
    void navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-imaro-primary)]">
      {/* Logo */}
      <div className="flex h-16 items-center px-4">
        <Wordmark inverted className="h-14 w-52" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {/* Section label */}
            {section.labelKey && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/35 select-none">
                {t(section.labelKey)}
              </p>
            )}

            {/* Items */}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* User info + logout */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? 'G'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user?.name ?? '—'}
            </p>
            <p className="truncate text-xs text-white/50 capitalize">
              {user?.role ?? '—'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t('nav.logout')}
        </button>
      </div>
    </div>
  )
}

// ─── GestionnaireLayout ───────────────────────────────────────────────────────

/**
 * Gestionnaire / manager desktop-first sidebar layout.
 * Sidebar is fixed on lg+. Below lg a hamburger button opens a slide-in overlay.
 */
export function GestionnaireLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* ── Desktop sidebar (fixed, always visible on lg+) ── */}
      <aside className="fixed inset-y-0 start-0 hidden w-64 lg:block">
        <SidebarNav />
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 start-0 z-50 w-64 lg:hidden">
            <div className="relative h-full">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
      <div className="flex min-h-svh flex-1 flex-col lg:ms-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-white px-4 dark:border-border dark:bg-card">
          {/* Hamburger — only visible below lg */}
          <Button
            variant="ghost"
            size="sm"
            className="me-3 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
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
