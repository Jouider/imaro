import { type ReactNode, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

type Props = { children: ReactNode }

const ONBOARDING_PATH = '/gestionnaire/onboarding'

/**
 * Protects routes at `/gestionnaire/*`.
 * - Redirects to /login when there is no token or the role is not
 *   gestionnaire / manager.
 * - Redirects a manager whose tenant has not finished onboarding to the
 *   onboarding flow (issue #150): first-run setup is mandatory before the app
 *   is usable. Applies after login, on refresh, and on deep links.
 */
export function GestionnaireGuard({ children }: Props) {
  const { token, user, tenant } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isAuthorised =
    Boolean(token) &&
    (user?.role === 'gestionnaire' || user?.role === 'manager')

  // The syndic owner must complete onboarding first. Gestionnaire employees
  // are exempt (the endpoints are manager-only — they'd just 403).
  const needsOnboarding =
    user?.role === 'manager' &&
    tenant != null &&
    !tenant.onboarding_completed_at

  useEffect(() => {
    if (!isAuthorised) {
      // Un membre du personnel connecté file vers son écran de scan plutôt que
      // vers le login (KAN-149 — confiné à /gardien, sans accès aux modules
      // gestionnaire).
      const target =
        token && user?.role === 'personnel' ? '/gardien' : '/login'
      void navigate(target, { replace: true })
      return
    }
    if (needsOnboarding && pathname !== ONBOARDING_PATH) {
      void navigate(ONBOARDING_PATH, { replace: true })
    }
  }, [isAuthorised, needsOnboarding, pathname, navigate, token, user])

  if (!isAuthorised) return null
  // Avoid flashing the requested page before the onboarding redirect lands.
  if (needsOnboarding && pathname !== ONBOARDING_PATH) return null
  return <>{children}</>
}
