import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * Protects /gardien — requires an authenticated user with role `personnel`
 * (field staff: gardien/sécurité…, KAN-106) or `manager` / `gestionnaire` /
 * `super_admin` who may also operate the lobby.
 */
export function GardienGuard({ children }: { children: ReactNode }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  const allowed = ['personnel', 'gestionnaire', 'manager', 'super_admin']
  if (user && !allowed.includes(user.role)) {
    return <Navigate to="/portail" replace />
  }
  return <>{children}</>
}
