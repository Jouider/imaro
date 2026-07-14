import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Contact,
  LogOut,
} from 'lucide-react'
import { logout } from '../lib/api'

const nav = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2, end: false },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/audit', label: 'Audit', icon: ShieldCheck, end: false },
  { to: '/leads', label: 'Démos & leads', icon: Contact, end: false },
]

export function Layout() {
  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 flex-col bg-primary text-white">
        <div className="px-5 py-5 text-lg font-bold tracking-tight">
          imaro <span className="font-normal opacity-70">back-office</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/15 font-medium' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              <Icon className="size-4" />
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
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
