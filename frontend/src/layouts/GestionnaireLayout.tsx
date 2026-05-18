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
  UserCircle,
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
  {
    labelKey: null,
    items: [
      {
        to: '/gestionnaire/profil',
        icon: <UserCircle className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.profil',
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
    <div
      className="flex h-full flex-col"
      style={{ background: 'linear-gradient(180deg, #1a4f72 0%, #153f5c 100%)' }}
    >
      {/* ── Logo ── */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/8">
        <Wordmark inverted className="h-12 w-48" />
      </div>

      {/* ── Navigation (no scrollbar) ── */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {/* Section label */}
            {section.labelKey && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 select-none">
                  {t(section.labelKey)}
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
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
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-white/12 text-white shadow-sm'
                          : 'text-white/55 hover:bg-white/6 hover:text-white/85',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left accent bar */}
                        {isActive && (
                          <span
                            className="absolute start-0 inset-y-1.5 w-[3px] rounded-full bg-[#e67e22]"
                            aria-hidden="true"
                          />
                        )}
                        {/* Icon — brighter when active */}
                        <span
                          className={cn(
                            'transition-colors',
                            isActive ? 'text-white' : 'text-white/45 group-hover:text-white/70',
                          )}
                        >
                          {item.icon}
                        </span>
                        {/* Label */}
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        {/* Chevron hint on hover (inactive only) */}
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

      {/* ── User footer ── */}
      <div className="shrink-0 border-t border-white/8 p-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-white/15"
            style={{ background: 'linear-gradient(135deg, #2980b9 0%, #1b4f72 100%)' }}
          >
            {user?.name?.charAt(0).toUpperCase() ?? 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white leading-tight">
              {user?.name ?? '—'}
            </p>
            <p className="truncate text-xs text-white/40 capitalize mt-0.5">
              {user?.role ?? '—'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-white/45 transition-all hover:bg-white/6 hover:text-white/80"
        >
          <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
          {t('nav.logout')}
        </button>
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
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-white/95 backdrop-blur-sm px-4 dark:border-border dark:bg-card/95">
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
