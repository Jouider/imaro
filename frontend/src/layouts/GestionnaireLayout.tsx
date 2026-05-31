import { useState, useRef } from 'react'
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
  Upload,
  Scale,
  Landmark,
  UserCheck,
  Sparkles,
  Banknote,
  HardHat,
  Undo2,
  TrendingUp,
  CalendarCheck,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  UserCircle,
  CreditCard as AbonnementIcon,
  BanknoteIcon,
  TicketIcon,
  AlertCircle,
  Info,
  CheckCheck,
  Search,
} from 'lucide-react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useNotifStore, type NotifType } from '@/stores/notifStore'
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
import { CommandPalette } from '@/components/gestionnaire/CommandPalette'
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
      {
        to: '/gestionnaire/ia',
        icon: <Sparkles className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.ia',
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
        to: '/gestionnaire/occupants',
        icon: <UserCheck className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.occupants',
      },
      {
        to: '/gestionnaire/prestataires',
        icon: <Hammer className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.prestataires',
      },
      {
        to: '/gestionnaire/imports',
        icon: <Upload className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.imports',
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
      {
        to: '/gestionnaire/recouvrement',
        icon: <Scale className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.recouvrement',
      },
      {
        to: '/gestionnaire/pointage',
        icon: <Landmark className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.pointage',
      },
      {
        to: '/gestionnaire/autres-recettes',
        icon: <TrendingUp className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.autresRecettes',
      },
      {
        to: '/gestionnaire/remboursements',
        icon: <Undo2 className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.remboursements',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionPatrimoine',
    items: [
      {
        to: '/gestionnaire/equipements',
        icon: <Wrench className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.equipements',
      },
      {
        to: '/gestionnaire/emprunts',
        icon: <Banknote className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.emprunts',
      },
      {
        to: '/gestionnaire/travaux-exceptionnels',
        icon: <HardHat className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.travauxExceptionnels',
      },
    ],
  },
  {
    labelKey: 'gestionnaire.nav.sectionConformite',
    items: [
      {
        to: '/gestionnaire/conformite',
        icon: <CalendarCheck className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.conformite',
      },
      {
        to: '/gestionnaire/annexes',
        icon: <ClipboardCheck className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.annexes',
      },
      {
        to: '/gestionnaire/audit',
        icon: <Activity className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.audit',
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
    labelKey: 'gestionnaire.nav.sectionAdministration',
    items: [
      {
        to: '/gestionnaire/utilisateurs',
        icon: <ShieldCheck className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.utilisateurs',
      },
      {
        to: '/gestionnaire/personnel',
        icon: <HardHat className="size-[18px]" aria-hidden="true" />,
        labelKey: 'gestionnaire.nav.personnel',
      },
    ],
  },
]

// ─── Permission filtering ──────────────────────────────────────────────────────
// Gestionnaires created via Équipe → Utilisateurs receive a `permissions` array
// on their user at login (issue #119). We hide nav items they can't access.
// The backend already enforces 403s on the API; this is the visual layer.
//
// Convention: a nav item's permission slug is the last segment of its route
// (e.g. /gestionnaire/paiements → "paiements"). Adjust ROUTE_PERMISSION below if
// the backend permission names diverge from the route slugs.

/** Routes every gestionnaire keeps, whatever their permissions (need a home). */
const ALWAYS_VISIBLE = new Set(['dashboard'])

/** Permission slug for a nav route — last path segment by default. */
function navPermission(to: string): string {
  return to.split('/').filter(Boolean).pop() ?? ''
}

/**
 * Filter nav sections by the user's permissions.
 * Fail-open: only restricts when role === 'gestionnaire' AND a permissions
 * array is present. Managers / owners / super-admins (no permissions array)
 * always see the full sidebar. Empty sections are dropped.
 */
function visibleSections(
  role: string | undefined,
  permissions: string[] | undefined,
): NavSection[] {
  const gated = role === 'gestionnaire' && Array.isArray(permissions)
  if (!gated) return NAV_SECTIONS

  const allowed = permissions ?? []
  const canSee = (item: NavItem) => {
    const slug = navPermission(item.to)
    return ALWAYS_VISIBLE.has(slug) || allowed.includes(slug)
  }

  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(canSee),
  })).filter((section) => section.items.length > 0)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

