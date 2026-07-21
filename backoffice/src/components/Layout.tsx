import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Users,
  ShieldCheck,
  Megaphone,
  ToggleRight,
  Activity,
  Tags,
  Lock,
  Contact,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { logout } from '../lib/api'

const nav = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2, end: false },
  { to: '/facturation', label: 'Facturation', icon: Receipt, end: false },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/audit', label: 'Audit', icon: ShieldCheck, end: false },
  { to: '/diffusion', label: 'Diffusion', icon: Megaphone, end: false },
  { to: '/fonctionnalites', label: 'Fonctionnalités', icon: ToggleRight, end: false },
  { to: '/systeme', label: 'Système', icon: Activity, end: false },
  { to: '/plans', label: 'Plans & tarifs', icon: Tags, end: false },
  { to: '/securite', label: 'Sécurité', icon: Lock, end: false },
  { to: '/leads', label: 'Démos & leads', icon: Contact, end: false },
]

export function Layout() {
  // Tiroir latéral sur mobile (le sidebar est fixe dès `md`).
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-full">
      {/* Barre supérieure — mobile uniquement */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-primary px-4 text-white md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg p-1 hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <img
          src="/logo-horizontal-inverted.png"
          alt="imaro back-office"
          className="h-6 w-auto object-contain"
        />
      </header>

      {/* Voile derrière le tiroir mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — tiroir sur mobile, colonne fixe dès md */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-primary text-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <img
            src="/logo-horizontal-inverted.png"
            alt="imaro back-office"
            className="h-8 w-auto object-contain"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="rounded-lg p-1 hover:bg-white/10 md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="-mt-3 px-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Back-office
        </p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 font-medium'
                    : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          <LogOut className="size-4" />
          Déconnexion
        </button>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