function notifIcon(type: NotifType) {
  const base = 'size-8 rounded-full flex items-center justify-center shrink-0'
  switch (type) {
    case 'paiement':
      return (
        <div className={cn(base, 'bg-green-100 dark:bg-green-900/30')}>
          <BanknoteIcon className="size-4 text-green-600 dark:text-green-400" />
        </div>
      )
    case 'ticket':
      return (
        <div className={cn(base, 'bg-blue-100 dark:bg-blue-900/30')}>
          <TicketIcon className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
      )
    case 'assemblee':
      return (
        <div className={cn(base, 'bg-purple-100 dark:bg-purple-900/30')}>
          <CalendarCheck className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
      )
    case 'retard':
      return (
        <div className={cn(base, 'bg-red-100 dark:bg-red-900/30')}>
          <AlertCircle className="size-4 text-red-500 dark:text-red-400" />
        </div>
      )
    default:
      return (
        <div className={cn(base, 'bg-gray-100 dark:bg-muted')}>
          <Info className="size-4 text-muted-foreground" />
        </div>
      )
  }
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

type SidebarNavProps = { onNavClick?: () => void }

function SidebarNav({ onNavClick }: SidebarNavProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const sections = visibleSections(user?.role, user?.permissions)

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'linear-gradient(180deg, var(--color-imaro-primary) 0%, var(--color-imaro-primary-dark) 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/8">
        <Wordmark inverted className="h-12 w-48" />
      </div>

      {/* Navigation */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section, si) => (
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
                            isActive
                              ? 'text-white'
                              : 'text-white/45 group-hover:text-white/70',
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">
                          {t(item.labelKey)}
                        </span>
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

// ─── NotificationCenter ───────────────────────────────────────────────────────

function NotificationCenter() {
  const { notifs, markRead, markAllRead, dismiss } = useNotifStore()
  const unreadCount = notifs.filter((n) => !n.read).length
  const panelRef = useRef<HTMLDivElement>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span
              className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#E67E22] text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        ref={panelRef}
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[var(--color-imaro-primary)]" />
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#E67E22] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-[var(--color-imaro-primary)] hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Tout lire
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Aucune notification
              </p>
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'group flex items-start gap-3 px-4 py-3 transition-colors',
                  'border-b last:border-0',
                  !n.read
                    ? 'bg-[var(--color-imaro-primary)]/[0.03] dark:bg-[var(--color-imaro-primary)]/10'
                    : 'hover:bg-muted/40',
                )}
                onClick={() => markRead(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && markRead(n.id)}
              >
                {/* Type icon */}
                {notifIcon(n.type)}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm leading-tight',
                        !n.read
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground/80',
                      )}
                    >
                      {n.title}
                    </p>
                    {/* Unread dot */}
                    {!n.read && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#E67E22]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {timeAgo(n.time)}
                  </p>
                </div>

                {/* Dismiss X — appears on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dismiss(n.id)
                  }}
                  aria-label="Supprimer cette notification"
                  className="mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground group-hover:flex"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifs.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <p className="text-center text-xs text-muted-foreground">
              {notifs.length} notification{notifs.length > 1 ? 's' : ''} au
              total
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menu utilisateur"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ring-transparent transition-all hover:ring-[var(--color-imaro-primary)]/30 focus:outline-none"
          style={{
            background:
              'linear-gradient(135deg, var(--color-imaro-primary-light) 0%, var(--color-imaro-primary) 100%)',
          }}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
        <DropdownMenuLabel className="font-normal py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-imaro-primary-light) 0%, var(--color-imaro-primary) 100%)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground leading-tight">
                {user?.name ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {user?.phone ?? '—'}
              </p>
              {tenant && (
                <p className="truncate text-xs text-muted-foreground/60 mt-0.5">
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
          <span>
            {logoutMutation.isPending ? 'Déconnexion…' : 'Déconnexion'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── ContextPill (topbar left) ────────────────────────────────────────────────

function ContextPill() {
  const { tenant } = useAuthStore()
  const { logoUrl } = useSettingsStore()

  return (
    <div className="hidden sm:flex items-center gap-2.5">
      {/* Logo or fallback icon */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden',
          !logoUrl && 'text-white',
        )}
        style={
          !logoUrl
            ? {
                background:
                  'linear-gradient(135deg, var(--color-imaro-primary-light) 0%, var(--color-imaro-primary) 100%)',
              }
            : undefined
        }
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo syndic"
            className="size-full object-contain"
          />
        ) : (
          <Building2 className="size-4" aria-hidden="true" />
        )}
      </div>

      {/* Name + subtitle */}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-foreground max-w-[160px]">
          {tenant?.name ?? 'Imaro'}
        </p>
        <p className="text-[11px] text-muted-foreground">Gestionnaire</p>
      </div>
    </div>
  )
}

// ─── GestionnaireLayout ───────────────────────────────────────────────────────

export function GestionnaireLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

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

      {/* Main area */}
      <div className="flex min-h-svh flex-1 flex-col lg:ms-[240px]">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white/95 px-3 backdrop-blur-sm dark:border-border dark:bg-card/95 sm:gap-3 sm:px-4">
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

          {/* Left: logo + tenant name */}
          <ContextPill />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cmd+K trigger pill — desktop only */}
          <CmdkTrigger />

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Notification center */}
            <NotificationCenter />

            {/* Divider — desktop only */}
            <div className="mx-1.5 hidden h-5 w-px bg-border sm:block" />

            {/* Theme toggle — desktop only (saves mobile real estate) */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <LanguageSwitcher />

            {/* Divider — desktop only */}
            <div className="mx-1.5 hidden h-5 w-px bg-border sm:block" />

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

// ─── CmdkTrigger ──────────────────────────────────────────────────────────────

/**
 * Pill button in the topbar that triggers Cmd+K. Click dispatches the
 * keydown event so we reuse the global listener in CommandPalette.
 */
function CmdkTrigger() {
  const { t } = useTranslation()
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  function open() {
    const ev = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    })
    window.dispatchEvent(ev)
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label={t('gestionnaire.cmdk.trigger')}
      className="hidden lg:inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-imaro-primary)]/15 bg-[var(--color-imaro-primary-tint)]/40 px-3 text-xs text-muted-foreground transition-colors hover:bg-[var(--color-imaro-primary-tint)] hover:text-[var(--primary)]"
    >
      <Search className="size-3.5" />
      <span className="font-medium">{t('gestionnaire.cmdk.trigger')}</span>
      <kbd className="ms-2 inline-flex h-5 items-center rounded border bg-white px-1.5 font-mono text-[10px] text-muted-foreground shadow-sm dark:bg-card">
        ⌘K
      </kbd>
    </button>
  )
}
